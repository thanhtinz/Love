"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLove, myName } from "@/lib/store";
import { CARE_MILESTONES, LoveLetter, RARITY_STYLE, getStage, today, uid } from "@/lib/types";
import { ACHIEVEMENTS, LOVE_MESSAGES, QUESTS, pickMessage } from "@/lib/data";
import FloatingHearts, { Burst } from "./FloatingHearts";

type Kind = "water" | "sun" | "love" | "bug";
const PARTICLES: Record<Kind, string[]> = { water: ["💧", "💦", "🔵", "🫧"], sun: ["☀️", "✨", "🌟", "💛"], love: ["💖", "💗", "💕", "❤️"], bug: ["🍃", "🐛", "✨", "🌿"] };
const XP: Record<Kind, number> = { water: 10, sun: 10, love: 12, bug: 8 };
interface Particle { id: number; emoji: string; x: number; delay: number; }
interface Falling { id: string; emoji: string; x: number; rarity: string; }

export default function TreeGame() {
  const { state, dispatch } = useLove();
  const stage = getStage(state.tree.xp);
  const me = myName(state);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [falling, setFalling] = useState<Falling[]>([]);
  const [shaking, setShaking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [comboFlash, setComboFlash] = useState(false);
  const [selected, setSelected] = useState<LoveLetter | null>(null);
  const [cooldowns, setCooldowns] = useState<Partial<Record<Kind, number>>>({});
  const [showBox, setShowBox] = useState(false);
  const prevLetterIds = useRef<Set<string>>(new Set(state.letters.filter((l) => !l.opened).map((l) => l.id)));
  const prevStage = useRef(stage.index);

  const pending = state.letters.filter((l) => !l.opened);
  const opened = state.letters.filter((l) => l.opened);
  const daily = state.daily.date === today() ? state.daily : { ...state.daily, water: 0, love: 0, sun: 0, bug: 0, caredA: false, caredB: false, claimed: [] as string[] };
  const questProgress = (q: (typeof QUESTS)[0]) => q.key === "both" ? (daily.caredA ? 1 : 0) + (daily.caredB ? 1 : 0) : daily[q.key];

  // Thư mới từ người kia (remote) cũng rơi xuống
  useEffect(() => {
    const nowIds = new Set(pending.map((l) => l.id));
    const fresh = pending.filter((l) => !prevLetterIds.current.has(l.id));
    if (fresh.length && prevLetterIds.current.size >= 0) {
      fresh.forEach((l, i) => setFalling((f) => [...f, { id: l.id + "-fall", emoji: RARITY_STYLE[l.rarity].emoji, x: 30 + ((i * 17 + 20) % 40), rarity: l.rarity }]));
      setTimeout(() => setFalling((f) => f.filter((x) => !fresh.some((l) => x.id === l.id + "-fall"))), 2400);
      setShaking(true); setTimeout(() => setShaking(false), 750);
    }
    prevLetterIds.current = nowIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length]);

  useEffect(() => { if (stage.index > prevStage.current) { setCelebrate(true); setTimeout(() => setCelebrate(false), 2600); } prevStage.current = stage.index; }, [stage.index]);

  function doAction(kind: Kind) {
    const now = Date.now();
    if (cooldowns[kind] && now - (cooldowns[kind] || 0) < 2500) return;
    setCooldowns((c) => ({ ...c, [kind]: now }));
    // --- Cơ chế rơi thư ---
    const newXp = state.tree.xp + XP[kind];
    const newStageIdx = getStage(newXp).index;
    const levelUp = newStageIdx > stage.index;
    const newCare = state.tree.careCount + 1;
    const isMilestone = CARE_MILESTONES.includes(newCare);
    const combo = Boolean(state.tree.lastCareBy && state.tree.lastCareBy !== state.currentUser && state.tree.lastCareAt && now - new Date(state.tree.lastCareAt).getTime() < 90000);
    let drop: LoveLetter | null = null; let rarity: "common" | "rare" | "legendary" | null = null; let source = "";
    if (levelUp && newStageIdx >= 5) { rarity = "legendary"; source = "Lên cấp nở hoa 🌸"; }
    else if (combo) { rarity = "rare"; source = "Combo Song chăm ✨"; }
    else if (isMilestone) { rarity = "rare"; source = `Mốc ${newCare} lần chăm 🏅`; }
    else if (levelUp) { rarity = "rare"; source = "Lên cấp 🎉"; }
    else if (Math.random() < 0.35) { rarity = newStageIdx >= 5 && Math.random() < 0.18 ? "legendary" : "common"; source = "Rơi ngẫu nhiên khi chăm cây"; }
    if (rarity) {
      const ownedIds = state.letters.map((l) => l.messageId);
      const msg = pickMessage(rarity, ownedIds);
      drop = { id: uid(), messageId: msg.id, rarity, source, opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" };
    }
    if (combo) { setComboFlash(true); setTimeout(() => setComboFlash(false), 2000); }
    // effects
    setShaking(true); setTimeout(() => setShaking(false), 750);
    const em = { water: "💧", sun: "☀️", love: "💖", bug: "🍃" }[kind];
    const nb: Burst[] = Array.from({ length: 5 }, (_, i) => ({ id: now + i, emoji: em, x: 25 + Math.random() * 50 }));
    setBursts((b) => [...b, ...nb]); setTimeout(() => setBursts((b) => b.filter((x) => !nb.includes(x))), 1300);
    const ps: Particle[] = Array.from({ length: 8 }, (_, i) => ({ id: now + 100 + i, emoji: PARTICLES[kind][i % 4], x: 15 + Math.random() * 70, delay: i * 0.08 }));
    setParticles((p) => [...p, ...ps]); setTimeout(() => setParticles((p) => p.filter((x) => !ps.includes(x))), 1600);
    if (drop) { setFalling((f) => [...f, { id: drop!.id + "-fall", emoji: RARITY_STYLE[drop.rarity].emoji, x: 38 + Math.random() * 24, rarity: drop.rarity }]); setTimeout(() => setFalling((f) => f.filter((x) => x.id !== drop!.id + "-fall")), 2400); }
    dispatch({ type: "TREE_ACTION", kind, actor: me, user: state.currentUser, drop, combo });
  }

  function claimQuest(q: (typeof QUESTS)[0]) {
    let drop: LoveLetter | null = null;
    if (q.id === "both") { const msg = pickMessage("rare", state.letters.map((l) => l.messageId)); drop = { id: uid(), messageId: msg.id, rarity: "rare", source: "Thưởng nhiệm vụ Song chăm ✨", opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" }; }
    dispatch({ type: "CLAIM_QUEST", questId: q.id, actor: me, rewardXp: q.rewardXp, drop });
  }

  const bar = (label: string, v: number, color: string, icon: string) => (
    <div><div className="flex justify-between text-xs font-bold text-slate-600"><span>{icon} {label}</span><span>{v}%</span></div><div className="h-3.5 rounded-full bg-white/80 overflow-hidden mt-1 shadow-inner"><div className={`h-full ${color} transition-all duration-700 rounded-full`} style={{ width: `${v}%` }} /></div></div>
  );
  const cdLeft = (k: Kind) => Math.max(0, 2500 - (Date.now() - (cooldowns[k] || 0)));
  const [, force] = useState(0); useEffect(() => { const iv = setInterval(() => force((x) => x + 1), 500); return () => clearInterval(iv); }, []);
  const msgOf = (l: LoveLetter) => LOVE_MESSAGES.find((m) => m.id === l.messageId);
  const confetti = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ id: i, x: (i * 37) % 100, delay: (i % 7) * 0.12, emoji: ["💖", "🎉", "🌸", "✨", "💗"][i % 5] })), []);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-pink-100 bg-gradient-to-b from-sky-100 via-pink-50 to-emerald-50 p-4 pb-2 shadow-[0_10px_40px_rgba(244,83,131,0.15)]">
        {/* mây trôi + nắng */}
        <span className="absolute top-3 left-4 text-3xl animate-drift opacity-80">☁️</span><span className="absolute top-8 right-8 text-3xl animate-drift opacity-70">☁️</span>
        <span className="absolute top-2 right-3 text-4xl animate-sparkle">☀️</span>
        {celebrate && <div className="absolute inset-0 pointer-events-none z-20">{confetti.map((c) => <span key={c.id} className="absolute top-0 animate-confetti text-2xl" style={{ left: `${c.x}%`, animationDelay: `${c.delay}s` }}>{c.emoji}</span>)}<div className="absolute inset-x-4 top-16 rounded-3xl bg-white/90 border-2 border-amber-300 py-3 text-center font-display font-bold text-amber-600 text-lg animate-pop shadow-xl">🎉 LÊN CẤP! Cây đã thành “{stage.name}” {stage.emoji}</div></div>}
        {comboFlash && <div className="absolute inset-x-6 top-4 z-20 rounded-full bg-gradient-to-r from-amber-300 to-pink-400 text-white text-center font-display font-bold py-2 animate-pop shadow-lg">✨ COMBO SONG CHĂM! Hai đứa cùng chăm cây ✨</div>}
        <div className="relative h-[290px] flex flex-col items-center justify-end">
          <FloatingHearts bursts={bursts} />
          {particles.map((p) => <span key={p.id} className="absolute top-16 animate-rise text-2xl pointer-events-none" style={{ left: `${p.x}%`, animationDelay: `${p.delay}s` }}>{p.emoji}</span>)}
          {falling.map((f) => <span key={f.id} className={`absolute top-6 animate-fall text-4xl z-10 ${f.rarity !== "common" ? "animate-glow" : ""}`} style={{ left: `${f.x}%` }}>{f.emoji}</span>)}
          <div className={`relative z-[5] transition-transform ${shaking ? "animate-shakeTree" : "animate-sway"} ${celebrate ? "animate-glow" : ""}`} style={{ transform: `scale(${stage.scale})`, transformOrigin: "bottom center" }}>
            <span className="text-[110px] leading-none block drop-shadow-lg select-none">{stage.emoji}</span>
            {stage.index >= 4 && <><span className="absolute -top-2 -left-4 text-2xl animate-sparkle">✨</span><span className="absolute top-4 -right-5 text-2xl animate-sparkle">🌸</span></>}
          </div>
          {/* mặt đất + thư nằm dưới gốc */}
          <div className="w-full mt-1">
            <div className="h-5 rounded-[50%] bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 mx-6" />
            <div className="min-h-[52px] flex flex-wrap justify-center gap-2 pt-2 pb-1">
              {pending.length === 0 && <p className="text-[11px] text-slate-400 font-semibold">Chăm cây để làm rơi thư tình 💌 (tỉ lệ ~35%, combo/mốc/lên cấp chắc chắn rơi!)</p>}
              {pending.map((l) => (
                <button key={l.id} onClick={() => setSelected(l)} className={`rounded-2xl border-2 px-3 py-2 font-display font-bold text-sm hover:scale-110 hover:-rotate-3 transition animate-bounceSoft ${RARITY_STYLE[l.rarity].ring}`} title="Bấm để mở thư">
                  {RARITY_STYLE[l.rarity].emoji} Thư {RARITY_STYLE[l.rarity].label} — bấm mở!
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-[6] text-center pb-2">
          <h2 className="font-display text-xl font-bold text-pink-600">{stage.name} {stage.emoji} <span className="text-sm text-slate-500">• Cấp {stage.index + 1}/7 • {state.tree.xp} XP • Đã chăm {state.tree.careCount} lần</span></h2>
          <p className="text-sm text-slate-500 font-semibold">{stage.desc}</p>
          {stage.next ? <><div className="mt-2 h-3 rounded-full bg-white overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 transition-all duration-700" style={{ width: `${stage.progressToNext}%` }} /></div><p className="text-[11px] text-slate-400 mt-1">Còn {stage.next.minXp - state.tree.xp} XP tới “{stage.next.name}”</p></> : <p className="text-xs font-bold text-violet-500 mt-1">👑 Cấp tối đa rồi — huyền thoại!</p>}
        </div>
        <div className="grid gap-2 pb-3 relative z-[6]">{bar("Nước", state.tree.water, "bg-gradient-to-r from-sky-300 to-sky-500", "💧")}{bar("Nắng", state.tree.sun, "bg-gradient-to-r from-amber-300 to-amber-500", "☀️")}{bar("Tình yêu", state.tree.love, "bg-gradient-to-r from-pink-300 to-rose-500", "💖")}</div>
        <div className="grid grid-cols-4 gap-2 pb-4 relative z-[6]">
          {([["water", "💧", "Tưới nước"], ["sun", "☀️", "Tắm nắng"], ["love", "💖", "Bón tim"], ["bug", "🐛", "Bắt sâu"]] as [Kind, string, string][]).map(([k, em, label]) => (
            <button key={k} disabled={cdLeft(k) > 0} onClick={() => doAction(k)} className="rounded-3xl bg-white/90 border-2 border-pink-100 py-3 font-display font-bold text-pink-600 shadow hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100">
              <span className="block text-2xl">{em}</span><span className="text-xs sm:text-sm">{cdLeft(k) > 0 ? `${(cdLeft(k) / 1000).toFixed(1)}s...` : label}</span><span className="block text-[10px] text-slate-400">+{XP[k]} XP</span>
            </button>
          ))}
        </div>
      </section>

      {/* Nhiệm vụ + streak + huy hiệu */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-pink-100 p-4">
          <h3 className="font-display font-bold text-pink-600">📋 Nhiệm vụ mỗi ngày <span className="text-xs text-slate-400">• 🔥 Streak {state.streak.count} ngày</span></h3>
          <ul className="mt-2 space-y-2">
            {QUESTS.map((q) => { const prog = Math.min(q.target, questProgress(q)); const done = prog >= q.target; const claimed = daily.claimed.includes(q.id); return (
              <li key={q.id} className="flex items-center gap-2 rounded-2xl bg-pink-50/70 px-3 py-2 text-sm">
                <span>{q.emoji}</span><span className={`flex-1 font-semibold ${done ? "text-emerald-600" : "text-slate-600"}`}>{q.label} ({prog}/{q.target}) {done && "✅"}</span>
                {done && !claimed && <button onClick={() => claimQuest(q)} className="rounded-full bg-amber-400 text-white text-xs font-bold px-3 py-1.5 hover:scale-105 animate-bounceSoft">Nhận +{q.rewardXp} XP 🎁</button>}
                {claimed && <span className="text-xs font-bold text-slate-400">Đã nhận ✓</span>}
              </li> ); })}
          </ul>
          <p className="text-[11px] text-slate-400 mt-2">Người kia làm giúp cũng tính tiến độ — thấy nhau realtime luôn. Nhiệm vụ “Cả 2 người” thưởng thêm thư Hiếm ✨</p>
        </section>
        <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-amber-100 p-4">
          <h3 className="font-display font-bold text-amber-600">🏆 Huy hiệu thành tích ({state.achievements.length}/{ACHIEVEMENTS.length})</h3>
          <div className="mt-2 flex flex-wrap gap-2">{ACHIEVEMENTS.map((a) => { const has = state.achievements.includes(a.id); return <span key={a.id} title={a.label} className={`rounded-full px-3 py-1.5 text-xs font-bold ${has ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400 grayscale opacity-60"}`}>{a.emoji} {a.label}</span>; })}</div>
          <button onClick={() => setShowBox(!showBox)} className="mt-3 w-full rounded-full bg-gradient-to-r from-pink-400 to-violet-400 text-white font-display font-bold py-2.5 hover:scale-[1.02] transition">💌 Hộp thư tình yêu — Đã sưu tập {opened.length}/{LOVE_MESSAGES.length} thư {pending.length ? `• ${pending.length} thư chưa mở!` : ""}</button>
        </section>
      </div>

      {/* Hộp thư / Album */}
      {showBox && (
        <section className="rounded-3xl bg-white/80 border-2 border-violet-100 p-4 animate-pop">
          <div className="flex justify-between items-center"><h3 className="font-display font-bold text-violet-600">💌 Album bộ sưu tập thư tình</h3><span className="text-xs font-bold text-slate-500">{opened.length}/{LOVE_MESSAGES.length} ({Math.round((opened.length / LOVE_MESSAGES.length) * 100)}%)</span></div>
          <div className="mt-2 h-3 rounded-full bg-violet-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-400 to-pink-400 transition-all" style={{ width: `${(opened.length / LOVE_MESSAGES.length) * 100}%` }} /></div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2 max-h-80 overflow-auto pr-1">
            {LOVE_MESSAGES.map((m) => { const owned = opened.find((l) => l.messageId === m.id); return (
              <div key={m.id} className={`rounded-2xl border-2 p-3 text-sm ${owned ? RARITY_STYLE[m.rarity].ring : "border-slate-100 bg-slate-50"}`}>
                {owned ? <><span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${RARITY_STYLE[m.rarity].bg}`}>{RARITY_STYLE[m.rarity].label}</span><p className="mt-1 font-semibold text-slate-700">{m.text}</p><p className="text-[11px] text-slate-400 mt-1">Mở ngày {owned.openedAt ? new Date(owned.openedAt).toLocaleDateString("vi-VN") : ""} • {owned.source} • bởi {owned.openedBy}</p></> : <p className="font-semibold text-slate-400">🔒 Bí mật... {m.rarity === "legendary" ? "Thư Huyền thoại — chờ cây nở hoa / lên cấp cao" : m.rarity === "rare" ? "Thư Hiếm — cần combo Song chăm hoặc đạt mốc chăm" : "Thư chưa khám phá — hãy chăm cây tiếp nhé"}</p>}
              </div> ); })}
          </div>
        </section>
      )}

      {/* Modal mở thư */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-sm rounded-[2rem] border-4 p-6 text-center animate-pop bg-white ${RARITY_STYLE[selected.rarity].ring}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-6xl animate-wiggle">💌</div>
            <span className={`inline-block mt-2 text-xs font-bold rounded-full px-3 py-1 ${RARITY_STYLE[selected.rarity].bg}`}>{RARITY_STYLE[selected.rarity].label} • {selected.source}</span>
            <p className="mt-4 text-lg font-bold text-slate-700 leading-relaxed">“{msgOf(selected)?.text}”</p>
            <p className="mt-3 text-xs text-slate-400">Rơi ngày {new Date(selected.droppedAt).toLocaleString("vi-VN")}</p>
            <button onClick={() => { dispatch({ type: "OPEN_LETTER", id: selected.id, opener: me }); setSelected(null); }} className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold py-3 hover:scale-[1.03] transition">Cất vào Hộp thư tình yêu 💖</button>
            <button onClick={() => setSelected(null)} className="mt-2 text-xs font-bold text-slate-400">Để dành, mở sau</button>
          </div>
        </div>
      )}
    </div>
  );
}

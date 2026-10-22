"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLove, myName } from "@/lib/store";
import { CARE_MILESTONES, LoveLetter, RARITY_STYLE, decayedStats, getStage, today, treeHealth, uid } from "@/lib/types";
import { ACHIEVEMENTS, LOVE_MESSAGES, QUESTS, pickMessage, shopItem, timeSky } from "@/lib/data";
import FloatingHearts, { Burst } from "./FloatingHearts";
import Shop from "./Shop";
import { Icon, type IconName } from "./Icon";
import TreeArt from "./TreeArt";
import FaceIcon from "./FaceIcon";

type Kind = "water" | "sun" | "love" | "bug";
const PARTICLES: Record<Kind, { icon: IconName; color: string }[]> = {
  water: [{ icon: "drop", color: "#38bdf8" }, { icon: "drop", color: "#0ea5e9" }, { icon: "sparkle", color: "#7dd3fc" }, { icon: "drop", color: "#60a5fa" }],
  sun: [{ icon: "sun", color: "#f59e0b" }, { icon: "sparkle", color: "#fbbf24" }, { icon: "star", color: "#facc15" }, { icon: "sparkle", color: "#fde047" }],
  love: [{ icon: "heartFill", color: "#f43f5e" }, { icon: "heart", color: "#fb7185" }, { icon: "heartFill", color: "#ec4899" }, { icon: "heart", color: "#f9a8d4" }],
  bug: [{ icon: "leaf", color: "#22c55e" }, { icon: "bug", color: "#84cc16" }, { icon: "sparkle", color: "#4ade80" }, { icon: "leaf", color: "#16a34a" }],
};
const BURST_STYLE: Record<Kind, { icon: IconName; color: string }> = {
  water: { icon: "drop", color: "#0ea5e9" }, sun: { icon: "sun", color: "#f59e0b" }, love: { icon: "heartFill", color: "#f43f5e" }, bug: { icon: "leaf", color: "#22c55e" },
};
const XP: Record<Kind, number> = { water: 10, sun: 10, love: 12, bug: 8 };
const GROUND_DECOR: { icon: IconName; color: string }[] = [
  { icon: "clover", color: "#22c55e" }, { icon: "flower", color: "#facc15" }, { icon: "flower", color: "#f472b6" }, { icon: "flower", color: "#fb7185" },
  { icon: "mushroom", color: "#ef4444" }, { icon: "flower", color: "#fb923c" }, { icon: "flower", color: "#c084fc" }, { icon: "clover", color: "#16a34a" },
];
const CONFETTI: { icon: IconName; color: string }[] = [
  { icon: "heartFill", color: "#f43f5e" }, { icon: "party", color: "#f59e0b" }, { icon: "flower", color: "#f472b6" }, { icon: "sparkle", color: "#fbbf24" }, { icon: "heart", color: "#fb7185" },
];
interface Particle { id: number; icon: IconName; color: string; x: number; delay: number; }
interface Falling { id: string; x: number; rarity: string; }

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

  // --- v2: chỉ số THẬT sau decay (force tick 500ms bên dưới giúp hiển thị luôn tươi) ---
  const stats = decayedStats(state.tree);
  const health = treeHealth(stats);
  const wilted = health.status === "wilted";

  // --- v2: cảnh vườn — nền trang bị ở shop, scene-auto thì theo giờ thật ---
  const sceneItem = shopItem(state.equipped.scene);
  const potItem = shopItem(state.equipped.pot);
  const accItem = shopItem(state.equipped.accessory);
  const hour = new Date().getHours();
  const autoSky = timeSky(hour);
  const isNight = sceneItem.id === "scene-night" || (sceneItem.id === "scene-auto" && autoSky.night);
  const skyGrad = sceneItem.id === "scene-auto" ? autoSky.sky : sceneItem.visual;
  const orb: IconName = sceneItem.id === "scene-night" ? "moon" : sceneItem.id === "scene-sunset" ? "sunset" : sceneItem.id === "scene-rainbow" ? "rainbow" : autoSky.orb;
  const butterflies = (health.status === "happy" ? 2 : 0) + (accItem.id === "acc-butterfly" ? 2 : 0);

  // Thư mới từ người kia (remote) cũng rơi xuống
  useEffect(() => {
    const nowIds = new Set(pending.map((l) => l.id));
    const fresh = pending.filter((l) => !prevLetterIds.current.has(l.id));
    if (fresh.length && prevLetterIds.current.size >= 0) {
      fresh.forEach((l, i) => setFalling((f) => [...f, { id: l.id + "-fall", x: 30 + ((i * 17 + 20) % 40), rarity: l.rarity }]));
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
    if (levelUp && newStageIdx >= 5) { rarity = "legendary"; source = "Lên cấp nở hoa"; }
    else if (combo) { rarity = "rare"; source = "Combo Song chăm"; }
    else if (isMilestone) { rarity = "rare"; source = `Mốc ${newCare} lần chăm`; }
    else if (levelUp) { rarity = "rare"; source = "Lên cấp"; }
    else if (Math.random() < 0.35) { rarity = newStageIdx >= 5 && Math.random() < 0.18 ? "legendary" : "common"; source = "Rơi ngẫu nhiên khi chăm cây"; }
    if (rarity) {
      const ownedIds = state.letters.map((l) => l.messageId);
      const msg = pickMessage(rarity, ownedIds);
      drop = { id: uid(), messageId: msg.id, rarity, source, opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" };
    }
    if (combo) { setComboFlash(true); setTimeout(() => setComboFlash(false), 2000); }
    // effects
    setShaking(true); setTimeout(() => setShaking(false), 750);
    const bs = BURST_STYLE[kind];
    const nb: Burst[] = Array.from({ length: 5 }, (_, i) => ({ id: now + i, icon: bs.icon, color: bs.color, x: 25 + Math.random() * 50 }));
    setBursts((b) => [...b, ...nb]); setTimeout(() => setBursts((b) => b.filter((x) => !nb.includes(x))), 1300);
    const ps: Particle[] = Array.from({ length: 8 }, (_, i) => { const s = PARTICLES[kind][i % 4]; return { id: now + 100 + i, icon: s.icon, color: s.color, x: 15 + Math.random() * 70, delay: i * 0.08 }; });
    setParticles((p) => [...p, ...ps]); setTimeout(() => setParticles((p) => p.filter((x) => !ps.includes(x))), 1600);
    if (drop) { setFalling((f) => [...f, { id: drop!.id + "-fall", x: 38 + Math.random() * 24, rarity: drop.rarity }]); setTimeout(() => setFalling((f) => f.filter((x) => x.id !== drop!.id + "-fall")), 2400); }
    dispatch({ type: "TREE_ACTION", kind, actor: me, user: state.currentUser, drop, combo });
  }

  function claimQuest(q: (typeof QUESTS)[0]) {
    let drop: LoveLetter | null = null;
    if (q.id === "both") { const msg = pickMessage("rare", state.letters.map((l) => l.messageId)); drop = { id: uid(), messageId: msg.id, rarity: "rare", source: "Thưởng nhiệm vụ Song chăm", opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" }; }
    dispatch({ type: "CLAIM_QUEST", questId: q.id, actor: me, rewardXp: q.rewardXp, drop });
  }

  const bar = (label: string, v: number, color: string, icon: IconName, iconColor: string) => (
    <div><div className="flex justify-between text-xs font-bold text-slate-600"><span className="inline-flex items-center gap-1"><Icon name={icon} className="w-4 h-4" /><span style={{ color: iconColor }} className="sr-only">{label}</span>{label}</span><span className="inline-flex items-center gap-1">{Math.round(v)}%{v < 20 && <Icon name="warning" className="w-4 h-4 text-red-500" />}</span></div><div className="h-3.5 rounded-full bg-white/80 overflow-hidden mt-1 shadow-inner"><div className={`h-full ${v < 20 ? "bg-gradient-to-r from-red-300 to-red-400" : color} transition-all duration-700 rounded-full`} style={{ width: `${v}%` }} /></div></div>
  );
  const cdLeft = (k: Kind) => Math.max(0, 2500 - (Date.now() - (cooldowns[k] || 0)));
  const [, force] = useState(0); useEffect(() => { const iv = setInterval(() => force((x) => x + 1), 500); return () => clearInterval(iv); }, []);
  const msgOf = (l: LoveLetter) => LOVE_MESSAGES.find((m) => m.id === l.messageId);
  const confetti = useMemo(() => Array.from({ length: 26 }, (_, i) => { const s = CONFETTI[i % CONFETTI.length]; return { id: i, x: (i * 37) % 100, delay: (i % 7) * 0.12, icon: s.icon, color: s.color }; }), []);
  const rarityBadge = (rarity: string) => rarity === "legendary" ? <Icon name="crown" className="w-4 h-4 text-violet-500" /> : rarity === "rare" ? <Icon name="sparkle" className="w-4 h-4 text-amber-500" /> : null;

  return (
    <div className="space-y-4">
      <section className={`relative overflow-hidden rounded-[2rem] border-2 ${isNight ? "border-indigo-200" : "border-pink-100"} bg-gradient-to-b ${skyGrad} p-4 pb-2 shadow-[0_10px_40px_rgba(244,83,131,0.15)] transition-colors duration-1000`}>
        {/* trời theo giờ / cảnh trang bị */}
        {!isNight && <><span className="absolute top-3 left-4 animate-drift opacity-80 text-white"><Icon name="cloud" className="w-10 h-10" /></span><span className="absolute top-8 right-8 animate-drift opacity-70 text-white"><Icon name="cloud" className="w-8 h-8" /></span></>}
        {isNight && <><span className="absolute top-4 left-8 animate-sparkle text-amber-200"><Icon name="sparkle" className="w-5 h-5" /></span><span className="absolute top-10 left-1/3 animate-sparkle text-amber-100"><Icon name="star" className="w-4 h-4" /></span><span className="absolute top-5 right-1/4 animate-sparkle text-amber-200"><Icon name="sparkle" className="w-5 h-5" /></span><span className="absolute top-16 right-10 w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_8px_3px_rgba(253,224,71,0.7)] animate-float" /></>}
        <span className="absolute top-2 right-3 animate-sparkle text-amber-400">{<Icon name={orb} className="w-11 h-11" />}</span>
        <span className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${isNight ? "bg-indigo-900/40 text-indigo-50" : "bg-white/60 text-slate-500"}`}>{sceneItem.id === "scene-auto" ? <><Icon name="clock" className="w-3.5 h-3.5" /> {autoSky.label} • cảnh theo giờ thật</> : <><Icon name={sceneItem.icon} className="w-3.5 h-3.5" /> Cảnh: {sceneItem.name}</>}</span>
        {celebrate && <div className="absolute inset-0 pointer-events-none z-20">{confetti.map((c) => <span key={c.id} className="absolute top-0 animate-confetti" style={{ left: `${c.x}%`, animationDelay: `${c.delay}s`, color: c.color }}><Icon name={c.icon} className="w-6 h-6" /></span>)}<div className="absolute inset-x-4 top-16 rounded-3xl bg-white/90 border-2 border-amber-300 py-3 px-4 text-center font-display font-bold text-amber-600 text-lg animate-pop shadow-xl inline-flex items-center justify-center gap-2 w-auto left-1/2 -translate-x-1/2 whitespace-nowrap"><Icon name="party" className="w-6 h-6" /> LÊN CẤP! Cây đã thành “{stage.name}”</div></div>}
        {comboFlash && <div className="absolute inset-x-6 top-10 z-20 rounded-full bg-gradient-to-r from-amber-300 to-pink-400 text-white text-center font-display font-bold py-2 animate-pop shadow-lg flex items-center justify-center gap-2"><Icon name="sparkle" className="w-5 h-5" /> COMBO SONG CHĂM! Hai đứa cùng chăm cây <Icon name="sparkle" className="w-5 h-5" /></div>}
        <div className="relative h-[320px] flex flex-col items-center justify-end">
          <FloatingHearts bursts={bursts} />
          {particles.map((p) => <span key={p.id} className="absolute top-16 animate-rise pointer-events-none" style={{ left: `${p.x}%`, animationDelay: `${p.delay}s`, color: p.color }}><Icon name={p.icon} className="w-6 h-6" /></span>)}
          {falling.map((f) => (
            <span key={f.id} className={`absolute top-6 animate-fall z-10 ${f.rarity !== "common" ? "animate-glow" : ""}`} style={{ left: `${f.x}%`, color: f.rarity === "legendary" ? "#8b5cf6" : f.rarity === "rare" ? "#d97706" : "#ec4899" }}>
              <span className="relative inline-block"><Icon name="envelope" className="w-10 h-10" />{f.rarity !== "common" && <span className="absolute -top-2 -right-2">{rarityBadge(f.rarity)}</span>}</span>
            </span>
          ))}
          {/* bướm bay khi cây khoẻ / mua phụ kiện đàn bướm */}
          {Array.from({ length: butterflies }).map((_, i) => (
            <span key={i} className="absolute animate-flutter pointer-events-none z-[7] text-violet-400" style={{ top: `${52 + i * 26}px`, left: `${12 + i * 22}%`, animationDelay: `${i * 1.3}s` }}><Icon name="butterfly" className="w-7 h-7" /></span>
          ))}
          <div className={`relative z-[5] transition-transform ${shaking ? "animate-shakeTree" : ""} ${celebrate ? "animate-glow" : ""}`} style={{ transform: `scale(${stage.scale})`, transformOrigin: "bottom center" }}>
            <div className={shaking || wilted ? "" : "animate-sway"} style={{ transformOrigin: "bottom center" }}>
              <TreeArt stage={stage.index} style={{ width: 168, height: 168, filter: wilted ? "grayscale(0.7) sepia(0.35) brightness(0.92)" : undefined, transform: wilted ? "rotate(-7deg) translateY(10px)" : undefined }} className="drop-shadow-lg select-none transition-all duration-700 block" />
            </div>
            {!wilted && stage.index >= 4 && <><span className="absolute -top-2 -left-4 animate-sparkle text-amber-400"><Icon name="sparkle" className="w-6 h-6" /></span><span className="absolute top-4 -right-5 animate-sparkle text-pink-400"><Icon name="flower" className="w-6 h-6" /></span></>}
            {/* phụ kiện trang bị */}
            {accItem.id === "acc-bow" && <span className="absolute -top-4 right-1 animate-bounceSoft text-pink-500"><Icon name="ribbon" className="w-8 h-8" /></span>}
            {accItem.id === "acc-chime" && <span className="absolute top-0 -left-9 animate-sway text-sky-500"><Icon name="bell" className="w-8 h-8" /></span>}
            {accItem.id === "acc-lantern" && <span className="absolute bottom-1 -right-10 animate-glow text-orange-500"><Icon name="lantern" className="w-8 h-8" /></span>}
          </div>
          {/* chậu cây trang bị ở shop */}
          <div className="relative z-[4] -mt-3 flex flex-col items-center">
            <div className={`w-28 h-9 rounded-b-[1.8rem] rounded-t-md bg-gradient-to-br ${potItem.visual} border-2 border-white/60 shadow-md grid place-items-center text-white/90`} title={potItem.name}>
              <Icon name={potItem.icon} className="w-5 h-5 drop-shadow" />
            </div>
            <span className={`text-[10px] font-bold mt-0.5 ${isNight ? "text-indigo-50" : "text-slate-500"}`}>{potItem.name}</span>
          </div>
          {/* mặt đất + hoa cỏ nhiều dần theo cấp cây + thư nằm dưới gốc */}
          <div className="w-full mt-1">
            <div className={`flex justify-between px-8 -mb-1 select-none ${isNight ? "opacity-70" : ""}`} aria-hidden>
              {GROUND_DECOR.slice(0, stage.index + 2).map((g, i) => <span key={i} style={{ color: g.color }} className={wilted ? "grayscale opacity-60" : ""}><Icon name={g.icon} className="w-4 h-4" /></span>)}
            </div>
            <div className={`h-5 rounded-[50%] bg-gradient-to-r mx-6 ${isNight ? "from-emerald-700 via-emerald-800 to-emerald-700" : "from-emerald-200 via-emerald-300 to-emerald-200"}`} />
            <div className="min-h-[52px] flex flex-wrap justify-center gap-2 pt-2 pb-1">
              {pending.length === 0 && <p className={`text-[11px] font-semibold inline-flex items-center gap-1.5 ${isNight ? "text-indigo-100/80" : "text-slate-400"}`}>Chăm cây để làm rơi thư tình <Icon name="envelope" className="w-4 h-4 text-pink-400" /> (tỉ lệ ~35%, combo/mốc/lên cấp chắc chắn rơi!)</p>}
              {pending.map((l) => (
                <button key={l.id} onClick={() => setSelected(l)} className={`rounded-2xl border-2 px-3 py-2 font-display font-bold text-sm hover:scale-110 hover:-rotate-3 transition animate-bounceSoft inline-flex items-center gap-1.5 ${RARITY_STYLE[l.rarity].ring}`} title="Bấm để mở thư">
                  <Icon name="envelope" className="w-5 h-5" />{rarityBadge(l.rarity)} Thư {RARITY_STYLE[l.rarity].label} — bấm mở!
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* trạng thái sống của cây */}
        <div className={`relative z-[6] mx-auto max-w-md rounded-full px-4 py-1.5 text-center text-xs font-bold animate-pop flex items-center justify-center gap-1.5 ${wilted ? "bg-red-100 text-red-600 border-2 border-red-200" : health.status === "need" ? "bg-amber-100 text-amber-700 border-2 border-amber-200" : "bg-white/70 text-emerald-600 border-2 border-emerald-100"}`} key={health.status + health.lowest}>
          {wilted ? <Icon name="flower" className="w-4 h-4 text-slate-400" /> : health.status === "happy" ? <FaceIcon mood="heartEyes" size={18} /> : health.status === "need" ? <FaceIcon mood="pleading" size={18} /> : <Icon name="leaf" className="w-4 h-4 text-emerald-500" />}
          <span>{health.message}</span>
        </div>
        <div className="relative z-[6] text-center pb-2 pt-2">
          <h2 className="font-display text-xl font-bold text-pink-600">{stage.name} <span className="text-sm text-slate-500">• Cấp {stage.index + 1}/7 • {state.tree.xp} XP • Đã chăm {state.tree.careCount} lần</span> <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs align-middle"><Icon name="coin" className="w-4 h-4" /> {state.coins} Xu Tim</span></h2>
          <p className="text-sm text-slate-500 font-semibold">{stage.desc}</p>
          {stage.next ? <><div className="mt-2 h-3 rounded-full bg-white overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 transition-all duration-700" style={{ width: `${stage.progressToNext}%` }} /></div><p className="text-[11px] text-slate-400 mt-1">Còn {stage.next.minXp - state.tree.xp} XP tới “{stage.next.name}”</p></> : <p className="text-xs font-bold text-violet-500 mt-1 inline-flex items-center gap-1"><Icon name="crown" className="w-4 h-4" /> Cấp tối đa rồi — huyền thoại!</p>}
        </div>
        <div className="grid gap-2 pb-1 relative z-[6]">{bar("Nước", stats.water, "bg-gradient-to-r from-sky-300 to-sky-500", "drop", "#0284c7")}{bar("Nắng", stats.sun, "bg-gradient-to-r from-amber-300 to-amber-500", "sun", "#d97706")}{bar("Tình yêu", stats.love, "bg-gradient-to-r from-pink-300 to-rose-500", "heart", "#e11d48")}</div>
        <p className="text-[11px] text-slate-400 pb-2 relative z-[6] flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5 shrink-0" /> Cây sống thật: chỉ số tự giảm theo thời gian (Nước −2.5/giờ, Nắng −1.8/giờ, Tình yêu −1.2/giờ) — nhớ ghé chăm cây mỗi ngày kẻo cây héo nhé!</p>
        <div className="grid grid-cols-4 gap-2 pb-4 relative z-[6]">
          {([["water", "drop", "#0ea5e9", "Tưới nước"], ["sun", "sun", "#f59e0b", "Tắm nắng"], ["love", "heartFill", "#f43f5e", "Bón tim"], ["bug", "bug", "#65a30d", "Bắt sâu"]] as [Kind, IconName, string, string][]).map(([k, ic, color, label]) => (
            <button key={k} disabled={cdLeft(k) > 0} onClick={() => doAction(k)} className="rounded-3xl bg-white/90 border-2 border-pink-100 py-3 font-display font-bold text-pink-600 shadow hover:scale-105 active:scale-95 transition disabled:opacity-50 disabled:scale-100">
              <span className="flex justify-center" style={{ color }}><Icon name={ic} className="w-7 h-7" /></span><span className="text-xs sm:text-sm block mt-0.5">{cdLeft(k) > 0 ? `${(cdLeft(k) / 1000).toFixed(1)}s...` : label}</span><span className="block text-[10px] text-slate-400">+{XP[k]} XP</span>
            </button>
          ))}
        </div>
      </section>

      {/* Nhiệm vụ + streak + huy hiệu */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-pink-100 p-4">
          <h3 className="font-display font-bold text-pink-600 flex items-center gap-1.5"><Icon name="checklist" className="w-5 h-5" /> Nhiệm vụ mỗi ngày <span className="text-xs text-slate-400 inline-flex items-center gap-1">• <Icon name="flame" className="w-4 h-4 text-orange-500" /> Streak {state.streak.count} ngày</span></h3>
          <ul className="mt-2 space-y-2">
            {QUESTS.map((q) => { const prog = Math.min(q.target, questProgress(q)); const done = prog >= q.target; const claimed = daily.claimed.includes(q.id); return (
              <li key={q.id} className="flex items-center gap-2 rounded-2xl bg-pink-50/70 px-3 py-2 text-sm">
                <span className="text-pink-500"><Icon name={q.icon} className="w-5 h-5" /></span><span className={`flex-1 font-semibold ${done ? "text-emerald-600" : "text-slate-600"}`}>{q.label} ({prog}/{q.target}) {done && <Icon name="check" className="w-4 h-4 text-emerald-500" />}</span>
                {done && !claimed && <button onClick={() => claimQuest(q)} className="rounded-full bg-amber-400 text-white text-xs font-bold px-3 py-1.5 hover:scale-105 animate-bounceSoft inline-flex items-center gap-1">Nhận +{q.rewardXp} XP +{q.rewardCoins}<Icon name="coin" className="w-3.5 h-3.5" /> <Icon name="gift" className="w-4 h-4" /></button>}
                {claimed && <span className="text-xs font-bold text-slate-400 inline-flex items-center gap-1">Đã nhận <Icon name="check" className="w-3.5 h-3.5" /></span>}
              </li> ); })}
          </ul>
          <p className="text-[11px] text-slate-400 mt-2">Người kia làm giúp cũng tính tiến độ — thấy nhau realtime luôn. Nhiệm vụ “Cả 2 người” thưởng thêm thư Hiếm.</p>
        </section>
        <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-amber-100 p-4">
          <h3 className="font-display font-bold text-amber-600 flex items-center gap-1.5"><Icon name="trophy" className="w-5 h-5" /> Huy hiệu thành tích ({state.achievements.length}/{ACHIEVEMENTS.length})</h3>
          <div className="mt-2 flex flex-wrap gap-2">{ACHIEVEMENTS.map((a) => { const has = state.achievements.includes(a.id); return <span key={a.id} title={a.label} className={`rounded-full px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 ${has ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400 grayscale opacity-60"}`}><Icon name={a.icon} className="w-4 h-4" /> {a.label}</span>; })}</div>
          <button onClick={() => setShowBox(!showBox)} className="mt-3 w-full rounded-full bg-gradient-to-r from-pink-400 to-violet-400 text-white font-display font-bold py-2.5 hover:scale-[1.02] transition flex items-center justify-center gap-2"><Icon name="envelope" className="w-5 h-5" /> Hộp thư tình yêu — Đã sưu tập {opened.length}/{LOVE_MESSAGES.length} thư {pending.length ? `• ${pending.length} thư chưa mở!` : ""}</button>
        </section>
      </div>

      {/* v2: Cửa hàng trang trí vườn */}
      <Shop />

      {/* Hộp thư / Album */}
      {showBox && (
        <section className="rounded-3xl bg-white/80 border-2 border-violet-100 p-4 animate-pop">
          <div className="flex justify-between items-center"><h3 className="font-display font-bold text-violet-600 flex items-center gap-1.5"><Icon name="envelope" className="w-5 h-5" /> Album bộ sưu tập thư tình</h3><span className="text-xs font-bold text-slate-500">{opened.length}/{LOVE_MESSAGES.length} ({Math.round((opened.length / LOVE_MESSAGES.length) * 100)}%)</span></div>
          <div className="mt-2 h-3 rounded-full bg-violet-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-400 to-pink-400 transition-all" style={{ width: `${(opened.length / LOVE_MESSAGES.length) * 100}%` }} /></div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2 max-h-80 overflow-auto pr-1">
            {LOVE_MESSAGES.map((m) => { const owned = opened.find((l) => l.messageId === m.id); return (
              <div key={m.id} className={`rounded-2xl border-2 p-3 text-sm ${owned ? RARITY_STYLE[m.rarity].ring : "border-slate-100 bg-slate-50"}`}>
                {owned ? <><span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${RARITY_STYLE[m.rarity].bg}`}>{RARITY_STYLE[m.rarity].label}</span><p className="mt-1 font-semibold text-slate-700">{m.text}</p><p className="text-[11px] text-slate-400 mt-1">Mở ngày {owned.openedAt ? new Date(owned.openedAt).toLocaleDateString("vi-VN") : ""} • {owned.source} • bởi {owned.openedBy}</p></> : <p className="font-semibold text-slate-400 flex items-start gap-1.5"><Icon name="lock" className="w-4 h-4 mt-0.5 shrink-0" /> Bí mật... {m.rarity === "legendary" ? "Thư Huyền thoại — chờ cây nở hoa / lên cấp cao" : m.rarity === "rare" ? "Thư Hiếm — cần combo Song chăm hoặc đạt mốc chăm" : "Thư chưa khám phá — hãy chăm cây tiếp nhé"}</p>}
              </div> ); })}
          </div>
        </section>
      )}

      {/* Modal mở thư */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-sm rounded-[2rem] border-4 p-6 text-center animate-pop bg-white ${RARITY_STYLE[selected.rarity].ring}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center animate-wiggle text-pink-500 relative">
              <Icon name="envelope" className="w-16 h-16" />
              {selected.rarity !== "common" && <span className="absolute -top-1 right-[38%]">{rarityBadge(selected.rarity)}</span>}
            </div>
            <span className={`inline-block mt-2 text-xs font-bold rounded-full px-3 py-1 ${RARITY_STYLE[selected.rarity].bg}`}>{RARITY_STYLE[selected.rarity].label} • {selected.source}</span>
            <p className="mt-4 text-lg font-bold text-slate-700 leading-relaxed">“{msgOf(selected)?.text}”</p>
            <p className="mt-3 text-xs text-slate-400">Rơi ngày {new Date(selected.droppedAt).toLocaleString("vi-VN")}</p>
            <button onClick={() => { dispatch({ type: "OPEN_LETTER", id: selected.id, opener: me }); setSelected(null); }} className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold py-3 hover:scale-[1.03] transition flex items-center justify-center gap-2">Cất vào Hộp thư tình yêu <Icon name="heartFill" className="w-5 h-5" /></button>
            <button onClick={() => setSelected(null)} className="mt-2 text-xs font-bold text-slate-400">Để dành, mở sau</button>
          </div>
        </div>
      )}
    </div>
  );
}

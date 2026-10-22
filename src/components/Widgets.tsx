"use client";
import { useState } from "react";
import { useLove, myName } from "@/lib/store";
import { DATE_IDEAS, MOODS, NOTE_COLORS, questionOfDay } from "@/lib/data";
import { uid } from "@/lib/types";

export function MoodPicker() {
  const { state, dispatch } = useLove();
  return (
    <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-pink-100 p-4 shadow-[0_8px_30px_rgba(244,83,131,0.10)]">
      <h2 className="font-display font-bold text-pink-600">🌈 Mood hôm nay</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 text-center">
        {(["A", "B"] as const).map((u) => (
          <div key={u} className="rounded-3xl bg-pink-50/70 p-3">
            <div className="text-4xl animate-float">{state.moods[u]}</div>
            <p className="text-xs font-bold text-slate-600 mt-1">{u === "A" ? state.personA : state.personB}{state.currentUser === u ? " (bạn)" : ""}</p>
            {state.currentUser === u && <div className="mt-2 flex flex-wrap justify-center gap-1">{MOODS.map((m) => <button key={m} onClick={() => dispatch({ type: "SET_MOOD", user: u, mood: m })} className="text-xl hover:scale-125 transition">{m}</button>)}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
export function DateIdea() {
  const [idea, setIdea] = useState("Bấm quay để nhận gợi ý hẹn hò bất ngờ nè 🎲");
  const [spin, setSpin] = useState(false);
  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-pink-50 border-2 border-amber-100 p-4">
      <h2 className="font-display font-bold text-amber-600">🎲 Gợi ý hẹn hò</h2>
      <p className={`mt-2 font-semibold text-slate-700 ${spin ? "animate-wiggle" : ""}`}>{idea}</p>
      <button onClick={() => { setSpin(true); let n = 0; const iv = setInterval(() => { setIdea(DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)]); if (++n > 8) { clearInterval(iv); setSpin(false); } }, 90); }} className="mt-3 rounded-full bg-amber-400 text-white font-display font-bold px-5 py-2 hover:scale-105 transition shadow">Quay ngay 🎰</button>
    </section>
  );
}
export function LoveNotes() {
  const { state, dispatch } = useLove(); const [text, setText] = useState("");
  return (
    <section>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết lời yêu thương..." className="flex-1 rounded-full border-2 border-pink-100 px-4 py-2.5 outline-none focus:border-pink-300 bg-white/80" onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { dispatch({ type: "ADD_NOTE", note: { id: uid(), author: myName(state), text: text.trim(), color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)], createdAt: new Date().toISOString() } }); setText(""); } }} />
        <button onClick={() => { if (!text.trim()) return; dispatch({ type: "ADD_NOTE", note: { id: uid(), author: myName(state), text: text.trim(), color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)], createdAt: new Date().toISOString() } }); setText(""); }} className="rounded-full bg-pink-500 text-white font-bold px-4 hover:scale-105 transition">Dán 📌</button>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {state.notes.map((n, i) => (
          <article key={n.id} className={`${n.color} rounded-3xl p-3 shadow-sm hover:scale-[1.03] hover:-rotate-1 transition animate-pop`} style={{ transform: `rotate(${i % 2 ? 1 : -1}deg)` }}>
            <p className="text-sm font-semibold text-slate-700 min-h-[60px]">{n.text}</p>
            <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500 font-bold"><span>— {n.author}</span><button onClick={() => dispatch({ type: "DEL_NOTE", id: n.id })} className="hover:scale-125">🗑️</button></div>
          </article>
        ))}
      </div>
      {!state.notes.length && <p className="text-center text-slate-400 mt-6">Chưa có ghi chú nào, dán tấm đầu tiên đi 💕</p>}
    </section>
  );
}
export function BucketList() {
  const { state, dispatch } = useLove(); const [text, setText] = useState("");
  const pct = state.bucket.length ? Math.round((state.bucket.filter((b) => b.done).length / state.bucket.length) * 100) : 0;
  return (
    <section>
      <div className="rounded-3xl bg-white/70 border-2 border-pink-100 p-4">
        <div className="flex justify-between font-display font-bold text-pink-600"><span>🎯 Bucket List chung</span><span>{pct}%</span></div>
        <div className="mt-2 h-4 rounded-full bg-pink-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-400 to-amber-300 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="flex gap-2 mt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Thêm mục tiêu cùng nhau..." className="flex-1 rounded-full border-2 border-pink-100 px-4 py-2.5 outline-none bg-white/80" />
        <button onClick={() => { if (!text.trim()) return; dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: text.trim(), done: false, createdAt: new Date().toISOString() } }); setText(""); }} className="rounded-full bg-pink-500 text-white font-bold px-4">Thêm +</button>
      </div>
      <ul className="mt-3 space-y-2">
        {state.bucket.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-3xl bg-white/70 border-2 border-pink-50 px-4 py-3">
            <button onClick={() => dispatch({ type: "TOGGLE_BUCKET", id: b.id })} className={`w-7 h-7 rounded-full border-2 font-bold ${b.done ? "bg-emerald-400 border-emerald-400 text-white" : "border-pink-300 text-transparent"}`}>✓</button>
            <span className={`flex-1 font-semibold ${b.done ? "line-through text-slate-400" : "text-slate-700"}`}>{b.text}</span>
            <button onClick={() => dispatch({ type: "DEL_BUCKET", id: b.id })}>🗑️</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function DailyQuestion() {
  const { state, dispatch } = useLove(); const [text, setText] = useState("");
  const q = questionOfDay(); const me = state.currentUser; const both = Boolean(state.answers.A && state.answers.B);
  const mine = me === "A" ? state.answers.A : state.answers.B;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-pink-50 border-2 border-violet-100 p-5">
      <h2 className="font-display font-bold text-violet-600 text-lg">💬 Câu hỏi hôm nay cho couple</h2>
      <p className="mt-2 text-lg font-bold text-slate-700">“{q}”</p>
      {!mine ? (
        <div className="mt-4 flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Câu trả lời của bạn..." className="flex-1 rounded-full border-2 border-violet-100 px-4 py-2.5 outline-none bg-white" /><button onClick={() => { if (!text.trim()) return; dispatch({ type: "ANSWER", user: me, text: text.trim() }); setText(""); }} className="rounded-full bg-violet-500 text-white font-bold px-4">Trả lời 💌</button></div>
      ) : <p className="mt-3 text-sm font-bold text-emerald-600">✅ Bạn đã trả lời rồi. {both ? "Xem đáp án của cả hai bên dưới nè!" : "Đợi người thương trả lời để mở khóa đáp án của nhau nhé 🔒"}</p>}
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {(["A", "B"] as const).map((u) => { const ans = u === "A" ? state.answers.A : state.answers.B; const show = both || u === me; return (
          <div key={u} className="rounded-3xl bg-white/80 p-4 border-2 border-pink-50"><p className="text-xs font-bold text-pink-500">{u === "A" ? state.personA : state.personB}</p><p className="mt-1 font-semibold text-slate-700">{ans ? (show ? ans : "🔒 Đã trả lời — chờ bạn trả lời để xem") : "Chưa trả lời..."}</p></div> ); })}
      </div>
    </section>
  );
}
export function ActivityFeed() {
  const { state } = useLove();
  return (
    <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-pink-100 p-4">
      <h2 className="font-display font-bold text-pink-600">⚡ Hoạt động trực tiếp</h2>
      <ul className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
        {state.activities.map((a) => (<li key={a.id} className="flex gap-2 text-sm animate-pop"><span>{a.emoji}</span><span className="flex-1"><b>{a.actor}</b> {a.text}</span><time className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(a.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time></li>))}
      </ul>
    </section>
  );
}

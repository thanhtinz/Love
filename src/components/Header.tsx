"use client";
import { useState } from "react";
import { useLove } from "@/lib/store";
import ChibiAvatar from "./ChibiAvatar";
export default function Header() {
  const { state, dispatch, connected } = useLove();
  const [edit, setEdit] = useState(false);
  const [a, setA] = useState(state.personA); const [b, setB] = useState(state.personB);
  const [room, setRoom] = useState(state.roomCode);
  const days = Math.max(0, Math.floor((Date.now() - new Date(state.startDate).getTime()) / 86400000) + 1);
  const milestones = [100, 200, 300, 365, 500, 730, 1000, 1500, 2000];
  const nextM = milestones.find((m) => m > days) || 3000;
  return (
    <header className="sticky top-2 z-40 rounded-3xl bg-white/80 backdrop-blur-md border-2 border-pink-100 shadow-[0_10px_36px_rgba(244,83,131,0.18)] p-4 animate-fadeUp">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ChibiAvatar variant="A" size={54} /><span className="text-2xl animate-bounceSoft">💖</span><ChibiAvatar variant="B" size={54} />
        </div>
        <div className="text-center flex-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-pink-600 leading-tight">{state.personA} <span className="text-pink-400">♥</span> {state.personB}</h1>
          <p className="text-sm text-pink-500 font-semibold">Yêu nhau được {days} ngày 🌸</p>
          <p className="text-xs text-slate-500">Còn {nextM - days} ngày nữa tới mốc {nextM} ngày 🎉</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-display font-bold shadow-sm" title="Xu Tim — dùng mua đồ trang trí vườn ở Cửa hàng">🪙 {state.coins} Xu Tim</span>
          <button onClick={() => { setA(state.personA); setB(state.personB); setRoom(state.roomCode); setEdit(!edit); }} className="rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-600 hover:scale-105 transition">⚙️ Sửa</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{connected ? "🟢 Đang kết nối realtime" : "⚪ Chưa kết nối"}</span>
        <span className="rounded-full bg-violet-100 text-violet-700 px-2.5 py-1 font-bold">🏠 Phòng: {state.roomCode}</span>
        <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 font-bold">🔥 Streak chăm cây: {state.streak.count} ngày</span>
        <span className="ml-auto flex items-center gap-1">Tôi là:
          {(["A", "B"] as const).map((u) => (
            <button key={u} onClick={() => dispatch({ type: "SET_USER", user: u })} className={`rounded-full px-2.5 py-1 font-bold transition ${state.currentUser === u ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500"}`}>{u === "A" ? state.personA : state.personB}</button>
          ))}
        </span>
      </div>
      {edit && (
        <div className="mt-3 grid grid-cols-2 gap-2 animate-pop">
          <label className="text-xs font-bold text-slate-500">Tên người A<input value={a} onChange={(e) => setA(e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none focus:border-pink-300" /></label>
          <label className="text-xs font-bold text-slate-500">Tên người B<input value={b} onChange={(e) => setB(e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none focus:border-pink-300" /></label>
          <label className="text-xs font-bold text-slate-500">Ngày bắt đầu yêu<input type="date" defaultValue={state.startDate} onChange={(e) => dispatch({ type: "SET_START", date: e.target.value })} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none" /></label>
          <label className="text-xs font-bold text-slate-500">Mã phòng (6 ký tự, 2 máy cùng mã)<input value={room} maxLength={6} onChange={(e) => setRoom(e.target.value.toUpperCase())} className="mt-1 w-full rounded-2xl border-2 border-violet-100 px-3 py-2 text-sm outline-none uppercase" /></label>
          <button onClick={() => { dispatch({ type: "SET_NAMES", a: a || state.personA, b: b || state.personB }); if (room.trim().length >= 4) dispatch({ type: "SET_ROOM", code: room.trim() }); setEdit(false); }} className="col-span-2 rounded-full bg-pink-500 text-white font-display font-bold py-2 hover:scale-[1.02] transition">Lưu lại 💾</button>
          <button onClick={() => { setEdit(false); dispatch({ type: "REOPEN_ONBOARDING" }); }} className="col-span-2 rounded-full bg-violet-100 text-violet-600 font-display font-bold py-2 hover:scale-[1.02] transition">🌸 Mở lại màn hình chào mừng / cài đặt ban đầu</button>
          <p className="col-span-2 text-[11px] text-slate-400">Mẹo realtime: mở 2 tab cùng mã phòng là thấy nhau ngay. Khác máy cần bật Supabase (xem README).</p>
        </div>
      )}
    </header>
  );
}

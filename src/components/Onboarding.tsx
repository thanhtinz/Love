"use client";
import { useState } from "react";
import { useLove } from "@/lib/store";
import { genRoomCode, today } from "@/lib/types";
import ChibiAvatar from "./ChibiAvatar";

/** Modal chào mừng lần đầu mở app: nhập tên 2 người, ngày bắt đầu yêu, chọn "tôi là ai", mã phòng. */
export default function Onboarding() {
  const { state, dispatch } = useLove();
  const [a, setA] = useState(state.personA === "Bé A" ? "" : state.personA);
  const [b, setB] = useState(state.personB === "Bé B" ? "" : state.personB);
  const [start, setStart] = useState(state.startDate || today());
  const [me, setMe] = useState<"A" | "B">(state.currentUser);
  const [room, setRoom] = useState(state.roomCode);
  if (state.onboarded) return null;
  const submit = () => {
    dispatch({
      type: "COMPLETE_ONBOARDING",
      a: a.trim() || "Bé A", b: b.trim() || "Bé B",
      startDate: start || today(), user: me,
      roomCode: room.trim().length >= 4 ? room.trim() : state.roomCode,
    });
  };
  const input = "mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-300 bg-white";
  return (
    <div className="fixed inset-0 z-[70] bg-pink-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white via-pink-50 to-amber-50 p-5 animate-pop shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-center gap-1">
          <ChibiAvatar variant="A" size={60} /><span className="text-3xl animate-bounceSoft">💖</span><ChibiAvatar variant="B" size={60} />
        </div>
        <h2 className="text-center font-display text-2xl font-bold text-pink-600 mt-1">Chào mừng đến với<br />Khu Vườn Tình Yêu 🌸</h2>
        <p className="text-center text-sm font-semibold text-slate-500 mt-1">Cùng nhau trồng một cái cây tình yêu, chăm mỗi ngày để nhận thư tình rơi ra từ cây nhé!</p>
        {!state.everOnboarded && <p className="mt-2 text-center text-xs font-bold text-amber-600 bg-amber-100 rounded-full py-1.5 px-3">🎁 Hoàn thành bước này nhận ngay quà chào mừng +30 Xu Tim 🪙</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-500">Tên người A<input value={a} onChange={(e) => setA(e.target.value)} placeholder="vd: Tín" className={input} /></label>
          <label className="text-xs font-bold text-slate-500">Tên người B<input value={b} onChange={(e) => setB(e.target.value)} placeholder="vd: Người thương" className={input} /></label>
          <label className="text-xs font-bold text-slate-500">Ngày bắt đầu yêu 💘<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
          <label className="text-xs font-bold text-slate-500">Mã phòng (2 máy nhập giống nhau)
            <span className="flex gap-1">
              <input value={room} maxLength={6} onChange={(e) => setRoom(e.target.value.toUpperCase())} className={`${input} uppercase`} />
              <button type="button" onClick={() => setRoom(genRoomCode())} title="Tạo mã ngẫu nhiên" className="mt-1 shrink-0 rounded-2xl bg-violet-100 px-2.5 text-sm hover:scale-105 transition">🎲</button>
            </span>
          </label>
        </div>
        <p className="mt-3 text-xs font-bold text-slate-500 text-center">Bạn là ai trong khu vườn này?</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["A", "B"] as const).map((u) => (
            <button key={u} onClick={() => setMe(u)} className={`rounded-3xl border-2 py-2.5 font-display font-bold transition ${me === u ? "bg-pink-500 text-white border-pink-500 scale-[1.03] shadow-lg" : "bg-white text-pink-500 border-pink-100 hover:scale-[1.02]"}`}>
              {u === "A" ? "🌸 " + (a.trim() || "Người A") : "💙 " + (b.trim() || "Người B")}
            </button>
          ))}
        </div>
        <button onClick={submit} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold text-lg py-3 hover:scale-[1.02] active:scale-95 transition shadow-lg">Vào khu vườn thôi! 🌱💖</button>
        <p className="mt-2 text-center text-[11px] text-slate-400">Mẹo: gửi mã phòng cho người thương, hai máy nhập cùng mã là chơi realtime với nhau được (khác máy cần Supabase — xem README).</p>
      </div>
    </div>
  );
}

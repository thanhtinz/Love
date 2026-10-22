"use client";
import { useState } from "react";
import { useLove } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { today } from "@/lib/types";
import ChibiAvatar from "./ChibiAvatar";

/**
 * V3 — Bước thiết lập khu vườn SAU KHI đã login + ghép cặp xong:
 * chỉ còn đặt TÊN KHU VƯỜN + NGÀY BẮT ĐẦU YÊU (tên/avatar/slot lấy từ tài khoản, không chọn tay A/B nữa).
 * Vẫn giữ quà tặng Xu Tim cho lần thiết lập đầu tiên (qua cờ everOnboarded trong reducer SETUP_GARDEN).
 */
export default function Onboarding() {
  const { state, dispatch } = useLove();
  const auth = useAuth();
  const [gardenName, setGardenName] = useState(state.gardenName === "Khu Vườn Tình Yêu" ? "" : state.gardenName);
  const [start, setStart] = useState(state.startDate || today());
  if (!auth.couple || state.onboarded) return null;
  const submit = () => {
    dispatch({ type: "SETUP_GARDEN", gardenName: gardenName.trim() || "Khu Vườn Tình Yêu", startDate: start || today() });
  };
  const input = "mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-300 bg-white";
  return (
    <div className="fixed inset-0 z-[70] bg-pink-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white via-pink-50 to-amber-50 p-5 animate-pop shadow-2xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-center gap-1">
          <ChibiAvatar avatarId={state.avatarA} size={60} /><span className="text-3xl animate-bounceSoft">💖</span><ChibiAvatar avatarId={state.avatarB} size={60} />
        </div>
        <h2 className="text-center font-display text-2xl font-bold text-pink-600 mt-1">Hai bạn đã thành một cặp! 🎉</h2>
        <p className="text-center text-sm font-semibold text-slate-500 mt-1">
          <b>{state.personA}</b> ♥ <b>{auth.couple.members.length > 1 ? state.personB : "đang chờ người thương vào vườn..."}</b><br />
          Đặt tên cho khu vườn và chọn ngày bắt đầu yêu để gieo hạt mầm đầu tiên nhé 🌱
        </p>
        {!state.everOnboarded && <p className="mt-2 text-center text-xs font-bold text-amber-600 bg-amber-100 rounded-full py-1.5 px-3">🎁 Hoàn thành bước này nhận ngay quà chào mừng +30 Xu Tim 🪙</p>}
        <div className="mt-4 space-y-3">
          <label className="text-xs font-bold text-slate-500">Tên khu vườn của hai bạn 🏡<input value={gardenName} onChange={(e) => setGardenName(e.target.value)} placeholder="vd: Vườn của Tín & Người thương" className={input} /></label>
          <label className="text-xs font-bold text-slate-500">Ngày bắt đầu yêu 💘<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} /></label>
        </div>
        <p className="mt-3 text-center text-[11px] font-bold text-slate-400">Mã mời của vườn: <span className="font-display tracking-[0.2em] text-pink-500">{auth.couple.code}</span> — gửi cho người thương nếu họ chưa vào nhé 💌</p>
        <button onClick={submit} className="mt-3 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold text-lg py-3 hover:scale-[1.02] active:scale-95 transition shadow-lg">Gieo hạt mầm thôi! 🌱💖</button>
      </div>
    </div>
  );
}

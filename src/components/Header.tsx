"use client";
import { useState } from "react";
import { useLove } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import ChibiAvatar from "./ChibiAvatar";
import AccountPanel from "./AccountPanel";
import { Icon } from "./Icon";

export default function Header() {
  const { state, dispatch, connected } = useLove();
  const auth = useAuth();
  const [edit, setEdit] = useState(false);
  const [gardenName, setGardenName] = useState(state.gardenName);
  const days = Math.max(0, Math.floor((Date.now() - new Date(state.startDate).getTime()) / 86400000) + 1);
  const milestones = [100, 200, 300, 365, 500, 730, 1000, 1500, 2000];
  const nextM = milestones.find((m) => m > days) || 3000;
  const partnerJoined = (auth.couple?.members.length ?? 0) > 1;
  const myName = state.currentUser === "A" ? state.personA : state.personB;
  return (
    <header className="sticky top-2 z-40 rounded-3xl bg-white/80 backdrop-blur-md border-2 border-pink-100 shadow-[0_10px_36px_rgba(244,83,131,0.18)] p-4 animate-fadeUp">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ChibiAvatar avatarId={state.avatarA} size={54} /><span className="animate-bounceSoft text-rose-500"><Icon name="heartFill" className="w-6 h-6" /></span><ChibiAvatar avatarId={state.avatarB} size={54} />
        </div>
        <div className="text-center flex-1 min-w-0">
          <p className="text-[11px] font-display font-bold text-violet-400 tracking-wide flex items-center justify-center gap-1"><Icon name="home" className="w-3.5 h-3.5" /> {state.gardenName}</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-pink-600 leading-tight truncate">{state.personA} <span className="text-pink-400 inline-flex align-middle"><Icon name="heartFill" className="w-5 h-5" /></span> {state.personB}</h1>
          <p className="text-sm text-pink-500 font-semibold flex items-center justify-center gap-1">Yêu nhau được {days} ngày <Icon name="flower" className="w-4 h-4 text-pink-400" /></p>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">Còn {nextM - days} ngày nữa tới mốc {nextM} ngày <Icon name="party" className="w-3.5 h-3.5 text-amber-500" /></p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-display font-bold shadow-sm" title="Xu Tim — dùng mua đồ trang trí vườn ở Cửa hàng"><Icon name="coin" className="w-3.5 h-3.5 inline" /> {state.coins} Xu Tim</span>
          <button onClick={() => { setGardenName(state.gardenName); setEdit(!edit); }} className="rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-600 hover:scale-105 transition inline-flex items-center gap-1"><Icon name="gear" className="w-3.5 h-3.5" /> Sửa</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{connected ? <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Đang kết nối realtime</> : <><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> Chưa kết nối</>}</span>
        <span className="rounded-full bg-violet-100 text-violet-700 px-2.5 py-1 font-bold inline-flex items-center gap-1"><Icon name="key" className="w-3.5 h-3.5" /> Mã mời: {state.roomCode}</span>
        <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 font-bold inline-flex items-center gap-1"><Icon name="flame" className="w-3.5 h-3.5 text-orange-500" /> Streak chăm cây: {state.streak.count} ngày</span>
        {!partnerJoined && <span className="rounded-full bg-rose-100 text-rose-600 px-2.5 py-1 font-bold animate-pulse inline-flex items-center gap-1"><Icon name="envelope" className="w-3.5 h-3.5" /> Đang chờ người thương nhập mã mời...</span>}
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-pink-50 border border-pink-100 pl-1 pr-2.5 py-0.5">
          <ChibiAvatar avatarId={auth.user?.avatar} size={22} />
          <span className="font-bold text-pink-600">{myName} (bạn)</span>
          <button onClick={() => void auth.signOut()} title="Đăng xuất" className="text-slate-400 hover:text-rose-500 hover:scale-110 transition font-bold inline-flex"><Icon name="logout" className="w-4 h-4" /></button>
        </span>
      </div>
      {edit && (
        <div className="mt-3 grid grid-cols-2 gap-2 animate-pop">
          <label className="text-xs font-bold text-slate-500">Tên khu vườn <Icon name="home" className="w-3.5 h-3.5 inline text-pink-400" /><input value={gardenName} onChange={(e) => setGardenName(e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none focus:border-pink-300" /></label>
          <label className="text-xs font-bold text-slate-500">Ngày bắt đầu yêu<input type="date" defaultValue={state.startDate} onChange={(e) => dispatch({ type: "SET_START", date: e.target.value })} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none" /></label>
          <button onClick={() => { dispatch({ type: "SETUP_GARDEN", gardenName: gardenName.trim() || state.gardenName, startDate: state.startDate }); setEdit(false); }} className="col-span-2 rounded-full bg-pink-500 text-white font-display font-bold py-2 hover:scale-[1.02] transition inline-flex items-center justify-center gap-1.5">Lưu lại <Icon name="save" className="w-4 h-4" /></button>
          <button onClick={() => { setEdit(false); dispatch({ type: "REOPEN_ONBOARDING" }); }} className="col-span-2 rounded-full bg-violet-100 text-violet-600 font-display font-bold py-2 hover:scale-[1.02] transition inline-flex items-center justify-center gap-1.5"><Icon name="flower" className="w-4 h-4" /> Mở lại màn hình thiết lập khu vườn</button>
          <AccountPanel />
          <p className="col-span-2 text-[11px] text-slate-400">Tên & avatar của mỗi người lấy từ tài khoản của họ — đổi trong mục Tài khoản & Khu vườn phía trên. Mẹo realtime: 2 tab cùng máy thấy nhau ngay; khác máy cần bật Supabase (xem README).</p>
        </div>
      )}
    </header>
  );
}

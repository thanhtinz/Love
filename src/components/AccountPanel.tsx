"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AVATARS } from "@/lib/types";
import ChibiAvatar from "./ChibiAvatar";

const inputCls = "mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none focus:border-pink-300 bg-white";

/** Mục "Tài khoản & Khu vườn": hồ sơ của tôi, thành viên, mã mời, rời vườn, đăng xuất. */
export default function AccountPanel() {
  const auth = useAuth();
  const [name, setName] = useState(auth.user?.displayName || "");
  const [avatar, setAvatar] = useState(auth.user?.avatar || "svg-a");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  if (!auth.user) return null;
  const partner = auth.couple?.members.find((m) => m.userId !== auth.user?.id);

  const copyCode = async () => {
    if (!auth.couple) return;
    try { await navigator.clipboard.writeText(auth.couple.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const saveProfile = async () => {
    setError(""); setSaved(false);
    const r = await auth.updateMyProfile(name, avatar);
    if (r.error) setError(r.error); else { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  };
  const leave = async () => {
    if (window.confirm("Bạn chắc chắn muốn rời khu vườn này? 🌧️ Dữ liệu vườn vẫn được giữ lại cho người còn lại, bạn có thể quay lại bằng mã mời.")) {
      await auth.leaveCouple();
    }
  };

  return (
    <div className="col-span-2 rounded-3xl bg-violet-50/70 border-2 border-violet-100 p-3 space-y-3">
      <h3 className="font-display font-bold text-violet-600">👤 Tài khoản & Khu vườn</h3>

      <div className="flex items-center gap-2.5">
        <ChibiAvatar avatarId={auth.user.avatar} size={46} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-slate-700 leading-tight truncate">{auth.user.displayName} <span className="text-[10px] align-middle rounded-full bg-pink-500 text-white px-2 py-0.5 ml-1">Bạn • ghế {auth.couple?.mySlot ?? "?"}</span></p>
          <p className="text-[11px] font-semibold text-slate-400 truncate">{auth.user.email}</p>
          <p className="text-[11px] font-bold text-slate-400">{auth.mode === "supabase" ? "☁️ Tài khoản Supabase (login mọi nơi)" : "📱 Tài khoản trên máy này"}</p>
        </div>
        <button onClick={() => void auth.signOut()} className="shrink-0 rounded-full bg-white border-2 border-pink-200 px-3 py-1.5 text-xs font-bold text-pink-600 hover:scale-105 transition">Đăng xuất 🚪</button>
      </div>

      {auth.couple && (
        <div className="rounded-2xl bg-white/80 border-2 border-pink-100 p-2.5">
          <p className="text-xs font-bold text-slate-500">Thành viên khu vườn (tối đa 2 người):</p>
          <div className="mt-1.5 space-y-1.5">
            {auth.couple.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <ChibiAvatar avatarId={m.avatar} size={30} />
                <span className="text-sm font-bold text-slate-600">{m.displayName}</span>
                <span className="text-[10px] rounded-full bg-violet-100 text-violet-600 px-2 py-0.5 font-bold">Ghế {m.slot}{m.userId === auth.user?.id ? " • bạn" : ""}</span>
              </div>
            ))}
            {!partner && <p className="text-xs font-semibold text-amber-600">💌 Chưa có người thương trong vườn — gửi mã mời bên dưới cho người ấy nhé!</p>}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Mã mời:</span>
            <span className="font-display font-bold tracking-[0.2em] text-pink-600 bg-pink-50 border-2 border-dashed border-pink-200 rounded-xl px-3 py-1">{auth.couple.code}</span>
            <button onClick={copyCode} className="rounded-full bg-pink-500 text-white text-xs font-bold px-3 py-1.5 hover:scale-105 transition">{copied ? "Đã chép ✓" : "Chép mã 📋"}</button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-slate-500">Đổi tên hiển thị / avatar của tôi:</p>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Tên hiển thị của bạn" />
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {AVATARS.map((a) => (
            <button key={a.id} type="button" title={a.label} onClick={() => setAvatar(a.id)} className={`rounded-2xl p-1 grid place-items-center transition ${avatar === a.id ? "bg-pink-100 ring-2 ring-pink-400 scale-110" : "bg-white hover:scale-105"}`}>
              <ChibiAvatar avatarId={a.id} size={30} />
            </button>
          ))}
        </div>
        {error && <p className="mt-1.5 text-xs font-bold text-rose-500">{error}</p>}
        <button onClick={saveProfile} className="mt-2 w-full rounded-full bg-violet-500 text-white font-display font-bold py-2 hover:scale-[1.02] transition">{saved ? "Đã lưu ✓" : "Lưu hồ sơ của tôi 💾"}</button>
      </div>

      {auth.couple && (
        <button onClick={leave} className="w-full rounded-full bg-white border-2 border-rose-200 text-rose-500 font-display font-bold py-2 hover:scale-[1.02] transition">🌧️ Rời khu vườn này</button>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AVATARS } from "@/lib/types";
import ChibiAvatar from "./ChibiAvatar";

const inputCls = "mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-300 bg-white";
const labelCls = "text-xs font-bold text-slate-500 block";

function ModeBadge() {
  const { mode } = useAuth();
  if (mode === "supabase") return <p className="mt-3 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-2 text-center">☁️ Đang dùng tài khoản Supabase — đăng nhập được ở mọi thiết bị, 2 điện thoại sync thật với nhau.</p>;
  return <p className="mt-3 rounded-2xl bg-amber-50 border-2 border-amber-100 text-amber-700 text-[11px] font-bold px-3 py-2 text-center">📱 Chế độ trên máy này — tài khoản chỉ dùng trên thiết bị này. Bật Supabase (xem README) để login mọi nơi nhé.</p>;
}

function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <span className={labelCls}>Chọn avatar chibi của bạn 🎀</span>
      <div className="mt-1.5 grid grid-cols-6 gap-1.5">
        {AVATARS.map((a) => (
          <button key={a.id} type="button" title={a.label} onClick={() => onChange(a.id)} className={`rounded-2xl p-1 grid place-items-center transition ${value === a.id ? "bg-pink-100 ring-2 ring-pink-400 scale-110" : "bg-white hover:scale-105"}`}>
            <ChibiAvatar avatarId={a.id} size={36} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PasswordField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className={labelCls}>{label}
      <span className="relative block">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ít nhất 6 ký tự" className={`${inputCls} pr-11`} autoComplete={label.includes("tạo") || label.includes("Mật khẩu mới") ? "new-password" : "current-password"} />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/3 text-base" title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? "🙈" : "👀"}</button>
      </span>
    </label>
  );
}

/** Màn hình Đăng nhập / Đăng ký — chưa login là chưa vào được vườn. */
export function AuthScreen() {
  const auth = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("svg-a");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const doRegister = async () => {
    setBusy(true); setError(""); setNotice("");
    const r = await auth.signUp(email, password, name, avatar);
    setBusy(false);
    if (r.error) setError(r.error);
    else if (r.needConfirm) setNotice("Đăng ký xong rồi! 💌 Supabase vừa gửi email xác nhận — bạn mở hộp thư, bấm link xác nhận rồi quay lại đăng nhập nhé.");
  };
  const doLogin = async () => {
    setBusy(true); setError(""); setNotice("");
    const r = await auth.signIn(email, password);
    setBusy(false);
    if (r.error) setError(r.error);
  };
  const doForgot = async () => {
    setBusy(true); setError(""); setNotice("");
    const r = await auth.resetPassword(email);
    setBusy(false);
    if (r.error) setError(r.error);
    else if (r.sent) setNotice("Đã gửi email khôi phục mật khẩu 💌 Bạn kiểm tra hộp thư (cả mục spam) nhé.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] flex items-center justify-center p-3 py-8">
      <div className="w-full max-w-md rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white via-pink-50 to-amber-50 p-5 shadow-2xl animate-pop">
        <div className="flex items-center justify-center gap-1">
          <ChibiAvatar variant="A" size={58} /><span className="text-3xl animate-bounceSoft">💖</span><ChibiAvatar variant="B" size={58} />
        </div>
        <h1 className="text-center font-display text-2xl font-bold text-pink-600 mt-1">Khu Vườn Tình Yêu 🌸</h1>
        <p className="text-center text-sm font-semibold text-slate-500">Mỗi người một tài khoản riêng — đăng nhập để vào khu vườn của hai bạn nhé!</p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-pink-100/70 p-1">
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setNotice(""); }} className={`rounded-full py-2 font-display font-bold transition ${tab === t ? "bg-pink-500 text-white shadow" : "text-pink-500"}`}>
              {t === "login" ? "Đăng nhập 🔑" : "Đăng ký 🌷"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className={labelCls}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" className={inputCls} autoComplete="email" /></label>
          <PasswordField label={tab === "register" ? "Mật khẩu (tạo mới)" : "Mật khẩu"} value={password} onChange={setPassword} />
          {tab === "register" && (
            <>
              <label className={labelCls}>Tên hiển thị<input value={name} onChange={(e) => setName(e.target.value)} placeholder="vd: Bé Tín, Người thương..." className={inputCls} autoComplete="nickname" /></label>
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </>
          )}
        </div>

        {error && <p className="mt-3 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 text-xs font-bold px-3 py-2 animate-pop">{error}</p>}
        {notice && <p className="mt-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-2 animate-pop">{notice}</p>}

        {tab === "login" ? (
          <>
            <button disabled={busy} onClick={doLogin} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold text-lg py-3 hover:scale-[1.02] active:scale-95 transition shadow-lg disabled:opacity-60">{busy ? "Đang đăng nhập... 💭" : "Vào khu vườn thôi! 🌱💖"}</button>
            {!showForgot ? (
              <button onClick={() => { setShowForgot(true); setError(""); setNotice(""); }} className="mt-2 w-full text-center text-xs font-bold text-violet-500 hover:underline">Quên mật khẩu? 🥺</button>
            ) : (
              <div className="mt-3 rounded-2xl bg-violet-50 border-2 border-violet-100 p-3 animate-pop">
                <p className="text-xs font-bold text-violet-600">Nhập email ở ô phía trên rồi bấm nút này, vườn sẽ gửi hướng dẫn khôi phục cho bạn 💌</p>
                <button disabled={busy} onClick={doForgot} className="mt-2 w-full rounded-full bg-violet-500 text-white font-display font-bold py-2 hover:scale-[1.02] transition disabled:opacity-60">Gửi email khôi phục 🔐</button>
              </div>
            )}
          </>
        ) : (
          <button disabled={busy} onClick={doRegister} className="mt-4 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold text-lg py-3 hover:scale-[1.02] active:scale-95 transition shadow-lg disabled:opacity-60">{busy ? "Đang tạo tài khoản... 💭" : "Tạo tài khoản của tôi 🌷"}</button>
        )}
        <ModeBadge />
      </div>
    </main>
  );
}

/** Màn hình sau khi login mà chưa có cặp: tạo vườn mới (nhận mã mời) hoặc nhập mã mời của người thương. */
export function PairScreen() {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const doCreate = async () => {
    setBusy(true); setError("");
    const r = await auth.createCouple();
    setBusy(false);
    if (r.error) setError(r.error);
    // createCouple thành công -> auth.couple được set, page sẽ chuyển vào bước đặt tên vườn.
  };
  const doJoin = async () => {
    setBusy(true); setError("");
    const r = await auth.joinCouple(code);
    setBusy(false);
    if (r.error) setError(r.error);
  };
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] flex items-center justify-center p-3 py-8">
      <div className="w-full max-w-md rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white via-pink-50 to-amber-50 p-5 shadow-2xl animate-pop">
        <div className="flex items-center gap-3">
          <ChibiAvatar avatarId={auth.user?.avatar} size={54} />
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-pink-600 leading-tight">Chào {auth.user?.displayName} 🌸</h2>
            <p className="text-xs font-semibold text-slate-500">{auth.user?.email}</p>
          </div>
          <button onClick={() => void auth.signOut()} className="rounded-full bg-pink-100 px-3 py-1.5 text-xs font-bold text-pink-600 hover:scale-105 transition">Đăng xuất</button>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600 text-center">Bạn chưa thuộc khu vườn nào. Tạo một khu vườn mới rồi gửi mã mời cho người thương, hoặc nhập mã mời của người ấy để vào vườn chung nhé 💞</p>

        <div className="mt-4 rounded-3xl bg-white/80 border-2 border-pink-100 p-4">
          <h3 className="font-display font-bold text-pink-600">🌱 Tạo khu vườn mới</h3>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Bạn sẽ là người đầu tiên (ghế A) và nhận một <b>mã mời</b> để gửi cho người thương.</p>
          <button disabled={busy} onClick={doCreate} className="mt-2.5 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold py-2.5 hover:scale-[1.02] active:scale-95 transition shadow disabled:opacity-60">{busy ? "Đang gieo hạt... 💭" : "Tạo khu vườn + nhận mã mời 🎁"}</button>
        </div>

        <div className="mt-3 rounded-3xl bg-white/80 border-2 border-violet-100 p-4">
          <h3 className="font-display font-bold text-violet-600">🔑 Nhập mã mời của người thương</h3>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Bạn sẽ vào ghế B trong khu vườn của người ấy. Mỗi vườn tối đa 2 người thôi nhé.</p>
          <div className="mt-2.5 flex gap-2">
            <input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VD: AB12CD" className={`${inputCls} uppercase text-center font-display font-bold tracking-widest`} />
            <button disabled={busy} onClick={doJoin} className="shrink-0 rounded-2xl bg-violet-500 text-white font-display font-bold px-4 hover:scale-105 active:scale-95 transition disabled:opacity-60">Vào vườn 💞</button>
          </div>
        </div>

        {error && <p className="mt-3 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 text-xs font-bold px-3 py-2 animate-pop">{error}</p>}
        <ModeBadge />
      </div>
    </main>
  );
}

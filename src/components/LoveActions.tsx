"use client";
import { useEffect, useRef, useState } from "react";
import { useLove, myName } from "@/lib/store";
import { LOVE_ACTIONS } from "@/lib/data";
import { Icon, type IconName } from "./Icon";

/** Hàng nút hành động yêu thương nhanh — bấm là người kia nhận popup realtime. */
export function LoveActions() {
  const { state, dispatch } = useLove();
  const me = myName(state);
  const [sent, setSent] = useState<string>("");
  return (
    <section className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-violet-50 border-2 border-pink-100 p-4 animate-fadeUp">
      <h2 className="font-display font-bold text-pink-600 flex items-center gap-1.5"><Icon name="heartFill" className="w-5 h-5" /> Gửi yêu thương nhanh</h2>
      <p className="text-[11px] text-slate-400">Bấm một cái là người thương nhận được ngay lập tức nè!</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {LOVE_ACTIONS.map((a) => (
          <button
            key={a.kind}
            onClick={() => { dispatch({ type: "LOVE_ACTION", kind: a.kind, emoji: a.icon, label: a.label, actor: me, user: state.currentUser }); setSent(a.kind); setTimeout(() => setSent(""), 1600); }}
            className="rounded-3xl bg-white/90 border-2 border-pink-100 py-3 font-display font-bold text-pink-600 shadow hover:scale-110 hover:-rotate-2 active:scale-90 transition"
          >
            <span className={`flex justify-center ${sent === a.kind ? "animate-wiggle" : ""}`}><Icon name={a.icon} className="w-8 h-8" /></span>
            <span className="text-xs inline-flex items-center gap-1 justify-center mt-0.5">{sent === a.kind ? <>Đã gửi! <Icon name="envelope" className="w-3.5 h-3.5" /></> : a.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Popup nổi bật hiện ở phía NGƯỜI NHẬN khi đối phương vừa gửi hành động yêu thương (realtime). */
export function LoveToast() {
  const { state } = useLove();
  const [show, setShow] = useState(false);
  const seenAt = useRef<string>("");
  const la = state.lastLoveAction;
  useEffect(() => {
    if (!la || !la.at) return;
    if (!seenAt.current) { seenAt.current = la.at; return; } // lần mount đầu: không phát lại hành động cũ
    if (la.at === seenAt.current) return;
    seenAt.current = la.at;
    if (la.by === state.currentUser) return; // chỉ hiện cho người nhận
    setShow(true);
    const t = setTimeout(() => setShow(false), 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [la?.at]);
  if (!la || !show) return null;
  const partner = la.by === "A" ? state.personA : state.personB;
  const iconName: IconName = (LOVE_ACTIONS.find((a) => a.kind === la.kind)?.icon || "heartFill") as IconName;
  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-[2rem] border-4 border-pink-300 bg-white/95 backdrop-blur px-5 py-3 shadow-[0_20px_50px_rgba(244,83,131,0.45)] animate-pop" onClick={() => setShow(false)}>
        <span className="animate-wiggle text-pink-500"><Icon name={iconName} className="w-12 h-12" /></span>
        <div>
          <p className="font-display font-bold text-pink-600 leading-tight">{partner} vừa {la.label} bạn nè!</p>
          <p className="text-xs text-slate-400 font-semibold">{new Date(la.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • Bấm để đóng</p>
        </div>
        <span className="animate-bounceSoft text-rose-500"><Icon name="heartFill" className="w-6 h-6" /></span>
      </div>
    </div>
  );
}

"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * V4 (bổ sung) — CỔNG CHẶN TRÌNH DUYỆT:
 * App CHỈ chạy khi đã cài thành webapp (PWA standalone). Mở domain bằng trình duyệt
 * thường (điện thoại hay PC) -> chỉ hiện màn hình hướng dẫn cài, không render app/login.
 * Bypass khi dev local: NEXT_PUBLIC_ALLOW_BROWSER=true trong .env.local (production không set -> chặn tuyệt đối).
 */
const ALLOW_BROWSER = process.env.NEXT_PUBLIC_ALLOW_BROWSER === "true";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return mm || ios;
}

type Platform = "android" | "ios" | "desktop" | "mobile-other";
function detectPlatform(): { platform: Platform; inApp: boolean } {
  const ua = navigator.userAgent || "";
  const inApp = /FBAN|FBAV|Zalo|Instagram|Line\//i.test(ua);
  if (/iphone|ipad|ipod/i.test(ua)) return { platform: "ios", inApp };
  if (/android/i.test(ua)) return { platform: "android", inApp };
  if (/mobile/i.test(ua)) return { platform: "mobile-other", inApp };
  return { platform: "desktop", inApp };
}

function Step({ n, icon, children }: { n: number; icon: IconName; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-pink-500 text-white font-display font-bold text-sm grid place-items-center shadow">{n}</span>
      <span className="shrink-0 mt-0.5 text-pink-500"><Icon name={icon} className="w-6 h-6" /></span>
      <span className="text-sm font-semibold text-slate-600 leading-relaxed">{children}</span>
    </li>
  );
}

export default function AppGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [inApp, setInApp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [qr, setQr] = useState("");
  const [origin, setOrigin] = useState("");
  const deferred = useRef<BIPEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  const recheck = useCallback(() => {
    if (ALLOW_BROWSER || isStandalone()) setStatus("allowed");
    else setStatus("blocked");
  }, []);

  /* Đăng ký Service Worker (cần cho điều kiện cài PWA) — chạy ở mọi chế độ hiển thị */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    const d = detectPlatform();
    setPlatform(d.platform); setInApp(d.inApp);
    recheck();
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => recheck();
    mq.addEventListener?.("change", onChange);
    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as BIPEvent; setCanPrompt(true); };
    const onInstalled = () => { setInstalled(true); setCanPrompt(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { mq.removeEventListener?.("change", onChange); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [recheck]);

  /* QR của chính domain hiện tại — chỉ sinh khi bị chặn trên PC */
  useEffect(() => {
    if (status !== "blocked" || platform !== "desktop" || !origin) return;
    let cancelled = false;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(origin, { width: 232, margin: 1, color: { dark: "#9d174d", light: "#ffffff" } }))
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, platform, origin]);

  const doInstall = async () => {
    const p = deferred.current;
    if (!p) return;
    await p.prompt();
    const choice = await p.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    deferred.current = null; setCanPrompt(false);
  };

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] flex items-center justify-center p-4">
        <div className="text-center animate-pop">
          <p className="animate-bounceSoft flex justify-center text-emerald-500"><Icon name="sprout" className="w-16 h-16" /></p>
          <p className="mt-2 font-display font-bold text-pink-500 flex items-center justify-center gap-1.5">Đang mở cửa khu vườn... <Icon name="heartFill" className="w-5 h-5 text-rose-500" /></p>
        </div>
      </main>
    );
  }
  if (status === "allowed") return <>{children}</>;

  /* ---------- Màn hình hướng dẫn cài webapp (không render app/login) ---------- */
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] flex items-center justify-center p-3 py-8">
      <div className="w-full max-w-md rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white via-pink-50 to-amber-50 p-5 shadow-2xl animate-pop">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="Khu Vườn Tình Yêu" className="w-20 h-20 rounded-[1.4rem] shadow-lg animate-float" />
        </div>
        <h1 className="text-center font-display text-2xl font-bold text-pink-600 mt-3 leading-tight">Cài Khu Vườn Tình Yêu về máy</h1>
        <p className="text-center text-sm font-semibold text-slate-500 mt-1">
          Khu vườn chỉ mở trong <b>webapp đã cài</b> trên điện thoại — mở bằng trình duyệt thường sẽ không vào được app. Cài một lần, sau này bấm icon ngoài màn hình chính là vào thẳng vườn của hai bạn.
        </p>

        {inApp && (
          <p className="mt-3 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-700 text-xs font-bold px-3 py-2 flex items-start gap-2">
            <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
            Bạn đang mở link trong trình duyệt của Zalo/Facebook — trình duyệt này không cài được webapp. Hãy bấm nút chia sẻ / menu của ứng dụng và chọn mở bằng <b>Chrome</b> (Android) hoặc <b>Safari</b> (iPhone), rồi cài theo hướng dẫn bên dưới.
          </p>
        )}

        {installed ? (
          <div className="mt-4 rounded-3xl bg-emerald-50 border-2 border-emerald-200 p-4 text-center animate-pop">
            <p className="flex justify-center text-emerald-500"><Icon name="check" className="w-10 h-10" /></p>
            <p className="font-display font-bold text-emerald-700 mt-1">Đã cài xong rồi!</p>
            <p className="text-sm font-semibold text-emerald-600">Thoát ra màn hình chính và bấm icon <b>Khu Vườn Tình Yêu</b> để vào vườn nhé.</p>
          </div>
        ) : platform === "desktop" ? (
          <div className="mt-4 rounded-3xl bg-white/80 border-2 border-pink-100 p-4 text-center">
            <p className="font-display font-bold text-pink-600 flex items-center justify-center gap-1.5"><Icon name="mobile" className="w-5 h-5" /> App chỉ dùng trên điện thoại</p>
            <p className="text-sm font-semibold text-slate-500 mt-1">Dùng điện thoại quét mã QR này để mở đúng địa chỉ, rồi cài webapp theo hướng dẫn hiện trên điện thoại:</p>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Mã QR mở Khu Vườn Tình Yêu trên điện thoại" className="mx-auto mt-3 w-[232px] h-[232px] rounded-2xl border-2 border-pink-100" />
            ) : (
              <p className="mt-3 text-xs font-bold text-slate-400">Đang tạo mã QR...</p>
            )}
            <p className="mt-3 font-display font-bold text-pink-600 break-all">{origin.replace(/^https?:\/\//, "")}</p>
            <p className="text-[11px] font-semibold text-slate-400">Hoặc gõ đúng địa chỉ trên vào Chrome/Safari của điện thoại.</p>
          </div>
        ) : platform === "ios" ? (
          <div className="mt-4 rounded-3xl bg-white/80 border-2 border-pink-100 p-4">
            <p className="font-display font-bold text-pink-600">Cài trên iPhone (Safari):</p>
            <ol className="mt-3 space-y-3">
              <Step n={1} icon="share">Bấm nút <b>Chia sẻ</b> ở thanh dưới cùng của Safari (ô vuông có mũi tên hướng lên).</Step>
              <Step n={2} icon="plus">Cuộn xuống và chọn <b>“Thêm vào Màn hình chính”</b>.</Step>
              <Step n={3} icon="check">Bấm <b>“Thêm”</b> ở góc phải trên — icon Khu Vườn Tình Yêu sẽ xuất hiện ngoài màn hình chính.</Step>
              <Step n={4} icon="sprout">Mở app từ icon đó là vào thẳng khu vườn.</Step>
            </ol>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl bg-white/80 border-2 border-pink-100 p-4">
            <p className="font-display font-bold text-pink-600">Cài trên điện thoại Android (Chrome):</p>
            {canPrompt && (
              <button onClick={doInstall} className="mt-3 w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold text-lg py-3 hover:scale-[1.02] active:scale-95 transition shadow-lg flex items-center justify-center gap-2">
                <Icon name="download" className="w-5 h-5" /> Cài app ngay
              </button>
            )}
            <ol className="mt-3 space-y-3">
              <Step n={1} icon="moreVertical">Bấm menu <b>3 chấm</b> ở góc phải trên của Chrome.</Step>
              <Step n={2} icon="download">Chọn <b>“Cài đặt ứng dụng”</b> hoặc <b>“Thêm vào màn hình chính”</b>.</Step>
              <Step n={3} icon="check">Bấm <b>“Cài đặt”</b> để xác nhận — icon app sẽ xuất hiện ngoài màn hình chính.</Step>
              <Step n={4} icon="sprout">Mở app từ icon đó là vào thẳng khu vườn.</Step>
            </ol>
            {platform === "mobile-other" && <p className="mt-3 text-[11px] font-bold text-slate-400">Nếu không thấy mục cài đặt, hãy mở lại link này bằng Chrome (Android) hoặc Safari (iPhone) rồi làm theo các bước trên.</p>}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
          <Icon name="lock" className="w-3.5 h-3.5" /> Vì sao phải cài? Để khu vườn là không gian riêng của hai bạn, mở nhanh như app thật và không lẫn với các tab trình duyệt.
        </p>
      </div>
    </main>
  );
}

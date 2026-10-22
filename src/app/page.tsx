"use client";
import { useState } from "react";
import Header from "@/components/Header";
import TreeGame from "@/components/TreeGame";
import Memories from "@/components/Memories";
import Onboarding from "@/components/Onboarding";
import { LoveActions, LoveToast } from "@/components/LoveActions";
import { ActivityFeed, BucketList, DailyQuestion, DateIdea, LoveNotes, MoodPicker } from "@/components/Widgets";
import { AuthScreen, PairScreen } from "@/components/AuthScreens";
import { useLove } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Icon, type IconName } from "@/components/Icon";
const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Trang chủ", icon: "home" }, { id: "tree", label: "Cây tình yêu", icon: "tree" }, { id: "notes", label: "Ghi chú", icon: "note" }, { id: "bucket", label: "Bucket List", icon: "target" }, { id: "question", label: "Câu hỏi", icon: "chat" }, { id: "memories", label: "Kỷ niệm", icon: "camera" },
];
type Tab = "home" | "tree" | "notes" | "bucket" | "question" | "memories";

/** Mưa cánh hoa nền rất nhẹ ở trang chủ (CSS thuần, pointer-events-none) */
const PETALS = [
  { left: "4%", delay: "0s", size: "text-lg", dur: "13s" }, { left: "16%", delay: "3.5s", size: "text-sm", dur: "16s" },
  { left: "30%", delay: "7s", size: "text-xl", dur: "12s" }, { left: "47%", delay: "1.8s", size: "text-sm", dur: "15s" },
  { left: "62%", delay: "5.2s", size: "text-lg", dur: "14s" }, { left: "76%", delay: "8.6s", size: "text-sm", dur: "17s" },
  { left: "88%", delay: "2.6s", size: "text-lg", dur: "13s" }, { left: "95%", delay: "10s", size: "text-xs", dur: "16s" },
];
function PetalRain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {PETALS.map((p, i) => (
        <span key={i} className={`absolute top-0 animate-petal opacity-0 text-pink-300 ${p.size}`} style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur }}><Icon name="petal" className="w-5 h-5" /></span>
      ))}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const { state } = useLove();
  const auth = useAuth();
  const pendingCount = state.letters.filter((l) => !l.opened).length;

  /* ---- V3: cổng tài khoản — chưa login / chưa ghép cặp thì chưa vào được vườn ---- */
  if (!auth.ready) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] flex items-center justify-center p-4">
        <div className="text-center animate-pop">
          <p className="animate-bounceSoft flex justify-center text-emerald-500"><Icon name="sprout" className="w-16 h-16" /></p>
          <p className="mt-2 font-display font-bold text-pink-500 flex items-center justify-center gap-1.5">Đang mở cửa khu vườn... <Icon name="heartFill" className="w-5 h-5 text-rose-500" /></p>
        </div>
      </main>
    );
  }
  if (!auth.user) return <AuthScreen />;
  if (!auth.couple) return <PairScreen />;

  return (
    <main className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] pb-24 sm:pb-8">
      {tab === "home" && <PetalRain />}
      <Onboarding />
      <LoveToast />
      <div className="relative z-10 mx-auto max-w-3xl px-3 sm:px-4 py-4 space-y-4">
        <Header />
        <nav className="hidden sm:flex gap-2 justify-center flex-wrap">
          {TABS.map((t) => (<button key={t.id} onClick={() => setTab(t.id as Tab)} className={`relative rounded-full px-4 py-2 font-display font-bold transition-all duration-300 inline-flex items-center gap-1.5 ${tab === t.id ? "bg-pink-500 text-white shadow-lg scale-105" : "bg-white/80 text-pink-500 border-2 border-pink-100 hover:scale-105"}`}><Icon name={t.icon} className="w-4 h-4" />{t.label}{t.id === "tree" && pendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] rounded-full w-5 h-5 grid place-items-center animate-bounceSoft">{pendingCount}</span>}</button>))}
        </nav>
        {tab === "home" && (<div key="home" className="space-y-4 animate-fadeUp"><TreeGame /><LoveActions /><div className="grid sm:grid-cols-2 gap-4"><MoodPicker /><DateIdea /></div><ActivityFeed /></div>)}
        {tab === "tree" && (<div key="tree" className="space-y-4 animate-fadeUp"><TreeGame /><LoveActions /><ActivityFeed /></div>)}
        {tab === "notes" && (<div key="notes" className="animate-fadeUp"><LoveNotes /></div>)}
        {tab === "bucket" && (<div key="bucket" className="animate-fadeUp"><BucketList /></div>)}
        {tab === "question" && (<div key="question" className="space-y-4 animate-fadeUp"><DailyQuestion /><MoodPicker /></div>)}
        {tab === "memories" && (<div key="memories" className="animate-fadeUp"><Memories /></div>)}
        <footer className="text-center text-xs text-slate-400 pt-2 flex items-center justify-center gap-1 flex-wrap">Làm bằng <Icon name="heartFill" className="w-3.5 h-3.5 text-rose-400" /> cho hai người — mỗi người một tài khoản, ghép cặp bằng mã mời để chơi realtime cùng nhau • Có thể “Thêm vào màn hình chính” như một app <Icon name="mobile" className="w-3.5 h-3.5" /></footer>
      </div>
      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t-2 border-pink-100 flex justify-around py-2">
        {TABS.map((t) => (<button key={t.id} onClick={() => setTab(t.id as Tab)} className={`relative flex flex-col items-center text-[9px] font-bold px-1.5 py-1 rounded-2xl transition ${tab === t.id ? "text-pink-600 bg-pink-50 scale-105" : "text-slate-400"}`}><Icon name={t.icon} className="w-6 h-6" />{t.label}{t.id === "tree" && pendingCount > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center">{pendingCount}</span>}</button>))}
      </nav>
    </main>
  );
}

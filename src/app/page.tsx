"use client";
import { useState } from "react";
import Header from "@/components/Header";
import TreeGame from "@/components/TreeGame";
import { ActivityFeed, BucketList, DailyQuestion, DateIdea, LoveNotes, MoodPicker } from "@/components/Widgets";
import { useLove } from "@/lib/store";
const TABS = [
  { id: "home", label: "🏠 Trang chủ" }, { id: "tree", label: "🌳 Cây tình yêu" }, { id: "notes", label: "📌 Ghi chú" }, { id: "bucket", label: "🎯 Bucket List" }, { id: "question", label: "💬 Câu hỏi" },
] as const;
type Tab = (typeof TABS)[number]["id"];
export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const { state } = useLove();
  const pendingCount = state.letters.filter((l) => !l.opened).length;
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ffe4ec_0%,#fff9f0_45%,#ecfdf5_100%)] pb-24 sm:pb-8">
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 space-y-4">
        <Header />
        <nav className="hidden sm:flex gap-2 justify-center flex-wrap">
          {TABS.map((t) => (<button key={t.id} onClick={() => setTab(t.id)} className={`relative rounded-full px-4 py-2 font-display font-bold transition ${tab === t.id ? "bg-pink-500 text-white shadow-lg scale-105" : "bg-white/80 text-pink-500 border-2 border-pink-100 hover:scale-105"}`}>{t.label}{t.id === "tree" && pendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] rounded-full w-5 h-5 grid place-items-center animate-bounceSoft">{pendingCount}</span>}</button>))}
        </nav>
        {tab === "home" && (<div className="space-y-4 animate-pop"><TreeGame /><div className="grid sm:grid-cols-2 gap-4"><MoodPicker /><DateIdea /></div><ActivityFeed /></div>)}
        {tab === "tree" && (<div className="space-y-4 animate-pop"><TreeGame /><ActivityFeed /></div>)}
        {tab === "notes" && (<div className="animate-pop"><LoveNotes /></div>)}
        {tab === "bucket" && (<div className="animate-pop"><BucketList /></div>)}
        {tab === "question" && (<div className="space-y-4 animate-pop"><DailyQuestion /><MoodPicker /></div>)}
        <footer className="text-center text-xs text-slate-400 pt-2">Làm bằng 💖 cho hai người — mở 2 tab cùng phòng để chơi realtime cùng nhau</footer>
      </div>
      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-t-2 border-pink-100 flex justify-around py-2">
        {TABS.map((t) => (<button key={t.id} onClick={() => setTab(t.id)} className={`relative flex flex-col items-center text-[10px] font-bold px-2 py-1 rounded-2xl ${tab === t.id ? "text-pink-600 bg-pink-50" : "text-slate-400"}`}><span className="text-xl">{t.label.split(" ")[0]}</span>{t.label.split(" ").slice(1).join(" ")}{t.id === "tree" && pendingCount > 0 && <span className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] rounded-full w-4 h-4 grid place-items-center">{pendingCount}</span>}</button>))}
      </nav>
    </main>
  );
}

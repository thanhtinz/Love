"use client";
import { useState } from "react";
import { useLove, myName } from "@/lib/store";
import { today, uid } from "@/lib/types";

function MemoryImage({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) return <div className="w-full h-36 rounded-3xl bg-gradient-to-br from-pink-100 via-amber-50 to-violet-100 grid place-items-center text-5xl">🌸</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={title} onError={() => setErr(true)} className="w-full h-44 object-cover rounded-3xl border-2 border-pink-50" loading="lazy" />;
}

export default function Memories() {
  const { state, dispatch } = useLove();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const sorted = [...state.memories].sort((a, b) => (a.date < b.date ? 1 : -1));
  const add = () => {
    if (!title.trim()) return;
    dispatch({ type: "ADD_MEMORY", memory: { id: uid(), title: title.trim(), date: date || today(), desc: desc.trim(), imageUrl: imageUrl.trim(), author: myName(state), createdAt: new Date().toISOString() } });
    setTitle(""); setDesc(""); setImageUrl(""); setDate(today());
  };
  return (
    <section className="space-y-4 animate-fadeUp">
      <div className="rounded-3xl bg-white/70 backdrop-blur border-2 border-pink-100 p-4">
        <h2 className="font-display font-bold text-pink-600">📸 Thêm kỷ niệm mới</h2>
        <div className="mt-3 grid gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề kỷ niệm... (vd: Lần đầu nắm tay 🥹)" className="w-full rounded-2xl border-2 border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-300 bg-white" />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-500">Ngày kỷ niệm<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none bg-white" /></label>
            <label className="text-xs font-bold text-slate-500">URL ảnh (tuỳ chọn)<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full rounded-2xl border-2 border-pink-100 px-3 py-2 text-sm outline-none bg-white" /></label>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kể lại một chút về khoảnh khắc này..." rows={2} className="w-full rounded-2xl border-2 border-pink-100 px-3 py-2.5 text-sm outline-none focus:border-pink-300 bg-white resize-none" />
          <button onClick={add} className="rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-display font-bold py-2.5 hover:scale-[1.02] active:scale-95 transition">Lưu kỷ niệm 💖</button>
        </div>
      </div>

      {sorted.length === 0 && <p className="text-center text-slate-400 py-6">Chưa có kỷ niệm nào — lưu khoảnh khắc đầu tiên đi nè 🥺</p>}
      <div className="relative pl-8">
        <div className="absolute left-[13px] top-1 bottom-1 w-1 rounded-full bg-gradient-to-b from-pink-300 via-rose-200 to-violet-300" aria-hidden />
        <div className="space-y-4">
          {sorted.map((m) => (
            <article key={m.id} className="relative animate-fadeUp">
              <span className="absolute -left-8 top-5 w-7 h-7 grid place-items-center rounded-full bg-white border-2 border-pink-300 text-sm shadow">💗</span>
              <div className="rounded-3xl bg-white/80 backdrop-blur border-2 border-pink-50 p-3 shadow-[0_8px_24px_rgba(244,83,131,0.10)] hover:scale-[1.01] transition">
                <MemoryImage url={m.imageUrl} title={m.title} />
                <div className="flex items-start justify-between gap-2 mt-2.5 px-1">
                  <div>
                    <h3 className="font-display font-bold text-slate-700 leading-tight">{m.title}</h3>
                    <p className="text-[11px] font-bold text-pink-500">📅 {new Date(m.date + "T00:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })} • bởi {m.author}</p>
                  </div>
                  <button onClick={() => dispatch({ type: "DEL_MEMORY", id: m.id })} title="Xoá kỷ niệm" className="hover:scale-125 transition">🗑️</button>
                </div>
                {m.desc && <p className="text-sm font-semibold text-slate-600 px-1 pb-1">{m.desc}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

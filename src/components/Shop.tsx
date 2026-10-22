"use client";
import { useLove, myName } from "@/lib/store";
import { SHOP_ITEMS } from "@/lib/data";
import type { ShopCategory } from "@/lib/types";
import { Icon } from "./Icon";

const CATS: { id: ShopCategory; label: string; icon: "pot" | "rainbow" | "ribbon" }[] = [
  { id: "pot", label: "Chậu cây", icon: "pot" },
  { id: "scene", label: "Nền cảnh vườn", icon: "rainbow" },
  { id: "accessory", label: "Phụ kiện", icon: "ribbon" },
];

export default function Shop() {
  const { state, dispatch } = useLove();
  const me = myName(state);
  return (
    <section className="rounded-3xl bg-white/70 backdrop-blur border-2 border-emerald-100 p-4 animate-fadeUp">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-emerald-600 flex items-center gap-1.5"><Icon name="bag" className="w-5 h-5" /> Cửa hàng trang trí vườn</h3>
        <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-sm font-display font-bold animate-pop inline-flex items-center gap-1" key={state.coins}><Icon name="coin" className="w-4 h-4" /> {state.coins} Xu Tim</span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Kiếm Xu Tim bằng cách chăm cây (+4~6), nhận nhiệm vụ ngày (+20), mở thư tình (+10/25/50). Mua xong là trang bị luôn, người thương thấy realtime nè!</p>
      <div className="mt-3 space-y-4">
        {CATS.map((cat) => (
          <div key={cat.id}>
            <p className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1"><Icon name={cat.icon} className="w-4 h-4 text-emerald-500" /> {cat.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {SHOP_ITEMS.filter((i) => i.category === cat.id).map((item) => {
                const owned = state.inventory.includes(item.id);
                const equipped = state.equipped[cat.id] === item.id;
                const afford = state.coins >= item.price;
                return (
                  <div key={item.id} className={`rounded-3xl border-2 p-3 transition hover:scale-[1.02] ${equipped ? "border-emerald-300 bg-emerald-50/80 shadow-[0_6px_20px_rgba(52,211,153,0.25)]" : "border-pink-50 bg-white/80"}`}>
                    <div className="flex items-start justify-between">
                      <span className="text-pink-500"><Icon name={item.icon} className="w-8 h-8" /></span>
                      {item.category === "pot" && <span className={`w-10 h-6 rounded-b-xl rounded-t-sm bg-gradient-to-br ${item.visual} border border-black/5`} />}
                      {item.category === "scene" && item.visual && <span className={`w-10 h-6 rounded-lg bg-gradient-to-br ${item.visual} border border-black/5`} />}
                    </div>
                    <p className="mt-1.5 font-display font-bold text-sm text-slate-700 leading-tight">{item.name}</p>
                    <p className="text-[11px] text-slate-400 leading-snug min-h-[26px]">{item.desc}</p>
                    {equipped ? (
                      <span className="mt-1 rounded-full bg-emerald-400 text-white text-[11px] font-bold px-3 py-1.5 inline-flex items-center gap-1">Đang dùng <Icon name="check" className="w-3.5 h-3.5" /></span>
                    ) : owned ? (
                      <button onClick={() => dispatch({ type: "EQUIP_ITEM", category: cat.id, itemId: item.id })} className="mt-1 rounded-full bg-pink-500 text-white text-[11px] font-bold px-3 py-1.5 hover:scale-105 transition">Trang bị</button>
                    ) : (
                      <button disabled={!afford} onClick={() => dispatch({ type: "BUY_ITEM", itemId: item.id, actor: me })} className={`mt-1 rounded-full text-[11px] font-bold px-3 py-1.5 transition inline-flex items-center gap-1 ${afford ? "bg-amber-400 text-white hover:scale-105 animate-bounceSoft" : "bg-slate-100 text-slate-400"}`}>
                        Mua · <Icon name="coin" className="w-3.5 h-3.5" /> {item.price}{afford ? "" : " (chưa đủ Xu)"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

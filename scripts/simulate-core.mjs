/**
 * Smoke mô phỏng cho bản rebuild — chạy: npm run simulate.
 * 1) Chăm đều 2 người trong 7 ngày -> cây phải trưởng thành (giai đoạn 6, có matureAt).
 * 2) Bỏ bê với chỉ số thấp 25 giờ -> gần như không lớn (héo = hệ số 0).
 * 3) Cây yếu lớn chậm hơn cây khỏe trên cùng một cửa sổ.
 * 4) Vắng 30 ngày -> số liệu vẫn hữu hạn, không NaN.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const TR = require("./.build/tree.js");

const H = 3600000;
let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const iso = (ms) => new Date(ms).toISOString();
const T0 = Date.now() - 8 * 24 * H;

/* 1) Chăm đều: mỗi 6 giờ, luân phiên 2 người x 4 hành động (cooldown 60s không cản vì cách 6h) */
{
  let tree = TR.createTree(T0);
  const kinds = ["water", "sun", "love", "bug"];
  let slot = "A";
  for (let t = T0; t < T0 + 7 * 24 * H; t += 6 * H) {
    tree = TR.materializeTree(tree, t);
    // Cooldown 60s là cho MỌI hành động chăm của một người — mô phỏng người dùng
    // thật: 4 hành động cách nhau 61 giây trong cùng một lần ghé.
    kinds.forEach((kind, i) => {
      const at = t + i * 61000;
      const cs = TR.careStatus(tree, kind, slot, at);
      if (cs.ok) tree = TR.applyCare(tree, kind, slot, at);
    });
    slot = slot === "A" ? "B" : "A";
  }
  const end = TR.materializeTree(tree, T0 + 7 * 24 * H);
  const info = TR.stageInfo(end, T0 + 7 * 24 * H);
  check("SIM1 chăm đều 7 ngày -> trưởng thành (giai đoạn 6)", info.index === 6 && info.mature, `stage=${info.index}, care=${end.careCount}, matureAt=${end.matureAt ? "có" : "thiếu"}`);
  check("SIM1b có matureAt sau khi nở trọn", Boolean(end.matureAt));
}

/* 2) Bỏ bê héo: chỉ số 15 từ đầu -> 25 giờ gần như không lớn */
{
  const start = TR.normalizeTree({
    plantedAt: iso(T0), growthAt: iso(T0), statsAt: iso(T0), growthRecordedMs: 0,
    water: 15, sun: 15, love: 15, totalBoostMs: 0, careCount: 0,
    lastCareAt: "", lastCareBySlot: "", lastCareAtBy: { A: "", B: "" }, announcedStage: 0, matureAt: "",
  });
  const end = TR.materializeTree(start, T0 + 25 * H);
  check("SIM2 cây héo 25 giờ -> tăng trưởng ~0", end.growthRecordedMs < 5 * 60000, `growth=${(end.growthRecordedMs / 60000).toFixed(1)} phút`);
}

/* 3) Yếu chậm hơn khỏe trên cùng cửa sổ 4 giờ */
{
  const mk = (w) => TR.normalizeTree({
    plantedAt: iso(T0), growthAt: iso(T0), statsAt: iso(T0), growthRecordedMs: 0,
    water: w, sun: 100, love: 100, totalBoostMs: 0, careCount: 0,
    lastCareAt: "", lastCareBySlot: "", lastCareAtBy: { A: "", B: "" }, announcedStage: 0, matureAt: "",
  });
  const healthy = TR.materializeTree(mk(100), T0 + 4 * H);
  const weak = TR.materializeTree(mk(30), T0 + 4 * H);
  check("SIM3 cây yếu lớn ~một nửa cây khỏe sau 4 giờ", weak.growthRecordedMs < healthy.growthRecordedMs * 0.7 && weak.growthRecordedMs > healthy.growthRecordedMs * 0.3,
    `healthy=${(healthy.growthRecordedMs / H).toFixed(2)}h weak=${(weak.growthRecordedMs / H).toFixed(2)}h`);
}

/* 4) Vắng 30 ngày */
{
  const freshTree = TR.createTree(T0);
  const end = TR.materializeTree(freshTree, T0 + 30 * 24 * H);
  check("SIM4 vắng 30 ngày: hữu hạn, không NaN, chỉ số chạm 0", isFinite(end.growthRecordedMs) && isFinite(end.water) && end.water === 0 && end.sun === 0 && end.love === 0);
}

if (failures > 0) { console.log(`CÓ ${failures} MÔ PHỎNG FAIL`); process.exit(1); }
console.log("Mô phỏng: TẤT CẢ PASS");

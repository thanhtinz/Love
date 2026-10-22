/**
 * Giả lập tăng trưởng thời gian thật của plants.ts (chạy bằng Node thuần).
 * Cách chạy:  npm run simulate
 * Script biên dịch src/lib/plants.ts + types.ts ra scripts/.build (CommonJS) rồi kiểm tra:
 *  1) Hướng Dương được chăm khỏe liên tục +25 giờ -> phải ở giai đoạn index 2.
 *  2) Hướng Dương héo (chỉ số < 20) +25 giờ -> tăng trưởng gần như 0, vẫn giai đoạn 0.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createPlant, fruitPending, materializePlant, stageInfo, stageStarts, speciesById, totalGrowthMs } = require("./.build/plants.js");

const H = 3600000;
const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

/* --- Kịch bản 1: khỏe, chăm đều mỗi giờ trong 25 giờ --- */
const sp = speciesById("sunflower");
console.log(`Loài: ${sp.name} | mốc bắt đầu các giai đoạn (giờ): ${stageStarts(sp).map((ms) => ms / H).join(", ")}`);
let p = createPlant("sunflower", t0);
for (let h = 1; h <= 25; h++) {
  p = materializePlant(p, t0 + h * H);
  p = { ...p, water: 100, sun: 100, love: 100 }; // giả lập được chăm nên chỉ số luôn khỏe
}
const info1 = stageInfo(p, t0 + 25 * H);
console.log(`Sau 25h khỏe: tăng trưởng tích lũy = ${(info1.growthMs / H).toFixed(2)}h | giai đoạn index ${info1.index} "${info1.stage.name}"`);
check("Hướng Dương +25h khỏe: tăng trưởng ~25h", Math.abs(info1.growthMs - 25 * H) < 5 * 60000, `growth=${(info1.growthMs / H).toFixed(2)}h`);
check("Hướng Dương +25h khỏe: đúng giai đoạn index 2", info1.index === 2, `stage="${info1.stage.name}"`);

/* --- Kịch bản 2: héo ngay từ đầu, để 25 giờ không chăm --- */
let w = createPlant("sunflower", t0);
w = { ...w, water: 10, sun: 10, love: 10 };
const w2 = materializePlant(w, t0 + 25 * H);
const info2 = stageInfo(w2, t0 + 25 * H);
console.log(`Sau 25h héo: tăng trưởng tích lũy = ${(info2.growthMs / 60000).toFixed(1)} phút | giai đoạn index ${info2.index} "${info2.stage.name}"`);
check("Hướng Dương héo +25h: tăng trưởng gần 0", info2.growthMs < 60000, `growth=${(info2.growthMs / 60000).toFixed(1)} phút`);
check("Hướng Dương héo +25h: vẫn giai đoạn 0", info2.index === 0, `stage="${info2.stage.name}"`);

/* --- Kịch bản 3: yếu (chỉ số ~30) -> tốc độ một nửa --- */
let y = createPlant("sunflower", t0);
y = { ...y, water: 31, sun: 31, love: 31, statsAt: new Date(t0).toISOString() };
const y2 = materializePlant(y, t0 + 2 * H);
const g3 = y2.growthRecordedMs;
console.log(`Yếu (31) trong 2h đầu: tăng trưởng = ${(g3 / H).toFixed(2)}h (kỳ vọng ~1h vì hao dần rồi x0.5/x0)`);
check("Cây yếu lớn chậm hơn cây khỏe", g3 < 1.6 * H, `growth=${(g3 / H).toFixed(2)}h`);

/* --- Kịch bản 4: vắng mặt 30 NGÀY không chăm (biên dài hạn) --- */
{
  let p30 = createPlant("sunflower", t0);
  p30 = { ...p30, water: 100, sun: 100, love: 100 };
  const m = materializePlant(p30, t0 + 30 * 24 * H);
  const inf = stageInfo(m, t0 + 30 * 24 * H);
  console.log(`Vắng 30 ngày: tăng trưởng = ${(inf.growthMs / H).toFixed(1)}h | giai đoạn ${inf.index} | chỉ số ${m.water}/${m.sun}/${m.love}`);
  check("Vắng 30 ngày: số liệu hữu hạn, chỉ số chạm 0, tăng trưởng đóng băng khi héo", Number.isFinite(inf.growthMs) && m.water === 0 && m.sun === 0 && m.love === 0 && inf.growthMs > 15 * H && inf.growthMs < 40 * H, `growth=${(inf.growthMs / H).toFixed(1)}h`);
  check("Vắng 30 ngày: KHÔNG trưởng thành oan (héo thì đứng yên)", !inf.mature && inf.index < 4);
}

/* --- Kịch bản 5: chăm khỏe liên tục -> nhảy NHIỀU giai đoạn + trưởng thành --- */
{
  let lp = createPlant("love-tree", t0);
  for (let h = 1; h <= 200; h++) {
    lp = materializePlant(lp, t0 + h * H);
    lp = { ...lp, water: 100, sun: 100, love: 100 };
  }
  const inf = stageInfo(lp, t0 + 200 * H);
  console.log(`Cây Tình Yêu chăm khỏe 200h: tăng trưởng = ${(inf.growthMs / H).toFixed(1)}h (tổng cần ${totalGrowthMs(speciesById("love-tree")) / H}h) | giai đoạn ${inf.index} | mature=${inf.mature}`);
  check("Chăm khỏe 200h: trưởng thành, ở giai đoạn cuối, có matureAt", inf.mature && inf.index === 6 && Boolean(lp.matureAt));
}

/* --- Kịch bản 6: Dâu Tây — quả chín sau trưởng thành 12h, héo vẫn chờ thu --- */
{
  let sb = createPlant("strawberry", t0);
  for (let h = 1; h <= 120; h++) {
    sb = materializePlant(sb, t0 + h * H);
    sb = { ...sb, water: 100, sun: 100, love: 100 };
  }
  const matureAtMs = new Date(sb.matureAt).getTime();
  check("Dâu: trưởng thành sau ~96h chăm khỏe", Boolean(sb.matureAt) && Math.abs(matureAtMs - (t0 + 96 * H)) < 2 * H, `matureAt sau ${((matureAtMs - t0) / H).toFixed(1)}h`);
  check("Dâu: quả CHƯA chín ở +11h sau trưởng thành", fruitPending(sb, matureAtMs + 11 * H) === false);
  check("Dâu: quả chín ở +12h sau trưởng thành", fruitPending(sb, matureAtMs + 12 * H) === true);
  const wilted = materializePlant({ ...sb, water: 0, sun: 0, love: 0, statsAt: new Date(matureAtMs).toISOString(), growthAt: new Date(matureAtMs).toISOString() }, matureAtMs + 13 * H);
  check("Dâu: dù héo, quả đã chín vẫn chờ thu (fruitReadyAt không bị trễ bởi sức khỏe)", fruitPending(wilted, matureAtMs + 13 * H) === true);
}

/* --- Kịch bản 7: đồng hồ máy chạy lùi (2 máy lệch giờ) — không tính trùng tăng trưởng --- */
{
  let p7 = createPlant("sunflower", t0);
  p7 = { ...p7, water: 100, sun: 100, love: 100 };
  const fwd = materializePlant(p7, t0 + 10 * H);
  const back = materializePlant(fwd, t0 + 5 * H); // máy khác có đồng hồ chậm hơn 5h
  check("Đồng hồ lùi: growthAt KHÔNG bị kéo lùi", back.growthAt === fwd.growthAt, `growthAt=${back.growthAt} vs ${fwd.growthAt}`);
  check("Đồng hồ lùi: tăng trưởng không đổi", back.growthRecordedMs === fwd.growthRecordedMs);
  const again = materializePlant(back, t0 + 12 * H);
  check("Sau khi đồng hồ quay lại: chỉ tính thêm đúng 2h (không tính trùng đoạn 5-10h)", Math.abs(again.growthRecordedMs - 12 * H) < 5 * 60000, `growth=${(again.growthRecordedMs / H).toFixed(2)}h`);
}

console.log(failures === 0 ? "\nTẤT CẢ KỊCH BẢN ĐẠT" : `\nCÓ ${failures} KỊCH BẢN CHƯA ĐẠT`);
process.exit(failures === 0 ? 0 : 1);

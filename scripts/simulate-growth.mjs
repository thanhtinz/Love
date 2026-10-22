/**
 * Giả lập tăng trưởng thời gian thật của plants.ts (chạy bằng Node thuần).
 * Cách chạy:  npm run simulate
 * Script biên dịch src/lib/plants.ts + types.ts ra scripts/.build (CommonJS) rồi kiểm tra:
 *  1) Hướng Dương được chăm khỏe liên tục +25 giờ -> phải ở giai đoạn index 2.
 *  2) Hướng Dương héo (chỉ số < 20) +25 giờ -> tăng trưởng gần như 0, vẫn giai đoạn 0.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createPlant, materializePlant, stageInfo, stageStarts, speciesById } = require("./.build/plants.js");

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

console.log(failures === 0 ? "\nTẤT CẢ KỊCH BẢN ĐẠT" : `\nCÓ ${failures} KỊCH BẢN CHƯA ĐẠT`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Test logic vòng 2: migration state cũ, khóa cứng ở reducer, merge 2 máy, ngày địa phương.
 * Cách chạy: npm run test-logic (biên dịch lib ra scripts/.build rồi chạy với TZ=Asia/Saigon).
 * Mỗi nhóm test ghi rõ bug nó bảo vệ — test phải FAIL trên code trước khi sửa.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const T = require("./.build/types.js");
const P = require("./.build/plants.js");
const D = require("./.build/data.js");
const R = require("./.build/reducer.js");
const M = require("./.build/merge.js");
const TM = require("./.build/time.js");

const H = 3600000;
let failures = 0;
let count = 0;
const check = (label, ok, detail) => {
  count++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const iso = (ms) => new Date(ms).toISOString();
const NOW = Date.now();
const todayStr = T.today();

/* ================= 1) MIGRATION FIXTURES ================= */
console.log("\n--- Migration: state thời web (V4, cây đơn, daily chung, emoji) ---");
const webEra = {
  roomCode: "ABC123", personA: "An", personB: "Bình", startDate: "2024-02-14", currentUser: "A",
  tree: { xp: 300, water: 55, sun: 66, love: 77, careCount: 40, lastCareAt: "2025-12-20T10:00:00.000Z", lastCareBy: "A", statsAt: "2025-12-20T10:00:00.000Z" },
  moods: { A: "\u{1F60A}", B: "\u{1F970}", date: "2025-12-20" },
  notes: [{ id: "n1", author: "An", text: "Ghi chú thời web", color: "bg-pink-100", createdAt: "2025-12-19T09:00:00.000Z" }],
  bucket: [{ id: "bk1", text: "Đi Đà Lạt", done: false, createdAt: "2025-12-19T09:00:00.000Z" }],
  answers: { date: "2025-12-20", A: "Đáp án web", B: "" },
  activities: [{ id: "a1", actor: "An", text: "vừa tưới cây", emoji: "sprout", time: "2025-12-20T10:00:00.000Z" }],
  letters: [
    { id: "L1", messageId: 3, rarity: "common", source: "web", opened: true, droppedAt: "2025-12-18T10:00:00.000Z", openedAt: "2025-12-18T11:00:00.000Z", openedBy: "Bình" },
    { id: "L2", messageId: 20, rarity: "rare", source: "web", opened: false, droppedAt: "2025-12-19T10:00:00.000Z", openedAt: "", openedBy: "" },
  ],
  daily: { date: "2025-12-20", water: 5, love: 3, sun: 2, bug: 1, caredA: true, caredB: false, claimed: ["water3"] },
  streak: { count: 2, lastDate: "2025-12-19" },
  achievements: ["first"],
  coins: 123,
  inventory: ["pot-basic", "scene-auto", "acc-none"],
  equipped: { pot: "pot-basic", scene: "scene-auto", accessory: "acc-none" },
  memories: [{ id: "m1", title: "Kỷ niệm web", date: "2025-01-01", desc: "d", imageUrl: "", author: "An", createdAt: "2025-12-19T09:00:00.000Z" }],
  lastLoveAction: { kind: "hug", emoji: "hug", label: "gửi ôm", by: "A", actor: "An", at: "2025-12-20T09:00:00.000Z" },
  onboarded: true, everOnboarded: true, gardenName: "Vườn web", avatarA: "svg-a", avatarB: "svg-b",
};
const w = P.normalizeStateV5(webEra);
check("web: cây đơn -> plants[0] loài love-tree", w.plants.length === 1 && w.plants[0].speciesId === "love-tree");
check("web: giữ nguyên giai đoạn (xp 300 -> giai đoạn 5)", P.stageInfo(w.plants[0], NOW).index === 5, `index=${P.stageInfo(w.plants[0], NOW).index}`);
check("web: giữ thư + trạng thái đã mở", w.letters.length === 2 && w.letters.find((l) => l.id === "L1").opened === true && w.letters[0].id === "L2");
check("web: giữ coins 123", w.coins === 123);
check("web: daily chung -> gán cho người đã chăm (A), claimed vào cả hai", w.daily.A.water === 5 && w.daily.B.water === 0 && w.daily.claimedA.includes("water3") && w.daily.claimedB.includes("water3"));
check("web: mood emoji -> id chuẩn", w.moods.A === "joy" && w.moods.B === "love");
check("web: activity emoji -> icon", w.activities[0].icon === "sprout");
check("web: có đủ trường mobile (games/loveNotes)", Boolean(w.games && w.games.spin && w.loveNotes));
check("web: giữ memories + bucket + streak", w.memories.length === 1 && w.bucket.length === 1 && w.streak.count === 2);

console.log("\n--- Migration: mobile v1 (plants có sẵn, daily vẫn shape chung) ---");
const plantRaw = (id, speciesId) => ({ id, speciesId, plantedAt: iso(NOW - 5 * H), growthAt: iso(NOW), statsAt: iso(NOW), growthRecordedMs: 2 * H, totalBoostMs: 0, water: 70, sun: 70, love: 70, careCount: 4, lastCareAt: "", lastCareBy: "", announcedStage: 1, matureAt: "", fruitReadyAt: "", harvestCount: 0 });
const v1 = P.normalizeStateV5({
  plants: [plantRaw("p1", "love-tree"), plantRaw("p2", "sunflower")],
  selectedPlantId: "p2",
  games: T.defaultGames,
  daily: { date: todayStr, water: 2, love: 1, sun: 0, bug: 0, caredA: false, caredB: true, claimed: [] },
  coins: 88,
});
check("v1: giữ nguyên 2 cây + cây đang chọn", v1.plants.length === 2 && v1.selectedPlantId === "p2");
check("v1: daily chung -> gán cho B (người đã chăm)", v1.daily.B.love === 1 && v1.daily.A.love === 0);

console.log("\n--- Migration: rỗng / hỏng / thu hết cây ---");
const empty = P.normalizeStateV5({});
check("rỗng {}: state hợp lệ, 1 cây mới, coins khởi điểm", empty.plants.length === 1 && empty.coins === T.START_COINS && empty.letters.length === 0);
let corruptOk = true; let corrupt;
try {
  corrupt = P.normalizeStateV5({ coins: NaN, letters: "oops", notes: 42, tree: { xp: NaN, water: "x" }, plants: [{ id: "x" }], games: "no" });
  P.normalizeStateV5(null); P.normalizeStateV5("chuỗi"); P.normalizeStateV5([1, 2]);
} catch { corruptOk = false; }
check("hỏng: không throw với mọi input lạ", corruptOk);
check("hỏng: coins NaN -> khởi điểm; coins âm -> 0; coins lẻ -> làm tròn", corrupt.coins === T.START_COINS && P.normalizeStateV5({ coins: -30 }).coins === 0 && P.normalizeStateV5({ coins: 99.7 }).coins === 99);
check("hỏng: letters sai kiểu -> [], plants được chuẩn hoá số hữu hạn", Array.isArray(corrupt.letters) && corrupt.plants.length === 1 && Number.isFinite(corrupt.plants[0].growthRecordedMs) && Number.isFinite(corrupt.plants[0].water));
const collectedAll = P.normalizeStateV5({
  plants: [], games: T.defaultGames, updatedAt: iso(NOW),
  tree: { xp: 500, water: 10, sun: 10, love: 10, careCount: 50, lastCareAt: iso(NOW), lastCareBy: "A", statsAt: iso(NOW) },
  treeCollection: [{ id: "c1", speciesId: "sunflower", plantedAt: iso(NOW - 100 * H), maturedAt: iso(NOW - 50 * H), collectedAt: iso(NOW - H), careCount: 30 }],
});
check("thu hết cây: plants RỖNG được tôn trọng (không hồi sinh cây legacy)", collectedAll.plants.length === 0 && collectedAll.selectedPlantId === "" && collectedAll.treeCollection.length === 1);
const webEmptyPlants = P.normalizeStateV5({ plants: [], tree: { xp: 500, water: 10, sun: 10, love: 10, careCount: 50, lastCareAt: iso(NOW), lastCareBy: "A", statsAt: iso(NOW) } });
check("đối chứng: plants [] KHÔNG dấu mobile + tree có tiến độ -> vẫn migration cây legacy", webEmptyPlants.plants.length === 1);

/* ================= 2) REDUCER — khóa cứng tầng store ================= */
console.log("\n--- Reducer: chăm cây (cooldown + chỉ số đầy) ---");
const base = () => P.normalizeStateV5({});
{
  const s0 = base();
  const pid = s0.plants[0].id;
  const a1 = R.gardenReducer(s0, { type: "TREE_ACTION", kind: "water", actor: "An", user: "A", plantId: pid });
  check("chăm lần 1: +Xu, +tiến độ nhiệm vụ của A", a1.coins === s0.coins + 5 && a1.daily.A.water === 1 && a1.plants[0].careCount === 1);
  const a2 = R.gardenReducer(a1, { type: "TREE_ACTION", kind: "water", actor: "An", user: "A", plantId: pid });
  check("chăm lần 2 ngay (cooldown 60s): bị chặn ở store", a2 === a1);
  const b1 = R.gardenReducer(a1, { type: "TREE_ACTION", kind: "water", actor: "Bình", user: "B", plantId: pid });
  check("người kia chăm cùng cây: được (cooldown theo người)", b1 !== a1 && b1.plants[0].careCount === 2 && b1.daily.B.water === 1);
  const full = P.normalizeStateV5({ plants: [{ ...plantRaw("pf", "love-tree"), water: 99, sun: 60 }] });
  const f1 = R.gardenReducer(full, { type: "TREE_ACTION", kind: "water", actor: "An", user: "A", plantId: "pf" });
  check("chỉ số đã đầy (>=95): chăm vô hiệu ở store", f1 === full);
  const f2 = R.gardenReducer(full, { type: "TREE_ACTION", kind: "sun", actor: "An", user: "A", plantId: "pf" });
  check("chỉ số khác chưa đầy: chăm được", f2 !== full);
}

console.log("\n--- Reducer: nhiệm vụ ngày (kiểm tiến độ + thưởng từ bảng, idempotent) ---");
{
  const mkDaily = (waterA) => P.normalizeStateV5({
    daily: { date: todayStr, A: { water: waterA, love: 0, sun: 0, bug: 0 }, B: { water: 0, love: 0, sun: 0, bug: 0 }, caredA: waterA > 0, caredB: false, claimedA: [], claimedB: [] },
  });
  const sLow = mkDaily(2);
  const rLow = R.gardenReducer(sLow, { type: "CLAIM_QUEST", questId: "water3", actor: "An", user: "A", rewardXp: 9999 });
  check("chưa đủ tiến độ (2/3): store từ chối dù UI/truyền rewardXp 9999", rLow === sLow);
  const sOk = mkDaily(3);
  const rOk = R.gardenReducer(sOk, { type: "CLAIM_QUEST", questId: "water3", actor: "An", user: "A", rewardXp: 9999 });
  check("đủ tiến độ: thưởng đúng bảng (15 XP, 20 Xu) — không theo số truyền lên", rOk.tree.xp === sOk.tree.xp + 15 && rOk.coins === sOk.coins + 20);
  const rAgain = R.gardenReducer(rOk, { type: "CLAIM_QUEST", questId: "water3", actor: "An", user: "A", rewardXp: 15 });
  check("nhận lần 2 (kể cả sau reload state): no-op", rAgain === rOk);
  const rBad = R.gardenReducer(sOk, { type: "CLAIM_QUEST", questId: "khong-ton-tai", actor: "An", user: "A", rewardXp: 15 });
  check("questId lạ: no-op", rBad === sOk);
  const sBoth = P.normalizeStateV5({ daily: { date: todayStr, A: { water: 0, love: 0, sun: 0, bug: 0 }, B: { water: 0, love: 0, sun: 0, bug: 0 }, caredA: true, caredB: false, claimedA: [], claimedB: [] } });
  check("nhiệm vụ song chăm: mới 1 người chăm -> chưa nhận được", R.gardenReducer(sBoth, { type: "CLAIM_QUEST", questId: "both", actor: "An", user: "A", rewardXp: 20 }) === sBoth);
}

console.log("\n--- Reducer: shop / ví / XP ---");
{
  const s = P.normalizeStateV5({ coins: 500, inventory: ["pot-basic", "scene-auto", "acc-none", "pot-gold"] });
  check("equip sai LOẠI (chậu vào ô khung cảnh): store chặn", R.gardenReducer(s, { type: "EQUIP_ITEM", category: "scene", itemId: "pot-gold" }) === s);
  const eq = R.gardenReducer(s, { type: "EQUIP_ITEM", category: "pot", itemId: "pot-gold" });
  check("equip đúng loại + đã sở hữu: được", eq !== s && eq.equipped.pot === "pot-gold");
  check("equip món chưa sở hữu: chặn", R.gardenReducer(s, { type: "EQUIP_ITEM", category: "pot", itemId: "pot-pink" }) === s);
  check("ADD_COINS NaN: bỏ qua", R.gardenReducer(s, { type: "ADD_COINS", coins: NaN, actor: "x", text: "t" }) === s);
  check("ADD_COINS âm quá đà: ví không âm", R.gardenReducer(s, { type: "ADD_COINS", coins: -99999, actor: "x", text: "t" }).coins === 0);
  check("ADD_XP NaN: bỏ qua", R.gardenReducer(s, { type: "ADD_XP", xp: NaN }) === s);
  const poor = P.normalizeStateV5({ coins: 10 });
  check("mua khi không đủ Xu: chặn", R.gardenReducer(poor, { type: "BUY_ITEM", itemId: "pot-gold", actor: "An" }) === poor);
}

console.log("\n--- Reducer: lên giai đoạn nhảy bậc / quiz / vòng quay / niêm phong ---");
{
  const nowIso = iso(NOW);
  const s = P.normalizeStateV5({ plants: [{ id: "sp1", speciesId: "love-tree", plantedAt: nowIso, growthAt: nowIso, statsAt: nowIso, growthRecordedMs: 54 * H, totalBoostMs: 0, water: 80, sun: 80, love: 80, careCount: 3, lastCareAt: "", lastCareBy: "", announcedStage: 0, matureAt: "", fruitReadyAt: "", harvestCount: 0 }] });
  const up = R.gardenReducer(s, { type: "STAGE_UP", plantId: "sp1" });
  check("nhảy 3 giai đoạn một lúc: XP cộng đủ 3 x stageXp (60)", up.tree.xp === s.tree.xp + 60, `xp=${up.tree.xp}`);
  check("STAGE_UP lần 2 cho cùng mốc: no-op", R.gardenReducer(up, { type: "STAGE_UP", plantId: "sp1" }) === up);

  const q0 = base();
  const q1 = R.gardenReducer(q0, { type: "QUIZ_ANSWER", user: "A", answers: [0, 1, 0, 1], actor: "An" });
  check("quiz: nộp lần 1 được", q1.games.quiz.A.join() === "0,1,0,1");
  check("quiz: nộp đè đáp án đã niêm phong -> chặn", R.gardenReducer(q1, { type: "QUIZ_ANSWER", user: "A", answers: [1, 1, 1, 1], actor: "An" }) === q1);
  check("quiz: đáp án sai định dạng (có số 2 / thiếu câu) -> chặn", R.gardenReducer(q0, { type: "QUIZ_ANSWER", user: "A", answers: [0, 1, 2, 0], actor: "An" }) === q0 && R.gardenReducer(q0, { type: "QUIZ_ANSWER", user: "A", answers: [0, 1], actor: "An" }) === q0);
  check("quiz: phần của B độc lập với A", R.gardenReducer(q1, { type: "QUIZ_ANSWER", user: "B", answers: [1, 1, 0, 0], actor: "Bình" }).games.quiz.B.join() === "1,1,0,0");

  let sp = base();
  for (let i = 0; i < 3; i++) sp = R.gardenReducer(sp, { type: "SPIN_USE", user: "A" });
  check("vòng quay: 3 lượt/người/ngày, lượt 4 bị chặn ở store", sp.games.spin.A === 3 && R.gardenReducer(sp, { type: "SPIN_USE", user: "A" }) === sp);
  check("vòng quay: lượt của B không bị A dùng hết", R.gardenReducer(sp, { type: "SPIN_USE", user: "B" }).games.spin.B === 1);
}

console.log("\n--- Reducer: đáp án/mood qua ngày + bucket chống spam + thư + thu hoạch ---");
{
  const s = P.normalizeStateV5({ answers: { date: "2020-01-01", A: "cũ của A", B: "cũ của B" }, moods: { date: "2020-01-01", A: "joy", B: "love" } });
  const a1 = R.gardenReducer(s, { type: "ANSWER", user: "A", text: "mới của A" });
  check("sang ngày: đáp án A mới được, đáp án B hôm qua KHÔNG mang sang", a1.answers.A === "mới của A" && a1.answers.B === "" && a1.answers.date === todayStr);
  check("đáp án đã niêm phong: ghi đè bị chặn", R.gardenReducer(a1, { type: "ANSWER", user: "A", text: "sửa lại" }) === a1);
  const m1 = R.gardenReducer(s, { type: "SET_MOOD", user: "A", mood: "calm" });
  check("sang ngày: mood A mới được, mood B hôm qua không mang sang", m1.moods.A === "calm" && m1.moods.B === "");

  const b0 = base();
  const item = (id, text) => ({ id, text, done: false, createdAt: iso(NOW), authorSlot: "A" });
  const b1 = R.gardenReducer(b0, { type: "ADD_BUCKET", item: item("x1", "Việc một") });
  check("bucket: thêm lần 1 được", b1.bucket.some((x) => x.id === "x1"));
  check("bucket: thêm ngay lần 2 (<5s, chống spam): chặn", R.gardenReducer(b1, { type: "ADD_BUCKET", item: item("x2", "Việc hai") }) === b1);
  const b3 = R.gardenReducer(b1, { type: "ADD_BUCKET", item: item("x3", "Nhiệm vụ vòng quay"), force: true });
  check("bucket: nhiệm vụ hệ thống (force) không bị cổng 5s nuốt mất", b3.bucket.some((x) => x.id === "x3"));

  const l0 = P.normalizeStateV5({ letters: [{ id: "L1", messageId: 1, rarity: "common", source: "test", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" }] });
  const l1 = R.gardenReducer(l0, { type: "OPEN_LETTER", id: "L1", opener: "An" });
  check("mở thư: +10 Xu lần đầu", l1.coins === l0.coins + 10 && l1.letters[0].opened === true);
  check("mở thư lần 2: không cộng trùng", R.gardenReducer(l1, { type: "OPEN_LETTER", id: "L1", opener: "An" }) === l1);
  const dup = R.gardenReducer(l0, { type: "ADD_LETTER", letter: l0.letters[0], actor: "An", text: "t" });
  check("thêm thư trùng id (sự kiện 2 máy): chặn trùng", dup === l0);

  const berry = P.normalizeStateV5({ plants: [{ id: "d1", speciesId: "strawberry", plantedAt: iso(NOW - 200 * H), growthAt: iso(NOW), statsAt: iso(NOW), growthRecordedMs: 96 * H, totalBoostMs: 0, water: 70, sun: 70, love: 70, careCount: 9, lastCareAt: "", lastCareBy: "", announcedStage: 5, matureAt: iso(NOW - 13 * H), fruitReadyAt: iso(NOW - H), harvestCount: 0 }] });
  const h1 = R.gardenReducer(berry, { type: "HARVEST_FRUIT", plantId: "d1", actor: "An" });
  check("thu hoạch dâu chín: +25 Xu, đếm 1 lần thu, hẹn quả sau", h1.coins === berry.coins + 25 && h1.plants[0].harvestCount === 1 && new Date(h1.plants[0].fruitReadyAt).getTime() > NOW);
  check("thu hoạch lần 2 ngay: no-op (quả chưa chín lại)", R.gardenReducer(h1, { type: "HARVEST_FRUIT", plantId: "d1", actor: "An" }) === h1);
}

/* ================= 3) MERGE 2 MÁY ================= */
console.log("\n--- Merge: mục theo người (chủ nhân slot thắng) ---");
{
  const mkBase = (over) => ({ ...P.normalizeStateV5({}), ...over });
  const local = mkBase({
    currentUser: "A", updatedAt: "2026-01-01T10:00:00.000Z",
    moods: { date: todayStr, A: "joy", B: "" },
    secTs: { "moods:A": { t: "2026-01-01T09:00:00.000Z", by: "A" }, "moods:B": { t: "2026-01-01T08:00:00.000Z", by: "B" } },
  });
  const remote = mkBase({
    currentUser: "B", updatedAt: "2026-01-01T10:05:00.000Z",
    moods: { date: todayStr, A: "", B: "calm" },
    secTs: { "moods:A": { t: "2026-01-01T10:04:00.000Z", by: "B" }, "moods:B": { t: "2026-01-01T10:04:00.000Z", by: "B" } },
  });
  const mg = M.mergeStates(local, remote, "A");
  check("mood của A: bản do A sửa thắng bản reset của máy B (dù stamp cũ hơn)", mg.moods.A === "joy");
  check("mood của B: lấy bản mới của B", mg.moods.B === "calm");
  check("merge: currentUser giữ của máy mình, updatedAt lấy max", mg.currentUser === "A" && mg.updatedAt === "2026-01-01T10:05:00.000Z");
}
{
  const dp = (water, love) => ({ water, love, sun: 0, bug: 0 });
  const local = { ...P.normalizeStateV5({}), daily: { date: todayStr, A: dp(2, 0), B: dp(0, 0), caredA: true, caredB: false, claimedA: ["water3"], claimedB: [] } };
  const remote = { ...P.normalizeStateV5({}), daily: { date: todayStr, A: dp(1, 0), B: dp(3, 1), caredA: true, caredB: true, claimedA: [], claimedB: ["love2"] } };
  const mg = M.mergeStates(local, remote, "A");
  check("daily: tiến độ lấy max từng người, claimed hợp nhất", mg.daily.A.water === 2 && mg.daily.B.water === 3 && mg.daily.claimedA.includes("water3") && mg.daily.claimedB.includes("love2") && mg.daily.caredB === true);
}
{
  const letter = (id, opened, messageId) => ({ id, messageId, rarity: "common", source: "test", opened, droppedAt: iso(NOW - H), openedAt: opened ? iso(NOW) : "", openedBy: opened ? "An" : "" });
  const local = { ...P.normalizeStateV5({}), letters: [letter("stageup-p1-2", false, 5), letter("Lx", false, 1)] };
  const remote = { ...P.normalizeStateV5({}), letters: [letter("stageup-p1-2", false, 9), letter("Lx", true, 1), letter("Ly", false, 2)] };
  const mg = M.mergeStates(local, remote, "A");
  check("thư: union theo id, thư lên giai đoạn id xác định chỉ còn 1 bản", mg.letters.filter((l) => l.id === "stageup-p1-2").length === 1 && mg.letters.length === 3);
  check("thư: bản đã mở thắng bản chưa mở", mg.letters.find((l) => l.id === "Lx").opened === true);
}
{
  const plantV = (over) => ({ id: "p1", speciesId: "love-tree", plantedAt: iso(NOW - 30 * H), growthRecordedMs: 10 * H, growthAt: iso(NOW - H), totalBoostMs: 0, water: 50, sun: 50, love: 50, statsAt: iso(NOW - H), careCount: 4, lastCareAt: iso(NOW - 5 * H), lastCareBy: "B", lastCareAtBy: { A: "", B: iso(NOW - 5 * H) }, announcedStage: 1, matureAt: "", fruitReadyAt: "", harvestCount: 0, ...over });
  const local = { ...P.normalizeStateV5({}), plants: [plantV({ growthRecordedMs: 10 * H, growthAt: iso(NOW - H), totalBoostMs: 30 * 60000, careCount: 5, lastCareAt: iso(NOW - 30 * 60000), lastCareBy: "A" })], selectedPlantId: "p1" };
  const remote = { ...P.normalizeStateV5({}), plants: [plantV({ growthRecordedMs: 10.2 * H, growthAt: iso(NOW), statsAt: iso(NOW), water: 40 })], selectedPlantId: "p1" };
  const mg = M.mergeStates(local, remote, "A");
  check("cây: lần chăm máy kia chưa có được cộng bù boost (+30p)", Math.abs(mg.plants[0].growthRecordedMs - (10.2 * H + 30 * 60000)) < 1000, `growth=${(mg.plants[0].growthRecordedMs / H).toFixed(2)}h`);
  check("cây: careCount lấy max, lastCareAt lấy lần mới hơn", mg.plants[0].careCount === 5 && mg.plants[0].lastCareBy === "A");
}
{
  const invBase = ["pot-basic", "scene-auto", "acc-none"];
  const c1 = M.mergeStates({ ...P.normalizeStateV5({}), inventory: [...invBase, "pot-gold"], coins: 20 }, { ...P.normalizeStateV5({}), inventory: invBase, coins: 200 }, "A");
  check("ví: một phía mua đồ -> lấy số dư của phía đã mua (không hoàn tiền oan)", c1.coins === 20 && c1.inventory.includes("pot-gold"));
  const c2 = M.mergeStates({ ...P.normalizeStateV5({}), inventory: [...invBase, "pot-gold"], coins: 20 }, { ...P.normalizeStateV5({}), inventory: [...invBase, "scene-night"], coins: 100 }, "A");
  check("ví: hai phía mua 2 món khác nhau -> lấy số nhỏ hơn (không tạo tiền), kho hợp nhất", c2.coins === 20 && c2.inventory.includes("pot-gold") && c2.inventory.includes("scene-night"));
  const c3 = M.mergeStates({ ...P.normalizeStateV5({}), inventory: invBase, coins: 300 }, { ...P.normalizeStateV5({}), inventory: invBase, coins: 250 }, "A");
  check("ví: không ai mua gì -> lấy số lớn hơn (phía đã ghi nhận thu nhập)", c3.coins === 300);
}
{
  // Qua reducer: MERGE_STATE phải áp dụng được mood của người kia mà không đè mood của mình
  const mine = { ...P.normalizeStateV5({}), currentUser: "A", moods: { date: todayStr, A: "joy", B: "" } };
  const theirs = { ...P.normalizeStateV5({}), currentUser: "B", moods: { date: todayStr, A: "", B: "calm" } };
  const out = R.gardenReducer(mine, { type: "MERGE_STATE", state: theirs, mySlot: "A" });
  check("reducer MERGE_STATE: nhận mood của B, giữ mood của A", out.moods.B === "calm" && out.moods.A === "joy");
}

/* ================= 4) NGÀY ĐỊA PHƯƠNG & GIỜ SERVER ================= */
console.log("\n--- Thời gian: ngày địa phương / tuần / offset server ---");
{
  const dawn = new Date(2026, 0, 1, 5, 0, 0); // 5h sáng giờ VN = 22h UTC hôm trước
  check("localDayNumber dùng ngày địa phương, không phải UTC", T.localDayNumber(dawn) === Math.floor(Date.UTC(2026, 0, 1) / 86400000) && T.localDayNumber(dawn) !== Math.floor(dawn.getTime() / 86400000));
  check("questionOfDay lúc 5h sáng = câu của ngày địa phương", D.questionOfDay(dawn) === D.QUESTIONS[T.localDayNumber(dawn) % D.QUESTIONS.length]);
  const morning = D.quizOfDay(new Date(2026, 0, 1, 5, 0, 0));
  const night = D.quizOfDay(new Date(2026, 0, 1, 23, 0, 0));
  check("quizOfDay nhất quán trong cùng ngày địa phương", JSON.stringify(morning) === JSON.stringify(night));
  check("weekKey: Chủ nhật và thứ Hai kề nhau thuộc 2 tuần khác nhau", T.weekKey(new Date(2026, 0, 4)) === "2026-W01" && T.weekKey(new Date(2026, 0, 5)) === "2026-W02", `${T.weekKey(new Date(2026, 0, 4))} / ${T.weekKey(new Date(2026, 0, 5))}`);
  TM.setServerOffsetMs(5000);
  check("offset giờ server: nowMs lệch đúng offset đã đặt", Math.abs(TM.nowMs() - Date.now() - 5000) < 60);
  TM.setServerOffsetMs(0);
}

/* ================= 5) GAME_WIN + BỘ SƯU TẬP THƯ BỀN VỮNG ================= */
console.log("\n--- GAME_WIN: thưởng ngày khóa cứng ở store ---");
{
  const s0 = base();
  const w1 = R.gardenReducer(s0, { type: "GAME_WIN", game: "memory", user: "A", actor: "An" });
  check("memory thắng lần 1: +20 Xu, +10 XP vườn, đếm 1", w1.coins === s0.coins + 20 && w1.tree.xp === s0.tree.xp + 10 && w1.games.dailyWins.memory.A === 1);
  check("memory thắng lần 2 cùng ngày: no-op (cap 1 lần/ngày)", R.gardenReducer(w1, { type: "GAME_WIN", game: "memory", user: "A", actor: "An" }) === w1);
  const wB = R.gardenReducer(w1, { type: "GAME_WIN", game: "memory", user: "B", actor: "Bình" });
  check("memory: phần của B độc lập với A", wB !== w1 && wB.games.dailyWins.memory.B === 1 && wB.coins === w1.coins + 20);
  const d1 = R.gardenReducer(s0, { type: "GAME_WIN", game: "dice", user: "A", actor: "An" });
  check("dice thắng lần 1: +15 Xu, +10 XP", d1.coins === s0.coins + 15 && d1.tree.xp === s0.tree.xp + 10 && d1.games.dailyWins.dice.A === 1);
  check("dice lần 2 cùng ngày: no-op", R.gardenReducer(d1, { type: "GAME_WIN", game: "dice", user: "A", actor: "An" }) === d1);
  const stale = { ...s0, games: { ...s0.games, dailyWins: { date: "2020-01-01", memory: { A: 1, B: 1 }, dice: { A: 1, B: 1 } } } };
  const wStale = R.gardenReducer(stale, { type: "GAME_WIN", game: "memory", user: "A", actor: "An" });
  check("dailyWins ngày cũ: rollover reset, thắng lại được", wStale !== stale && wStale.games.dailyWins.date === todayStr && wStale.games.dailyWins.memory.A === 1);
  const gw = (dw) => ({ ...base(), games: { ...base().games, dailyWins: dw } });
  const mgw = M.mergeStates(gw({ date: todayStr, memory: { A: 1, B: 0 }, dice: { A: 0, B: 0 } }), gw({ date: todayStr, memory: { A: 0, B: 0 }, dice: { A: 0, B: 1 } }), "A");
  check("merge dailyWins cùng ngày: max từng game/người", mgw.games.dailyWins.memory.A === 1 && mgw.games.dailyWins.dice.B === 1 && mgw.games.dailyWins.memory.B === 0);
  const mgw2 = M.mergeStates(gw({ date: "2020-01-01", memory: { A: 1, B: 1 }, dice: { A: 1, B: 1 } }), gw({ date: todayStr, memory: { A: 0, B: 0 }, dice: { A: 0, B: 1 } }), "A");
  check("merge dailyWins khác ngày: phía ngày mới hơn thắng", mgw2.games.dailyWins.date === todayStr && mgw2.games.dailyWins.memory.A === 0 && mgw2.games.dailyWins.dice.B === 1);
}

console.log("\n--- Bộ sưu tập thư: bền vững khi xoay vòng + messageId chuỗi ---");
{
  const letter = (id, messageId, opened = false) => ({ id, messageId, rarity: "common", source: "test", opened, droppedAt: iso(NOW), openedAt: "", openedBy: "" });
  const s1 = P.normalizeStateV5({ letters: [letter("c1", 5), letter("c2", 7)] });
  check("normalize: letterCollection = id các thư hiện có", s1.letterCollection.includes(5) && s1.letterCollection.includes(7));
  const rotated = P.normalizeStateV5({ ...s1, letters: [letter("c3", 9)] });
  check("thư bị xoay vòng khỏi hộp thư: collection VẪN giữ id cũ + thêm id mới", rotated.letters.length === 1 && rotated.letterCollection.includes(5) && rotated.letterCollection.includes(7) && rotated.letterCollection.includes(9));
  const strId = P.normalizeStateV5({ letters: [letter("s1", "12")] });
  check("messageId dạng chuỗi: ép về số trong thư và collection", strId.letters[0].messageId === 12 && strId.letterCollection.includes(12));
  const stored = P.normalizeStateV5({ letterCollection: [3, "4"], letters: [] });
  check("letterCollection đã lưu được giữ lại (kể cả phần tử chuỗi)", stored.letterCollection.includes(3) && stored.letterCollection.includes(4));
  const o1 = R.gardenReducer(s1, { type: "OPEN_LETTER", id: "c1", opener: "An" });
  check("OPEN_LETTER: id thư nằm trong collection sau khi mở", o1.letterCollection.includes(5) && o1.letterCollection.includes(7));
  const a1 = R.gardenReducer(s1, { type: "ADD_LETTER", letter: letter("c9", 21), actor: "An", text: "t" });
  check("ADD_LETTER: id thư mới được ghi vào collection", a1.letterCollection.includes(21));
  const mgA = P.normalizeStateV5({ letterCollection: [5], letters: [letter("m1", 5)] });
  const mgB = P.normalizeStateV5({ letterCollection: [8], letters: [letter("m2", "8")] });
  const mgc = M.mergeStates(mgA, mgB, "A");
  check("merge: collection hợp nhất 2 phía + id thư của cả hai (kể cả chuỗi)", mgc.letterCollection.includes(5) && mgc.letterCollection.includes(8) && mgc.letters.length === 2);
}

/* ================= 6) VÒNG RÀ SOÁT A–J (2026-10-23) ================= */
console.log("\n--- Ngày chặt: parseDateKey loại ngày không tồn tại ---");
{
  check("parseDateKey: 2024-02-29 (năm nhuận) hợp lệ", T.parseDateKey("2024-02-29") !== null);
  check("parseDateKey: 2025-02-31 bị loại (JS Date tự lăn sang 03-03)", T.parseDateKey("2025-02-31") === null);
  check("parseDateKey: 2025-13-01 / chữ / rỗng bị loại", T.parseDateKey("2025-13-01") === null && T.parseDateKey("abc") === null && T.parseDateKey("") === null && T.parseDateKey(null) === null);
  const s = base();
  check("SETUP_GARDEN với ngày 2025-02-31: store bỏ qua ngày, giữ ngày cũ", R.gardenReducer(s, { type: "SETUP_GARDEN", gardenName: "Vườn", startDate: "2025-02-31" }).startDate === s.startDate);
  check("SETUP_GARDEN ngày hợp lệ: được nhận", R.gardenReducer(s, { type: "SETUP_GARDEN", gardenName: "Vườn", startDate: "2024-02-14" }).startDate === "2024-02-14");
  check("SET_START ngày không tồn tại: no-op", R.gardenReducer(s, { type: "SET_START", date: "2025-02-31" }) === s);
}

console.log("\n--- Normalize fuzz: định danh/ngày/thư/nội dung hỏng ---");
{
  const fz = P.normalizeStateV5({
    currentUser: "X", personA: 42, personB: null, startDate: "2025-02-31",
    letters: [
      { id: 7, messageId: "x", rarity: "siêu hiếm", source: 9, opened: "yes", droppedAt: 5, openedAt: null, openedBy: {}, openedBySlot: "C" },
      { id: "ok2", messageId: 4, rarity: "rare", source: "s", opened: true, droppedAt: "2026-01-02T00:00:00.000Z", openedAt: "", openedBy: "An", openedBySlot: "B" },
      { id: "ok1", messageId: 3, rarity: "common", source: "s", opened: false, droppedAt: "2026-01-03T00:00:00.000Z", openedAt: "", openedBy: "" },
    ],
    notes: [{ id: "n1", author: 5, text: 99, color: null, createdAt: 7 }],
    bucket: [{ id: "b1", text: false, done: "yes", createdAt: null }],
    memories: [{ id: "m1", title: 3, date: 4, desc: null, imageUrl: 9, author: [], createdAt: null }],
    frameRewards: { date: "2026-01-01", claimed: ["days", "hack", 7, "mood"] },
  });
  check("fuzz: currentUser lạ -> 'A'; tên không phải chuỗi -> mặc định", fz.currentUser === "A" && typeof fz.personA === "string" && typeof fz.personB === "string");
  check("fuzz: startDate không tồn tại -> mặc định (hôm nay)", fz.startDate === todayStr);
  check("fuzz: thư được làm sạch từng trường (id chuỗi, rarity whitelist, opened boolean, slot hợp lệ)", fz.letters.every((l) => typeof l.id === "string" && ["common", "rare", "legendary"].includes(l.rarity) && typeof l.opened === "boolean") && fz.letters.find((l) => l.id === "ok2").openedBySlot === "B");
  check("fuzz: thư sắp xếp mới nhất trước theo droppedAt", fz.letters[0].id === "ok1" && fz.letters[1].id === "ok2");
  check("fuzz: notes/bucket/memories có trường lạ -> ép về chuỗi/boolean an toàn", typeof fz.notes[0].text === "string" && fz.bucket[0].done === false && typeof fz.memories[0].title === "string");
  check("fuzz: frameRewards.claimed chỉ giữ loại khung hợp lệ", JSON.stringify(fz.frameRewards.claimed) === JSON.stringify(["days", "mood"]));
}

console.log("\n--- Tombstone: xoá là xoá hẳn, không hồi sinh qua merge ---");
{
  const note = { id: "tn1", author: "An", authorSlot: "A", text: "ghi chú sẽ xoá", color: "#fff", createdAt: iso(NOW) };
  const buck = { id: "tb1", text: "việc sẽ xoá", done: false, createdAt: iso(NOW), authorSlot: "A" };
  const memo = { id: "tm1", title: "kỷ niệm sẽ xoá", date: "2025-01-01", desc: "", imageUrl: "", author: "An", authorSlot: "A", createdAt: iso(NOW) };
  const withAll = { ...base(), notes: [note], bucket: [buck], memories: [memo] };
  const delN = R.gardenReducer(withAll, { type: "DEL_NOTE", id: "tn1" });
  check("DEL_NOTE: mất khỏi danh sách + có tombstone", delN.notes.length === 0 && delN.deletedIds.notes.includes("tn1"));
  const stale = { ...base(), notes: [note], bucket: [buck], memories: [memo] };
  const mgN = M.mergeStates(delN, stale, "A");
  check("merge với bản cũ còn giữ ghi chú: ghi chú ĐÃ XOÁ không hồi sinh", mgN.notes.length === 0 && mgN.deletedIds.notes.includes("tn1"));
  const delB = R.gardenReducer(withAll, { type: "DEL_BUCKET", id: "tb1" });
  check("merge bucket: mục đã xoá không hồi sinh", M.mergeStates(delB, stale, "A").bucket.length === 0);
  const delM = R.gardenReducer(withAll, { type: "DEL_MEMORY", id: "tm1" });
  check("merge memories: kỷ niệm đã xoá không hồi sinh", M.mergeStates(delM, stale, "A").memories.length === 0);
  const zombie = P.normalizeStateV5({ notes: [note], deletedIds: { notes: ["tn1"], bucket: [], memories: [] }, games: T.defaultGames });
  check("normalize: state chứa cả mục lẫn tombstone của nó -> mục bị loại", zombie.notes.length === 0);
  const reAdd = R.gardenReducer(delN, { type: "ADD_NOTE", note });
  check("ADD_NOTE với id đã có tombstone: bị chặn", reAdd === delN);
}

console.log("\n--- SPIN_RESOLVE: trừ lượt + thưởng nguyên tử ---");
{
  const s0 = base();
  const r1 = R.gardenReducer(s0, { type: "SPIN_RESOLVE", user: "A", actor: "An", kind: "coins", amount: 50 });
  check("spin trúng Xu: lượt +1 VÀ +50 Xu trong cùng một dispatch", r1.games.spin.A === 1 && r1.coins === s0.coins + 50);
  const r2 = R.gardenReducer(r1, { type: "SPIN_RESOLVE", user: "A", actor: "An", kind: "xp", amount: 10 });
  check("spin trúng XP: lượt +1 và XP vườn +10", r2.games.spin.A === 2 && r2.tree.xp === s0.tree.xp + 10);
  const letter = { id: "spinL1", messageId: 2, rarity: "common", source: "Vòng quay yêu thương", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" };
  const r3 = R.gardenReducer(r2, { type: "SPIN_RESOLVE", user: "A", actor: "An", kind: "letter-common", amount: 0, letter });
  check("spin trúng thư: lượt +1, thư vào hộp + vào bộ sưu tập", r3.games.spin.A === 3 && r3.letters.some((l) => l.id === "spinL1") && r3.letterCollection.includes(2));
  const r4 = R.gardenReducer(r3, { type: "SPIN_RESOLVE", user: "A", actor: "An", kind: "coins", amount: 50 });
  check("spin lần 4 (hết lượt): no-op toàn phần — không trừ, không thưởng", r4 === r3);
  const free = R.gardenReducer(r3, { type: "SPIN_RESOLVE", user: "A", actor: "An", kind: "again", amount: 1 });
  check("spin ô Thêm lượt ở trạng thái hết lượt thường: không trừ thêm, không kẹt", free.games.spin.A === 3);
  const mis = R.gardenReducer(s0, { type: "SPIN_RESOLVE", user: "B", actor: "Bình", kind: "mission", amount: 0, bucketItem: { id: "bm1", text: "Ôm nhau 10 giây", done: false, createdAt: iso(NOW), authorSlot: "B" } });
  check("spin trúng nhiệm vụ: bucket có nhiệm vụ + lượt của B +1 (không cần cổng 5s)", mis.bucket.some((b) => b.id === "bm1") && mis.games.spin.B === 1);
  check("SPIN_USE cũ vẫn hoạt động (tương thích)", R.gardenReducer(s0, { type: "SPIN_USE", user: "A" }).games.spin.A === 1);
}

console.log("\n--- Thư xác định + openedBySlot + hoạt động kèm slot ---");
{
  const sA = { ...base(), plants: [{ ...plantRaw("pd1", "sakura"), announcedStage: 0 }], selectedPlantId: "pd1" };
  const sB = { ...base(), plants: [{ ...plantRaw("pd1", "sakura"), announcedStage: 0 }], selectedPlantId: "pd1" };
  const dA = R.makeStageUpDrop(sA, "pd1", 1, false);
  const dB = R.makeStageUpDrop(sB, "pd1", 1, false);
  const sig = (d) => (d ? `${d.id}|${d.messageId}|${d.rarity}` : "null");
  check("thư lên giai đoạn: 2 máy độc lập tạo CÙNG id + CÙNG nội dung (hoặc cùng không rơi)", sig(dA) === sig(dB), dA ? `id=${dA.id} msg=${dA.messageId} rarity=${dA.rarity}` : "không rơi");
  if (dA) check("thư lên giai đoạn: id dạng stageup-<cây>-<giai đoạn>", dA.id === "stageup-pd1-1");
  const dRepeat = R.makeStageUpDrop(sA, "pd1", 1, false);
  check("thư lên giai đoạn: gọi lại cùng tham số cho cùng kết quả (không ngẫu nhiên)", sig(dRepeat) === sig(dA));
  const l0 = P.normalizeStateV5({ letters: [{ id: "L9", messageId: 1, rarity: "common", source: "test", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" }] });
  const l1 = R.gardenReducer(l0, { type: "OPEN_LETTER", id: "L9", opener: "Tên Trùng", openerSlot: "B" });
  check("OPEN_LETTER ghi openedBySlot của người mở", l1.letters[0].openedBySlot === "B");
  const noSlot = { ...l0, letters: [{ ...l0.letters[0], opened: true, openedBy: "Tên Trùng" }] };
  const withSlot = { ...l0, letters: [{ ...l0.letters[0], opened: true, openedBy: "Tên Trùng", openedBySlot: "B" }] };
  check("merge 2 bản đã mở: ưu tiên bản có openedBySlot", M.mergeStates(noSlot, withSlot, "A").letters[0].openedBySlot === "B");
  const la = R.gardenReducer(base(), { type: "LOVE_ACTION", kind: "hug", icon: "people-outline", label: "gửi một cái ôm", actor: "Tên Trùng", user: "B" });
  check("LOVE_ACTION: hoạt động ghi kèm slot người gửi", la.activities[0].slot === "B" && la.lastLoveAction.by === "B");
}

console.log("\n--- Wave 2: cây đã thu không hồi sinh / thư rơi vào bộ sưu tập / bucket doneAt ---");
{
  const fakeLetter = (id, messageId) => ({ id, messageId, rarity: "common", source: "test", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" });
  // C1: cây đã thu (có trong treeCollection phía remote) không được merge hồi sinh từ plants phía local
  const collected = { id: "pX", speciesId: "love-tree", plantedAt: iso(NOW - 9 * 24 * H), maturedAt: iso(NOW - H), collectedAt: iso(NOW), careCount: 30 };
  const sideWithPlant = { ...base(), plants: [{ ...plantRaw("pX", "love-tree") }], treeCollection: [] };
  const sideCollected = { ...base(), plants: [], treeCollection: [collected] };
  check("merge: cây đã thu KHÔNG hồi sinh (local còn cây, remote đã thu)", !M.mergeStates(sideWithPlant, sideCollected, "A").plants.some((p) => p.id === "pX"));
  check("merge: cây đã thu KHÔNG hồi sinh (chiều ngược lại)", !M.mergeStates(sideCollected, sideWithPlant, "A").plants.some((p) => p.id === "pX"));
  check("normalize: state chứa cả plants[id] + treeCollection[id] -> plants bị lọc", P.normalizeStateV5({ plants: [plantRaw("pX", "love-tree")], treeCollection: [collected], games: T.defaultGames }).plants.length === 0);
  // D1: thư rơi từ chăm cây phải vào letterCollection bền vững
  const s0 = base();
  const t1 = R.gardenReducer(s0, { type: "TREE_ACTION", kind: "water", actor: "An", user: "A", plantId: s0.plants[0].id, drop: fakeLetter("drop-care", 7) });
  check("TREE_ACTION: thư rơi có trong hộp + letterCollection", t1.letters.some((l) => l.id === "drop-care") && t1.letterCollection.includes(7));
  // D1: thư lên giai đoạn
  const sg = { ...base(), plants: [{ ...plantRaw("psg", "sunflower"), announcedStage: 0, growthRecordedMs: 24 * H }], selectedPlantId: "psg" };
  const t2 = R.gardenReducer(sg, { type: "STAGE_UP", plantId: "psg", drop: fakeLetter("drop-stage", 9) });
  check("STAGE_UP: thư rơi có trong hộp + letterCollection", t2.letters.some((l) => l.id === "drop-stage") && t2.letterCollection.includes(9));
  // D1: thư thưởng nhiệm vụ Song chăm
  const sq = P.normalizeStateV5({ daily: { date: todayStr, A: { water: 0, love: 0, sun: 0, bug: 0 }, B: { water: 0, love: 0, sun: 0, bug: 0 }, caredA: true, caredB: true, claimedA: [], claimedB: [] } });
  const t3 = R.gardenReducer(sq, { type: "CLAIM_QUEST", questId: "both", actor: "An", user: "A", rewardXp: 10, drop: fakeLetter("drop-quest", 11) });
  check("CLAIM_QUEST: thư thưởng có trong hộp + letterCollection", t3.letters.some((l) => l.id === "drop-quest") && t3.letterCollection.includes(11));
  // F1: bỏ đánh dấu bucket thắng khi doneAt mới hơn (cả 2 chiều); không có doneAt giữ luật cũ
  const bOn = { id: "b1", text: "x", done: true, createdAt: iso(NOW - 20000), doneAt: iso(NOW - 10000) };
  const bOff = { id: "b1", text: "x", done: false, createdAt: iso(NOW - 20000), doneAt: iso(NOW) };
  check("merge bucket: doneAt mới hơn (bỏ đánh dấu) thắng", M.mergeStates({ ...base(), bucket: [bOn] }, { ...base(), bucket: [bOff] }, "A").bucket.find((b) => b.id === "b1").done === false);
  check("merge bucket: doneAt mới hơn thắng cả chiều ngược", M.mergeStates({ ...base(), bucket: [bOff] }, { ...base(), bucket: [bOn] }, "A").bucket.find((b) => b.id === "b1").done === false);
  const bLegacyOff = { id: "b1", text: "x", done: false, createdAt: iso(NOW - 20000) };
  const bLegacyOn = { id: "b1", text: "x", done: true, createdAt: iso(NOW - 20000) };
  check("merge bucket legacy (không doneAt): done=true vẫn thắng", M.mergeStates({ ...base(), bucket: [bLegacyOff] }, { ...base(), bucket: [bLegacyOn] }, "A").bucket.find((b) => b.id === "b1").done === true);
  const tb = R.gardenReducer({ ...base(), bucket: [bLegacyOff] }, { type: "TOGGLE_BUCKET", id: "b1" });
  check("TOGGLE_BUCKET: ghi doneAt mới", tb.bucket[0].done === true && typeof tb.bucket[0].doneAt === "string" && tb.bucket[0].doneAt.length > 0);
}

console.log("\n--- Wave 2: coins neo chung / thư hội tụ / cap nội dung / no-op / HEART_PLAY ---");
{
  const cL = { ...base(), coins: 150, coinsBase: 100 };
  const cR = { ...base(), coins: 130, coinsBase: 100 };
  const cm = M.mergeStates(cL, cR, "A");
  check("merge coins cùng neo: cộng delta CẢ HAI phía (150+130-100=180)", cm.coins === 180 && cm.coinsBase === 180, `coins=${cm.coins}`);
  check("merge coins cùng neo: đối xứng 2 chiều", M.mergeStates(cR, cL, "A").coins === 180);
  const buyL = { ...base(), coins: 70, coinsBase: 100 };
  const earnR = { ...base(), coins: 120, coinsBase: 100 };
  check("merge coins: một phía mua (-30) + một phía kiếm (+20) -> 90", M.mergeStates(buyL, earnR, "A").coins === 90);
  const lx = (mid) => ({ id: "LX", messageId: mid, rarity: "common", source: "t", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" });
  const m1 = M.mergeStates({ ...base(), letters: [lx(5)] }, { ...base(), letters: [lx(9)] }, "A");
  const m2 = M.mergeStates({ ...base(), letters: [lx(9)] }, { ...base(), letters: [lx(5)] }, "A");
  check("merge thư cùng id khác nội dung: hội tụ về messageId nhỏ hơn ở CẢ 2 chiều", m1.letters.find((l) => l.id === "LX").messageId === 5 && m2.letters.find((l) => l.id === "LX").messageId === 5);
  const fullNotes = { ...base(), notes: Array.from({ length: 200 }, (_, i) => ({ id: "n" + i, author: "An", authorSlot: "A", text: "x", color: "#fff", createdAt: iso(NOW - i * 1000) })) };
  check("ADD_NOTE ở cap 200: no-op (cùng reference)", R.gardenReducer(fullNotes, { type: "ADD_NOTE", note: { id: "n-new", author: "An", authorSlot: "A", text: "mới", color: "#fff", createdAt: iso(NOW) } }) === fullNotes);
  const fullBucket = { ...base(), bucket: Array.from({ length: 200 }, (_, i) => ({ id: "bk" + i, text: "x", done: false, createdAt: iso(NOW - i * 1000) })) };
  check("ADD_BUCKET ở cap 200: no-op (cùng reference)", R.gardenReducer(fullBucket, { type: "ADD_BUCKET", item: { id: "bk-new", text: "mới", done: false, createdAt: iso(NOW), authorSlot: "A" }, force: true }) === fullBucket);
  const sm = { ...base(), moods: { A: "joy", B: "", date: todayStr } };
  check("SET_MOOD chọn lại mood hiện tại: no-op (cùng reference)", R.gardenReducer(sm, { type: "SET_MOOD", user: "A", mood: "joy" }) === sm);
  const sl = { ...base(), loveNotes: { A: "abc", B: "" } };
  check("SET_LOVE_NOTE lưu lại y nguyên: no-op (cùng reference)", R.gardenReducer(sl, { type: "SET_LOVE_NOTE", user: "A", text: "abc" }) === sl);
  const h1 = R.gardenReducer(base(), { type: "HEART_PLAY", user: "A" });
  check("HEART_PLAY: ghi 1 lượt chơi ngay khi bắt đầu", h1.games.heartPlays.A === 1 && h1.games.heartPlays.date === todayStr);
  const h2 = R.gardenReducer(h1, { type: "HEART_SCORE", user: "A", score: 10, actor: "An" });
  check("HEART_SCORE: KHÔNG cộng thêm lượt (lượt do HEART_PLAY ghi)", h2.games.heartPlays.A === 1);
}

console.log("\n--- Wave 2: normalize (số dạng chuỗi / rác collection / trùng id cây) + streak + mã vườn ---");
{
  check("normalize: coins dạng chuỗi '500' được parse, không reset về 50", P.normalizeStateV5({ coins: "500" }).coins === 500);
  check("normalize: quiz dạng chuỗi ['0','1'] được giữ thành [0,1]", JSON.stringify(P.normalizeStateV5({ games: { quiz: { date: todayStr, A: ["0", "1"], B: [] } } }).games.quiz.A) === "[0,1]");
  const junk = P.normalizeStateV5({ letterCollection: [1.5, -5, null, true, "x", 7], letters: [] });
  check("normalize: letterCollection rác bị lọc, chỉ còn số nguyên >= 1", JSON.stringify(junk.letterCollection) === "[7]", JSON.stringify(junk.letterCollection));
  check("normalize: 2 cây trùng id bị khử trùng còn 1", P.normalizeStateV5({ plants: [plantRaw("dup", "love-tree"), plantRaw("dup", "sakura")] }).plants.length === 1);
  check("normalize: messageId thập phân 12.7 được làm tròn xuống 12", P.normalizeStateV5({ letters: [{ id: "LF", messageId: 12.7, rarity: "common", source: "t", opened: false, droppedAt: iso(NOW), openedAt: "", openedBy: "" }] }).letters[0].messageId === 12);
  check("vườn mới: mood mặc định RỖNG (chưa ai chọn)", base().moods.A === "" && base().moods.B === "");
  const d3 = T.dayKeyLocal(new Date(NOW - 3 * 86400000));
  const d1 = T.dayKeyLocal(new Date(NOW - 86400000));
  check("effectiveStreak: nghỉ 3 ngày -> 0 dù count còn 5", T.effectiveStreak({ count: 5, lastDate: d3 }, NOW) === 0);
  check("effectiveStreak: chăm hôm qua -> giữ 5; hôm nay -> giữ 5", T.effectiveStreak({ count: 5, lastDate: d1 }, NOW) === 5 && T.effectiveStreak({ count: 5, lastDate: todayStr }, NOW) === 5);
  let codesOk = true;
  for (let i = 0; i < 2000; i++) { const c = T.genRoomCode(); if (c.length !== 6) { codesOk = false; break; } }
  check("genRoomCode: 2000 mã đều đúng 6 ký tự", codesOk);
}

console.log(`\n${count - failures}/${count} test đạt`);
console.log(failures === 0 ? "TẤT CẢ TEST LOGIC ĐẠT" : `CÓ ${failures} TEST CHƯA ĐẠT`);
process.exit(failures === 0 ? 0 : 1);

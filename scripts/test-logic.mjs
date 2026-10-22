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
check("web: giữ thư + trạng thái đã mở", w.letters.length === 2 && w.letters[0].opened === true);
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

console.log(`\n${count - failures}/${count} test đạt`);
console.log(failures === 0 ? "TẤT CẢ TEST LOGIC ĐẠT" : `CÓ ${failures} TEST CHƯA ĐẠT`);
process.exit(failures === 0 ? 0 : 1);

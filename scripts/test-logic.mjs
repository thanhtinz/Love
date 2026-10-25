/**
 * Test logic cho bản REBUILD 5 lõi (đếm ngày · cây · note · nhịp nhớ · định vị tạm).
 * Chạy: npm run test-logic (biên dịch src/lib ra scripts/.build rồi chạy, TZ=Asia/Saigon).
 * Mỗi nhóm ghi rõ luật nó bảo vệ — các khóa cứng (cooldown, trần, hết hạn) phải
 * nằm ở reducer/lib, test này FAIL nếu ai đó gỡ khóa ở tầng logic.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const T = require("./.build/types.js");
const TR = require("./.build/tree.js");
const F = require("./.build/features.js");
const CT = require("./.build/content.js");
const MO = require("./.build/model.js");
const R = require("./.build/reducer.js");
const M = require("./.build/merge.js");
const MT = require("./.build/maptiles.js");
const WG = require("./.build/widget.js");
const Q = require("./.build/quests.js");
const MEM = require("./.build/memories.js");

const H = 3600000;
const MIN = 60000;
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
/** Khoá ngày địa phương của ngày cách hôm nay n ngày (cho test giai đoạn theo ngày yêu) */
const dayKeyAgo = (n) => T.dayKeyLocal(new Date(NOW - n * 24 * H));
const fresh = () => MO.normalizeState(null);
const mkTree = (over = {}) => TR.normalizeTree({
  plantedAt: iso(NOW - 1000), growthRecordedMs: 0, growthAt: iso(NOW - 1000), statsAt: iso(NOW - 1000),
  water: 60, sun: 60, love: 60, totalBoostMs: 0, careCount: 0, lastCareAt: "", lastCareBySlot: "",
  lastCareAtBy: { A: "", B: "" }, announcedStage: 0, matureAt: "", ...over,
});

/* ================= A) ĐẾM NGÀY YÊU + CỘT MỐC ================= */
console.log("\n--- A) Đếm ngày + cột mốc ---");
{
  const daysAgo = (n) => { const d = new Date(NOW - n * 24 * H); return T.dayKeyLocal(d); };
  check("A1 ngày bắt đầu = hôm nay -> Ngày 1", F.dayCount(daysAgo(0)) === 1);
  check("A2 bắt đầu 99 ngày trước -> Ngày 100", F.dayCount(daysAgo(99)) === 100);
  check("A3 nextMilestone(1) = 100, còn 99", (() => { const n = F.nextMilestone(1); return n && n.days === 100 && n.remaining === 99; })());
  check("A4 nextMilestone(100) = 200, còn 100", (() => { const n = F.nextMilestone(100); return n && n.days === 200 && n.remaining === 100; })());
  check("A5 nextMilestone(10000) = null (hết danh sách)", F.nextMilestone(10000) === null);
  check("A6 milestoneReached: 99->null, 100->100, 250->200", F.milestoneReached(99) === null && F.milestoneReached(100) === 100 && F.milestoneReached(250) === 200);
  check("A7 parseDateKey loại ngày không tồn tại 2025-02-31", T.parseDateKey("2025-02-31") === null && !T.isValidDateKey("2025-02-31"));
  check("A8 năm nhuận: 2024-02-29 hợp lệ, 2025-02-29 không", T.isValidDateKey("2024-02-29") && !T.isValidDateKey("2025-02-29"));

  let st = fresh();
  const before = st;
  st = R.gardenReducer(st, { type: "SET_START_DATE", date: daysAgo(30), user: "A", actor: "An" });
  check("A9 SET_START_DATE ngày quá khứ hợp lệ -> áp dụng + startSetBy + dấu vết", st !== before && st.couple.startDate === daysAgo(30) && st.couple.startSetBy === "A" && st.activities.length === 1);
  const future = T.dayKeyLocal(new Date(NOW + 24 * H));
  const stFuture = R.gardenReducer(st, { type: "SET_START_DATE", date: future, user: "A", actor: "An" });
  check("A10 SET_START_DATE ở tương lai -> bị chặn (giữ nguyên state)", stFuture === st);
  const stBad = R.gardenReducer(st, { type: "SET_START_DATE", date: "31/02/2025", user: "A", actor: "An" });
  check("A11 SET_START_DATE sai định dạng -> bị chặn", stBad === st);
  let sm = R.gardenReducer(fresh(), { type: "MARK_MILESTONE", days: 100, actor: "An" });
  const actsAfterFirst = sm.activities.length;
  sm = R.gardenReducer(sm, { type: "MARK_MILESTONE", days: 100, actor: "An" });
  check("A12 MARK_MILESTONE idempotent: ghi 1 lần, dấu vết 1 lần", sm.couple.celebrated.filter((d) => d === 100).length === 1 && sm.activities.length === actsAfterFirst);
}

/* ================= B) CÂY: TĂNG TRƯỞNG / HAO / SỨC KHỎE ================= */
console.log("\n--- B) Cây — tăng trưởng theo thời gian thật ---");
{
  const t0 = NOW - 12 * H;
  const healthy = mkTree({ plantedAt: iso(t0), growthAt: iso(t0), statsAt: iso(t0), water: 100, sun: 100, love: 100 });
  const mHealthy = TR.materializeTree(healthy, NOW);
  check("B1 cây khỏe 12 giờ -> lớn ~12 giờ (hệ số x1)", Math.abs(mHealthy.growthRecordedMs - 12 * H) < 20 * MIN, `growth=${(mHealthy.growthRecordedMs / H).toFixed(2)}h`);
  const weak = mkTree({ plantedAt: iso(NOW - 4 * H), growthAt: iso(NOW - 4 * H), statsAt: iso(NOW - 4 * H), water: 30, sun: 100, love: 100 });
  const mWeak = TR.materializeTree(weak, NOW);
  check("B2 cây yếu (min 30) 4 giờ -> lớn ~2 giờ (hệ số x0.5)", Math.abs(mWeak.growthRecordedMs - 2 * H) < 25 * MIN, `growth=${(mWeak.growthRecordedMs / H).toFixed(2)}h`);
  const wilted = mkTree({ plantedAt: iso(NOW - 24 * H), growthAt: iso(NOW - 24 * H), statsAt: iso(NOW - 24 * H), water: 10, sun: 12, love: 15 });
  const mWilted = TR.materializeTree(wilted, NOW);
  check("B3 cây héo (min <20) 24 giờ -> đứng yên", mWilted.growthRecordedMs === 0);
  const d = TR.decayedStats(mkTree({ water: 100, sun: 100, love: 100, statsAt: iso(NOW - 10 * H), growthAt: iso(NOW - 10 * H) }), NOW);
  check("B4 hao 10 giờ: Nước -25, Nắng -18, Yêu -12", Math.abs(d.water - 75) < 0.6 && Math.abs(d.sun - 82) < 0.6 && Math.abs(d.love - 88) < 0.6, `${d.water}/${d.sun}/${d.love}`);
  check("B5 ranh giới giai đoạn: 0h->0, 12h->1, tổng->6 (trưởng thành)", TR.stageIndexForGrowth(0) === 0 && TR.stageIndexForGrowth(12 * H) === 1 && TR.stageIndexForGrowth(TR.totalGrowthMs()) === 6);
  check("B6 tổng thời gian lớn ~168 giờ (7 ngày)", Math.abs(TR.totalGrowthMs() - 168 * H) < MIN);
  const absent = TR.materializeTree(mkTree({ plantedAt: iso(NOW - 30 * 24 * H), growthAt: iso(NOW - 30 * 24 * H), statsAt: iso(NOW - 30 * 24 * H) }), NOW);
  check("B7 vắng 30 ngày: số liệu hữu hạn, không NaN, chỉ số về 0", isFinite(absent.growthRecordedMs) && absent.water === 0 && absent.sun === 0 && absent.love === 0);
  const healthW = TR.treeHealth({ water: 10, sun: 50, love: 50 });
  const healthOk = TR.treeHealth({ water: 80, sun: 80, love: 80 });
  check("B8 treeHealth: min<20 -> wilted, đủ đầy -> happy/ok", healthW.status === "wilted" && (healthOk.status === "happy" || healthOk.status === "ok"));

  /* GIAI ĐOẠN THEO NGÀY YÊU THẬT (từ 2026-10-23 — thay cho giai đoạn theo điểm lớn) */
  const stageCases = [[1, 1], [6, 1], [7, 2], [29, 2], [30, 3], [99, 3], [100, 4], [199, 4], [200, 5], [364, 5], [365, 6], [729, 6], [730, 7], [5000, 7]];
  check("B9 ranh giới giai đoạn theo ngày: 6->1, 7->2, 29->2, 30->3, 99->3, 100->4, 199->4, 200->5, 364->5, 365->6, 729->6, 730->7", stageCases.every(([d, s]) => TR.treeStageForDay(d).stage === s));
  check("B10 tiến độ trong giai đoạn: ngày 15 (gđ2) = 8/23, ngày 29 = 22/23, ngày 1 = 0, gđ7 = 1",
    Math.abs(TR.treeStageForDay(15).progress - 8 / 23) < 1e-9
    && Math.abs(TR.treeStageForDay(29).progress - 22 / 23) < 1e-9
    && TR.treeStageForDay(1).progress === 0
    && TR.treeStageForDay(730).progress === 1);
  check("B11 daysToNextStage: ngày 1 -> 6, ngày 7 -> 23, ngày 100 -> 100, ngày 729 -> 1, ngày 730 -> null",
    TR.treeStageForDay(1).daysToNextStage === 6
    && TR.treeStageForDay(7).daysToNextStage === 23
    && TR.treeStageForDay(100).daysToNextStage === 100
    && TR.treeStageForDay(729).daysToNextStage === 1
    && TR.treeStageForDay(730).daysToNextStage === null);
  check("B12 di trú bản cũ: startDate được cứu 251 ngày trước -> Ngày 252 -> cây ở giai đoạn 5 ngay", (() => {
    const mig = MO.normalizeState({ startDate: dayKeyAgo(251) });
    const d = F.dayCount(mig.couple.startDate);
    return d === 252 && TR.treeStageForDay(d).stage === 5;
  })());
}

/* ================= C) CHĂM CÂY: COOLDOWN / ĐẦY / COMBO / THƯ ================= */
console.log("\n--- C) Chăm cây + combo Song chăm + thư rơi ---");
{
  const base = mkTree({ water: 50, sun: 50, love: 50 });
  const cared = TR.applyCare(base, "water", "A", NOW);
  check("C1 tưới nước: +30 nước, +30 phút boost, careCount+1, ghi người chăm", cared.water === 80 && cared.totalBoostMs === 30 * MIN && cared.careCount === 1 && cared.lastCareBySlot === "A" && cared.lastCareAtBy.A === iso(NOW));
  const capped = TR.applyCare(mkTree({ water: 90, sun: 50, love: 50 }), "water", "A", NOW);
  check("C2 chỉ số cộng dồn bị chặn ở 100", capped.water === 100);
  const csCool = TR.careStatus(cared, "water", "A", NOW + 30 * 1000);
  check("C3 cooldown 60s/người: chăm lại sau 30s bị chặn + có lý do", !csCool.ok && csCool.cooldownLeftMs > 0 && csCool.reason.length > 0);
  const csOther = TR.careStatus(cared, "water", "B", NOW + 30 * 1000);
  check("C4 cooldown là theo NGƯỜI: người ấy chăm ngay được", csOther.ok);
  const csAfter = TR.careStatus(cared, "water", "A", NOW + 61 * 1000);
  check("C5 hết 60s thì chăm lại được", csAfter.ok);
  const csFull = TR.careStatus(mkTree({ water: 97, sun: 50, love: 50 }), "water", "A", NOW);
  check("C6 chỉ số >=95%: chăm vô hiệu + UI có lý do (nói rõ 'không có tác dụng')", !csFull.ok && csFull.reason.includes("không có tác dụng"));
  const csBugFull = TR.careStatus(mkTree({ water: 99, sun: 98, love: 97 }), "bug", "A", NOW);
  check("C7 bắt sâu khi cây đã rất khỏe (min>=95) cũng bị chặn", !csBugFull.ok);

  let st = fresh();
  st = { ...st, tree: mkTree({ water: 50, sun: 50, love: 50 }) };
  const stFull = { ...fresh(), tree: mkTree({ water: 99, sun: 50, love: 50 }) };
  const blockedRes = R.gardenReducer(stFull, { type: "TREE_CARE", kind: "water", user: "A", actor: "An", drop: null, combo: false });
  check("C8 reducer khóa cứng: TREE_CARE khi đầy -> no-op nguyên state", blockedRes === stFull);
  const okRes = R.gardenReducer(st, { type: "TREE_CARE", kind: "water", user: "A", actor: "An", drop: null, combo: false });
  check("C9 TREE_CARE hợp lệ -> cây được chăm + có dấu vết", okRes.tree.careCount === 1 && okRes.activities.some((a) => a.icon === "water"));
  const coolRes = R.gardenReducer(okRes, { type: "TREE_CARE", kind: "sun", user: "A", actor: "An", drop: null, combo: false });
  check("C10 reducer khóa cứng: chăm liên tiếp trong 60s -> no-op", coolRes === okRes);

  const comboState = { ...fresh(), tree: mkTree({ lastCareAtBy: { A: "", B: iso(NOW - 30 * 1000) }, lastCareAt: iso(NOW - 30 * 1000) }) };
  const comboRes = F.decideCareLetter(comboState, "water", NOW);
  check("C11 combo: người ấy chăm 30s trước, mình chưa chăm sau đó -> combo + rơi thư", comboRes.combo === true && comboRes.drop !== null && comboRes.drop.source.includes("Song chăm"));
  const oldComboState = { ...fresh(), tree: mkTree({ lastCareAtBy: { A: "", B: iso(NOW - 120 * 1000) } }) };
  check("C12 quá cửa sổ 90s -> không combo", F.decideCareLetter(oldComboState, "water", NOW).combo === false);
  const meAfterState = { ...fresh(), tree: mkTree({ lastCareAtBy: { A: iso(NOW - 10 * 1000), B: iso(NOW - 30 * 1000) } }) };
  check("C13 mình đã chăm SAU người ấy -> không tính combo", F.decideCareLetter(meAfterState, "water", NOW).combo === false);
  check("C14 kho thư đúng 36 lá (18 thường / 10 hiếm / 8 huyền thoại)", CT.LOVE_MESSAGES.length === 36
    && CT.LOVE_MESSAGES.filter((m) => m.rarity === "common").length === 18
    && CT.LOVE_MESSAGES.filter((m) => m.rarity === "rare").length === 10
    && CT.LOVE_MESSAGES.filter((m) => m.rarity === "legendary").length === 8);
  const l1 = CT.makeStageUpLetter(3, false, "A", iso(NOW));
  const l2 = CT.makeStageUpLetter(3, false, "A", iso(NOW));
  check("C15 thư lên giai đoạn xác định: cùng giai đoạn -> cùng id (2 máy hội tụ)", l1.id === l2.id && l1.id === "stageup-3" && l1.messageId >= 1 && l1.messageId <= 36);
  /* Giai đoạn KHÔNG còn theo điểm lớn/chăm cây — chỉ theo ngày yêu (từ 2026-10-23) */
  check("C16 chăm/điểm lớn không đổi giai đoạn: sổ tăng trưởng đầy + trưởng thành nhưng mới Ngày 1 -> vẫn giai đoạn 1", (() => {
    const stFullGrowth = { ...fresh(), tree: mkTree({ growthRecordedMs: TR.totalGrowthMs(), matureAt: iso(NOW) }) };
    return TR.treeStageForDay(F.dayCount(stFullGrowth.couple.startDate, NOW)).stage === 1;
  })());
  check("C16b 0 điểm tăng trưởng nhưng yêu 400 ngày -> giai đoạn 6 (giai đoạn thuần theo ngày)", (() => {
    const stOld = MO.normalizeState({ startDate: dayKeyAgo(399) });
    return stOld.tree.growthRecordedMs === 0 && F.dayCount(stOld.couple.startDate, NOW) === 400 && TR.treeStageForDay(400).stage === 6;
  })());
  let ss = fresh();
  ss = R.gardenReducer(ss, { type: "CELEBRATE_TREE_STAGE", stage: 4, drop: l1 });
  const ssAfter = R.gardenReducer(ss, { type: "CELEBRATE_TREE_STAGE", stage: 4, drop: l1 });
  check("C17 CELEBRATE_TREE_STAGE: ghi celebratedStages + thư + nhật ký 'Cây tình yêu đã lên giai đoạn mới' đúng 1 lần, gọi lại -> no-op",
    ss.couple.celebratedStages.join(",") === "4"
    && ss.lastLetter?.id === l1.id
    && ss.activities.filter((a) => a.text.includes("Cây tình yêu đã lên giai đoạn mới")).length === 1
    && ssAfter === ss);
  const ss5 = R.gardenReducer(ss, { type: "CELEBRATE_TREE_STAGE", stage: 5, drop: CT.makeStageUpLetter(4, false, "A", iso(NOW)) });
  check("C18 giai đoạn sau vẫn ăn mừng tiếp được: celebratedStages = [4,5]", ss5.couple.celebratedStages.join(",") === "4,5");
  const ssBad = R.gardenReducer(fresh(), { type: "CELEBRATE_TREE_STAGE", stage: 9, drop: null });
  check("C19 CELEBRATE_TREE_STAGE với giai đoạn ngoài 1..7 -> bị chặn", ssBad.couple.celebratedStages.length === 0);
}

/* ================= D) NOTE TÌNH YÊU ================= */
console.log("\n--- D) Note tình yêu ---");
{
  const mkNote = (over = {}) => ({ id: T.uid(), authorSlot: "A", text: "Nhớ em nhiều", mood: "", createdAt: iso(NOW), readAt: "", ...over });
  let st = fresh();
  st = R.gardenReducer(st, { type: "NOTE_ADD", note: mkNote(), user: "A" });
  check("D1 gửi note hợp lệ -> có trong timeline + noteLog được ghi", st.notes.length === 1 && st.noteLog.A !== "");
  const tooLong = R.gardenReducer(fresh(), { type: "NOTE_ADD", note: mkNote({ text: "x".repeat(301) }), user: "A" });
  check("D2 note 301 ký tự -> bị chặn ở reducer", tooLong.notes.length === 0);
  const spam = R.gardenReducer(st, { type: "NOTE_ADD", note: mkNote({ createdAt: iso(NOW + 2000) }), user: "A" });
  check("D3 giãn cách 5s: note thứ hai sau 2s -> bị chặn", spam.notes.length === 1);
  const okSecond = R.gardenReducer(st, { type: "NOTE_ADD", note: mkNote({ createdAt: iso(NOW + 6000) }), user: "A" });
  check("D4 sau 6s -> gửi được", okSecond.notes.length === 2);
  const mismatch = R.gardenReducer(fresh(), { type: "NOTE_ADD", note: mkNote({ authorSlot: "B" }), user: "A" });
  check("D5 authorSlot khác người gửi -> bị chặn", mismatch.notes.length === 0);
  const noteId = st.notes[0].id;
  const readByAuthor = R.gardenReducer(st, { type: "NOTE_READ", id: noteId, user: "A" });
  check("D6 tác giả tự đọc note của mình -> no-op", readByAuthor === st);
  const readByPartner = R.gardenReducer(st, { type: "NOTE_READ", id: noteId, user: "B" });
  check("D7 người nhận mở note -> readAt được ghi (người viết thấy 'đã xem')", Boolean(readByPartner.notes.find((n) => n.id === noteId)?.readAt));
  const readAgain = R.gardenReducer(readByPartner, { type: "NOTE_READ", id: noteId, user: "B" });
  check("D8 đọc lại lần nữa -> no-op", readAgain === readByPartner);
  const many = Array.from({ length: 250 }, (_, i) => mkNote({ id: `n${i}`, createdAt: iso(NOW - i * 1000) }));
  const cappedNorm = MO.normalizeState({ notes: many });
  check("D9 normalize chặn timeline ở 200 note", cappedNorm.notes.length === 200 && cappedNorm.notes[0].id === "n0");
  const sideA = { ...fresh(), notes: [mkNote({ id: "shared1" })] };
  const sideB = { ...fresh(), notes: [{ ...mkNote({ id: "shared1" }), readAt: iso(NOW + 5000) }, mkNote({ id: "only-b", authorSlot: "B", createdAt: iso(NOW + 1000) })] };
  const merged = M.mergeStates(sideA, sideB, "A");
  const shared = merged.notes.find((n) => n.id === "shared1");
  check("D10 merge note: readAt từ máy người nhận thắng + union đủ 2 note", Boolean(shared?.readAt) && merged.notes.length === 2);
}

/* ================= E) NHỊP TIM "NHỚ BẠN" ================= */
console.log("\n--- E) Nhịp tim Nhớ bạn ---");
{
  let st = fresh();
  st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
  check("E1 gửi 1 nhịp: bộ đếm ngày=1, slot total=1, burst=1, có dấu vết", st.pings.day.A === 1 && st.pings.A.total === 1 && st.pings.A.burst === 1 && st.activities.length === 1);
  st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
  st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
  check("E2 gửi liền 3 nhịp KHÔNG gộp chuỗi: 3 sự kiện riêng — total=3, ngày=3, burst vẫn 1, 3 dòng dấu vết", st.pings.A.total === 3 && st.pings.day.A === 3 && st.pings.A.burst === 1 && st.activities.length === 3 && st.pings.A.lastBurstAt === st.pings.A.lastAt);
  const atFifty = { ...fresh(), pings: { A: { total: 50, lastAt: "", lastBurstAt: "", burst: 0 }, B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 }, day: { date: todayStr, A: 50, B: 0 } } };
  const beyond = R.gardenReducer(atFifty, { type: "PING_SEND", user: "A", actor: "An" });
  check("E3 KHÔNG còn trần ngày: đã 50 nhịp vẫn gửi tiếp được nhịp 51", beyond !== atFifty && beyond.pings.day.A === 51 && beyond.pings.A.total === 51);
  const capB = R.gardenReducer(atFifty, { type: "PING_SEND", user: "B", actor: "Bình" });
  check("E4 bộ đếm vẫn theo NGƯỜI GỬI: người ấy gửi phần của mình bình thường", capB !== atFifty && capB.pings.day.B === 1);
  const yesterday = T.dayKeyLocal(new Date(NOW - 24 * H));
  const stale = { ...fresh(), pings: { A: { total: 9, lastAt: "", lastBurstAt: "", burst: 0 }, B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 }, day: { date: yesterday, A: 9, B: 0 } } };
  const rolled = R.gardenReducer(stale, { type: "PING_SEND", user: "A", actor: "An" });
  check("E5 sang ngày mới: bộ đếm ngày tự reset rồi mới cộng", rolled.pings.day.date === todayStr && rolled.pings.day.A === 1);
  const tickRolled = R.gardenReducer(stale, { type: "TICK" });
  check("E6 TICK cũng lăn ngày cho bộ đếm nhịp", tickRolled.pings.day.date === todayStr && tickRolled.pings.day.A === 0);
  check("E7 các hằng số giới hạn nhịp ĐÃ GỠ hẳn khỏi types (không trần, không burst, không cooldown)", T.PING_DAILY_MAX === undefined && T.PING_BURST_WINDOW_MS === undefined && T.PING_POP_COOLDOWN_MS === undefined);
  let spam = fresh();
  for (let i = 0; i < 45; i++) spam = R.gardenReducer(spam, { type: "PING_SEND", user: "A", actor: "An" });
  check("E8 gửi 45 nhịp liền: đếm đủ 45 nhưng nhật ký vẫn chặn ở 40 dòng như mọi hoạt động", spam.pings.day.A === 45 && spam.pings.A.total === 45 && spam.activities.length === 40);
}

/* ================= F) VỊ TRÍ TRỰC TIẾP =================
 * ADAPT từ section F cũ ("Định vị tạm thời" — phiên chia sẻ 15p/1h/4h):
 * mô hình phiên đã bị GỠ theo yêu cầu của chủ app ("không cần bật tắt, vô
 * phần đó là thấy luôn vị trí của nhau"). Các test F1–F6/F9/F10 của bản cũ
 * (PRESENCE_START/STOP, shareStatus, SHARE_DURATIONS, hết hạn phiên) được
 * THAY bằng test cho cổng tiết lưu publish + publish/lưu điểm mới nhất +
 * nhãn độ tươi + migration vứt phiên cũ; F7/F8 (haversine/distanceText) giữ
 * nguyên vì toán khoảng cách không đổi. */
console.log("\n--- F) Vị trí trực tiếp: tiết lưu publish + điểm mới nhất + độ tươi ---");
{
  const A0 = { lat: 21.0285, lng: 105.8542 };
  check("F1 shouldPublishLive: chưa từng publish -> publish ngay", F.shouldPublishLive(null, A0, NOW) === true);
  check("F2 shouldPublishLive: mới 5 giây (dù đi xa 100m+) -> CHƯA publish (cổng 10 giây)",
    F.shouldPublishLive({ ...A0, atMs: NOW }, { lat: 21.0295, lng: 105.8542 }, NOW + 5000) === false);
  check("F3 shouldPublishLive: đủ 15 giây nhưng mới đi ~5m -> CHƯA publish (cổng 20m)",
    F.shouldPublishLive({ ...A0, atMs: NOW - 15000 }, { lat: 21.02855, lng: 105.8542 }, NOW) === false);
  check("F4 shouldPublishLive: đủ 15 giây + đi ~55m -> publish",
    F.shouldPublishLive({ ...A0, atMs: NOW - 15000 }, { lat: 21.029, lng: 105.8542 }, NOW) === true);

  let st = fresh();
  st = R.gardenReducer(st, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 21.0285, lng: 105.8542, acc: 12, battery: 77, at: iso(NOW) });
  check("F5 publish KHÔNG cần phiên/công tắc: snapshot ghi luôn điểm mới nhất + pin + locAt",
    st.presence.A.lat === 21.0285 && st.presence.A.battery === 77 && st.presence.A.locAt === iso(NOW));
  st = R.gardenReducer(st, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 21.03, lng: 105.86, acc: 9, battery: 76, at: iso(NOW + 70000) });
  check("F6 publish tiếp theo GHI ĐÈ điểm cũ (chỉ giữ điểm mới nhất, không lịch sử)",
    st.presence.A.lat === 21.03 && st.presence.A.locAt === iso(NOW + 70000) && st.presence.A.battery === 76);
  const batteryOnly = R.gardenReducer(st, { type: "PRESENCE_SNAPSHOT", user: "A", lat: null, lng: null, acc: null, battery: 70, at: iso(NOW + 140000) });
  check("F7 snapshot không có điểm (chỉ pin) -> giữ nguyên vị trí cũ, chỉ mới pin/mốc",
    batteryOnly.presence.A.lat === 21.03 && batteryOnly.presence.A.locAt === iso(NOW + 70000) && batteryOnly.presence.A.battery === 70);

  const hnHcm = F.haversineKm({ lat: 21.0285, lng: 105.8542 }, { lat: 10.8231, lng: 106.6297 });
  check("F8 haversine Hà Nội -> TP.HCM ~ 1.100-1.200 km; cùng điểm = 0", hnHcm > 1100 && hnHcm < 1200 && F.haversineKm({ lat: 21, lng: 105 }, { lat: 21, lng: 105 }) === 0, `${hnHcm.toFixed(0)} km`);
  check("F9 distanceText: <0.3km thân thiện, 550m, 5,3 km", F.distanceText(0.2) === "Đang ở rất gần nhau" && F.distanceText(0.55) === "550 m" && F.distanceText(5.26) === "5,3 km");

  check("F10 freshnessText: rỗng -> ''; 30 giây -> 'Vừa cập nhật'; 10 phút -> 'Cập nhật 10 phút trước'; 3 giờ -> 'Vị trí gần nhất · ...'",
    F.freshnessText("", NOW) === ""
    && F.freshnessText(iso(NOW - 30000), NOW) === "Vừa cập nhật"
    && F.freshnessText(iso(NOW - 10 * MIN), NOW) === "Cập nhật 10 phút trước"
    && F.freshnessText(iso(NOW - 3 * H), NOW).startsWith("Vị trí gần nhất · "));

  const oldSession = MO.normalizeState({ presence: { A: { sharing: true, startedAt: iso(NOW), expiresAt: "", lat: 21.5, lng: 105.5, locAt: iso(NOW), battery: 50, at: iso(NOW) }, B: { sharing: false } } });
  const newShape = MO.normalizeState({ presence: { A: { lat: 21.5, lng: 105.5, acc: 8, battery: 50, locAt: iso(NOW), at: iso(NOW) } } });
  check("F11 migration: state PHIÊN cũ -> vị trí bị vứt, bắt đầu trống; shape trực tiếp mới -> giữ nguyên điểm",
    oldSession.presence.A.lat === null && oldSession.presence.A.locAt === ""
    && newShape.presence.A.lat === 21.5 && newShape.presence.A.locAt === iso(NOW));
}

/* ================= G) MERGE 2 MÁY + NORMALIZE + STAMP ================= */
console.log("\n--- G) Merge / normalize / đóng dấu ---");
{
  const def = MO.normalizeState(null);
  check("G1 normalize(null) -> mặc định an toàn", def.couple.startDate === todayStr && def.notes.length === 0 && def.tree.growthRecordedMs === 0 && def.presence.A.lat === null);
  let threw = false;
  try { MO.normalizeState("rác"); MO.normalizeState(42); MO.normalizeState([1, 2]); MO.normalizeState({ couple: "x", tree: 7, notes: "y" }); } catch { threw = true; }
  check("G2 normalize không bao giờ throw với dữ liệu rác", !threw);
  const legacy = MO.normalizeState({
    roomCode: "OLD123", personA: "An", personB: "Bình", startDate: "2024-02-14", currentUser: "B",
    plants: [{ plantedAt: iso(NOW - 50 * H), growthRecordedMs: 40 * H, growthAt: iso(NOW - H), statsAt: iso(NOW - H), water: 70, sun: 70, love: 70, totalBoostMs: 5 * H, careCount: 12, lastCareAt: "", lastCareBySlot: "", announcedStage: 2, matureAt: "" }],
    notes: [{ id: "old1", author: "An", text: "note kiểu cũ không có authorSlot" }],
    presence: { me: { sharing: true } },
    xu: 9999, level: 5,
  });
  check("G3 state BẢN CŨ nạp an toàn: cứu ngày bắt đầu + cây ở plants[0], note cũ bị loại, presence cũ về mặc định", legacy.couple.startDate === "2024-02-14" && legacy.tree.careCount === 12 && legacy.notes.length === 0 && legacy.presence.A.lat === null && legacy.currentUser === "B");
  const v4 = MO.normalizeState({ tree: { xp: 1234, level: 9 } });
  check("G4 tree kiểu V4 (không plantedAt) -> cây mới tinh, không crash", v4.tree.growthRecordedMs === 0 && Boolean(v4.tree.plantedAt));

  const baseState = fresh();
  const mineShared = { ...baseState, presence: { ...baseState.presence, A: { ...baseState.presence.A, sharing: true, startedAt: iso(NOW) } } };
  const ownerStamped = M.stampSections(baseState, mineShared, "A", iso(NOW));
  const otherCopy = { ...fresh(), updatedAt: iso(NOW + 60000) };
  const mergedOwner = M.mergeStates(otherCopy, ownerStamped, "B");
  check("G5 merge presence: bản do CHÍNH chủ slot đóng dấu thắng bản mới hơn của máy khác", mergedOwner.presence.A.sharing === true);
  const coupleLocal = { ...fresh(), couple: { ...fresh().couple, startDate: "2024-01-01", startSetAt: iso(NOW - H), startSetBy: "A", celebrated: [100] } };
  const coupleRemote = { ...fresh(), couple: { ...fresh().couple, startDate: "2024-02-14", startSetAt: iso(NOW), startSetBy: "B", celebrated: [200] } };
  const mergedCouple = M.mergeStates(coupleLocal, coupleRemote, "A");
  check("G6 merge ngày bắt đầu: LWW theo startSetAt + celebrated hợp nhất", mergedCouple.couple.startDate === "2024-02-14" && mergedCouple.couple.celebrated.join(",") === "100,200");
  const tLocal = mkTree({ growthRecordedMs: 10 * H, totalBoostMs: 0, careCount: 3, growthAt: iso(NOW), statsAt: iso(NOW) });
  const tRemote = mkTree({ growthRecordedMs: 9 * H, totalBoostMs: 2 * H, careCount: 5, growthAt: iso(NOW), statsAt: iso(NOW) });
  const mergedTree = M.mergeStates({ ...fresh(), tree: tLocal }, { ...fresh(), tree: tRemote }, "A");
  check("G7 merge cây: cộng bù boost phía kia chưa có (10h + 2h = 12h), careCount lấy max", mergedTree.tree.growthRecordedMs === 12 * H && mergedTree.tree.careCount === 5);
  const letterOld = { id: "l-old", messageId: 1, rarity: "common", source: "x", at: iso(NOW - H), bySlot: "A" };
  const letterNew = { id: "l-new", messageId: 2, rarity: "rare", source: "y", at: iso(NOW), bySlot: "B" };
  const mergedLetter = M.mergeStates({ ...fresh(), lastLetter: letterOld }, { ...fresh(), lastLetter: letterNew }, "A");
  check("G8 merge thư rơi: lá mới hơn thắng", mergedLetter.lastLetter?.id === "l-new");
  const actA = { ...fresh(), activities: [{ id: "a1", actor: "An", text: "x", icon: "heart", time: iso(NOW) }] };
  const actB = { ...fresh(), activities: [{ id: "a2", actor: "Bình", text: "y", icon: "water", time: iso(NOW - 1000) }] };
  const mergedActs = M.mergeStates(actA, actB, "A");
  check("G9 merge nhật ký: union theo id, mới nhất trước", mergedActs.activities.length === 2 && mergedActs.activities[0].id === "a1");
  const stamped = R.dispatchWithStamps(fresh(), { type: "NOTE_ADD", note: { id: "sx1", authorSlot: "A", text: "hi", mood: "", createdAt: iso(NOW), readAt: "" }, user: "A" });
  check("G10 dispatchWithStamps đóng dấu notes + noteLog:A với by=A", stamped.secTs?.notes?.by === "A" && stamped.secTs?.["noteLog:A"]?.by === "A");
  const newerState = { ...fresh(), updatedAt: iso(NOW + H) };
  const olderIncoming = { ...fresh(), updatedAt: iso(NOW - H), personA: "Tên Cũ" };
  const guarded = R.gardenReducer(newerState, { type: "SET_STATE", state: olderIncoming });
  check("G11 SET_STATE chống ghi đè ngược: bản cũ hơn updatedAt bị từ chối", guarded === newerState);
  const csLocal = { ...fresh(), couple: { ...fresh().couple, celebratedStages: [2] } };
  const csRemote = { ...fresh(), couple: { ...fresh().couple, celebratedStages: [5, 2] } };
  const mergedStages = M.mergeStates(csLocal, csRemote, "A");
  check("G12 merge celebratedStages: hợp nhất [2] + [2,5] = [2,5] (không máy nào ăn mừng lại)", mergedStages.couple.celebratedStages.join(",") === "2,5");
  check("G13 normalize celebratedStages: thiếu -> [], chỉ nhận số nguyên 1..7, khử trùng + sắp xếp", (() => {
    const a = MO.normalizeState(null);
    const b = MO.normalizeState({ couple: { celebratedStages: [5, 2, 2, 9, 0, "x"] } });
    return a.couple.celebratedStages.length === 0 && b.couple.celebratedStages.join(",") === "2,5";
  })());
}

/* ================= H) BẢN ĐỒ HAI ĐỨA — TOÁN GẠCH OPENSTREETMAP ================= */
console.log("\n--- H) Bản đồ — slippy tiles + fit khung hình ---");
{
  const hcmc = { lat: 10.8231, lon: 106.6297 };
  const tile = MT.tileIndices(hcmc.lat, hcmc.lon, 15);
  check("H1 tile TP.HCM (10.8231, 106.6297) ở zoom 15 = (26089, 15392) theo công thức slippy chuẩn", tile.x === 26089 && tile.y === 15392, `${tile.x},${tile.y}`);
  check("H2 tileUrl đúng mẫu gạch OSM", MT.tileUrl(26089, 15392, 15) === "https://tile.openstreetmap.org/15/26089/15392.png");
  const px = MT.latLonToWorldPx(hcmc.lat, hcmc.lon, 15);
  const rt = MT.worldPxToLatLon(px.x, px.y, 15);
  check("H3 chiếu -> chiếu ngược ≈ toạ độ gốc (sai số < 1e-6)", Math.abs(rt.lat - hcmc.lat) < 1e-6 && Math.abs(rt.lon - hcmc.lon) < 1e-6, `${rt.lat.toFixed(6)},${rt.lon.toFixed(6)}`);
  const W = 360, HH = 340, PAD = 40;
  const project = (pt, fit) => {
    const c = MT.latLonToWorldPx(fit.center.lat, fit.center.lon, fit.zoom);
    const p = MT.latLonToWorldPx(pt.lat, pt.lon, fit.zoom);
    return { x: p.x - (c.x - W / 2), y: p.y - (c.y - HH / 2) };
  };
  const inside = (pt, fit) => { const q = project(pt, fit); return q.x >= PAD - 1 && q.x <= W - PAD + 1 && q.y >= PAD - 1 && q.y <= HH - PAD + 1; };
  const hanoi = { lat: 21.0285, lon: 105.8542 };
  const farFit = MT.fitMapPoints([hanoi, hcmc], W, HH, PAD);
  check("H4 fit cặp xa (Hà Nội <-> TP.HCM): cả 2 điểm lọt khung có đệm", inside(hanoi, farFit) && inside(hcmc, farFit), `zoom=${farFit.zoom}`);
  const nearPair = [hcmc, { lat: 10.8251, lon: 106.6317 }];
  const nearFit = MT.fitMapPoints(nearPair, W, HH, PAD);
  check("H5 fit cặp gần (~300m): cả 2 điểm lọt khung, zoom cao hơn cặp xa và <= 17", nearPair.every((pt) => inside(pt, nearFit)) && nearFit.zoom <= 17 && nearFit.zoom > farFit.zoom, `zoom=${nearFit.zoom}`);
  const single = MT.fitMapPoints([hcmc], W, HH, PAD);
  check("H6 fit 1 điểm -> zoom 15, tâm đúng điểm đó", single.zoom === 15 && single.center.lat === hcmc.lat && single.center.lon === hcmc.lon);
  const worldFit = MT.fitMapPoints([{ lat: 80, lon: -179 }, { lat: -80, lon: 179 }], W, HH, PAD);
  check("H7 fit cặp cực đoan (gần trọn thế giới) -> zoom bị kẹp không dưới 3", worldFit.zoom >= 3, `zoom=${worldFit.zoom}`);

  /* ---- Tương tác: kéo (pan) ---- */
  const Z15 = 15;
  const dragRight = MT.panCenterByPixels(hcmc, Z15, 256, 0); // nội dung theo tay sang phải -> tâm sang TÂY
  const dragLeft = MT.panCenterByPixels(hcmc, Z15, -256, 0); // nội dung theo tay sang trái -> tâm sang ĐÔNG
  check("H8 kéo: kéo phải (dx>0) tâm giảm kinh độ (sang tây), kéo trái (dx<0) tâm tăng kinh độ (sang đông)", dragRight.lon < hcmc.lon && dragLeft.lon > hcmc.lon, `right=${dragRight.lon.toFixed(5)} left=${dragLeft.lon.toFixed(5)}`);
  check("H9 kéo: 256px ở zoom 15 = đúng 1 gạch = 360/2^15 độ kinh (cả hai chiều)", Math.abs((hcmc.lon - dragRight.lon) - 360 / Math.pow(2, 15)) < 1e-9 && Math.abs((dragLeft.lon - hcmc.lon) - 360 / Math.pow(2, 15)) < 1e-9, `dLon=${(hcmc.lon - dragRight.lon).toFixed(8)}`);
  const panDown = MT.panCenterByPixels(hcmc, Z15, 0, 256); // kéo XUỐNG -> nội dung theo tay, tâm lên BẮC
  const panUp = MT.panCenterByPixels(hcmc, Z15, 0, -256);
  check("H10 kéo: kéo xuống (dy>0) tâm tăng vĩ độ, kéo lên (dy<0) tâm giảm vĩ độ; độ dịch pixel thế giới đúng 256", panDown.lat > hcmc.lat && panUp.lat < hcmc.lat && Math.abs((MT.latLonToWorldPx(hcmc.lat, hcmc.lon, Z15).y - MT.latLonToWorldPx(panDown.lat, panDown.lon, Z15).y) - 256) < 1e-6, `down=${panDown.lat.toFixed(5)} up=${panUp.lat.toFixed(5)}`);
  const panAnti = MT.panCenterByPixels({ lat: 10, lon: 179.9999 }, Z15, -256, 0); // kéo sang đông qua kinh tuyến 180
  check("H11 kéo qua kinh tuyến 180: kinh độ gói vòng về [-180, 180)", panAnti.lon >= -180 && panAnti.lon < -179, `lon=${panAnti.lon.toFixed(5)}`);
  const panPole = MT.panCenterByPixels({ lat: 80, lon: 0 }, Z15, 0, 100000); // kéo lên cực mạnh
  check("H12 kéo quá cực: vĩ độ tâm bị kẹp <= 85.0511 (biên Mercator)", panPole.lat <= 85.05113, `lat=${panPole.lat.toFixed(5)}`);

  /* ---- Tương tác: zoom quanh điểm neo ---- */
  const VS = { w: 360, h: 340 };
  const anchor = { x: 40, y: 300 };
  const latLonAtPx = (view, px) => {
    const c = MT.latLonToWorldPx(view.center.lat, view.center.lon, view.zoom);
    return MT.worldPxToLatLon(c.x + (px.x - VS.w / 2), c.y + (px.y - VS.h / 2), view.zoom);
  };
  const projectPx = (view, ll) => {
    const c = MT.latLonToWorldPx(view.center.lat, view.center.lon, view.zoom);
    const p = MT.latLonToWorldPx(ll.lat, ll.lon, view.zoom);
    return { x: p.x - c.x + VS.w / 2, y: p.y - c.y + VS.h / 2 };
  };
  const before = { center: { lat: hcmc.lat, lon: hcmc.lon }, zoom: 10 };
  const anchorLL = latLonAtPx(before, anchor);
  const zoomedIn = MT.zoomCenterAroundAnchor(before.center, before.zoom, 13, anchor, VS);
  const anchorAfter = projectPx(zoomedIn, anchorLL);
  check("H13 zoom quanh neo (không phải tâm): điểm địa lý dưới neo GIỮ NGUYÊN pixel sau zoom 10 -> 13", Math.abs(anchorAfter.x - anchor.x) < 1e-6 && Math.abs(anchorAfter.y - anchor.y) < 1e-6, `(${anchorAfter.x.toFixed(3)},${anchorAfter.y.toFixed(3)}) vs (${anchor.x},${anchor.y})`);
  const zoomedOut = MT.zoomCenterAroundAnchor(before.center, before.zoom, 6.5, anchor, VS);
  const anchorAfterOut = projectPx(zoomedOut, anchorLL);
  check("H14 zoom RA quanh neo + zoom lẻ (10 -> 6.5): neo vẫn bất biến", Math.abs(anchorAfterOut.x - anchor.x) < 1e-6 && Math.abs(anchorAfterOut.y - anchor.y) < 1e-6, `(${anchorAfterOut.x.toFixed(3)},${anchorAfterOut.y.toFixed(3)})`);
  const centerZoom = MT.zoomCenterAroundAnchor(before.center, before.zoom, 12, { x: VS.w / 2, y: VS.h / 2 }, VS);
  check("H15 zoom quanh đúng tâm khung: tâm không đổi", Math.abs(centerZoom.center.lat - before.center.lat) < 1e-9 && Math.abs(centerZoom.center.lon - before.center.lon) < 1e-9, `zoom=${centerZoom.zoom}`);
  const clampHi = MT.zoomCenterAroundAnchor(before.center, before.zoom, 25, anchor, VS);
  const clampLo = MT.zoomCenterAroundAnchor(before.center, before.zoom, 1, anchor, VS);
  check("H16 zoom bị kẹp [3, 18]: xin 25 -> 18, xin 1 -> 3", clampHi.zoom === 18 && clampLo.zoom === 3, `hi=${clampHi.zoom} lo=${clampLo.zoom}`);

  /* ---- Gạch: gói X / kẹp Y ---- */
  check("H17 wrapTileX gói vòng qua biên thế giới: -1 -> 2^z-1, 2^z -> 0, trong biên giữ nguyên", MT.wrapTileX(-1, 15) === 32767 && MT.wrapTileX(32768, 15) === 0 && MT.wrapTileX(26089, 15) === 26089, `${MT.wrapTileX(-1, 15)},${MT.wrapTileX(32768, 15)}`);
  check("H18 clampTileY kẹp vào [0, 2^z-1]: -5 -> 0, 99999 -> 32767, trong biên giữ nguyên", MT.clampTileY(-5, 15) === 0 && MT.clampTileY(99999, 15) === 32767 && MT.clampTileY(15392, 15) === 15392, `${MT.clampTileY(-5, 15)},${MT.clampTileY(99999, 15)}`);
}

/* ================= I) WIDGET MÀN HÌNH CHÍNH ================= */
console.log("\n--- I) Widget: công tắc riêng + props + timeline ---");
{
  const variantOf = (day, note, tree) => WG.widgetLayoutVariant({ showDay: day, showNote: note, showTree: tree });
  check("I1 bố cục theo tổ hợp công tắc: 8 tổ hợp -> 8 biến thể đúng", [
    [false, false, false, "none"], [true, true, true, "all"],
    [true, true, false, "noteDay"], [false, true, true, "noteTree"],
    [true, false, true, "dayTree"], [false, true, false, "note"],
    [true, false, false, "day"], [false, false, true, "tree"],
  ].every(([d, n, t, v]) => variantOf(d, n, t) === v));

  check("I2 mặc định cả ba công tắc TẮT -> biến thể 'none' (trạng thái gợi ý)", (() => {
    const st = fresh();
    return st.widgetPrefs.A.day === false && st.widgetPrefs.A.note === false && st.widgetPrefs.A.tree === false
      && WG.widgetLayoutVariant(WG.buildWidgetProps(WG.widgetInputFromState(st, "A", NOW))) === "none";
  })());

  // Ngày 252 (bắt đầu 251 ngày trước): giai đoạn 5 "Nụ hoa", còn 365-252 = 113 ngày lên giai đoạn 6.
  const st252 = MO.normalizeState({ couple: { startDate: dayKeyAgo(251) }, widgetPrefs: { A: { day: true, note: true, tree: true } } });
  const p252 = WG.buildWidgetProps(WG.widgetInputFromState(st252, "A", NOW));
  check("I3 props ngày 252: dayCount 252, cây giai đoạn 5 'Nụ hoa', còn 113 ngày lên giai đoạn", p252.dayCount === 252 && p252.treeStage === 5 && p252.treeStageName === "Nụ hoa" && p252.daysToNextStage === 113, `stage=${p252.treeStage} next=${p252.daysToNextStage}`);

  const st100 = MO.normalizeState({ couple: { startDate: dayKeyAgo(99) }, widgetPrefs: { A: { day: true, note: false, tree: false } } });
  const p100 = WG.buildWidgetProps(WG.widgetInputFromState(st100, "A", NOW));
  check("I4 đúng ngày mốc 100: milestoneToday = true, dayProgress = 1, chữ có mốc 100", p100.dayCount === 100 && p100.milestoneToday === true && p100.dayProgress === 1 && p100.milestoneText.includes("100"));

  const st150 = MO.normalizeState({ couple: { startDate: dayKeyAgo(149) }, widgetPrefs: { A: { day: true, note: false, tree: false } } });
  const p150 = WG.buildWidgetProps(WG.widgetInputFromState(st150, "A", NOW));
  check("I5 ngày 150: tiến độ tới mốc 200 = (150-100)/(200-100) = 0.5, còn 50 ngày", Math.abs(p150.dayProgress - 0.5) < 1e-9 && p150.milestoneText.includes("50 ngày") && p150.milestoneText.includes("200"), p150.milestoneText);

  // Note: phải chọn note mới nhất của NGƯỜI ẤY (slot B khi mình là A), không phải của mình.
  const noteMine = { id: "n-mine", authorSlot: "A", text: "Note của mình mới nhất", mood: "", createdAt: iso(NOW - 1 * MIN), readAt: "" };
  const notePartner = { id: "n-partner", authorSlot: "B", text: "Note của người ấy", mood: "", createdAt: iso(NOW - 3 * H), readAt: "" };
  const stNotes = MO.normalizeState({ couple: { startDate: dayKeyAgo(10) }, notes: [noteMine, notePartner], widgetPrefs: { A: { day: false, note: true, tree: false } } });
  const pNotes = WG.buildWidgetProps(WG.widgetInputFromState(stNotes, "A", NOW));
  check("I6 module Note chọn note của NGƯỜI ẤY (dù note của mình mới hơn) + chưa xem + '3 giờ trước'", pNotes.noteId === "n-partner" && pNotes.noteText === "Note của người ấy" && pNotes.noteUnread === true && pNotes.noteRelativeTime === "3 giờ trước", `${pNotes.noteId}/${pNotes.noteRelativeTime}`);
  const pNotesRead = WG.buildWidgetProps(WG.widgetInputFromState(MO.normalizeState({ couple: { startDate: dayKeyAgo(10) }, notes: [{ ...notePartner, readAt: iso(NOW - 2 * H) }], widgetPrefs: { A: { note: true } } }), "A", NOW));
  check("I7 note đã đọc -> noteUnread = false", pNotesRead.noteUnread === false);

  const longNote = "Hôm nay trời đẹp quá, mình đi dạo quanh hồ và nghĩ về những ngày đầu hai đứa mới quen nhau, mọi thứ vẫn còn nguyên vẹn như thế. ".repeat(3).trim();
  const tFull = WG.truncateNoteText(longNote, WG.NOTE_TEXT_BUDGET);
  const tShort = WG.truncateNoteText(longNote, WG.NOTE_SHORT_BUDGET);
  check("I8 cắt note: không vượt ngân sách, kết bằng '…', một dòng, cắt ở ranh giới từ", tFull.length <= WG.NOTE_TEXT_BUDGET && tShort.length <= WG.NOTE_SHORT_BUDGET && tFull.endsWith("…") && !tFull.includes("\n") && !tFull.slice(0, -1).endsWith(" "), `${tFull.length}/${tShort.length}`);
  check("I9 cắt note: note ngắn giữ nguyên; note toàn khoảng trắng -> rỗng", WG.truncateNoteText("Yêu bạn", 150) === "Yêu bạn" && WG.truncateNoteText("  \n  ", 150) === "");

  // Timeline: hôm nay ngày 29 (giai đoạn 2) — entry ngày mai phải sang ngày 30 (giai đoạn 3).
  const baseTl = { startDate: dayKeyAgo(28), prefs: { day: true, note: false, tree: true }, partnerNote: null };
  const tl = WG.buildWidgetTimeline(baseTl, NOW, 30);
  check("I10 timeline 30 ngày: 31 entry, entry sau 0 giờ địa phương, ngày tăng dần đều +1", tl.length === 31 && tl.slice(1).every((e) => e.date.getHours() === 0 && e.date.getMinutes() === 0) && tl.every((e, i) => e.props.dayCount === 29 + i), `${tl[0].props.dayCount}->${tl[30].props.dayCount}`);
  check("I11 timeline qua ranh giới GIAI ĐOẠN: entry 0 giai đoạn 2, entry ngày mai giai đoạn 3", tl[0].props.treeStage === 2 && tl[1].props.treeStage === 3 && tl[1].props.daysToNextStage === 70, `s0=${tl[0].props.treeStage} s1=${tl[1].props.treeStage}`);

  const baseMs = { startDate: dayKeyAgo(98), prefs: { day: true, note: false, tree: false }, partnerNote: null };
  const tlMs = WG.buildWidgetTimeline(baseMs, NOW, 3);
  check("I12 timeline qua MỐC NGÀY: hôm nay 99 (chưa mốc), ngày mai 100 (milestoneToday)", tlMs[0].props.dayCount === 99 && tlMs[0].props.milestoneToday === false && tlMs[1].props.dayCount === 100 && tlMs[1].props.milestoneToday === true);

  // Reducer: WIDGET_PREFS_SET chỉ sửa slot của chính người thao tác + no-op khi không đổi.
  const stW = fresh();
  const stW1 = R.gardenReducer(stW, { type: "WIDGET_PREFS_SET", user: "A", prefs: { note: true } });
  check("I13 WIDGET_PREFS_SET: chỉ slot A đổi (note=true), slot B giữ nguyên tắt", stW1.widgetPrefs.A.note === true && stW1.widgetPrefs.A.day === false && stW1.widgetPrefs.B.note === false);
  const stW2 = R.gardenReducer(stW1, { type: "WIDGET_PREFS_SET", user: "A", prefs: { note: true } });
  check("I14 WIDGET_PREFS_SET không đổi giá trị -> no-op (cùng reference)", stW2 === stW1);
  const stW3 = R.gardenReducer(stW1, { type: "WIDGET_PREFS_SET", user: "A", prefs: { day: "yes" } });
  check("I15 WIDGET_PREFS_SET giá trị không phải boolean -> bỏ qua (no-op)", stW3 === stW1);

  const stNorm = MO.normalizeState({ widgetPrefs: { A: { day: true, note: "x", tree: 1 }, B: null } });
  check("I16 normalize widgetPrefs: boolean thật được giữ, rác -> tắt, thiếu -> tắt cả ba", stNorm.widgetPrefs.A.day === true && stNorm.widgetPrefs.A.note === false && stNorm.widgetPrefs.A.tree === false && stNorm.widgetPrefs.B.day === false && stNorm.widgetPrefs.B.note === false && stNorm.widgetPrefs.B.tree === false);

  // Merge: công tắc của ai người đó thắng (đóng dấu secTs qua dispatchWithStamps).
  const localMine = R.dispatchWithStamps(fresh(), { type: "WIDGET_PREFS_SET", user: "A", prefs: { note: true } });
  const remoteStale = { ...fresh(), widgetPrefs: { A: { day: false, note: false, tree: false }, B: { day: false, note: false, tree: false } }, secTs: { "widgetPrefs:A": { t: iso(NOW - 60000), by: "B" } } };
  const mergedMine = M.mergeStates(localMine, MO.normalizeState(remoteStale), "A");
  check("I17 merge: công tắc của A do A sửa thắng bản cũ phía máy B ghi hộ", mergedMine.widgetPrefs.A.note === true);
  const remoteB = R.dispatchWithStamps({ ...fresh(), currentUser: "B" }, { type: "WIDGET_PREFS_SET", user: "B", prefs: { day: true, tree: true } });
  const mergedBoth = M.mergeStates(localMine, remoteB, "A");
  check("I18 merge: hai máy giữ độc lập — A note=true (của A), B day+tree=true (của B)", mergedBoth.widgetPrefs.A.note === true && mergedBoth.widgetPrefs.B.day === true && mergedBoth.widgetPrefs.B.tree === true && mergedBoth.widgetPrefs.B.note === false);

  // Neo vào 12:00 trưa hôm nay để phép so lệch 20 phút không bao giờ vấp nửa đêm.
  const noon = new Date(); noon.setHours(12, 0, 0, 0);
  const NOON = noon.getTime();
  const startNoon = T.dayKeyLocal(new Date(NOON - 10 * 24 * H));
  const pSig1 = WG.buildWidgetProps({ startDate: startNoon, prefs: { day: true, note: true, tree: false }, partnerNote: { id: "x1", text: "Chào bạn", authorName: "Bé B", createdAt: iso(NOON - 3 * H), readAt: "" }, nowMs: NOON });
  const pSig2 = WG.buildWidgetProps({ startDate: startNoon, prefs: { day: true, note: true, tree: false }, partnerNote: { id: "x1", text: "Chào bạn", authorName: "Bé B", createdAt: iso(NOON - 3 * H), readAt: "" }, nowMs: NOON + 20 * MIN });
  const pSig3 = WG.buildWidgetProps({ startDate: startNoon, prefs: { day: true, note: true, tree: false }, partnerNote: { id: "x2", text: "Note khác", authorName: "Bé B", createdAt: iso(NOON - 1 * H), readAt: "" }, nowMs: NOON });
  check("I19 chữ ký widget: lệch 20 phút (chỉ đổi chữ 'x giờ trước') -> chữ ký GIỐNG; note mới -> chữ ký KHÁC", WG.widgetSignature(pSig1) === WG.widgetSignature(pSig2) && WG.widgetSignature(pSig1) !== WG.widgetSignature(pSig3));

  const st800 = MO.normalizeState({ couple: { startDate: dayKeyAgo(799) }, widgetPrefs: { A: { tree: true } } });
  const p800 = WG.buildWidgetProps(WG.widgetInputFromState(st800, "A", NOW));
  check("I20 giai đoạn cuối (ngày 800): stage 7, daysToNextStage = -1, treeProgress = 1", p800.dayCount === 800 && p800.treeStage === 7 && p800.daysToNextStage === -1 && p800.treeProgress === 1);
}

/* ================= J) ĐƯỜNG PUSH NHỊP NHỚ (notify-heartbeat) ================= */
console.log("\n--- J) Push từng nhịp nhớ ---");
{
  // push.js kéo theo React Native/Expo — nạp nó trong Node bằng cách chèn sẵn
  // các module giả vào require.cache (chỉ tầng invoke edge function là thật,
  // và nó cũng được thay bằng mock ghi lại lời gọi qua mối nối test của push.ts).
  const buildDir = path.join(path.dirname(fileURLToPath(import.meta.url)), ".build");
  const stubModule = (spec, exportsObj) => {
    const resolved = require.resolve(spec, { paths: [buildDir] });
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj, children: [], paths: [] };
  };
  stubModule("react-native", { Platform: { OS: "ios" } });
  stubModule("expo-constants", { executionEnvironment: "standalone", expoConfig: { extra: {} } });
  stubModule("expo-notifications", {
    getPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
    requestPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
    getExpoPushTokenAsync: async () => ({ data: "ExponentPushToken[test]" }),
    setNotificationHandler: () => {},
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    registerTaskAsync: async () => {},
    BackgroundNotificationTaskResult: { NewData: "newData", Failed: "failed" },
  });
  stubModule("expo-task-manager", { defineTask: () => {} });
  stubModule("./supabase", { getSupabase: () => { throw new Error("không được chạm Supabase thật trong test"); } });
  stubModule("./widgetSync", { refreshWidgetForIncomingNote: async () => {} });
  const PUSH = require("./.build/push.js");

  const calls = [];
  PUSH.setFunctionsInvokerForTest(async (name) => { calls.push(name); });
  // Mô phỏng ĐÚNG luồng UI (QuickActions + trang Nhà): dispatch xong là gọi notify.
  let st = fresh();
  for (let i = 0; i < 3; i++) {
    st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
    PUSH.notifyPartnerOfHeartbeat();
  }
  check("J1 3 lần gửi liên tiếp = 3 sự kiện riêng + ĐÚNG 3 lần thử gọi notify-heartbeat", st.pings.A.total === 3 && calls.length === 3 && calls.every((n) => n === "notify-heartbeat"), calls.join(","));
  PUSH.notifyPartnerOfNote();
  check("J2 đường note không đổi: notifyPartnerOfNote vẫn gọi notify-note", calls.length === 4 && calls[3] === "notify-note");
  PUSH.setFunctionsInvokerForTest(async () => { throw new Error("function chưa deploy"); });
  let threw = false;
  try { PUSH.notifyPartnerOfHeartbeat(); } catch { threw = true; }
  check("J3 invoke lỗi (chưa deploy/mất mạng) -> nuốt êm, không ném ra ngoài", threw === false);
  PUSH.setFunctionsInvokerForTest(null);
}

/* ================= K) CÂU TÌNH HÔM NAY + LỜI CHÀO (đợt "chất app" 1) ================= */
console.log("\n--- K) Câu tình hôm nay + lời chào theo buổi ---");
{
  check("K1 kho câu tình đúng 30 câu, không câu rỗng", CT.DAILY_QUOTES.length === 30
    && CT.DAILY_QUOTES.every((q) => typeof q === "string" && q.trim().length > 0));
  const keyA = "2026-10-25";
  check("K2 dailyQuote XÁC ĐỊNH: cùng khóa ngày -> cùng câu (2 máy khớp nhau)",
    CT.dailyQuote(keyA) === CT.dailyQuote(keyA) && CT.DAILY_QUOTES.includes(CT.dailyQuote(keyA)));
  const seen = new Set();
  for (let d = 0; d < 60; d++) seen.add(CT.dailyQuote(T.dayKeyLocal(new Date(2026, 8, 1 + d))));
  check("K3 dailyQuote đổi câu theo ngày (60 ngày có >10 câu khác nhau)", seen.size > 10, `${seen.size} câu khác nhau`);
  check("K4 dayPartForHour: 6h sáng · 12h trưa · 16h chiều · 21h tối · 2h tối",
    CT.dayPartForHour(6) === "sang" && CT.dayPartForHour(12) === "trua"
    && CT.dayPartForHour(16) === "chieu" && CT.dayPartForHour(21) === "toi" && CT.dayPartForHour(2) === "toi");
  check("K5 greetingLine gọi tên CẢ HAI người ở mọi buổi",
    [7, 12, 16, 21].every((h) => { const g = CT.greetingLine(h, "Tín", "Vy"); return g.includes("Tín") && g.includes("Vy"); }));
  check("K6 greetingLine 4 buổi là 4 câu khác nhau",
    new Set([7, 12, 16, 21].map((h) => CT.greetingLine(h, "An", "Bình"))).size === 4);
}

/* ================= L) KỶ VẬT (đợt "chất app" 2): HỘP THƯ ĐÃ GIỮ + HÀNH TRÌNH MỐC ================= */
console.log("\n--- L) Kỷ vật: hộp thư đã giữ + lịch sử mốc ---");
{
  // L1: chăm cây rơi thư -> ghi kỷ vật kind "care", nội dung chụp từ kho thư
  const dropCare = CT.makeLetterMoment("common", "Rơi khi chăm cây", "A", iso(NOW));
  const stL1 = R.gardenReducer({ ...fresh(), tree: mkTree({ water: 50, sun: 50, love: 50 }) },
    { type: "TREE_CARE", kind: "water", user: "A", actor: "An", drop: dropCare, combo: false });
  check("L1 TREE_CARE có drop -> keptLetters +1, kind 'care', id/nội dung/thời điểm khớp khoảnh khắc",
    stL1.keptLetters.length === 1 && stL1.keptLetters[0].id === dropCare.id && stL1.keptLetters[0].kind === "care"
    && stL1.keptLetters[0].text === CT.messageById(dropCare.messageId).text && stL1.keptLetters[0].receivedAt === dropCare.at);

  // L2: combo Song chăm -> kind "combo"
  const dropCombo = CT.makeLetterMoment("rare", "Combo Song chăm", "A", iso(NOW));
  const stL2 = R.gardenReducer({ ...fresh(), tree: mkTree({ water: 50, sun: 50, love: 50 }) },
    { type: "TREE_CARE", kind: "sun", user: "A", actor: "An", drop: dropCombo, combo: true });
  check("L2 TREE_CARE combo -> kỷ vật kind 'combo'", stL2.keptLetters.length === 1 && stL2.keptLetters[0].kind === "combo");

  // L3: thư lên giai đoạn -> kind "stage"; 2 máy cùng ghi sự kiện xác định -> merge còn đúng 1 bản, receivedAt sớm hơn thắng
  const sDrop = CT.makeStageUpLetter(3, false, "A", iso(NOW));
  const phoneA = R.gardenReducer(fresh(), { type: "CELEBRATE_TREE_STAGE", stage: 4, drop: sDrop });
  const phoneB = R.gardenReducer(fresh(), { type: "CELEBRATE_TREE_STAGE", stage: 4, drop: { ...sDrop, at: iso(NOW + 5000) } });
  const mergedL3 = M.mergeStates(phoneA, phoneB, "A");
  check("L3 thư giai đoạn kind 'stage'; 2 máy ghi trùng -> merge đúng 1 bản, giữ receivedAt sớm hơn",
    phoneA.keptLetters.length === 1 && phoneA.keptLetters[0].kind === "stage"
    && mergedL3.keptLetters.filter((k) => k.id === sDrop.id).length === 1 && mergedL3.keptLetters[0].receivedAt === sDrop.at);

  // L4: addKeptLetter khử trùng theo id — bản receivedAt sớm hơn thắng bất kể thứ tự thêm
  const kEarly = F.keptLetterFromMoment({ id: "dup1", messageId: 3, rarity: "common", source: "s", at: iso(NOW), bySlot: "A" }, "care");
  const kLate = { ...kEarly, receivedAt: iso(NOW + 60000) };
  const listL4 = F.addKeptLetter(F.addKeptLetter([], kLate), kEarly);
  check("L4 addKeptLetter trùng id -> 1 bản, receivedAt sớm hơn thắng",
    listL4.length === 1 && listL4[0].receivedAt === kEarly.receivedAt);

  // L5: trần 100 — thêm 105 lá thì giữ 100 lá MỚI nhất, cũ nhất rơi ra
  let listL5 = [];
  for (let i = 0; i < 105; i++) {
    listL5 = F.addKeptLetter(listL5, { id: `k${i}`, messageId: 1, text: "t", rarity: "common", kind: "care", source: "", bySlot: "A", receivedAt: iso(NOW + i * 1000) });
  }
  check("L5 trần 100: 105 lá -> còn 100, mới nhất đứng đầu, 5 lá cũ nhất bị rơi",
    listL5.length === 100 && listL5[0].id === "k104" && listL5[listL5.length - 1].id === "k5");

  // L6: MARK_MILESTONE ghi lịch sử đúng 1 lần (idempotent, không thêm dấu vết lần 2)
  let stL6 = R.gardenReducer(fresh(), { type: "MARK_MILESTONE", days: 100, actor: "An" });
  const actsL6 = stL6.activities.length;
  stL6 = R.gardenReducer(stL6, { type: "MARK_MILESTONE", days: 100, actor: "An" });
  check("L6 MARK_MILESTONE ghi milestoneHistory 1 lần, có reachedAt, gọi lại không đổi",
    stL6.couple.milestoneHistory.length === 1 && stL6.couple.milestoneHistory[0].days === 100
    && stL6.couple.milestoneHistory[0].reachedAt !== "" && stL6.activities.length === actsL6);

  // L7: merge lịch sử mốc — union theo days, reachedAt có mốc thật thắng bản trống
  const hBase = fresh().couple;
  const hA = { ...fresh(), couple: { ...hBase, celebrated: [100], milestoneHistory: [{ days: 100, reachedAt: iso(NOW) }] } };
  const hB = { ...fresh(), couple: { ...hBase, celebrated: [200], milestoneHistory: [{ days: 200, reachedAt: iso(NOW + 1000) }, { days: 100, reachedAt: "" }] } };
  const hM = M.mergeStates(hA, hB, "A");
  check("L7 merge milestoneHistory: union [100,200] tăng dần, mốc 100 giữ reachedAt thật",
    hM.couple.milestoneHistory.map((h) => h.days).join(",") === "100,200" && hM.couple.milestoneHistory[0].reachedAt === iso(NOW));

  // L8: bản lưu CŨ (chưa có keptLetters/milestoneHistory) migrate sạch: [] + backfill từ celebrated
  const oldSave = MO.normalizeState({ couple: { startDate: "2026-02-14", celebrated: [100, 200] } });
  check("L8 normalize bản cũ: keptLetters [] + milestoneHistory backfill reachedAt rỗng",
    oldSave.keptLetters.length === 0
    && oldSave.couple.milestoneHistory.map((h) => h.days).join(",") === "100,200"
    && oldSave.couple.milestoneHistory.every((h) => h.reachedAt === ""));

  // L9: normalize lọc kỷ vật hỏng + khử trùng (bản trùng muộn hơn bị loại)
  const messy = MO.normalizeState({ keptLetters: [
    { id: "ok1", messageId: 5, text: "x", rarity: "rare", kind: "stage", source: "s", bySlot: "B", receivedAt: iso(NOW) },
    { id: "", messageId: 5 },
    { id: "bad", messageId: 99 },
    "junk",
    { id: "ok1", messageId: 5, text: "x", rarity: "rare", kind: "stage", source: "s", bySlot: "B", receivedAt: iso(NOW + 9999) },
  ] });
  check("L9 normalize keptLetters: lọc hỏng, trùng id giữ bản sớm hơn",
    messy.keptLetters.length === 1 && messy.keptLetters[0].id === "ok1" && messy.keptLetters[0].receivedAt === iso(NOW));

  // L10: milestoneDateKey — ngày thứ N của cặp đôi rơi đúng khóa ngày có dayCount = N
  check("L10 milestoneDateKey: dayCount tại trưa của khóa ngày trả về === đúng số mốc",
    [100, 200, 365].every((n) => F.dayCount("2026-02-14", new Date(`${F.milestoneDateKey("2026-02-14", n)}T12:00:00`).getTime()) === n)
    && F.milestoneDateKey("2026-02-14", 100) === "2026-05-24");
}

/* ================= M) ẢNH CỦA HAI ĐỨA (đợt "chất app" 3) ================= */
console.log("\n--- M) Ảnh của hai đứa: state + merge LWW theo updatedAt ---");
{
  const photoOld = { path: "couple-1/photo.jpg", updatedAt: iso(NOW - H), bySlot: "A" };
  const photoNew = { path: "couple-1/photo.jpg", updatedAt: iso(NOW), bySlot: "B" };

  // M1: merge hai phía đều có ảnh — updatedAt mới hơn thắng, bất kể phía local/remote
  const mNewLocal = M.mergeStates({ ...fresh(), couplePhoto: photoNew }, { ...fresh(), couplePhoto: photoOld }, "A");
  const mNewRemote = M.mergeStates({ ...fresh(), couplePhoto: photoOld }, { ...fresh(), couplePhoto: photoNew }, "A");
  check("M1 merge ảnh: updatedAt mới hơn thắng ở cả hai chiều local/remote",
    mNewLocal.couplePhoto?.updatedAt === photoNew.updatedAt && mNewLocal.couplePhoto?.bySlot === "B"
    && mNewRemote.couplePhoto?.updatedAt === photoNew.updatedAt && mNewRemote.couplePhoto?.bySlot === "B");

  // M2: một phía chưa có ảnh — phía đã có thắng (null không bao giờ đè ảnh thật)
  const mNullLocal = M.mergeStates({ ...fresh(), couplePhoto: null }, { ...fresh(), couplePhoto: photoOld }, "A");
  const mNullRemote = M.mergeStates({ ...fresh(), couplePhoto: photoOld }, { ...fresh(), couplePhoto: null }, "A");
  check("M2 merge ảnh: null thua ảnh đã đặt ở cả hai chiều",
    mNullLocal.couplePhoto?.updatedAt === photoOld.updatedAt && mNullRemote.couplePhoto?.updatedAt === photoOld.updatedAt);

  // M3: cả hai phía chưa có -> vẫn null
  check("M3 merge ảnh: hai phía đều null -> null",
    M.mergeStates(fresh(), fresh(), "A").couplePhoto === null);

  // M4: hoà updatedAt -> giữ bản local (ổn định, không nhảy qua lại giữa 2 máy)
  const tieA = { path: "couple-1/photo.jpg", updatedAt: iso(NOW), bySlot: "A" };
  const tieB = { path: "couple-1/photo.jpg", updatedAt: iso(NOW), bySlot: "B" };
  check("M4 merge ảnh: hoà mốc -> giữ local",
    M.mergeCouplePhoto(tieA, tieB) === tieA && M.mergeCouplePhoto(null, null) === null);

  // M5: normalize — bản lưu CŨ (chưa có couplePhoto) migrate về null, không crash
  check("M5 normalize bản cũ: couplePhoto mặc định null",
    MO.normalizeState(null).couplePhoto === null
    && MO.normalizeState({ couple: { startDate: "2026-02-14" } }).couplePhoto === null);

  // M6: normalize — ảnh hợp lệ được giữ nguyên; shape hỏng -> null
  const okNorm = MO.normalizeState({ couplePhoto: photoNew });
  const badNorm = MO.normalizeState({ couplePhoto: { path: "", updatedAt: iso(NOW), bySlot: "A" } });
  const badSlot = MO.normalizeState({ couplePhoto: { path: "x/photo.jpg", updatedAt: iso(NOW), bySlot: "C" } });
  check("M6 normalize ảnh: hợp lệ giữ nguyên, path rỗng/bySlot sai -> null",
    okNorm.couplePhoto?.path === photoNew.path && okNorm.couplePhoto?.bySlot === "B"
    && badNorm.couplePhoto === null && badSlot.couplePhoto === null);

  // M7: reducer COUPLE_PHOTO_SET — đặt được + dấu vết; bySlot lệch người thao tác -> chặn; đặt lại y hệt -> no-op
  const stP = R.gardenReducer(fresh(), { type: "COUPLE_PHOTO_SET", photo: photoNew, user: "B", actor: "Bình" });
  const stPBad = R.gardenReducer(fresh(), { type: "COUPLE_PHOTO_SET", photo: photoNew, user: "A", actor: "An" });
  const stPAgain = R.gardenReducer(stP, { type: "COUPLE_PHOTO_SET", photo: photoNew, user: "B", actor: "Bình" });
  check("M7 COUPLE_PHOTO_SET: hợp lệ -> có ảnh + 1 dấu vết; bySlot != user -> chặn; trùng lặp -> no-op",
    stP.couplePhoto?.bySlot === "B" && stP.activities.length === 1
    && stPBad.couplePhoto === null && stPAgain === stP);

  // M8: đường dẫn theo quy ước "{coupleId}/photo.jpg" nằm ngay trong state đã ghi
  check("M8 quy ước đường dẫn: state giữ đúng '{coupleId}/photo.jpg'",
    stP.couplePhoto?.path === "couple-1/photo.jpg");
}

/* ================= N) WEB PUSH (bản web): HELPER THUẦN CỦA lib/webpush ================= */
console.log("\n--- N) Web Push: base64url + chuẩn hoá đăng ký + nhận diện iOS ---");
{
  // Dùng lại các module giả đã chèn ở mục J (react-native Platform "ios",
  // expo-constants extra {}) — webpush.js chỉ chạm vào chúng khi được gọi.
  const WP = require("./.build/webpush.js");
  const bytesOf = (u8) => Array.from(u8);

  // N1: giải mã base64url — vector cố định + vòng tròn với oracle Buffer của Node
  check("N1 urlBase64ToUint8Array: 'SGVsbG8' -> byte của 'Hello'; rỗng -> rỗng",
    bytesOf(WP.urlBase64ToUint8Array("SGVsbG8")).join(",") === "72,101,108,108,111"
    && WP.urlBase64ToUint8Array("").length === 0);
  const raw65 = Uint8Array.from({ length: 65 }, (_, i) => (i * 37 + 4) % 256);
  raw65[0] = 4; // giống khóa VAPID công khai: điểm EC chưa nén bắt đầu bằng 0x04
  const raw65B64Url = Buffer.from(raw65).toString("base64url");
  check("N2 urlBase64ToUint8Array khớp oracle Buffer với khóa 65 byte chứa ký tự - và _",
    bytesOf(WP.urlBase64ToUint8Array(raw65B64Url)).join(",") === bytesOf(raw65).join(","),
    raw65B64Url.slice(0, 16) + "...");
  check("N3 bytesToUrlBase64: mã hoá 'Hello' -> 'SGVsbG8' và vòng tròn decode(encode(x)) = x",
    WP.bytesToUrlBase64(Uint8Array.from([72, 101, 108, 108, 111])) === "SGVsbG8"
    && bytesOf(WP.urlBase64ToUint8Array(WP.bytesToUrlBase64(raw65))).join(",") === bytesOf(raw65).join(","));

  // N4: chuẩn hoá đăng ký trình duyệt thành dòng DB
  const row = WP.subscriptionToRow(
    { endpoint: "https://push.example/abc", expirationTime: null, keys: { p256dh: "P256DH", auth: "AUTH" } },
    "user-1", "Mozilla/5.0 Test",
  );
  check("N4 subscriptionToRow: JSON hợp lệ -> dòng đủ endpoint/p256dh/auth/user_id/user_agent",
    row?.endpoint === "https://push.example/abc" && row?.p256dh === "P256DH" && row?.auth === "AUTH"
    && row?.user_id === "user-1" && row?.user_agent === "Mozilla/5.0 Test");
  check("N5 subscriptionToRow: thiếu keys / endpoint rỗng / null -> null (không lưu rác)",
    WP.subscriptionToRow({ endpoint: "https://push.example/abc", keys: {} }, "u", "") === null
    && WP.subscriptionToRow({ endpoint: "", keys: { p256dh: "x", auth: "y" } }, "u", "") === null
    && WP.subscriptionToRow(null, "u", "") === null);

  // N6: nhận diện iOS cần thêm vào màn hình chính
  const uaIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15";
  const uaIpad = "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15";
  const uaAndroid = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0";
  check("N6 isIosNeedingHomeScreen: iPhone/iPad chưa standalone -> true; đã standalone hoặc Android -> false",
    WP.isIosNeedingHomeScreen(uaIphone, false) === true
    && WP.isIosNeedingHomeScreen(uaIpad, false) === true
    && WP.isIosNeedingHomeScreen(uaIphone, true) === false
    && WP.isIosNeedingHomeScreen(uaAndroid, false) === false);

  // N7: so khớp khóa ứng dụng của đăng ký sẵn có với khóa VAPID hiện tại
  const keyBuf = WP.urlBase64ToUint8Array(raw65B64Url).buffer;
  check("N7 applicationServerKeyMatches: cùng byte -> true; khác byte/rỗng/null -> false",
    WP.applicationServerKeyMatches(keyBuf, raw65B64Url) === true
    && WP.applicationServerKeyMatches(new Uint8Array(65).buffer, raw65B64Url) === false
    && WP.applicationServerKeyMatches(null, raw65B64Url) === false
    && WP.applicationServerKeyMatches(keyBuf, "") === false);

  // N8: ngoài web (stub Platform "ios") -> trạng thái unsupported + chưa có khóa VAPID
  const statusNative = await WP.getWebPushStatus();
  check("N8 ngoài nền tảng web: getWebPushStatus = 'unsupported' và vapidPublicKey = '' khi extra trống",
    statusNative === "unsupported" && WP.vapidPublicKey() === "");
}

/* ================= O) SÂU TRÊN CÂY (đợt "chăm cây 2") ================= */
console.log("\n--- O) Sâu trên cây: xuất hiện theo seed + bắt + hết hạn ---");
{
  // Cây bị bỏ bê: lần chăm cuối cách đây 30 giờ, chỉ số đã hao.
  const neglectedBase = {
    ...fresh(),
    tree: mkTree({
      plantedAt: iso(NOW - 200 * H), growthAt: iso(NOW - 30 * H), statsAt: iso(NOW - 30 * H),
      water: 60, sun: 60, love: 60, lastCareAt: iso(NOW - 30 * H), lastCareBySlot: "A",
    }),
  };
  // Quét tối đa 30 ngày tới để tìm một ngày roll thăm "trúng" đợt sâu (xác suất
  // bỏ bê 50%/ngày — 30 ngày liên tiếp trượt là ~0). Test không phụ thuộc ngày cụ thể.
  // Mốc dò của mỗi ngày neo ở 17:00 giờ địa phương của CHÍNH ngày đó — KHÔNG lấy
  // NOW + d*24h: giờ xuất hiện theo seed luôn nằm trong 7h–15h và cửa sổ sống dài
  // 12h, nên 17:00 rơi vào MỌI cửa sổ sống có thể của ngày (xuất hiện trễ nhất
  // 15h, hết hạn sớm nhất 19h) và probe - appearedAt luôn < 12h như O2 đòi hỏi.
  // Neo theo đồng hồ tường lúc chạy test là mong manh theo giờ: chạy lúc 0–7h
  // sáng, mốc dò của cả 30 ngày đều đứng TRƯỚC giờ xuất hiện sớm nhất (7h) nên
  // pestSpawnFor trả null dù roll trúng — O1 đã trượt đúng kiểu này lúc
  // 2026-10-26 00:09 (Asia/Saigon), roll thực tế trúng cả 5 ngày đầu (0.18–0.19).
  let spawnProbe = 0;
  let spawnEvent = null;
  for (let d = 0; d < 30 && !spawnEvent; d++) {
    const probeDayStart = T.parseDateKey(dayKeyAgo(-d));
    spawnProbe = probeDayStart.getTime() + 17 * H;
    spawnEvent = F.pestSpawnFor(neglectedBase, spawnProbe);
  }
  check("O1 cây bị bỏ bê: trong 30 ngày phải có ngày sâu xuất hiện theo seed", spawnEvent !== null && spawnEvent.status === "active");
  const again = F.pestSpawnFor(neglectedBase, spawnProbe);
  check("O2 pestSpawnFor XÁC ĐỊNH: cùng state + cùng mốc -> cùng một sự kiện (2 máy khớp nhau)",
    JSON.stringify(again) === JSON.stringify(spawnEvent)
    && new Date(spawnEvent.appearedAt).getTime() <= spawnProbe
    && spawnProbe - new Date(spawnEvent.appearedAt).getTime() < 12 * H);
  const withActive = { ...neglectedBase, treePest: spawnEvent };
  check("O3 đang có sâu sống -> không sinh đợt mới chồng lên", F.pestSpawnFor(withActive, spawnProbe) === null);
  const withCaught = { ...neglectedBase, treePest: { ...spawnEvent, status: "caught", caughtBy: "A", caughtAt: iso(spawnProbe) } };
  check("O4 ngày đó đã có đợt sâu (dù đã bắt) -> không sinh đợt thứ hai trong ngày", F.pestSpawnFor(withCaught, spawnProbe) === null);

  const activeNow = { id: `pest-${todayStr}`, dateKey: todayStr, appearedAt: iso(NOW - H), status: "active", caughtBy: "", caughtAt: "", expiredAt: "" };
  let st = { ...fresh(), treePest: activeNow };
  const spawned = R.gardenReducer(fresh(), { type: "PEST_SPAWN", event: activeNow });
  const spawnedTwice = R.gardenReducer(spawned, { type: "PEST_SPAWN", event: activeNow });
  check("O5 PEST_SPAWN idempotent: ghi 1 lần, dispatch lại cùng sự kiện -> no-op",
    spawned.treePest?.status === "active" && spawnedTwice === spawned);
  const caught = R.gardenReducer(st, { type: "TREE_CARE", kind: "bug", user: "A", actor: "An" });
  check("O6 bắt sâu khi CÓ sâu: sự kiện -> caught + ghi người bắt + dấu vết 'vừa bắt sâu cho cây'",
    caught.treePest?.status === "caught" && caught.treePest?.caughtBy === "A"
    && caught.activities[0]?.text === "vừa bắt sâu cho cây");
  const noPest = fresh();
  const blockedCatch = R.gardenReducer(noPest, { type: "TREE_CARE", kind: "bug", user: "A", actor: "An" });
  check("O7 bắt sâu khi KHÔNG có sâu: reducer chặn cứng (trả nguyên state)", blockedCatch === noPest);
  const csNoPest = TR.careStatus(noPest.tree, "bug", "A", NOW, null);
  const csPest = TR.careStatus(mkTree({ water: 100, sun: 100, love: 100 }), "bug", "A", NOW, activeNow);
  check("O8 careStatus: không sâu -> chặn kèm lý do 'đang sạch'; có sâu -> bắt được kể cả cây đang đầy chỉ số",
    csNoPest.ok === false && csNoPest.reason.includes("đang sạch") && csPest.ok === true);

  const oldPest = { ...activeNow, appearedAt: iso(NOW - 13 * H), dateKey: T.dayKeyLocal(new Date(NOW - 13 * H)) };
  check("O9 quá 12 giờ -> sâu không còn 'sống' (isPestActive=false)", TR.isPestActive(oldPest, NOW) === false && TR.isPestActive(activeNow, NOW) === true);
  const expired = R.gardenReducer(st, { type: "PEST_EXPIRE", id: activeNow.id });
  const expiredTwice = R.gardenReducer(expired, { type: "PEST_EXPIRE", id: activeNow.id });
  check("O10 PEST_EXPIRE ghi hết hạn đúng 1 lần (lần 2 no-op)",
    expired.treePest?.status === "expired" && Boolean(expired.treePest?.expiredAt) && expiredTwice === expired);

  const mL = { ...fresh(), treePest: activeNow };
  const mR = { ...fresh(), treePest: { ...activeNow, status: "caught", caughtBy: "B", caughtAt: iso(NOW - 10 * MIN) } };
  const mergedPest = M.mergeStates(mL, mR, "A");
  const laterPest = { ...activeNow, id: "pest-2099-01-01", dateKey: "2099-01-01", appearedAt: iso(NOW + 24 * H) };
  const mergedDiff = M.mergeStates(mL, { ...fresh(), treePest: laterPest }, "A");
  check("O11 merge sâu: cùng id -> 'đã bắt' thắng 'đang sống'; khác id -> đợt xuất hiện muộn hơn thắng",
    mergedPest.treePest?.status === "caught" && mergedPest.treePest?.caughtBy === "B" && mergedDiff.treePest?.id === "pest-2099-01-01");

  const decayTree = mkTree({ statsAt: iso(NOW - 10 * H), water: 90, sun: 90, love: 90 });
  const plain = TR.decayedStats(decayTree, NOW);
  const withPestDecay = TR.decayedStats(decayTree, NOW, { ...activeNow, appearedAt: iso(NOW - 10 * H), dateKey: T.dayKeyLocal(new Date(NOW - 10 * H)) });
  check("O12 có sâu: hao NHANH hơn — nước hao thêm (hệ số 1.6): 90 - 25 - 15 = 50",
    Math.abs(plain.water - 65) < 0.11 && Math.abs(withPestDecay.water - 50) < 0.11, `plain=${plain.water} pest=${withPestDecay.water}`);

  check("O13 migration: bản lưu cũ/không có treePest -> null; dữ liệu rác -> null; sự kiện hợp lệ được giữ",
    MO.normalizeState({}).treePest === null
    && MO.normalizeState({ treePest: { junk: 1 } }).treePest === null
    && MO.normalizeState({ treePest: activeNow }).treePest?.id === activeNow.id);
}

/* ================= P) NHIỆM VỤ MỖI NGÀY ================= */
console.log("\n--- P) Nhiệm vụ mỗi ngày: bộ xác định + tiến độ + merge + chuỗi ---");
{
  const set1 = Q.questsForDay(todayStr);
  const set2 = Q.questsForDay(todayStr);
  check("P1 questsForDay XÁC ĐỊNH: cùng ngày -> cùng bộ 3 nhiệm vụ, kind không trùng, đều thuộc pool",
    JSON.stringify(set1) === JSON.stringify(set2) && set1.length === 3
    && new Set(set1.map((q) => q.kind)).size === 3
    && set1.every((q) => Q.QUEST_POOL.some((d) => d.kind === q.kind)));

  const mkQ = (kind, target, over = {}) => ({ kind, target, count: 0, byA: 0, byB: 0, completedAt: "", ...over });
  const base = { dateKey: todayStr, quests: [mkQ("water", 1), mkQ("ping", 1), mkQ("care3", 3)], allCompletedAt: "" };
  const afterCare = Q.advanceDailyQuests(base, { type: "care", kind: "water", slot: "A" }, iso(NOW));
  const wq = afterCare.dq.quests.find((q) => q.kind === "water");
  const c3 = afterCare.dq.quests.find((q) => q.kind === "care3");
  const pq = afterCare.dq.quests.find((q) => q.kind === "ping");
  check("P2 chăm nước: nhiệm vụ 'water' xong (completedAt có) + 'care3' +1 + 'ping' không đổi + chưa đủ 3/3",
    wq.count === 1 && Boolean(wq.completedAt) && wq.byA === 1 && c3.count === 1 && pq.count === 0 && afterCare.justCompletedAll === false);

  let bc = { dateKey: todayStr, quests: [mkQ("bothcare", 2)], allCompletedAt: "" };
  bc = Q.advanceDailyQuests(bc, { type: "care", kind: "sun", slot: "A" }, iso(NOW)).dq;
  const bcMid = bc.quests[0];
  bc = Q.advanceDailyQuests(bc, { type: "care", kind: "sun", slot: "A" }, iso(NOW)).dq;
  const bcSame = bc.quests[0];
  const bcDone = Q.advanceDailyQuests(bc, { type: "care", kind: "love", slot: "B" }, iso(NOW));
  check("P3 'bothcare': 1 người chăm 2 lần vẫn 1/2 (count theo NGƯỜI); người kia chăm -> 2/2 + hoàn thành",
    bcMid.count === 1 && bcSame.count === 1 && bcSame.byA === 2
    && bcDone.dq.quests[0].count === 2 && Boolean(bcDone.dq.quests[0].completedAt) && bcDone.justCompletedAll === true);

  const bugCount = Q.advanceDailyQuests({ dateKey: todayStr, quests: [mkQ("care3", 3)], allCompletedAt: "" }, { type: "care", kind: "bug", slot: "B" }, iso(NOW));
  check("P4 bắt sâu cũng tính là 1 lần chăm cho 'care3'", bugCount.dq.quests[0].count === 1 && bugCount.dq.quests[0].byB === 1);

  const daySet = Q.questsForDay(todayStr);
  const lDq = { dateKey: todayStr, quests: daySet.map((q) => ({ ...q })), allCompletedAt: "" };
  const rDq = { dateKey: todayStr, quests: daySet.map((q) => ({ ...q })), allCompletedAt: "" };
  const firstKind = daySet[0].kind;
  lDq.quests[0] = { ...lDq.quests[0], count: Math.min(1, lDq.quests[0].target), byA: 1 };
  rDq.quests[0] = { ...rDq.quests[0], byB: 1 };
  const mergedDq = Q.mergeDailyQuests(lDq, rDq);
  const mergedFirst = mergedDq.quests.find((q) => q.kind === firstKind);
  const otherDay = { dateKey: dayKeyAgo(1), quests: Q.questsForDay(dayKeyAgo(1)), allCompletedAt: "" };
  const mergedDays = Q.mergeDailyQuests(otherDay, lDq);
  check("P5 merge nhiệm vụ: cùng ngày -> byA/byB hợp nhất (không mất đóng góp của máy nào); khác ngày -> ngày mới thắng",
    mergedFirst.byA === 1 && mergedFirst.byB === 1 && mergedDays.dateKey === todayStr);

  const yDq = Q.emptyDailyQuests(dayKeyAgo(1));
  const todaySet = Q.questsForDay(todayStr);
  const evFor = (kind) => (kind === "ping" ? { type: "ping", slot: "A" } : kind === "note" ? { type: "note", slot: "A" } : { type: "care", kind: kind === "sun" || kind === "love" ? kind : "water", slot: "A" });
  const rolled = Q.advanceDailyQuests(yDq, evFor(todaySet[0].kind), iso(NOW));
  check("P6 qua ngày: bộ nhiệm vụ tự lăn sang hôm nay rồi mới cộng hành động",
    rolled.dq.dateKey === todayStr && rolled.dq.quests[0].count === 1);

  const doneQ = (kind) => mkQ(kind, 1, { count: 1, byA: 1, completedAt: iso(NOW - H) });
  let stQ = {
    ...fresh(),
    tree: mkTree({ water: 50, sun: 50, love: 50 }),
    dailyQuests: { dateKey: todayStr, quests: [doneQ("water"), doneQ("note"), mkQ("ping", 1)], allCompletedAt: "" },
  };
  stQ = R.gardenReducer(stQ, { type: "PING_SEND", user: "A", actor: "An" });
  const bonusOnce = stQ.tree.water === 58 && stQ.tree.sun === 58 && stQ.tree.love === 58;
  const histOnce = stQ.questHistory.filter((k) => k === todayStr).length === 1 && Boolean(stQ.dailyQuests.allCompletedAt);
  stQ = R.gardenReducer(stQ, { type: "PING_SEND", user: "A", actor: "An" });
  check("P7 đủ 3/3 qua reducer: thưởng +8 sức sống + ghi lịch sử + allCompletedAt — và CHỈ 1 lần (nhịp tiếp theo không thưởng lại)",
    bonusOnce && histOnce && stQ.tree.water === 58 && stQ.questHistory.length === 1);

  const caredState = R.gardenReducer(fresh(), { type: "TREE_CARE", kind: "water", user: "A", actor: "An" });
  const careQuestsOk = caredState.dailyQuests.quests.every((q) => (["water", "care3", "bothcare"].includes(q.kind) ? q.byA === 1 : true));
  check("P8 TREE_CARE thành công qua reducer cũng đẩy tiến độ nhiệm vụ chăm (byA=1)", careQuestsOk && caredState.dailyQuests.dateKey === todayStr);

  check("P9 questStreak: 3 ngày liền = 3; hôm nay chưa xong tính từ hôm qua = 1; đứt 1 ngày = 0; rỗng = 0",
    Q.questStreak([todayStr, dayKeyAgo(1), dayKeyAgo(2)], todayStr) === 3
    && Q.questStreak([dayKeyAgo(1), dayKeyAgo(2)], todayStr) === 2
    && Q.questStreak([dayKeyAgo(2)], todayStr) === 0
    && Q.questStreak([], todayStr) === 0);

  const storedDq = Q.emptyDailyQuests(todayStr);
  storedDq.quests[0] = { ...storedDq.quests[0], count: 1, byA: 1, completedAt: iso(NOW - H) };
  const migrated = MO.normalizeState({ dailyQuests: storedDq, questHistory: [todayStr, "không-phải-ngày", todayStr] });
  check("P10 migration: bản cũ -> bộ nhiệm vụ hôm nay 3 việc + lịch sử rỗng; bản đã lưu -> tiến độ giữ nguyên, lịch sử lọc ngày rác + khử trùng",
    MO.normalizeState({}).dailyQuests.quests.length === 3 && MO.normalizeState({}).questHistory.length === 0
    && migrated.dailyQuests.quests[0].count === 1 && JSON.stringify(migrated.questHistory) === JSON.stringify([todayStr]));
}

/* ================= R) TRẠNG THÁI CỦA NHAU (hiện diện sống) ================= */
console.log("\n--- R) Trạng thái của nhau: ghi theo slot + merge chủ slot + độ tươi ---");
{
  let st = fresh();
  st = R.gardenReducer(st, { type: "STATUS_SET", user: "A", status: { mood: "nho", text: "  chờ em về ăn cơm  ", updatedAt: iso(NOW) } });
  check("R1 STATUS_SET ghi đúng slot của người đặt (A), chữ được trim, slot B không bị đụng",
    st.status.A?.mood === "nho" && st.status.A?.text === "chờ em về ăn cơm" && st.status.B === null);
  const invalid = R.gardenReducer(st, { type: "STATUS_SET", user: "A", status: { mood: "không-có-mood-này", text: "", updatedAt: iso(NOW) } });
  check("R2 mood ngoài bộ preset -> bị từ chối (trả nguyên state)", invalid === st);
  const long = R.gardenReducer(st, { type: "STATUS_SET", user: "B", status: { mood: "vui", text: "x".repeat(60), updatedAt: iso(NOW) } });
  check("R3 dòng tự viết bị cắt đúng 40 ký tự", long.status.B?.text.length === 40 && long.status.A?.mood === "nho");
  const cleared = R.gardenReducer(long, { type: "STATUS_SET", user: "B", status: null });
  check("R4 xoá trạng thái (status null) chỉ xoá đúng slot mình", cleared.status.B === null && cleared.status.A?.mood === "nho");

  const localSt = { ...fresh(), currentUser: "A", status: { A: { mood: "vui", text: "", updatedAt: iso(NOW) }, B: { mood: "met", text: "", updatedAt: iso(NOW - 3 * H) } } };
  const remoteSt = { ...fresh(), currentUser: "B", status: { A: { mood: "ban", text: "", updatedAt: iso(NOW - 3 * H) }, B: { mood: "nho", text: "nhớ anh", updatedAt: iso(NOW) } } };
  const mergedSt = M.mergeStates(localSt, remoteSt, "A");
  check("R5 merge trạng thái: CHỦ SLOT thắng tuyệt đối từng slot (A lấy của máy A, B lấy của máy B)",
    mergedSt.status.A?.mood === "vui" && mergedSt.status.B?.mood === "nho" && mergedSt.status.B?.text === "nhớ anh");

  check("R6 migration: bản cũ -> status null cả hai; mood rác -> null; trạng thái hợp lệ được giữ nguyên",
    MO.normalizeState({}).status.A === null && MO.normalizeState({}).status.B === null
    && MO.normalizeState({ status: { A: { mood: "rác", text: "", updatedAt: iso(NOW) } } }).status.A === null
    && MO.normalizeState({ status: { B: { mood: "doi", text: "ăn cơm chưa", updatedAt: iso(NOW) } } }).status.B?.mood === "doi");

  check("R7 độ tươi: <24h chưa cũ; 25h là cũ + nhãn 'từ hôm qua'; 3 ngày -> 'từ 3 ngày trước'; null -> không cũ, không nhãn",
    F.statusStale({ updatedAt: iso(NOW - 2 * H) }, NOW) === false
    && F.statusStale({ updatedAt: iso(NOW - 25 * H) }, NOW) === true
    && F.statusFreshnessLabel({ updatedAt: iso(NOW - 30 * H) }, NOW) === "từ hôm qua"
    && F.statusFreshnessLabel({ updatedAt: iso(NOW - 3 * 24 * H) }, NOW) === "từ 3 ngày trước"
    && F.statusStale(null, NOW) === false && F.statusFreshnessLabel(null, NOW) === "");
  check("R8 bộ preset trạng thái: đúng 8 mood, nhãn tiếng Việt ấm, mọi mood có icon",
    CT.STATUS_MOODS.length === 8 && CT.STATUS_MOODS.every((m) => m.label && m.icon)
    && CT.STATUS_MOODS.map((m) => m.label).join("|") === "Vui vẻ|Bình yên|Đang nhớ người ấy|Hơi mệt|Bận một chút|Đói bụng|Buồn ngủ|Đang yêu đời");
}

/* ================= S) DÂY KỶ NIỆM (kho ảnh treo trên dây) ================= */
console.log("\n--- S) Dây kỷ niệm: thêm/sửa/xoá + mộ xoá + merge union/LWW + nghiêng xác định ---");
{
  const mkMem = (id, over = {}) => ({
    id, path: `couple-1/memories/${id}.jpg`, caption: "", dateKey: "2026-02-14",
    bySlot: "A", addedAt: iso(NOW - 24 * H), updatedAt: iso(NOW - 24 * H), ...over,
  });

  // S1: thêm hợp lệ -> vào state đúng nguyên vẹn + 1 dòng dấu vết icon "images"
  const m1 = mkMem("mem-1", { caption: "Biển Vũng Tàu" });
  const stAdd = R.gardenReducer(fresh(), { type: "MEMORY_ADD", memory: m1, user: "A", actor: "An" });
  check("S1 MEMORY_ADD hợp lệ -> có ảnh + giữ nguyên metadata + 1 dấu vết",
    stAdd.memories.length === 1 && stAdd.memories[0].caption === "Biển Vũng Tàu"
    && stAdd.memories[0].path === "couple-1/memories/mem-1.jpg"
    && stAdd.activities.length === 1 && stAdd.activities[0].icon === "images");

  // S2: các đường thêm bị chặn — bySlot lệch người thao tác, ngày không tồn tại,
  //     trùng id (no-op), và id đã nằm trong MỘ thì không hồi sinh được
  const badSlot = R.gardenReducer(fresh(), { type: "MEMORY_ADD", memory: m1, user: "B", actor: "Bình" });
  const badDate = R.gardenReducer(fresh(), { type: "MEMORY_ADD", memory: mkMem("mem-x", { dateKey: "2026-02-31" }), user: "A", actor: "An" });
  const dup = R.gardenReducer(stAdd, { type: "MEMORY_ADD", memory: m1, user: "A", actor: "An" });
  const stRm = R.gardenReducer(stAdd, { type: "MEMORY_REMOVE", id: "mem-1", user: "A", actor: "An" });
  const resurrect = R.gardenReducer(stRm, { type: "MEMORY_ADD", memory: m1, user: "A", actor: "An" });
  check("S2 MEMORY_ADD bị chặn: bySlot != user / ngày 31-02 / trùng id no-op / id trong mộ không hồi sinh",
    badSlot.memories.length === 0 && badDate.memories.length === 0 && dup === stAdd && resurrect === stRm);

  // S3: ghi chú qua sanitize ở reducer — trim hai đầu + cắt đúng trần 60 ký tự
  const stCap = R.gardenReducer(fresh(), { type: "MEMORY_ADD", memory: mkMem("mem-cap", { caption: `  ${"y".repeat(70)}  ` }), user: "A", actor: "An" });
  check("S3 ghi chú được trim + cắt đúng 60 ký tự tại tầng reducer",
    stCap.memories[0].caption.length === 60 && stCap.memories[0].caption === "y".repeat(60));

  // S4: sửa ghi chú/ngày — áp dụng + updatedAt tiến lên; ngày sai -> chặn cả
  //     hành động; id lạ -> no-op; sửa y hệt -> no-op (không phát đồng bộ thừa)
  const stUpd = R.gardenReducer(stAdd, { type: "MEMORY_UPDATE", id: "mem-1", caption: " Cà phê sáng ", dateKey: "2026-03-01", user: "B" });
  const updBadDate = R.gardenReducer(stAdd, { type: "MEMORY_UPDATE", id: "mem-1", caption: "x", dateKey: "2026-02-31", user: "A" });
  const updGhost = R.gardenReducer(stAdd, { type: "MEMORY_UPDATE", id: "khong-co", caption: "x", dateKey: "2026-03-01", user: "A" });
  const updSame = R.gardenReducer(stAdd, { type: "MEMORY_UPDATE", id: "mem-1", caption: "Biển Vũng Tàu", dateKey: "2026-02-14", user: "A" });
  check("S4 MEMORY_UPDATE: người ấy cũng sửa được + trim + đổi ngày + updatedAt mới hơn; ngày sai/id lạ/y hệt -> giữ nguyên",
    stUpd.memories[0].caption === "Cà phê sáng" && stUpd.memories[0].dateKey === "2026-03-01"
    && stUpd.memories[0].updatedAt > m1.updatedAt
    && updBadDate === stAdd && updGhost === stAdd && updSame === stAdd);

  // S5: gỡ ảnh — biến khỏi danh sách + id vào mộ + dấu vết; gỡ lại -> no-op
  check("S5 MEMORY_REMOVE: ảnh biến mất + id vào danh sách mộ + thêm 1 dấu vết; gỡ lại là no-op",
    stRm.memories.length === 0 && stRm.removedMemoryIds.includes("mem-1") && stRm.activities.length === 2
    && R.gardenReducer(stRm, { type: "MEMORY_REMOVE", id: "mem-1", user: "A", actor: "An" }) === stRm);

  // S6: trần 30 — dây đã đủ 30 thì ảnh thứ 31 bị từ chối ở reducer
  const full30 = Array.from({ length: 30 }, (_, i) => mkMem(`mem-full-${i}`, { dateKey: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }));
  const stFull = { ...fresh(), memories: MEM.materializeMemories(full30, []) };
  const add31 = R.gardenReducer(stFull, { type: "MEMORY_ADD", memory: mkMem("mem-31"), user: "A", actor: "An" });
  check("S6 trần MEMORIES_CAP: đủ 30 ảnh thì MEMORY_ADD thứ 31 bị từ chối",
    stFull.memories.length === 30 && add31 === stFull);

  // S7: merge union — ảnh của A ở máy A + ảnh của B ở máy B -> merged có cả hai
  const mB = mkMem("mem-2", { bySlot: "B", dateKey: "2026-04-05" });
  const mergedUnion = M.mergeStates({ ...fresh(), memories: [m1] }, { ...fresh(), memories: [mB] }, "A");
  check("S7 merge union: hai máy mỗi nơi một ảnh -> hợp nhất đủ cả hai",
    mergedUnion.memories.length === 2
    && mergedUnion.memories.some((m) => m.id === "mem-1") && mergedUnion.memories.some((m) => m.id === "mem-2"));

  // S8: MỘ THẮNG bản sao cũ ở cả hai chiều merge (xoá ở máy nào cũng thắng)
  const tombSide = { ...fresh(), memories: [], removedMemoryIds: ["mem-1"] };
  const staleSide = { ...fresh(), memories: [m1], removedMemoryIds: [] };
  const mgT1 = M.mergeStates(staleSide, tombSide, "A");
  const mgT2 = M.mergeStates(tombSide, staleSide, "A");
  check("S8 merge: id trong mộ bị lọc ở CẢ hai chiều local/remote + mộ được giữ lại",
    mgT1.memories.length === 0 && mgT2.memories.length === 0
    && mgT1.removedMemoryIds.includes("mem-1") && mgT2.removedMemoryIds.includes("mem-1"));

  // S9: LWW từng ảnh theo updatedAt (cả hai chiều); hoà mốc -> hội tụ xác định
  const mOld = mkMem("mem-lww", { caption: "ghi chú cũ", updatedAt: iso(NOW - 2 * H) });
  const mNew = mkMem("mem-lww", { caption: "ghi chú mới", updatedAt: iso(NOW) });
  const lww1 = M.mergeStates({ ...fresh(), memories: [mOld] }, { ...fresh(), memories: [mNew] }, "A");
  const lww2 = M.mergeStates({ ...fresh(), memories: [mNew] }, { ...fresh(), memories: [mOld] }, "A");
  const tieA = mkMem("mem-tie", { caption: "aaa", updatedAt: iso(NOW) });
  const tieB = mkMem("mem-tie", { caption: "bbb", updatedAt: iso(NOW) });
  const tie1 = M.mergeStates({ ...fresh(), memories: [tieA] }, { ...fresh(), memories: [tieB] }, "A");
  const tie2 = M.mergeStates({ ...fresh(), memories: [tieB] }, { ...fresh(), memories: [tieA] }, "A");
  check("S9 merge LWW theo updatedAt ở cả hai chiều; hoà mốc -> hai chiều cho cùng một bản thắng",
    lww1.memories[0].caption === "ghi chú mới" && lww2.memories[0].caption === "ghi chú mới"
    && tie1.memories[0].caption === tie2.memories[0].caption);

  // S10: thứ tự hiện thực hoá — theo ngày KỶ NIỆM tăng dần, hoà ngày theo addedAt
  const shuffled = [
    mkMem("s-mid", { dateKey: "2026-05-01", addedAt: iso(NOW - 2 * H) }),
    mkMem("s-first", { dateKey: "2025-12-24" }),
    mkMem("s-mid-early", { dateKey: "2026-05-01", addedAt: iso(NOW - 5 * H) }),
  ];
  const ordered = MEM.materializeMemories(shuffled, []);
  check("S10 hiện thực hoá: sắp theo dateKey tăng dần, cùng ngày thì addedAt sớm hơn đứng trước",
    ordered.map((m) => m.id).join(",") === "s-first,s-mid-early,s-mid");

  // S11: góc nghiêng xác định theo id — cùng id cùng góc, luôn trong ±2.5°, các id khác nhau có khác nhau
  const tilts = ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"].map((id) => MEM.memoryTiltDeg(id));
  check("S11 góc nghiêng: cùng id -> cùng góc ở mọi lần tính; |góc| <= 2.5; không phải mọi khung đều thẳng",
    MEM.memoryTiltDeg("mem-1") === MEM.memoryTiltDeg("mem-1")
    && tilts.every((t) => Math.abs(t) <= 2.5) && new Set(tilts).size > 1);

  // S12: normalize — bản cũ không có trường -> dây trống; mục hỏng bị rơi; mục
  //      trong mộ bị lọc ngay khi nạp; ghi chú dài bị cắt; thứ tự được sắp lại
  const normOld = MO.normalizeState(null);
  const normMixed = MO.normalizeState({
    memories: [
      mkMem("n-ok-late", { dateKey: "2026-06-01", caption: "z".repeat(80) }),
      mkMem("n-ok-early", { dateKey: "2026-01-01" }),
      { id: "n-bad-path", path: "", caption: "", dateKey: "2026-01-01", bySlot: "A", addedAt: iso(NOW), updatedAt: iso(NOW) },
      mkMem("n-bad-date", { dateKey: "2026-02-31" }),
      mkMem("n-tombed", { dateKey: "2026-02-02" }),
    ],
    removedMemoryIds: ["n-tombed", "n-tombed"],
  });
  check("S12 normalize: bản cũ -> []; mục hỏng/path rỗng/ngày sai bị rơi; mộ lọc ngay + khử trùng mộ; caption cắt 60; đã sắp theo ngày",
    normOld.memories.length === 0 && normOld.removedMemoryIds.length === 0
    && normMixed.memories.map((m) => m.id).join(",") === "n-ok-early,n-ok-late"
    && normMixed.memories[1].caption.length === 60
    && normMixed.removedMemoryIds.length === 1);

  // S13: trần khi hợp nhất — 20 + 20 ảnh rời nhau -> hiện thực hoá giữ đúng 30
  const half1 = Array.from({ length: 20 }, (_, i) => mkMem(`cap-a-${i}`, { dateKey: `2025-0${(i % 9) + 1}-15` }));
  const half2 = Array.from({ length: 20 }, (_, i) => mkMem(`cap-b-${i}`, { dateKey: `2026-0${(i % 9) + 1}-15` }));
  const mergedCap = M.mergeStates({ ...fresh(), memories: half1 }, { ...fresh(), memories: half2 }, "A");
  check("S13 merge tràn trần: union 40 ảnh -> giữ đúng 30 (phần đầu câu chuyện theo ngày)",
    mergedCap.memories.length === 30 && mergedCap.memories.every((m) => m.id.startsWith("cap-a-") || m.dateKey <= "2026-04-15"));
}

console.log(`\n===== TỔNG: ${count - failures}/${count} PASS =====`);
if (failures > 0) { console.log(`CÓ ${failures} TEST FAIL`); process.exit(1); }

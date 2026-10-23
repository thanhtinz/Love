/**
 * Test logic cho bản REBUILD 5 lõi (đếm ngày · cây · note · nhịp nhớ · định vị tạm).
 * Chạy: npm run test-logic (biên dịch src/lib ra scripts/.build rồi chạy, TZ=Asia/Saigon).
 * Mỗi nhóm ghi rõ luật nó bảo vệ — các khóa cứng (cooldown, trần, hết hạn) phải
 * nằm ở reducer/lib, test này FAIL nếu ai đó gỡ khóa ở tầng logic.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const T = require("./.build/types.js");
const TR = require("./.build/tree.js");
const F = require("./.build/features.js");
const CT = require("./.build/content.js");
const MO = require("./.build/model.js");
const R = require("./.build/reducer.js");
const M = require("./.build/merge.js");
const MT = require("./.build/maptiles.js");

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
  const burstAt1 = st.pings.A.lastBurstAt;
  st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
  st = R.gardenReducer(st, { type: "PING_SEND", user: "A", actor: "An" });
  check("E2 chạm dồn <=5s = 1 chuỗi: burst=3, lastBurstAt giữ mốc đầu chuỗi, dấu vết vẫn 1", st.pings.A.burst === 3 && st.pings.A.lastBurstAt === burstAt1 && st.activities.length === 1);
  const capped = { ...fresh(), pings: { A: { total: 50, lastAt: "", lastBurstAt: "", burst: 0 }, B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 }, day: { date: todayStr, A: 50, B: 0 } } };
  const capRes = R.gardenReducer(capped, { type: "PING_SEND", user: "A", actor: "An" });
  check("E3 trần cứng 50 nhịp/ngày/người -> nhịp 51 bị chặn ở reducer", capRes === capped);
  const capB = R.gardenReducer(capped, { type: "PING_SEND", user: "B", actor: "Bình" });
  check("E4 trần là theo NGƯỜI GỬI: người ấy vẫn gửi được", capB !== capped && capB.pings.day.B === 1);
  const yesterday = T.dayKeyLocal(new Date(NOW - 24 * H));
  const stale = { ...fresh(), pings: { A: { total: 9, lastAt: "", lastBurstAt: "", burst: 0 }, B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 }, day: { date: yesterday, A: 9, B: 0 } } };
  const rolled = R.gardenReducer(stale, { type: "PING_SEND", user: "A", actor: "An" });
  check("E5 sang ngày mới: bộ đếm ngày tự reset rồi mới cộng", rolled.pings.day.date === todayStr && rolled.pings.day.A === 1);
  const tickRolled = R.gardenReducer(stale, { type: "TICK" });
  check("E6 TICK cũng lăn ngày cho bộ đếm nhịp", tickRolled.pings.day.date === todayStr && tickRolled.pings.day.A === 0);
  check("E7 hằng số trần/cooldown đúng spec: 50/ngày, burst 5s, pop cooldown 30s", T.PING_DAILY_MAX === 50 && T.PING_BURST_WINDOW_MS === 5000 && T.PING_POP_COOLDOWN_MS === 30000);
}

/* ================= F) ĐỊNH VỊ TẠM THỜI ================= */
console.log("\n--- F) Định vị tạm thời ---");
{
  let st = fresh();
  st = R.gardenReducer(st, { type: "PRESENCE_START", user: "A", durationMs: 15 * MIN, actor: "An" });
  const exp = new Date(st.presence.A.expiresAt).getTime();
  check("F1 bắt đầu phiên 15 phút: sharing=true, expiresAt ~ +15 phút, toạ độ sạch", st.presence.A.sharing === true && Math.abs(exp - (NOW + 15 * MIN)) < 5000 && st.presence.A.lat === null);
  st = R.gardenReducer(st, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 21.0285, lng: 105.8542, acc: 12, battery: 77, at: iso(NOW + 1000) });
  check("F2 snapshot trong phiên -> lưu vị trí + pin + locAt", st.presence.A.lat === 21.0285 && st.presence.A.battery === 77 && st.presence.A.locAt === iso(NOW + 1000));
  const notSharing = fresh();
  const snapLate = R.gardenReducer(notSharing, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 1, lng: 2, acc: 5, battery: 50, at: iso(NOW) });
  check("F3 snapshot khi KHÔNG chia sẻ -> no-op (không hồi sinh phiên)", snapLate === notSharing);
  let stExp = fresh();
  stExp = R.gardenReducer(stExp, { type: "PRESENCE_START", user: "A", durationMs: 15 * MIN, actor: "An" });
  stExp = R.gardenReducer(stExp, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 21, lng: 105, acc: 10, battery: 60, at: iso(NOW + 1000) });
  const afterExp = R.gardenReducer(stExp, { type: "PRESENCE_SNAPSHOT", user: "A", lat: 21.1, lng: 105.1, acc: 10, battery: 59, at: iso(NOW + 16 * MIN) });
  check("F4 snapshot tới SAU expiresAt -> phiên tự kết thúc + xoá toạ độ", afterExp.presence.A.sharing === false && afterExp.presence.A.lat === null);
  const stopped = R.gardenReducer(st, { type: "PRESENCE_STOP", user: "A", actor: "An", reason: "manual" });
  check("F5 dừng thủ công -> sharing=false + xoá toạ độ khỏi state", stopped.presence.A.sharing === false && stopped.presence.A.lat === null && stopped.presence.A.locAt === "");
  const ssExpired = F.shareStatus({ sharing: true, expiresAt: iso(NOW - 1000) }, NOW);
  const ssOpen = F.shareStatus({ sharing: true, expiresAt: "" }, NOW);
  const ssTimed = F.shareStatus({ sharing: true, expiresAt: iso(NOW + 30 * MIN) }, NOW);
  check("F6 shareStatus: hết hạn -> expired; không hạn -> active vô hạn; có hạn -> remainingMs", ssExpired.expired === true && ssExpired.active === false && ssOpen.active === true && ssOpen.remainingMs === null && ssTimed.active === true && Math.abs((ssTimed.remainingMs || 0) - 30 * MIN) < 2000);
  const hnHcm = F.haversineKm({ lat: 21.0285, lng: 105.8542 }, { lat: 10.8231, lng: 106.6297 });
  check("F7 haversine Hà Nội -> TP.HCM ~ 1.100-1.200 km; cùng điểm = 0", hnHcm > 1100 && hnHcm < 1200 && F.haversineKm({ lat: 21, lng: 105 }, { lat: 21, lng: 105 }) === 0, `${hnHcm.toFixed(0)} km`);
  check("F8 distanceText: <0.3km thân thiện, 550m, 5,3 km", F.distanceText(0.2) === "Đang ở rất gần nhau" && F.distanceText(0.55) === "550 m" && F.distanceText(5.26) === "5,3 km");
  check("F9 các mốc thời lượng đúng spec: 15p / 1h / 4h / tự tắt", F.SHARE_DURATIONS.map((d) => d.ms).join(",") === [15 * MIN, 60 * MIN, 4 * H, null].join(","));
}

/* ================= G) MERGE 2 MÁY + NORMALIZE + STAMP ================= */
console.log("\n--- G) Merge / normalize / đóng dấu ---");
{
  const def = MO.normalizeState(null);
  check("G1 normalize(null) -> mặc định an toàn", def.couple.startDate === todayStr && def.notes.length === 0 && def.tree.growthRecordedMs === 0 && def.presence.A.sharing === false);
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
  check("G3 state BẢN CŨ nạp an toàn: cứu ngày bắt đầu + cây ở plants[0], note cũ bị loại, presence cũ về mặc định", legacy.couple.startDate === "2024-02-14" && legacy.tree.careCount === 12 && legacy.notes.length === 0 && legacy.presence.A.sharing === false && legacy.currentUser === "B");
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
}

console.log(`\n===== TỔNG: ${count - failures}/${count} PASS =====`);
if (failures > 0) { console.log(`CÓ ${failures} TEST FAIL`); process.exit(1); }

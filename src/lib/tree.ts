import { TreePestEvent, TreePlant, finiteNum, isPlainObject } from "./types";

/**
 * CÂY TÌNH YÊU — MỘT cây duy nhất của hai đứa (7 tranh vẽ thật love-tree-s1..s7).
 * Module THUẦN (không React) để kiểm chứng bằng Node (scripts/test-logic.mjs,
 * scripts/simulate-core.mjs).
 *
 * GIAI ĐOẠN CỦA CÂY ĐI THEO NGÀY YÊU THẬT (từ 2026-10-23): stage suy ra từ
 * daysTogether (cùng nguồn với bộ đếm ngày — couple.startDate) qua
 * treeStageForDay() bên dưới, KHÔNG còn từ điểm tăng trưởng. Chăm cây không làm
 * cây lên giai đoạn nữa; chăm chỉ giữ cây TƯƠI KHỎE (chỉ số = sức sống hiển thị).
 *
 * Phần "tăng trưởng ghi sổ" (growthRecordedMs/growthAt/materializeTree...) được
 * GIỮ NGUYÊN vì tương thích dữ liệu cũ + mô phỏng sức sống, nhưng từ nay nó
 * không quyết định giai đoạn và không còn hiển thị cho người dùng:
 * - Cây lưu growthRecordedMs (tăng trưởng đã "ghi sổ") tại mốc growthAt.
 * - Tăng trưởng hiệu dụng tại now = ghi sổ + tích lũy từ growthAt -> now, tính theo
 *   từng bước <= 5 phút: mỗi bước trừ hao chỉ số rồi nhân tốc độ theo sức khỏe tại
 *   bước đó — khỏe (thấp nhất >= 40) x1 · yếu (20..40) x0.5 · héo (< 20) x0 (đứng yên).
 * - Chăm cây: cộng chỉ số + cộng "tăng tốc" quy đổi thẳng thành thời gian tăng trưởng.
 * - Trưởng thành theo sổ cũ (đủ 168 giờ tăng trưởng hiệu dụng ≈ 7 ngày): đóng dấu
 *   matureAt, không chết, không thu hoạch — chỉ còn là dữ kiện tương thích.
 */

export const HOUR = 3600000;
export interface StageDef { name: string; desc: string; durationMs: number }
const h = (n: number) => n * HOUR;

export const TREE_NAME = "Cây Tình Yêu";
export const TREE_STAGES: StageDef[] = [
  { name: "Hạt giống", desc: "Một hạt mầm tình yêu vừa được gieo", durationMs: h(12) },
  { name: "Mầm non", desc: "Mầm nhỏ đã nhú lên rồi nè!", durationMs: h(18) },
  { name: "Cây con", desc: "Cây con xanh mướt đáng yêu", durationMs: h(24) },
  { name: "Cây lớn", desc: "Tán lá sum suê, tình cảm vững chãi", durationMs: h(36) },
  { name: "Nụ hoa", desc: "Nụ hoa e ấp sắp nở", durationMs: h(36) },
  { name: "Nở hoa", desc: "Hoa nở rực rỡ, thơm ngát", durationMs: h(42) },
  { name: "Cây trái tim", desc: "Đỉnh cao! Cây kết trái tim lấp lánh", durationMs: 0 },
];
export const TREE_STAGE_COUNT = TREE_STAGES.length;

/* ================= GIAI ĐOẠN THEO NGÀY YÊU THẬT =================
 * Stage 1-based suy ra THUẦN từ số ngày yêu (day 1 = ngày đầu tiên, cùng định
 * nghĩa với dayCount ở features.ts). Ngưỡng ngày BẮT ĐẦU của từng giai đoạn:
 * 1: ngày 1–6 · 2: 7–29 · 3: 30–99 · 4: 100–199 · 5: 200–364 · 6: 365–729 ·
 * 7: 730 trở đi. Đây là NƠI DUY NHẤT định nghĩa ánh xạ ngày -> giai đoạn:
 * màn Cây, thư lên giai đoạn và mọi nơi hiển thị giai đoạn đều đi qua đây. */
export const TREE_STAGE_START_DAYS: number[] = [1, 7, 30, 100, 200, 365, 730];

export interface TreeStageForDay {
  /** Giai đoạn 1..7 */
  stage: number;
  /** Tiến độ TRONG giai đoạn hiện tại 0..1 (giai đoạn 7 luôn = 1) */
  progress: number;
  /** Còn bao nhiêu ngày nữa lên giai đoạn mới; null ở giai đoạn 7 */
  daysToNextStage: number | null;
  /** Ngày bắt đầu của giai đoạn hiện tại */
  stageStartDay: number;
}

export function treeStageForDay(day: number): TreeStageForDay {
  const d = Math.max(1, Math.floor(isFinite(day) ? day : 1));
  let idx = 0;
  for (let i = 0; i < TREE_STAGE_START_DAYS.length; i++) {
    if (d >= TREE_STAGE_START_DAYS[i]) idx = i;
  }
  const start = TREE_STAGE_START_DAYS[idx];
  const nextStart = idx + 1 < TREE_STAGE_START_DAYS.length ? TREE_STAGE_START_DAYS[idx + 1] : null;
  if (nextStart === null) return { stage: idx + 1, progress: 1, daysToNextStage: null, stageStartDay: start };
  const progress = Math.min(1, Math.max(0, (d - start) / (nextStart - start)));
  return { stage: idx + 1, progress, daysToNextStage: nextStart - d, stageStartDay: start };
}

/** Hao chỉ số mỗi giờ (điểm %) */
export const DECAY_PER_HOUR = { water: 2.5, sun: 1.8, love: 1.2 };
/** Tăng tốc quy đổi thời gian tăng trưởng khi chăm (ms) */
export const CARE_BOOST_MS: Record<"water" | "sun" | "love" | "bug", number> = {
  water: 30 * 60 * 1000,
  sun: 30 * 60 * 1000,
  love: 45 * 60 * 1000,
  bug: 20 * 60 * 1000,
};
/** Cộng trực tiếp vào chỉ số khi chăm: 3 hành động chính +30 chỉ số của chúng;
 *  Bắt sâu chăm tổng thể (+10 cả ba chỉ số, đang yếu chỗ nào cũng đỡ). */
export const CARE_STAT_DELTA: Record<"water" | "sun" | "love" | "bug", { water: number; sun: number; love: number }> = {
  water: { water: 30, sun: 0, love: 0 },
  sun: { water: 0, sun: 30, love: 0 },
  love: { water: 0, sun: 0, love: 30 },
  bug: { water: 10, sun: 10, love: 10 },
};

export const totalGrowthMs = (): number => TREE_STAGES.reduce((a, s) => a + s.durationMs, 0);
/** Mốc tăng trưởng tích lũy tại điểm BẮT ĐẦU mỗi giai đoạn */
export function stageStarts(): number[] {
  const out: number[] = []; let acc = 0;
  for (const s of TREE_STAGES) { out.push(acc); acc += s.durationMs; }
  return out;
}
/** Chỉ số giai đoạn tương ứng một mức tăng trưởng tích lũy (thuần hàm) */
export function stageIndexForGrowth(growthMs: number): number {
  const starts = stageStarts();
  let idx = TREE_STAGES.length - 1;
  for (let i = 0; i < TREE_STAGES.length; i++) {
    if (TREE_STAGES[i].durationMs > 0 && growthMs < starts[i] + TREE_STAGES[i].durationMs) { idx = i; break; }
  }
  return idx;
}

const clampStat = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

/* ================= SÂU TRÊN CÂY (sự kiện dùng chung — types.ts) =================
 * Sâu làm cây hao sức NHANH HƠN một chút trong lúc chúng còn ở trên cây
 * (hệ số x1.6 lên phần hao theo giờ, tính trên đoạn thời gian giao nhau giữa
 * [statsAt -> now] và cửa sổ sống của đợt sâu). Chỉ sức sống — không bao giờ
 * chạm vào giai đoạn (giai đoạn chỉ theo ngày yêu). */
/** Đợt sâu tự hết hạn sau ~12 giờ nếu không ai bắt */
export const PEST_EXPIRE_MS = 12 * HOUR;
/** Hệ số hao thêm khi có sâu (1.6 = hao nhanh hơn 60% trong lúc có sâu) */
export const PEST_DECAY_MULTIPLIER = 1.6;

/** Đợt sâu có đang SỐNG tại now không (chưa bắt + chưa quá hạn 12h) */
export function isPestActive(pest: TreePestEvent | null | undefined, nowMs: number = Date.now()): boolean {
  if (!pest || pest.status !== "active") return false;
  const appeared = new Date(pest.appearedAt).getTime();
  if (!isFinite(appeared)) return false;
  return nowMs < appeared + PEST_EXPIRE_MS;
}

/** Cửa sổ sống [start, end] của một đợt sâu (ms) */
export function pestWindowMs(pest: TreePestEvent): { start: number; end: number } {
  const start = new Date(pest.appearedAt).getTime();
  const expiry = (isFinite(start) ? start : 0) + PEST_EXPIRE_MS;
  if (pest.status === "caught") {
    const c = new Date(pest.caughtAt).getTime();
    return { start, end: isFinite(c) ? Math.min(c, expiry) : expiry };
  }
  if (pest.status === "expired") {
    const e = new Date(pest.expiredAt).getTime();
    return { start, end: isFinite(e) ? Math.min(e, expiry) : expiry };
  }
  return { start, end: expiry };
}

/**
 * Điểm hao THÊM vì sâu, tính trên cây GỐC (chưa materialize): phần thời gian
 * giao nhau giữa [tree.statsAt -> nowMs] và cửa sổ sống của đợt sâu, nhân
 * (hệ số − 1) × tốc độ hao từng chỉ số. Trả về null khi không có giao nhau.
 */
export function pestExtraDecay(
  tree: TreePlant,
  pest: TreePestEvent | null | undefined,
  nowMs: number = Date.now(),
): { water: number; sun: number; love: number } | null {
  if (!pest || !tree.statsAt) return null;
  const statsMs = new Date(tree.statsAt).getTime();
  if (!isFinite(statsMs)) return null;
  const w = pestWindowMs(pest);
  const overlapMs = Math.min(nowMs, w.end) - Math.max(statsMs, w.start);
  if (!(overlapMs > 0)) return null;
  const hrs = overlapMs / HOUR;
  const k = PEST_DECAY_MULTIPLIER - 1;
  return {
    water: DECAY_PER_HOUR.water * hrs * k,
    sun: DECAY_PER_HOUR.sun * hrs * k,
    love: DECAY_PER_HOUR.love * hrs * k,
  };
}

/**
 * Cây đã materialize TẠI now, có trừ hao thêm vì sâu (tính từ cây gốc để
 * không trừ trùng khi gọi nhiều lần). Đây là bản "sự thật tại now" dùng cho
 * reducer khi chăm cây trong lúc có sâu.
 */
export function pestAdjustedTree(tree: TreePlant, pest: TreePestEvent | null | undefined, nowMs: number = Date.now()): TreePlant {
  const m = materializeTree(tree, nowMs);
  const extra = pestExtraDecay(tree, pest, nowMs);
  if (!extra) return m;
  return {
    ...m,
    water: clampStat(m.water - extra.water),
    sun: clampStat(m.sun - extra.sun),
    love: clampStat(m.love - extra.love),
  };
}

/** Chỉ số sau hao theo thời gian (suy ra, không ghi sổ).
 *  Truyền thêm `pest` để trừ hao nhanh hơn trong lúc sâu còn sống trên cây. */
export function decayedStats(tree: TreePlant, nowMs: number = Date.now(), pest?: TreePestEvent | null): { water: number; sun: number; love: number } {
  const base = { water: clampStat(tree.water || 0), sun: clampStat(tree.sun || 0), love: clampStat(tree.love || 0) };
  if (!tree.statsAt) return base;
  const hours = (nowMs - new Date(tree.statsAt).getTime()) / HOUR;
  if (!isFinite(hours) || hours <= 0) return base;
  let out = {
    water: clampStat(base.water - DECAY_PER_HOUR.water * hours),
    sun: clampStat(base.sun - DECAY_PER_HOUR.sun * hours),
    love: clampStat(base.love - DECAY_PER_HOUR.love * hours),
  };
  const extra = pestExtraDecay(tree, pest ?? null, nowMs);
  if (extra) {
    out = {
      water: clampStat(out.water - extra.water),
      sun: clampStat(out.sun - extra.sun),
      love: clampStat(out.love - extra.love),
    };
  }
  return out;
}

/** Hệ số tốc độ lớn theo sức khỏe: khỏe x1 · yếu x0.5 · héo (thấp nhất < 20) x0 */
export function growthFactor(stats: { water: number; sun: number; love: number }): number {
  const min = Math.min(stats.water, stats.sun, stats.love);
  if (min < 20) return 0;
  if (min < 40) return 0.5;
  return 1;
}

export type TreeHealthStatus = "happy" | "ok" | "need" | "wilted";
export function treeHealth(stats: { water: number; sun: number; love: number }): { status: TreeHealthStatus; message: string; lowest: "water" | "sun" | "love" } {
  const entries = [["water", stats.water], ["sun", stats.sun], ["love", stats.love]] as const;
  const [lowest, min] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const msgs: Record<string, string> = {
    water: "Cây đang khát nước nè — tưới cho cây một chút nhé!",
    sun: "Cây đang thiếu nắng nè — cho cây tắm nắng đi!",
    love: "Cây đang nhớ yêu thương nè — gửi lời yêu cho cây nhé!",
  };
  // Héo = cây đang MỆT (chỉ là sức sống hiển thị) — cây vẫn lớn theo ngày yêu
  // như thường, chăm là để cây tươi lại, không có chuyện "đứng yên tăng trưởng".
  const wiltMsgs: Record<string, string> = {
    water: "Cây đang mệt vì khát nước — tưới nước và chăm cây để cây tươi lại nhé!",
    sun: "Cây đang mệt vì thiếu nắng — cho cây tắm nắng và chăm cây để cây tươi lại nhé!",
    love: "Cây đang mệt vì thiếu yêu thương — gửi lời yêu và chăm cây để cây tươi lại nhé!",
  };
  if (min < 20) return { status: "wilted", message: wiltMsgs[lowest], lowest };
  if (min < 40) return { status: "need", message: msgs[lowest], lowest };
  if (min >= 70) return { status: "happy", message: "Cây đang rất hạnh phúc", lowest };
  return { status: "ok", message: "Cây đang ổn nè. Nhớ chăm đều để cây luôn tươi nhé!", lowest };
}

const STEP_MS = 5 * 60 * 1000; // bước tích lũy tối đa 5 phút — 2 máy cùng tính sẽ khớp nhau

/**
 * Ghi sổ tăng trưởng + hao chỉ số từ growthAt/statsAt tới nowMs.
 * Trả về cây MỚI đã materialize (không mutate bản gốc). Trưởng thành trong lúc
 * tích lũy -> đóng dấu matureAt. Đồng hồ máy chạy LÙI so với mốc ghi sổ: TUYỆT
 * ĐỐI không kéo growthAt lùi (đoạn đã ghi sổ sẽ bị tính trùng lần hai).
 */
export function materializeTree(tree: TreePlant, nowMs: number = Date.now()): TreePlant {
  const from = new Date(tree.growthAt || tree.plantedAt).getTime();
  let growth = tree.growthRecordedMs || 0;
  let stats = { water: clampStat(tree.water || 0), sun: clampStat(tree.sun || 0), love: clampStat(tree.love || 0) };
  let matureAt = tree.matureAt || "";
  const total = totalGrowthMs();
  if (!isFinite(from) || nowMs <= from) {
    if (!matureAt && growth >= total) return { ...tree, matureAt: tree.plantedAt };
    return { ...tree };
  }
  let t = from;
  while (t < nowMs) {
    const step = Math.min(STEP_MS, nowMs - t);
    const hours = step / HOUR;
    stats = {
      water: clampStat(stats.water - DECAY_PER_HOUR.water * hours),
      sun: clampStat(stats.sun - DECAY_PER_HOUR.sun * hours),
      love: clampStat(stats.love - DECAY_PER_HOUR.love * hours),
    };
    if (!matureAt) {
      growth += growthFactor(stats) * step;
      if (growth >= total) {
        growth = total;
        matureAt = new Date(t + step).toISOString();
      }
    }
    t += step;
    // Chỉ số đã chạm 0 hết: từ đây không còn gì thay đổi nữa — thoát sớm.
    if (stats.water === 0 && stats.sun === 0 && stats.love === 0) break;
  }
  const nowIsoStr = new Date(nowMs).toISOString();
  return { ...tree, growthRecordedMs: growth, growthAt: nowIsoStr, water: stats.water, sun: stats.sun, love: stats.love, statsAt: nowIsoStr, matureAt };
}
/** Bản xem trước đã materialize (hiển thị, không ghi state) */
export const projectTree = materializeTree;

export interface StageInfo {
  index: number;
  stage: StageDef;
  next: StageDef | null;
  progressInStage: number;
  growthMs: number;
  remainingToNextMs: number;
  mature: boolean;
}
export function stageInfo(tree: TreePlant, nowMs: number = Date.now()): StageInfo {
  const p = projectTree(tree, nowMs);
  const g = p.growthRecordedMs;
  const starts = stageStarts();
  const idx = stageIndexForGrowth(g);
  const st = TREE_STAGES[idx];
  const progressInStage = st.durationMs > 0 ? Math.min(100, Math.round(((g - starts[idx]) / st.durationMs) * 100)) : 100;
  const remainingToNextMs = st.durationMs > 0 ? Math.max(0, starts[idx] + st.durationMs - g) : 0;
  return { index: idx, stage: st, next: TREE_STAGES[idx + 1] || null, progressInStage, growthMs: g, remainingToNextMs, mature: Boolean(p.matureAt) || g >= totalGrowthMs() };
}

/** Cây mới vừa gieo (chỉ số khởi đầu 60 cho có đà lớn những giờ đầu) */
export function createTree(nowMs: number = Date.now()): TreePlant {
  const nowIsoStr = new Date(nowMs).toISOString();
  return {
    plantedAt: nowIsoStr, growthRecordedMs: 0, growthAt: nowIsoStr, totalBoostMs: 0,
    water: 60, sun: 60, love: 60, statsAt: nowIsoStr,
    careCount: 0, lastCareAt: "", lastCareBySlot: "", lastCareAtBy: { A: "", B: "" },
    announcedStage: 0, matureAt: "",
  };
}

/** Cooldown chăm cây: mỗi người chờ 60 giây giữa 2 lần chăm */
export const CARE_COOLDOWN_MS = 60000;
/** Chỉ số tương ứng đã từ ngưỡng này thì chăm thêm không còn tác dụng */
export const CARE_FULL_THRESHOLD = 95;
export type CareKind = "water" | "sun" | "love" | "bug";
export interface CareStatus { ok: boolean; reason: string; cooldownLeftMs: number }
/**
 * Một lần chăm có HỢP LỆ + CÓ TÁC DỤNG không (dùng chung UI và reducer — khóa cứng ở reducer):
 * - Chưa hết cooldown của chính người đó -> không ok (kèm lý do để UI nói rõ).
 * - Chỉ số liên quan đã >= 95% -> không ok: không boost, không thư.
 * - RIÊNG "Bắt sâu" (kind "bug"): chỉ có tác dụng khi sâu ĐANG SỐNG trên cây
 *   (truyền `pest` vào); không có sâu -> bị chặn với lý do "cây đang sạch".
 *   Có sâu thì bắt được kể cả khi cây đang khỏe (bỏ qua ngưỡng 95%).
 */
export function careStatus(tree: TreePlant, kind: CareKind, slot: "A" | "B", nowMs: number = Date.now(), pest?: TreePestEvent | null): CareStatus {
  const last = tree.lastCareAtBy ? tree.lastCareAtBy[slot] : "";
  if (last) {
    const left = CARE_COOLDOWN_MS - (nowMs - new Date(last).getTime());
    if (left > 0) return { ok: false, reason: `Bạn vừa chăm cây rồi — chờ ${Math.ceil(left / 1000)} giây nữa nhé`, cooldownLeftMs: left };
  }
  if (kind === "bug") {
    if (!isPestActive(pest ?? null, nowMs)) {
      return { ok: false, reason: "Hiện không có sâu trên cây — cây đang sạch nè", cooldownLeftMs: 0 };
    }
    return { ok: true, reason: "", cooldownLeftMs: 0 };
  }
  const p = pest ? pestAdjustedTree(tree, pest, nowMs) : materializeTree(tree, nowMs);
  const stat = kind === "water" ? p.water : kind === "sun" ? p.sun : p.love;
  if (stat >= CARE_FULL_THRESHOLD) {
    const reason = kind === "water" ? "Cây đã đủ nước rồi, tưới thêm không có tác dụng"
      : kind === "sun" ? "Cây đã đủ nắng rồi, tắm nắng thêm không có tác dụng"
      : "Cây đã tràn đầy yêu thương rồi";
    return { ok: false, reason, cooldownLeftMs: 0 };
  }
  return { ok: true, reason: "", cooldownLeftMs: 0 };
}

/** Thưởng hoàn thành đủ nhiệm vụ ngày: +8 sức sống cả 3 chỉ số (chỉ sức sống). */
export const QUEST_REWARD_VITALITY = 8;

/** Cộng sức sống trực tiếp vào các chỉ số ĐÃ LƯU của cây (không materialize —
 *  dùng cho phần thưởng nhiệm vụ ngày, kể cả khi hành động chốt là nhịp/note). */
export function applyVitalityBonus(tree: TreePlant, amount: number = QUEST_REWARD_VITALITY): TreePlant {
  return {
    ...tree,
    water: clampStat(tree.water + amount),
    sun: clampStat(tree.sun + amount),
    love: clampStat(tree.love + amount),
  };
}

/** Áp một lần chăm HỢP LỆ lên cây đã materialize: cộng chỉ số + tăng tốc tăng trưởng + dấu vết. */
export function applyCare(tree: TreePlant, kind: CareKind, slot: "A" | "B", nowMs: number): TreePlant {
  const nowIsoStr = new Date(nowMs).toISOString();
  const d = CARE_STAT_DELTA[kind];
  const total = totalGrowthMs();
  const boost = tree.matureAt ? 0 : CARE_BOOST_MS[kind];
  const growth = Math.min(total, tree.growthRecordedMs + boost);
  return {
    ...tree,
    water: clampStat(tree.water + d.water), sun: clampStat(tree.sun + d.sun), love: clampStat(tree.love + d.love),
    growthRecordedMs: growth,
    totalBoostMs: tree.totalBoostMs + boost,
    matureAt: tree.matureAt || (growth >= total ? nowIsoStr : ""),
    careCount: tree.careCount + 1,
    lastCareAt: nowIsoStr, lastCareBySlot: slot,
    lastCareAtBy: { ...tree.lastCareAtBy, [slot]: nowIsoStr },
  };
}

/** Chuẩn hoá 1 cây từ dữ liệu thô (server/cache/bản cũ) — mọi trường đều có fallback an toàn. */
export function normalizeTree(rawInput: unknown): TreePlant {
  const raw: Partial<TreePlant> = isPlainObject(rawInput) ? (rawInput as Partial<TreePlant>) : {};
  const base = createTree();
  const statOr = (v: unknown) => clampStat(finiteNum(v, 60));
  const countOr = (v: unknown) => Math.max(0, Math.floor(finiteNum(v, 0)));
  const strOrLocal = (v: unknown, fallback: string) => (typeof v === "string" && v ? v : fallback);
  const total = totalGrowthMs();
  return {
    plantedAt: strOrLocal(raw.plantedAt, base.plantedAt),
    growthRecordedMs: Math.min(total, Math.max(0, finiteNum(raw.growthRecordedMs, 0))),
    growthAt: strOrLocal(raw.growthAt, "") || strOrLocal(raw.statsAt, "") || strOrLocal(raw.plantedAt, base.growthAt),
    totalBoostMs: Math.max(0, finiteNum(raw.totalBoostMs, 0)),
    water: statOr(raw.water), sun: statOr(raw.sun), love: statOr(raw.love),
    statsAt: strOrLocal(raw.statsAt, "") || strOrLocal(raw.growthAt, "") || strOrLocal(raw.plantedAt, base.statsAt),
    careCount: countOr(raw.careCount),
    lastCareAt: typeof raw.lastCareAt === "string" ? raw.lastCareAt : "",
    lastCareBySlot: raw.lastCareBySlot === "A" || raw.lastCareBySlot === "B" ? raw.lastCareBySlot : "",
    lastCareAtBy: {
      A: typeof raw.lastCareAtBy?.A === "string" ? raw.lastCareAtBy.A : "",
      B: typeof raw.lastCareAtBy?.B === "string" ? raw.lastCareAtBy.B : "",
    },
    announcedStage: Math.min(TREE_STAGE_COUNT - 1, countOr(raw.announcedStage)),
    matureAt: typeof raw.matureAt === "string" ? raw.matureAt : "",
  };
}

/** Định dạng khoảng thời gian ms -> "3 ngày 5 giờ" / "5 giờ 20 phút" / "20 phút" */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "0 phút";
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440), hrs = Math.floor((totalMin % 1440) / 60), min = totalMin % 60;
  if (d > 0) return hrs > 0 ? `${d} ngày ${hrs} giờ` : `${d} ngày`;
  if (hrs > 0) return min > 0 ? `${hrs} giờ ${min} phút` : `${hrs} giờ`;
  return `${Math.max(1, min)} phút`;
}

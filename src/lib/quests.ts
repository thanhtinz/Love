import {
  DailyQuestsState, PersonId, QuestKind, QuestProgress, QUEST_HISTORY_CAP,
  dayKeyLocal, parseDateKey, today,
} from "./types";
import { hashString } from "./content";

/**
 * NHIỆM VỤ CHĂM CÂY MỖI NGÀY (đợt "nhiệm vụ chăm cây") — module THUẦN.
 *
 * - Mỗi ngày có ĐÚNG 3 nhiệm vụ, chọn XÁC ĐỊNH theo dateKey (sắp xếp pool theo
 *   hash của "quests:{dateKey}:{kind}" rồi lấy 3 đầu) — 2 máy tự tính ra cùng
 *   một bộ, không cần server, không cần đồng bộ danh sách.
 * - Tiến độ đi từ HÀNH ĐỘNG THẬT (chăm cây / gửi nhịp nhớ / viết note) qua
 *   reducer — không có đường cộng điểm nào khác.
 * - PHẦN THƯỞNG KHÔNG PHẢI TIỀN TỆ (app không có Xu/XP và không bao giờ thêm):
 *   hoàn thành đủ 3 -> (a) pop ăn mừng 1 lần/ngày ở UI, (b) cây tỏa hào quang
 *   vàng đến hết ngày (UI suy ra từ allCompletedAt), (c) cây nhận +8 sức sống
 *   cả 3 chỉ số (chỉ sức sống — giai đoạn vẫn chỉ theo ngày yêu, như mọi luật
 *   chăm cây khác), (d) ngày được ghi vào questHistory để tính chuỗi ngày.
 * - Bắt sâu KHÔNG nằm trong pool: sâu là sự kiện ngẫu nhiên theo seed, không
 *   phải ngày nào cũng có — thay vào đó có nhiệm vụ đếm tổng số lần chăm.
 */

export interface QuestDef { kind: QuestKind; label: string; icon: string; target: number }
export const QUEST_POOL: QuestDef[] = [
  { kind: "water", label: "Tưới nước cho cây", icon: "water", target: 1 },
  { kind: "sun", label: "Phơi nắng cho cây", icon: "sunny", target: 1 },
  { kind: "love", label: "Nói lời yêu với cây", icon: "heart", target: 1 },
  { kind: "ping", label: "Gửi 1 nhịp nhớ cho người ấy", icon: "pulse", target: 1 },
  { kind: "note", label: "Viết 1 note cho người ấy", icon: "document-text", target: 1 },
  { kind: "care3", label: "Chăm cây đủ 3 lần", icon: "leaf", target: 3 },
  { kind: "bothcare", label: "Cả hai cùng chăm cây", icon: "people", target: 2 },
];
export const questDef = (kind: QuestKind): QuestDef => QUEST_POOL.find((q) => q.kind === kind) || QUEST_POOL[0];
export const isQuestKind = (v: unknown): v is QuestKind => QUEST_POOL.some((q) => q.kind === v);

/** Bộ 3 nhiệm vụ của một ngày — xác định thuần theo dateKey (2 máy khớp nhau). */
export function questsForDay(dateKey: string): QuestProgress[] {
  const ordered = [...QUEST_POOL].sort(
    (a, b) => hashString(`quests:${dateKey}:${a.kind}`) - hashString(`quests:${dateKey}:${b.kind}`),
  );
  return ordered.slice(0, 3).map((d) => ({ kind: d.kind, target: d.target, count: 0, byA: 0, byB: 0, completedAt: "" }));
}

export function emptyDailyQuests(dateKey: string = today()): DailyQuestsState {
  return { dateKey, quests: questsForDay(dateKey), allCompletedAt: "" };
}

/** Bộ nhiệm vụ ĐANG HIỆU LỰC để hiển thị: state lưu của hôm nay, hoặc bộ mới
 *  của hôm nay ở tiến độ 0 nếu state đã sang ngày khác (chưa ai hành động). */
export function currentDailyQuests(dq: DailyQuestsState, dateKey: string = today()): DailyQuestsState {
  return dq.dateKey === dateKey ? dq : emptyDailyQuests(dateKey);
}

export type QuestEvent =
  | { type: "care"; kind: "water" | "sun" | "love" | "bug"; slot: PersonId }
  | { type: "ping"; slot: PersonId }
  | { type: "note"; slot: PersonId };

function questMatches(q: QuestProgress, ev: QuestEvent): boolean {
  if (ev.type === "care") return q.kind === ev.kind || q.kind === "care3" || q.kind === "bothcare";
  if (ev.type === "ping") return q.kind === "ping";
  return q.kind === "note";
}

/**
 * Áp một hành động thật vào bộ nhiệm vụ: nếu dateKey đã cũ thì LĂN sang bộ của
 * hôm nay trước rồi mới cộng. Trả về bộ mới + cờ justCompletedAll (chỉ true
 * đúng 1 lần — ở hành động làm đủ 3/3) để reducer trao thưởng đúng 1 lần.
 */
export function advanceDailyQuests(
  dq: DailyQuestsState,
  ev: QuestEvent,
  nowIso: string,
  dateKey: string = today(),
): { dq: DailyQuestsState; justCompletedAll: boolean } {
  const cur = dq.dateKey === dateKey ? dq : emptyDailyQuests(dateKey);
  let changed = cur !== dq;
  const quests = cur.quests.map((q) => {
    if (!questMatches(q, ev)) return q;
    const byA = q.byA + (ev.slot === "A" ? 1 : 0);
    const byB = q.byB + (ev.slot === "B" ? 1 : 0);
    const count = q.kind === "bothcare"
      ? Math.min(byA, 1) + Math.min(byB, 1)
      : q.count + 1;
    if (count === q.count && byA === q.byA && byB === q.byB) return q;
    changed = true;
    return { ...q, byA, byB, count, completedAt: q.completedAt || (count >= q.target ? nowIso : "") };
  });
  if (!changed) return { dq: cur, justCompletedAll: false };
  const allDone = quests.length > 0 && quests.every((q) => q.count >= q.target);
  const justCompletedAll = allDone && !cur.allCompletedAt;
  return {
    dq: { dateKey, quests, allCompletedAt: cur.allCompletedAt || (allDone ? nowIso : "") },
    justCompletedAll,
  };
}

/**
 * Merge bộ nhiệm vụ 2 máy:
 * - Khác dateKey: ngày MUỘN hơn thắng nguyên bộ (bộ cũ đã hết hiệu lực).
 * - Cùng dateKey: từng nhiệm vụ lấy count/byA/byB LỚN hơn (tiến độ là đơn điệu
 *   trong ngày — máy nào thấy nhiều hơn là đúng hơn); bothcare suy lại count
 *   từ byA/byB đã hợp nhất; completedAt/allCompletedAt lấy mốc SỚM nhất có
 *   giá trị. Bộ nhiệm vụ của cùng một ngày là xác định nên 2 máy luôn khớp
 *   danh sách kind; nếu lệch (đổi pool giữa các bản app) thì giữ danh sách
 *   của phía local cho những kind phía kia không có.
 */
export function mergeDailyQuests(l: DailyQuestsState, r: DailyQuestsState): DailyQuestsState {
  if (l.dateKey !== r.dateKey) return l.dateKey > r.dateKey ? l : r;
  const rByKind = new Map(r.quests.map((q) => [q.kind, q]));
  const quests = l.quests.map((lq) => {
    const rq = rByKind.get(lq.kind);
    if (!rq) return lq;
    const byA = Math.max(lq.byA, rq.byA);
    const byB = Math.max(lq.byB, rq.byB);
    const count = lq.kind === "bothcare"
      ? Math.min(byA, 1) + Math.min(byB, 1)
      : Math.max(lq.count, rq.count);
    const completedAt = lq.completedAt && rq.completedAt
      ? (lq.completedAt <= rq.completedAt ? lq.completedAt : rq.completedAt)
      : (lq.completedAt || rq.completedAt);
    return { ...lq, target: Math.max(lq.target, rq.target), byA, byB, count, completedAt };
  });
  const allCompletedAt = l.allCompletedAt && r.allCompletedAt
    ? (l.allCompletedAt <= r.allCompletedAt ? l.allCompletedAt : r.allCompletedAt)
    : (l.allCompletedAt || r.allCompletedAt);
  return { dateKey: l.dateKey, quests, allCompletedAt };
}

/** Hợp nhất lịch sử ngày hoàn thành: union, mới nhất trước, trần QUEST_HISTORY_CAP. */
export function unionQuestHistory(l: string[], r: string[]): string[] {
  return [...new Set([...(l || []), ...(r || [])])].sort().reverse().slice(0, QUEST_HISTORY_CAP);
}

/**
 * Chuỗi ngày chăm đủ liên tiếp tính tới hôm nay: hôm nay chưa xong thì chuỗi
 * được tính lùi từ HÔM QUA (ngày chưa hết, chuỗi chưa đứt); đứt một ngày là
 * chuỗi về 0.
 */
export function questStreak(history: string[], todayKey: string = today()): number {
  const set = new Set(history || []);
  const start = parseDateKey(todayKey);
  if (!start) return 0;
  let cursor = start;
  if (!set.has(todayKey)) {
    cursor = new Date(start.getTime() - 86400000);
    if (!set.has(dayKeyLocal(cursor))) return 0;
  }
  let n = 0;
  while (set.has(dayKeyLocal(cursor))) {
    n += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return n;
}

import {
  AppState, LetterMoment, PersonId, dayKeyLocal, localDayNumber, parseDateKey,
} from "./types";
import { CARE_BOOST_MS, TREE_STAGE_COUNT, materializeTree, stageIndexForGrowth, stageInfo } from "./tree";
import { makeLetterMoment } from "./content";

/**
 * Logic tính năng THUẦN của các lõi (không React):
 * CORE 1 đếm ngày + mốc · CORE 2 quyết định thư rơi khi chăm · CORE 5 định vị.
 */

/* ================= CORE 1 — ĐẾM NGÀY YÊU ================= */
/** Các mốc ngày được ăn mừng (ngày thứ N của hai đứa) */
export const MILESTONES: number[] = [100, 200, 300, 365, 500, 730, 1000, 1500, 2000, 2500, 3000, 3650, 5000, 7300, 10000];

/** Số ngày yêu: ngày bắt đầu = Ngày 1 (tính theo ngày địa phương, không lệch UTC). */
export function dayCount(startDate: string, nowMs: number = Date.now()): number {
  const start = parseDateKey(startDate);
  if (!start) return 1;
  const diff = localDayNumber(new Date(nowMs)) - localDayNumber(start);
  return Math.max(1, diff + 1);
}
/** Mốc sắp tới + còn bao nhiêu ngày (null khi đã qua mốc lớn nhất trong bảng) */
export function nextMilestone(count: number): { days: number; remaining: number } | null {
  const m = MILESTONES.find((x) => x > count);
  return m ? { days: m, remaining: m - count } : null;
}
/** Mốc lớn nhất đã chạm tới (để ăn mừng đúng 1 lần kể cả khi mở app muộn sau ngày mốc) */
export function milestoneReached(count: number): number | null {
  let found: number | null = null;
  for (const m of MILESTONES) if (m <= count) found = m;
  return found;
}

/* ================= CORE 2 — THƯ RƠI KHI CHĂM CÂY ================= */
export const COMBO_WINDOW_MS = 90000;
/** Tổng số lần chăm chạm các mốc này -> chắc chắn rơi thư Hiếm */
export const CARE_MILESTONES: number[] = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

/**
 * Quyết định thư rơi cho MỘT lần chăm sắp thực hiện (gọi TRƯỚC khi dispatch, bằng
 * state hiện tại — máy người chăm là nơi duy nhất rút ngẫu nhiên; kết quả ghi vào
 * state nên máy kia nhận đúng lá thư đó, không rút lại):
 * - Chăm làm cây LÊN GIAI ĐOẠN -> chắc chắn rơi (Hiếm; trưởng thành 50% Huyền thoại).
 * - Combo Song chăm: người ấy chăm trong 90 giây gần nhất VÀ sau lần chăm cuối của
 *   mình (mỗi lần chăm của người ấy chỉ "kích hoạt" tối đa 1 combo) -> Hiếm.
 * - Tổng lần chăm chạm mốc -> Hiếm.
 * - Còn lại ~35%: Thường (cây ở giai đoạn >= 4 thêm 18% cơ hội Huyền thoại).
 */
export function decideCareLetter(state: AppState, kind: "water" | "sun" | "love" | "bug", nowMs: number = Date.now()): { drop: LetterMoment | null; combo: boolean } {
  const me = state.currentUser;
  const other: PersonId = me === "A" ? "B" : "A";
  const atIso = new Date(nowMs).toISOString();
  const partnerLast = state.tree.lastCareAtBy[other] ? new Date(state.tree.lastCareAtBy[other]).getTime() : 0;
  const myLast = state.tree.lastCareAtBy[me] ? new Date(state.tree.lastCareAtBy[me]).getTime() : 0;
  const combo = partnerLast > 0 && nowMs - partnerLast < COMBO_WINDOW_MS && partnerLast > myLast;

  const mat = materializeTree(state.tree, nowMs);
  const before = stageInfo(mat, nowMs).index;
  const boostedGrowth = mat.matureAt ? mat.growthRecordedMs : mat.growthRecordedMs + CARE_BOOST_MS[kind];
  const stageUp = stageIndexForGrowth(boostedGrowth) > before;
  const newCareTotal = state.tree.careCount + 1;
  const isMilestone = CARE_MILESTONES.includes(newCareTotal);

  if (stageUp) {
    const willMature = stageIndexForGrowth(boostedGrowth) >= TREE_STAGE_COUNT - 1;
    const rarity = willMature && Math.random() < 0.5 ? "legendary" : "rare";
    return { drop: makeLetterMoment(rarity, willMature ? "Cây trưởng thành" : "Lên giai đoạn mới", me, atIso), combo };
  }
  if (combo) return { drop: makeLetterMoment("rare", "Combo Song chăm", me, atIso), combo };
  if (isMilestone) return { drop: makeLetterMoment("rare", `Mốc ${newCareTotal} lần chăm`, me, atIso), combo };
  if (Math.random() < 0.35) {
    const rarity = before >= 4 && Math.random() < 0.18 ? "legendary" : "common";
    return { drop: makeLetterMoment(rarity, "Rơi khi chăm cây", me, atIso), combo };
  }
  return { drop: null, combo };
}

/* ================= CORE 5 — ĐỊNH VỊ TẠM THỜI ================= */
export interface ShareDuration { label: string; ms: number | null }
export const SHARE_DURATIONS: ShareDuration[] = [
  { label: "15 phút", ms: 15 * 60 * 1000 },
  { label: "1 giờ", ms: 60 * 60 * 1000 },
  { label: "4 giờ", ms: 4 * 60 * 60 * 1000 },
  { label: "Đến khi tự tắt", ms: null },
];

export interface ShareStatus { active: boolean; expired: boolean; remainingMs: number | null }
/**
 * Trạng thái phiên chia sẻ SUY RA từ expiresAt tại thời điểm now — phiên hết hạn
 * là "đã kết thúc" ở MỌI nơi hiển thị, kể cả khi state chưa kịp ghi cờ dừng.
 */
export function shareStatus(slot: { sharing: boolean; expiresAt: string }, nowMs: number = Date.now()): ShareStatus {
  if (!slot.sharing) return { active: false, expired: false, remainingMs: null };
  if (!slot.expiresAt) return { active: true, expired: false, remainingMs: null };
  const left = new Date(slot.expiresAt).getTime() - nowMs;
  if (!isFinite(left) || left <= 0) return { active: false, expired: true, remainingMs: 0 };
  return { active: true, expired: false, remainingMs: left };
}

/** Khoảng cách đường chim bay (km) giữa 2 điểm lat/lng */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const hv = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(hv)));
}
/** Chữ khoảng cách thân thiện: rất gần -> câu ấm; < 1km -> mét; còn lại km với dấu phẩy thập phân kiểu Việt */
export function distanceText(km: number): string {
  if (!isFinite(km) || km < 0) return "";
  if (km < 0.3) return "Đang ở rất gần nhau";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/* ================= Định dạng thời gian thân thiện ================= */
/** "vừa xong" / "5 phút trước" / "2 giờ trước" / "3 ngày trước" (so với now) */
export function timeAgoText(iso: string, nowMs: number = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "";
  const diff = nowMs - t;
  if (diff < 45000) return "vừa xong";
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${Math.max(1, min)} phút trước`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return dayKeyLocal(new Date(t)).split("-").reverse().join("/");
}
/** Đếm ngược phiên chia sẻ: "còn 12 phút 30 giây" / "còn 2 giờ 5 phút" */
export function remainingText(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hrs > 0) return `còn ${hrs} giờ ${min} phút`;
  if (min > 0) return `còn ${min} phút ${sec} giây`;
  return `còn ${sec} giây`;
}

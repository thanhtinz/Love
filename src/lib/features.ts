import {
  AppState, KEPT_LETTERS_CAP, KeptLetter, KeptLetterKind, LetterMoment, MilestoneRecord,
  PersonId, dayKeyLocal, localDayNumber, parseDateKey,
} from "./types";
import { treeStageForDay } from "./tree";
import { makeLetterMoment, messageById } from "./content";

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
/** Khóa ngày dương lịch mà số ngày yêu chạm đúng `days` (ngày bắt đầu = Ngày 1):
 *  mốc 100 của cặp bắt đầu 14/02 rơi vào ngày thứ 100 kể từ 14/02. */
export function milestoneDateKey(startDate: string, days: number): string {
  const start = parseDateKey(startDate);
  if (!start || !isFinite(days) || days < 1) return "";
  const ms = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) + (Math.floor(days) - 1) * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/* ================= CORE 2 — THƯ RƠI KHI CHĂM CÂY ================= */
export const COMBO_WINDOW_MS = 90000;
/** Tổng số lần chăm chạm các mốc này -> chắc chắn rơi thư Hiếm */
export const CARE_MILESTONES: number[] = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000];

/**
 * Quyết định thư rơi cho MỘT lần chăm sắp thực hiện (gọi TRƯỚC khi dispatch, bằng
 * state hiện tại — máy người chăm là nơi duy nhất rút ngẫu nhiên; kết quả ghi vào
 * state nên máy kia nhận đúng lá thư đó, không rút lại):
 * - Combo Song chăm: người ấy chăm trong 90 giây gần nhất VÀ sau lần chăm cuối của
 *   mình (mỗi lần chăm của người ấy chỉ "kích hoạt" tối đa 1 combo) -> Hiếm.
 * - Tổng lần chăm chạm mốc -> Hiếm.
 * - Còn lại ~35%: Thường (cây ở giai đoạn >= 5 theo NGÀY YÊU thêm 18% cơ hội Huyền thoại).
 * LƯU Ý: chăm cây KHÔNG còn làm cây lên giai đoạn — giai đoạn đi theo ngày yêu
 * (treeStageForDay) và thư "lên giai đoạn" rơi riêng khi mở app
 * (CELEBRATE_TREE_STAGE), không qua hàm này nữa.
 */
export function decideCareLetter(state: AppState, kind: "water" | "sun" | "love" | "bug", nowMs: number = Date.now()): { drop: LetterMoment | null; combo: boolean } {
  const me = state.currentUser;
  const other: PersonId = me === "A" ? "B" : "A";
  const atIso = new Date(nowMs).toISOString();
  const partnerLast = state.tree.lastCareAtBy[other] ? new Date(state.tree.lastCareAtBy[other]).getTime() : 0;
  const myLast = state.tree.lastCareAtBy[me] ? new Date(state.tree.lastCareAtBy[me]).getTime() : 0;
  const combo = partnerLast > 0 && nowMs - partnerLast < COMBO_WINDOW_MS && partnerLast > myLast;

  const newCareTotal = state.tree.careCount + 1;
  const isMilestone = CARE_MILESTONES.includes(newCareTotal);

  if (combo) return { drop: makeLetterMoment("rare", "Combo Song chăm", me, atIso), combo };
  if (isMilestone) return { drop: makeLetterMoment("rare", `Mốc ${newCareTotal} lần chăm`, me, atIso), combo };
  if (Math.random() < 0.35) {
    const stageNow = treeStageForDay(dayCount(state.couple.startDate, nowMs)).stage;
    const rarity = stageNow >= 5 && Math.random() < 0.18 ? "legendary" : "common";
    return { drop: makeLetterMoment(rarity, "Rơi khi chăm cây", me, atIso), combo };
  }
  return { drop: null, combo };
}

/* ================= KỶ VẬT (đợt "chất app" 2) — HỘP THƯ ĐÃ GIỮ + LỊCH SỬ MỐC ================= */
/** Chụp một khoảnh khắc thư rơi thành kỷ vật (nội dung chụp tại thời điểm giữ). */
export function keptLetterFromMoment(moment: LetterMoment, kind: KeptLetterKind): KeptLetter {
  return {
    id: moment.id,
    messageId: moment.messageId,
    text: messageById(moment.messageId).text,
    rarity: moment.rarity,
    kind,
    source: moment.source,
    bySlot: moment.bySlot,
    receivedAt: moment.at,
  };
}
const keptSortDesc = (a: KeptLetter, b: KeptLetter): number => (b.receivedAt || "").localeCompare(a.receivedAt || "");
/**
 * Thêm 1 kỷ vật vào bộ sưu tập: khử trùng theo id — cùng một sự kiện thư được
 * ghi ở cả 2 máy (đặc biệt thư lên giai đoạn có id xác định) thì giữ bản
 * receivedAt SỚM hơn (sự kiện chỉ xảy ra 1 lần). Sắp mới nhất trước, chặn
 * KEPT_LETTERS_CAP bằng cách bỏ cũ nhất.
 */
export function addKeptLetter(list: KeptLetter[], kept: KeptLetter): KeptLetter[] {
  const existing = list.find((k) => k.id === kept.id);
  if (existing && (existing.receivedAt || "") <= (kept.receivedAt || "")) return list;
  const rest = existing ? list.filter((k) => k.id !== kept.id) : list;
  return [...rest, kept].sort(keptSortDesc).slice(0, KEPT_LETTERS_CAP);
}
/** Hợp nhất 2 bộ sưu tập (merge 2 máy / normalize): cùng luật khử trùng với addKeptLetter. */
export function unionKeptLetters(a: KeptLetter[], b: KeptLetter[]): KeptLetter[] {
  const byId = new Map<string, KeptLetter>();
  for (const k of [...a, ...b]) {
    const prev = byId.get(k.id);
    if (!prev || (k.receivedAt || "") < (prev.receivedAt || "")) byId.set(k.id, k);
  }
  return [...byId.values()].sort(keptSortDesc).slice(0, KEPT_LETTERS_CAP);
}
/**
 * Ghi 1 mốc vào lịch sử — idempotent: mốc đã có thì giữ nguyên (chỉ bổ sung
 * reachedAt nếu bản cũ đang trống mà lần ghi này có mốc thật). Mốc ngoài bảng
 * MILESTONES bị bỏ qua. Trả về mảng MỚI chỉ khi thật sự thay đổi.
 */
export function recordMilestone(history: MilestoneRecord[], days: number, reachedAtIso: string): MilestoneRecord[] {
  const d = Math.floor(days);
  if (!MILESTONES.includes(d)) return history;
  const existing = history.find((h) => h.days === d);
  if (existing) {
    // Đã ghi rồi: chỉ bổ sung reachedAt khi bản cũ đang trống mà lần này có mốc thật.
    if (existing.reachedAt || !reachedAtIso) return history;
    return history.map((h) => (h.days === d ? { days: d, reachedAt: reachedAtIso } : h));
  }
  return [...history, { days: d, reachedAt: reachedAtIso }].sort((x, y) => x.days - y.days);
}
/** Hợp nhất lịch sử mốc 2 máy theo `days`: reachedAt lấy bản có mốc thật sớm hơn. */
export function unionMilestoneHistory(a: MilestoneRecord[], b: MilestoneRecord[]): MilestoneRecord[] {
  const byDays = new Map<number, MilestoneRecord>();
  for (const h of [...a, ...b]) {
    if (!MILESTONES.includes(h.days)) continue;
    const prev = byDays.get(h.days);
    if (!prev) { byDays.set(h.days, h); continue; }
    if (!prev.reachedAt && h.reachedAt) byDays.set(h.days, h);
    else if (prev.reachedAt && h.reachedAt && h.reachedAt < prev.reachedAt) byDays.set(h.days, h);
  }
  return [...byDays.values()].sort((x, y) => x.days - y.days);
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

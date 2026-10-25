import {
  AppState, KEPT_LETTERS_CAP, KeptLetter, KeptLetterKind, LetterMoment, MilestoneRecord,
  PersonId, PingsState, TreePestEvent, dayKeyLocal, localDayNumber, parseDateKey, today,
} from "./types";
import { PEST_EXPIRE_MS, decayedStats, isPestActive, treeStageForDay } from "./tree";
import { makeLetterMoment, messageById, seeded01 } from "./content";

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

/* ================= SÂU TRÊN CÂY — ĐIỀU KIỆN XUẤT HIỆN (thuần, theo seed) ================= */
/** Cây bị bỏ bê: lâu không được chăm HOẶC chỉ số thấp nhất đã hao xuống thấp */
export const PEST_NEGLECT_HOURS = 24;
export const PEST_LOW_STAT = 30;
/** Xác suất xuất hiện trong ngày khi cây bị bỏ bê / khi cây được chăm đều */
export const PEST_CHANCE_NEGLECTED = 0.5;
export const PEST_CHANCE_BASE = 0.12;

/**
 * Đợt sâu của "hôm nay" (nếu có) — THUẦN và XÁC ĐỊNH theo seed nên 2 máy tính
 * ra GIỐNG HỆT nhau từ cùng state: máy nào mở app trước thì dispatch
 * PEST_SPAWN ghi sự kiện vào state, máy kia hội tụ qua sync (và tự nó cũng
 * tính ra cùng một sự kiện nếu chưa kịp nhận).
 *
 * Điều kiện:
 * - Chưa có đợt sâu đang sống; ngày của mốc xuất hiện chưa từng có đợt sâu
 *   (tối đa 1 đợt/ngày — kể cả đợt đã bắt/hết hạn rồi).
 * - Rút thăm theo seed hash("pest:{startDate}:{dateKey}"): cây bị bỏ bê
 *   (>= 24h không ai chăm HOẶC chỉ số thấp nhất < 30) -> 50%; còn lại 12%.
 * - Mốc xuất hiện: bỏ bê vì lâu không chăm -> đúng lúc đủ 24h kể từ lần chăm
 *   cuối; các trường hợp còn lại -> một giờ cố định trong buổi sáng/chiều
 *   (7h–15h, cũng theo seed). Mốc xuất hiện phải <= now và cửa sổ sống 12h
 *   chưa trôi qua (sâu xuất hiện mà không ai kịp thấy thì coi như chưa từng có).
 */
export function pestSpawnFor(state: AppState, nowMs: number = Date.now()): TreePestEvent | null {
  const pest = state.treePest;
  if (isPestActive(pest, nowMs)) return null;
  const { tree } = state;
  const lastCareMs = tree.lastCareAt
    ? new Date(tree.lastCareAt).getTime()
    : new Date(tree.plantedAt).getTime();
  const hoursSinceCare = isFinite(lastCareMs) ? (nowMs - lastCareMs) / 3600000 : 0;
  const stats = decayedStats(tree, nowMs);
  const minStat = Math.min(stats.water, stats.sun, stats.love);
  const staleCare = hoursSinceCare >= PEST_NEGLECT_HOURS;
  const neglected = staleCare || minStat < PEST_LOW_STAT;

  const todayKey = dayKeyLocal(new Date(nowMs));
  const roll = seeded01(`pest:${state.couple.startDate}:${todayKey}`);
  if (roll >= (neglected ? PEST_CHANCE_NEGLECTED : PEST_CHANCE_BASE)) return null;

  const dayStart = parseDateKey(todayKey);
  if (!dayStart) return null;
  const seededHourMs = dayStart.getTime()
    + (7 + Math.floor(seeded01(`pest-hour:${state.couple.startDate}:${todayKey}`) * 9)) * 3600000;
  let appearedMs = seededHourMs;
  if (staleCare) appearedMs = Math.max(lastCareMs + PEST_NEGLECT_HOURS * 3600000, seededHourMs);
  if (appearedMs > nowMs) return null; // chưa tới giờ xuất hiện — lần mở sau sẽ tính lại
  if (nowMs - appearedMs >= PEST_EXPIRE_MS) return null; // cửa sổ sống đã qua mà chưa ai ghi sổ
  const dateKey = dayKeyLocal(new Date(appearedMs));
  if (pest && pest.dateKey === dateKey) return null; // ngày đó đã có đợt sâu rồi
  return {
    id: `pest-${dateKey}`,
    dateKey,
    appearedAt: new Date(appearedMs).toISOString(),
    status: "active",
    caughtBy: "",
    caughtAt: "",
    expiredAt: "",
  };
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

/* ================= CORE 5 — VỊ TRÍ TRỰC TIẾP ================= */
/** Cổng tiết lưu publish vị trí trực tiếp: tối đa 1 lần / 10 giây VÀ chỉ khi
 *  đã di chuyển >= 20m từ điểm publish gần nhất. */
export const LIVE_MIN_INTERVAL_MS = 10000;
export const LIVE_MIN_DISTANCE_M = 20;

/**
 * Có nên publish điểm mới này không — THUẦN để kiểm chứng: chưa từng publish
 * -> publish ngay; chưa đủ 10 giây từ lần publish trước -> không; đủ giờ
 * nhưng di chuyển chưa tới 20m -> không; đủ cả hai -> publish.
 */
export function shouldPublishLive(
  last: { lat: number; lng: number; atMs: number } | null,
  next: { lat: number; lng: number },
  nowMs: number,
): boolean {
  if (!last) return true;
  if (nowMs - last.atMs < LIVE_MIN_INTERVAL_MS) return false;
  return haversineKm(last, next) * 1000 >= LIVE_MIN_DISTANCE_M;
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

/**
 * Nhãn "độ tươi" của vị trí trực tiếp — nói THẬT trạng thái mà không hù:
 * điểm mới (< 90 giây) là "Vừa cập nhật"; trong giờ là "Cập nhật N phút
 * trước"; cũ hơn nữa (thường là vì app của người ấy đang đóng — vị trí chỉ
 * publish khi app mở) thì ghi "Vị trí gần nhất · ..." để hiểu đó là điểm
 * cuối cùng được thấy, không phải vị trí hiện tại.
 */
export function freshnessText(locAt: string, nowMs: number = Date.now()): string {
  if (!locAt) return "";
  const t = new Date(locAt).getTime();
  if (!isFinite(t)) return "";
  const age = nowMs - t;
  if (age < 90 * 1000) return "Vừa cập nhật";
  if (age < 3600000) return `Cập nhật ${Math.max(1, Math.floor(age / 60000))} phút trước`;
  return `Vị trí gần nhất · ${timeAgoText(locAt, nowMs)}`;
}

/* ================= CORE 4 — NHỊP NHỚ: ĐẾM THEO NGÀY ================= */
/**
 * Số nhịp một người ĐÃ GỬI trong "hôm nay" (ngày địa phương) — đọc từ bộ đếm
 * ngày của pings (reducer cộng dồn theo NGƯỜI GỬI và tự lăn ngày khi sang
 * ngày mới). Bộ đếm thuộc về ngày khác (chưa kịp lăn) -> 0: nhịp nhớ là
 * MỘT CHIỀU (người gửi là người đang nhớ) nên số này luôn là số nhịp CỦA
 * SLOT ĐÓ gửi đi — phía người nhận dùng nó cho dòng "Hôm nay {người ấy} đã
 * nhớ bạn N lần" trong PingPop, gồm cả chính nhịp vừa tới (reducer đã cộng
 * nhịp đó vào bộ đếm ngày trước khi state đồng bộ sang máy người nhận).
 */
export function pingsToday(pings: PingsState, slot: PersonId): number {
  return pings.day.date === today() ? pings.day[slot] : 0;
}

/* ================= TRẠNG THÁI CỦA NHAU — HẠN HIỆN 24 GIỜ ================= */
/** Trạng thái chỉ HIỆN tối đa 24 giờ kể từ lúc đặt; hết 24 giờ là HẾT HẠN
 *  và phải đặt lại cái mới (luật chủ app chốt 2026-10-25). */
export const STATUS_TTL_MS = 24 * 3600000;

/**
 * Trạng thái đã HẾT HẠN chưa (> 24h từ lúc đặt). Chưa đặt (null) thì không
 * có gì để hết hạn -> false. Mốc updatedAt hỏng/không đọc được -> coi như
 * hết hạn (thà ẩn còn hơn hiện một trạng thái không rõ tuổi).
 */
export function statusExpired(status: { updatedAt: string } | null | undefined, nowMs: number = Date.now()): boolean {
  if (!status) return false;
  const t = new Date(status.updatedAt).getTime();
  if (!isFinite(t)) return true;
  return nowMs - t > STATUS_TTL_MS;
}

/**
 * Trạng thái ĐƯỢC PHÉP HIỆN tại thời điểm nowMs: có đặt VÀ chưa hết hạn thì
 * trả nguyên trạng thái; còn lại trả null — hết hạn = hiện ĐÚNG NHƯ CHƯA ĐẶT
 * (không mờ, không nhãn "từ hôm qua"). Hạn được tính thuần từ updatedAt ngay
 * lúc hiển thị, KHÔNG xoá/sửa state đã lưu, nên 2 máy luôn nhất trí mà không
 * tốn thêm lượt đồng bộ nào; đặt trạng thái mới (updatedAt mới) là đồng hồ
 * 24 giờ chạy lại từ đầu.
 */
export function visibleStatus<T extends { updatedAt: string }>(status: T | null | undefined, nowMs: number = Date.now()): T | null {
  if (!status) return null;
  return statusExpired(status, nowMs) ? null : status;
}

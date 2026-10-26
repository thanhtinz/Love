import {
  Birthday, PersonId, SPECIAL_DATES_CAP, SPECIAL_DATE_TITLE_MAX, SpecialDate,
  formatDateVN, isPlainObject, isValidDateKey, localDayNumber, parseDateKey, strOr,
} from "./types";

/**
 * NGÀY KỶ NIỆM — logic THUẦN của màn /special-days (không React/Supabase):
 * toán đếm ngược theo NGÀY DƯƠNG LỊCH ĐỊA PHƯƠNG (mọi phép trừ đều đi qua
 * localDayNumber nên không lệch UTC/qua tháng), chuẩn hoá + hợp nhất bộ sưu
 * tập ngày đặc biệt, và dựng danh sách thẻ đã sắp cho màn hình.
 *
 * Mô hình đồng bộ của bộ sưu tập ngày đặc biệt — THEO ĐÚNG dây kỷ niệm
 * (lib/memories.ts đã kiểm chứng):
 * - UNION theo id: ngày người này thêm, máy người kia chưa có vẫn được giữ.
 * - Cùng một id ở 2 máy: LAST-WRITER-WINS theo `updatedAt`; hoà mốc thì so
 *   chuỗi JSON (merge (a, b) và merge (b, a) cho cùng một kết quả).
 * - Xoá: id vào DANH SÁCH MỘ (removedSpecialDateIds, union giữa 2 máy) và
 *   hiện thực hoá lọc bỏ — bản sao cũ không hồi sinh được ngày đã xoá.
 * Sinh nhật thì RIÊNG theo slot như trạng thái (chỉ chính chủ ghi) — phần
 * merge của sinh nhật nằm ở lib/merge.ts (pickSlot, chủ slot thắng).
 */

/* ================= TOÁN NGÀY: LẦN XUẤT HIỆN + ĐẾM NGƯỢC ================= */

const isLeapYear = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Số ngày của từng tháng trong NĂM NHUẬN — dùng để CHẤP NHẬN 29/02 khi nhập
 *  sinh nhật/ngày lặp (ngày đó có tồn tại, chỉ là không phải năm nào cũng có). */
const DAYS_IN_MONTH_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Ngày/tháng có hợp lệ không (theo lịch năm nhuận: 29/02 được, 30/02 và
 *  31/04 thì không). Chỉ nhận số nguyên thật — chuỗi số bị loại. */
export function isValidDayMonth(day: unknown, month: unknown): boolean {
  if (typeof day !== "number" || typeof month !== "number") return false;
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= DAYS_IN_MONTH_LEAP[month - 1];
}

/**
 * Số thứ tự ngày địa phương của LẦN XUẤT HIỆN trong `year` của một ngày/tháng.
 * 29/02 rơi vào năm KHÔNG nhuận -> lần xuất hiện của năm đó là 28/02 (sinh
 * nhật 29/02 vẫn được mừng mỗi năm, chỉ sớm một ngày ở năm thường) — luật này
 * áp nhất quán cho cả sinh nhật lẫn ngày đặc biệt lặp hằng năm.
 */
export function occurrenceDayNumber(day: number, month: number, year: number): number {
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return localDayNumber(new Date(year, month - 1, d));
}

/** Còn bao nhiêu ngày tới lần xuất hiện TIẾP THEO của ngày/tháng này:
 *  năm nay nếu chưa qua, sang năm nếu đã qua; đúng hôm nay -> 0. */
export function daysUntilYearly(day: number, month: number, nowMs: number = Date.now()): number {
  const now = new Date(nowMs);
  const todayNum = localDayNumber(now);
  let occ = occurrenceDayNumber(day, month, now.getFullYear());
  if (occ < todayNum) occ = occurrenceDayNumber(day, month, now.getFullYear() + 1);
  return occ - todayNum;
}

/** Khóa ngày (yyyy-mm-dd) của lần xuất hiện tiếp theo — để hiện ngày lên thẻ. */
export function nextOccurrenceKey(day: number, month: number, nowMs: number = Date.now()): string {
  const now = new Date(nowMs);
  const todayNum = localDayNumber(now);
  let year = now.getFullYear();
  if (occurrenceDayNumber(day, month, year) < todayNum) year += 1;
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  const mm = String(month).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Kết quả đếm cho MỘT sự kiện:
 * - upcoming: còn `days` ngày (0 = ĐÚNG HÔM NAY — ngày đáng ăn mừng).
 * - elapsed: đã qua được `days` ngày (chỉ xảy ra với ngày MỘT LẦN).
 */
export type DayCountdown =
  | { mode: "upcoming"; days: number }
  | { mode: "elapsed"; days: number };

/** Đếm cho một ngày đặc biệt: lặp hằng năm thì luôn là upcoming tới lần xuất
 *  hiện tiếp theo; một lần thì so thẳng với hôm nay. dateKey hỏng -> elapsed 0
 *  (không crash — dữ liệu qua sanitize vốn không tới được đây). */
export function countdownForSpecial(item: Pick<SpecialDate, "dateKey" | "yearly">, nowMs: number = Date.now()): DayCountdown {
  const target = parseDateKey(item.dateKey);
  if (!target) return { mode: "elapsed", days: 0 };
  if (item.yearly) {
    return { mode: "upcoming", days: daysUntilYearly(target.getDate(), target.getMonth() + 1, nowMs) };
  }
  const diff = localDayNumber(target) - localDayNumber(new Date(nowMs));
  return diff >= 0 ? { mode: "upcoming", days: diff } : { mode: "elapsed", days: -diff };
}

/* ================= CHUẨN HOÁ + HỢP NHẤT BỘ SƯU TẬP ================= */

/** Trần danh sách mộ giữ lại trong state (như dây kỷ niệm). */
export const REMOVED_SPECIAL_DATE_IDS_CAP = 300;

/** Tiêu đề chuẩn: trim hai đầu + cắt đúng trần ký tự (khóa cứng ở tầng lib). */
export function sanitizeSpecialTitle(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, SPECIAL_DATE_TITLE_MAX) : "";
}

/** Sinh nhật chuẩn: chỉ nhận {day, month} nguyên hợp lệ theo lịch năm nhuận;
 *  còn lại -> null (chưa đặt / dữ liệu hỏng — đánh rơi êm, không crash). */
export function sanitizeBirthday(raw: unknown): Birthday | null {
  if (!isPlainObject(raw)) return null;
  const day = typeof raw.day === "number" ? Math.floor(raw.day) : NaN;
  const month = typeof raw.month === "number" ? Math.floor(raw.month) : NaN;
  if (!isValidDayMonth(day, month)) return null;
  return { day, month };
}

const slotOr = (v: unknown): PersonId | "" => (v === "A" || v === "B" ? v : "");
const isoOr = (v: unknown): string => {
  const s = strOr(v, "");
  return s && isFinite(new Date(s).getTime()) ? s : "";
};

/**
 * Chuẩn hoá MỘT ngày đặc biệt từ dữ liệu bất kỳ: thiếu id, tiêu đề rỗng sau
 * trim, dateKey không tồn tại, bySlot lạ, mốc thời gian không đọc được ->
 * null (đánh rơi). addedAt hỏng thì lùi về updatedAt (và ngược lại).
 */
export function sanitizeSpecialDate(raw: unknown): SpecialDate | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  const title = sanitizeSpecialTitle(raw.title);
  if (!title) return null;
  if (!isValidDateKey(raw.dateKey)) return null;
  const bySlot = slotOr(raw.bySlot);
  if (!bySlot) return null;
  const updatedAt = isoOr(raw.updatedAt) || isoOr(raw.addedAt);
  const addedAt = isoOr(raw.addedAt) || updatedAt;
  if (!updatedAt || !addedAt) return null;
  return {
    id: raw.id,
    title,
    dateKey: raw.dateKey as string,
    yearly: raw.yearly === true,
    bySlot,
    addedAt,
    updatedAt,
  };
}

/** Thứ tự LƯU của bộ sưu tập: theo dateKey tăng dần, hoà thì theo mốc thêm,
 *  hoà nữa thì theo id — hoàn toàn xác định để 2 máy xếp giống hệt nhau
 *  (thứ tự HIỆN trên màn do buildSpecialDayList tính lại theo đếm ngược). */
export function compareSpecialDates(a: SpecialDate, b: SpecialDate): number {
  if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
  if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
export function sortSpecialDates(list: SpecialDate[]): SpecialDate[] {
  return [...list].sort(compareSpecialDates);
}

/** Bản nào thắng khi cùng id: updatedAt mới hơn; hoà mốc -> JSON lớn hơn
 *  thắng (đối xứng: không phụ thuộc bản nào là "local"). */
export function specialDateLwwWins(candidate: SpecialDate, current: SpecialDate): boolean {
  if (candidate.updatedAt !== current.updatedAt) return candidate.updatedAt > current.updatedAt;
  return JSON.stringify(candidate) > JSON.stringify(current);
}

/**
 * HIỆN THỰC HOÁ bộ sưu tập: lọc bỏ id nằm trong mộ, khử trùng theo id (bản
 * LWW thắng), sắp theo thứ tự lưu, chặn trần SPECIAL_DATES_CAP (phần tràn chỉ
 * xảy ra khi 2 máy cùng thêm lúc gần đầy — cả 2 máy cùng tính ra cùng một
 * danh sách bị chặn nên vẫn hội tụ). Đây là dạng duy nhất được LƯU vào
 * state.specialDates.
 */
export function materializeSpecialDates(items: SpecialDate[], removedIds: string[]): SpecialDate[] {
  const tomb = new Set(removedIds);
  const byId = new Map<string, SpecialDate>();
  for (const it of items) {
    if (!it || tomb.has(it.id)) continue;
    const prev = byId.get(it.id);
    if (!prev || specialDateLwwWins(it, prev)) byId.set(it.id, it);
  }
  return sortSpecialDates([...byId.values()]).slice(0, SPECIAL_DATES_CAP);
}

/** Hợp nhất danh sách mộ của 2 máy: union giữ thứ tự xuất hiện, chặn trần. */
export function unionRemovedSpecialDateIds(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...a, ...b]) {
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(-REMOVED_SPECIAL_DATE_IDS_CAP);
}

/** Hợp nhất bộ sưu tập giữa 2 máy (đúng khuôn mergeMemories): mộ hợp nhất
 *  trước, union theo id với LWW từng mục, rồi hiện thực hoá bằng mộ chung. */
export function mergeSpecialDates(
  local: SpecialDate[], remote: SpecialDate[],
  localRemoved: string[], remoteRemoved: string[],
): { specialDates: SpecialDate[]; removedSpecialDateIds: string[] } {
  const removedSpecialDateIds = unionRemovedSpecialDateIds(localRemoved, remoteRemoved);
  const specialDates = materializeSpecialDates([...local, ...remote], removedSpecialDateIds);
  return { specialDates, removedSpecialDateIds };
}

/* ================= DANH SÁCH THẺ CHO MÀN HÌNH ================= */

/**
 * MỘT thẻ trong danh sách "Ngày kỷ niệm" — đã gồm cả TIÊU ĐỀ + NHÃN NGÀY để
 * màn hình (và thẻ vào ở tab Hai đứa) không phải tự ghép chữ hai nơi khác
 * nhau. `group` quyết thứ tự hiện:
 * - 0: SẮP TỚI (gồm cả hôm nay) — sắp theo số ngày còn lại tăng dần.
 * - 1: ĐÃ QUA (ngày một lần đã qua + thẻ kỷ niệm yêu nhau) — sắp theo độ
 *   "vừa mới qua" (số ngày đã qua tăng dần), nên kỷ niệm yêu nhau (đã qua
 *   hàng trăm ngày) tự nhiên đứng cuối như ảnh mẫu của chủ app.
 * - 2: LỜI MỜI đặt sinh nhật của CHÍNH MÌNH (chỉ khi mình chưa đặt; sinh
 *   nhật chưa đặt của NGƯỜI ẤY thì không hiện thẻ nào — dữ kiện riêng của họ).
 */
export interface SpecialDayListItem {
  key: string;
  kind: "birthday" | "anniversary" | "custom" | "birthdayInvite";
  /** Slot của thẻ sinh nhật/lời mời; null với thẻ kỷ niệm + ngày tự thêm */
  slot: PersonId | null;
  /** Ngày đặc biệt gốc (chỉ kind "custom") */
  item: SpecialDate | null;
  group: 0 | 1 | 2;
  /** group 0: số ngày còn lại (0 = hôm nay) · group 1: số ngày đã qua */
  days: number;
  isToday: boolean;
  title: string;
  dateLabel: string;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function buildSpecialDayList(args: {
  birthdays: { A: Birthday | null; B: Birthday | null };
  specialDates: SpecialDate[];
  startDate: string;
  /** Số ngày yêu hiện tại (dayCount ở features) — "Đã X ngày" của thẻ kỷ niệm */
  loveDayCount: number;
  nameA: string;
  nameB: string;
  mySlot: PersonId;
  nowMs?: number;
}): SpecialDayListItem[] {
  const nowMs = args.nowMs ?? Date.now();
  const nameOf = (slot: PersonId): string => (slot === "A" ? args.nameA : args.nameB);
  const items: SpecialDayListItem[] = [];

  for (const slot of ["A", "B"] as PersonId[]) {
    const b = args.birthdays[slot];
    if (b) {
      const days = daysUntilYearly(b.day, b.month, nowMs);
      items.push({
        key: `birthday-${slot}`, kind: "birthday", slot, item: null,
        group: 0, days, isToday: days === 0,
        title: `Sinh nhật của ${nameOf(slot)}`,
        dateLabel: `${pad2(b.day)}/${pad2(b.month)}`,
      });
    } else if (slot === args.mySlot) {
      items.push({
        key: `birthday-invite-${slot}`, kind: "birthdayInvite", slot, item: null,
        group: 2, days: 0, isToday: false,
        title: "Thêm sinh nhật của bạn",
        dateLabel: "",
      });
    }
  }

  items.push({
    key: "anniversary", kind: "anniversary", slot: null, item: null,
    group: 1, days: args.loveDayCount, isToday: false,
    title: "Kỷ niệm yêu nhau",
    dateLabel: formatDateVN(args.startDate),
  });

  for (const sd of args.specialDates) {
    const cd = countdownForSpecial(sd, nowMs);
    const target = parseDateKey(sd.dateKey);
    items.push({
      key: `custom-${sd.id}`, kind: "custom", slot: null, item: sd,
      group: cd.mode === "upcoming" ? 0 : 1,
      days: cd.days,
      isToday: cd.mode === "upcoming" && cd.days === 0,
      title: sd.title,
      dateLabel: sd.yearly && target
        ? formatDateVN(nextOccurrenceKey(target.getDate(), target.getMonth() + 1, nowMs))
        : formatDateVN(sd.dateKey),
    });
  }

  items.sort((a, b) => (a.group - b.group) || (a.days - b.days) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return items;
}

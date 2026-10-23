import {
  CycleSlotState, PetState, PresenceSlotState, SpecialEvent,
  dayKeyLocal, localDayNumber, parseDateKey,
} from "./types";

/**
 * Logic THUẦN của gói tính năng 2026-10-23 (Nhớ bạn / Hiện diện / Chu kỳ /
 * Thú cưng / Ngày đặc biệt) — không React/native, kiểm chứng bằng
 * scripts/test-logic.mjs như mọi logic vườn khác.
 */

/* ================= Hiện diện: khoảng cách ================= */

/** Khoảng cách đường chim bay (km) giữa 2 toạ độ — công thức haversine. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Khoảng cách giữa 2 snapshot hiện diện; null khi một trong hai chưa có toạ độ. */
export function distanceKmBetween(a: PresenceSlotState, b: PresenceSlotState): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

/** Định dạng km kiểu Việt: 2,3 km · 850 m (làm tròn chục mét) · số nguyên khi >= 10 km. */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/**
 * Nhãn khoảng cách theo kế hoạch Hạng 2: rất gần (< 0,1 km) và "cùng một nơi"
 * (< 0,5 km) được diễn đạt bằng lời thay vì con số lạnh.
 */
export function distanceLabel(km: number): string {
  if (km < 0.1) return "đang ở rất gần bạn";
  if (km < 0.5) return "đang ở cùng một nơi với bạn";
  return `đang cách bạn ${formatKm(km)}`;
}

/** Thời gian tương đối kiểu Việt cho dòng "cập nhật lúc …". */
export function relativeTimeVi(iso: string, nowMs: number = Date.now()): string {
  if (!iso) return "chưa cập nhật";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "chưa cập nhật";
  const diff = nowMs - t;
  if (diff < 60000) return "vừa xong";
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} phút trước`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "hôm qua";
  if (days < 30) return `${days} ngày trước`;
  const d = new Date(t);
  return `ngày ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Snapshot coi là "cũ" sau 24 giờ — UI phải nói rõ thay vì hiện như dữ kiện mới. */
export const PRESENCE_STALE_MS = 24 * 3600000;
/** Cooldown cập nhật tay snapshot của chính mình (kế hoạch Hạng 2: 30 giây). */
export const PRESENCE_REFRESH_COOLDOWN_MS = 30000;

/* ================= Chu kỳ (Meet You for Partners) ================= */

export type CyclePhase = "period" | "follicular" | "ovulation" | "luteal";
export const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  period: "Kỳ kinh",
  follicular: "Giai đoạn nang trứng",
  ovulation: "Ngày rụng trứng",
  luteal: "Giai đoạn hoàng thể",
};
/** Gợi ý quan tâm nhẹ theo giai đoạn — văn phong chăm sóc, KHÔNG phải tư vấn y tế. */
export const CYCLE_TIPS: Record<CyclePhase, string[]> = {
  period: [
    "Pha một cốc trà ấm hoặc chuẩn bị túi chườm ấm cho bạn ấy",
    "Hỏi bạn ấy có đau bụng không và ở bên nhiều hơn hôm nay",
    "Nhường bạn ấy nghỉ ngơi — việc nhà để mình lo thêm một chút",
  ],
  follicular: [
    "Tinh thần đang lên — rủ bạn ấy làm điều cả hai thích",
    "Một lời khen nhỏ hôm nay sẽ được nhớ rất lâu",
    "Cùng lên kế hoạch cho buổi hẹn sắp tới nhé",
  ],
  ovulation: [
    "Năng lượng đang cao — hợp cho một buổi hẹn ra ngoài",
    "Tặng bạn ấy một món quà nhỏ bất ngờ",
    "Cùng nhau vận động nhẹ: đi dạo quanh khu vườn chẳng hạn",
  ],
  luteal: [
    "Gần kỳ tới, bạn ấy có thể mệt và nhạy cảm hơn — kiên nhẫn một chút nhé",
    "Hạn chế trêu chọc, tăng ôm ấp và lắng nghe",
    "Chuẩn bị sẵn đồ ăn vặt bạn ấy thích cho những ngày sắp tới",
  ],
};

export interface CycleInfo {
  /** Ngày thứ mấy trong chu kỳ (0-based) */
  dayInCycle: number;
  phase: CyclePhase;
  phaseLabel: string;
  /** Ngày dự kiến bắt đầu kỳ tiếp theo (khoá ngày địa phương yyyy-mm-dd) */
  nextStart: string;
  /** Còn bao nhiêu ngày tới kỳ tiếp theo (0 = hôm nay) */
  daysUntilNext: number;
  /** Cửa sổ nhạy cảm: đang trong kỳ kinh hoặc <= 3 ngày trước kỳ tới (PMS) */
  sensitive: boolean;
  tips: string[];
}

/**
 * Suy ra giai đoạn từ (ngày bắt đầu kỳ gần nhất, độ dài chu kỳ, độ dài kỳ kinh).
 * Ngày rụng trứng ước tính = cycleLen - 14 (pha hoàng thể ~14 ngày), cửa sổ ±1 ngày.
 * Trả về null khi chưa có ngày bắt đầu hợp lệ hoặc ngày bắt đầu nằm trong tương lai.
 * CHỈ là phép tính lịch tham khảo để quan tâm nhau — không phải dự đoán y tế.
 */
export function cycleInfo(c: CycleSlotState, nowMs: number = Date.now()): CycleInfo | null {
  if (!c.lastStart) return null;
  const start = parseDateKey(c.lastStart);
  if (!start) return null;
  const cycleLen = Math.max(21, Math.min(35, Math.round(c.cycleLen) || 28));
  const periodLen = Math.max(3, Math.min(8, Math.round(c.periodLen) || 5));
  const diff = localDayNumber(new Date(nowMs)) - localDayNumber(start);
  if (diff < 0) return null;
  const dayInCycle = diff % cycleLen;
  const daysUntilNext = (cycleLen - dayInCycle) % cycleLen;
  const next = new Date(nowMs);
  next.setDate(next.getDate() + daysUntilNext);
  const ovDay = cycleLen - 14;
  let phase: CyclePhase;
  if (dayInCycle < periodLen) phase = "period";
  else if (Math.abs(dayInCycle - ovDay) <= 1) phase = "ovulation";
  else if (dayInCycle < ovDay - 1) phase = "follicular";
  else phase = "luteal";
  return {
    dayInCycle,
    phase,
    phaseLabel: CYCLE_PHASE_LABEL[phase],
    nextStart: dayKeyLocal(next),
    daysUntilNext,
    sensitive: phase === "period" || daysUntilNext <= 3,
    tips: CYCLE_TIPS[phase],
  };
}

/* ================= Thú cưng chung ================= */

export type PetCareKind = "feed" | "pet" | "play";
export const PET_CARE_LABEL: Record<PetCareKind, string> = { feed: "cho ăn", pet: "vuốt ve", play: "chơi cùng" };
/** Cooldown chăm pet: 60 giây/người — cùng luật với chăm cây */
export const PET_CARE_COOLDOWN_MS = 60000;
/** Thưởng Xu nhỏ khi chăm pet: +3 Xu, tối đa 5 lần được thưởng/ngày/người (chung tinh thần trần thưởng ngày của vườn) */
export const PET_CARE_REWARD_COINS = 3;
export const PET_CARE_REWARD_DAILY_MAX = 5;
/** Ngưỡng ngày-chăm-khác-nhau để lên giai đoạn: bé con (0) -> thiếu niên (3 ngày) -> trưởng thành (7 ngày) */
export const PET_STAGE_THRESHOLDS = [0, 3, 7];
export const PET_STAGE_LABEL = ["Bé con", "Thiếu niên", "Trưởng thành"];
/** Hao theo giờ: đói hao nhanh hơn vui một chút (pet cần được cho ăn đều hơn được chơi) */
export const PET_DECAY_PER_HOUR = { hunger: 1.8, joy: 1.4 };

/** Giai đoạn của pet suy ra từ SỐ NGÀY KHÁC NHAU có chăm — chăm dồn trong 1 ngày không lên giai đoạn. */
export function petStageIndex(pet: PetState): number {
  const days = pet.careDays.length;
  let idx = 0;
  PET_STAGE_THRESHOLDS.forEach((t, i) => { if (days >= t) idx = i; });
  return idx;
}

/** Chỉ số đói/vui HIỆU DỤNG tại nowMs (hao theo giờ từ mốc statsAt) — không ghi cứng vào state. */
export function petNeedsAt(pet: PetState, nowMs: number = Date.now()): { hunger: number; joy: number } {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
  const base = { hunger: clamp(pet.hunger || 0), joy: clamp(pet.joy || 0) };
  if (!pet.statsAt) return base;
  const hours = (nowMs - new Date(pet.statsAt).getTime()) / 3600000;
  if (!isFinite(hours) || hours <= 0) return base;
  return {
    hunger: clamp(base.hunger - PET_DECAY_PER_HOUR.hunger * hours),
    joy: clamp(base.joy - PET_DECAY_PER_HOUR.joy * hours),
  };
}

export interface PetCareStatus { ok: boolean; reason: string; cooldownLeftMs: number }
/**
 * Kiểm tra một lần chăm pet có HỢP LỆ + CÓ TÁC DỤNG không — cùng triết lý careStatus của cây:
 * cooldown 60 giây theo NGƯỜI, và chăm vào chỉ số đã đầy (>= 95) thì vô hiệu.
 * feed cần đói chưa đầy; vuốt ve/chơi cần vui chưa đầy.
 */
export function petCareStatus(pet: PetState, kind: PetCareKind, slot: "A" | "B", nowMs: number = Date.now()): PetCareStatus {
  const last = pet.lastCareAtBy ? pet.lastCareAtBy[slot] : "";
  if (last) {
    const left = PET_CARE_COOLDOWN_MS - (nowMs - new Date(last).getTime());
    if (left > 0) return { ok: false, reason: `Bạn vừa chăm ${pet.name} rồi — chờ ${Math.ceil(left / 1000)} giây nữa nhé`, cooldownLeftMs: left };
  }
  const needs = petNeedsAt(pet, nowMs);
  if (kind === "feed" && needs.hunger >= 95) return { ok: false, reason: `${pet.name} đang no căng rồi, cho ăn thêm không có tác dụng`, cooldownLeftMs: 0 };
  if (kind !== "feed" && needs.joy >= 95) return { ok: false, reason: `${pet.name} đang vui hết nấc rồi`, cooldownLeftMs: 0 };
  return { ok: true, reason: "", cooldownLeftMs: 0 };
}

/** Một câu trạng thái của pet cho dải vườn ở Trang chủ. */
export function petStatusLine(pet: PetState, nowMs: number = Date.now()): string {
  const needs = petNeedsAt(pet, nowMs);
  const min = Math.min(needs.hunger, needs.joy);
  if (min < 20) return needs.hunger <= needs.joy ? `${pet.name} đang đói lắm — vào vườn cho bé ăn nhé` : `${pet.name} đang buồn — vào vườn chơi với bé nhé`;
  if (min < 45) return needs.hunger <= needs.joy ? `${pet.name} hơi đói rồi` : `${pet.name} hơi buồn, cần được vuốt ve`;
  return `${pet.name} đang vui vẻ trong vườn`;
}

/* ================= Ngày đặc biệt ================= */

export interface UpcomingEvent { event: SpecialEvent; dateKey: string; daysUntil: number }

function dateKeyOf(d: Date): string { return dayKeyLocal(d); }

/**
 * Lần xuất hiện TIẾP THEO của một sự kiện (kể từ hôm nay, giờ địa phương).
 * - once: chính ngày đó; đã qua -> null.
 * - yearly: ngày/tháng của năm nay; đã qua -> năm sau. 29/2 vào năm không nhuận -> lùi 28/2.
 */
export function nextOccurrence(ev: SpecialEvent, nowMs: number = Date.now()): { dateKey: string; daysUntil: number } | null {
  const base = parseDateKey(ev.date);
  if (!base) return null;
  const todayNum = localDayNumber(new Date(nowMs));
  if (ev.repeat === "once") {
    const daysUntil = localDayNumber(base) - todayNum;
    return daysUntil >= 0 ? { dateKey: ev.date, daysUntil } : null;
  }
  const month = base.getMonth();
  const day = base.getDate();
  const candidate = (year: number): Date => {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDayOfMonth));
  };
  let cand = candidate(new Date(nowMs).getFullYear());
  if (localDayNumber(cand) < todayNum) cand = candidate(new Date(nowMs).getFullYear() + 1);
  return { dateKey: dateKeyOf(cand), daysUntil: localDayNumber(cand) - todayNum };
}

/** Danh sách sự kiện sắp tới đã sắp xếp gần nhất trước (bỏ sự kiện một-lần đã qua). */
export function upcomingEvents(events: SpecialEvent[], nowMs: number = Date.now()): UpcomingEvent[] {
  return events
    .map((event) => {
      const occ = nextOccurrence(event, nowMs);
      return occ ? { event, dateKey: occ.dateKey, daysUntil: occ.daysUntil } : null;
    })
    .filter((x): x is UpcomingEvent => x !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.event.title.localeCompare(b.event.title));
}

/** Sự kiện gần nhất sắp tới — cho dòng đếm ngược ở hub Hai đứa và Trang chủ. */
export function nextEvent(events: SpecialEvent[], nowMs: number = Date.now()): UpcomingEvent | null {
  return upcomingEvents(events, nowMs)[0] ?? null;
}

/** Nhãn đếm ngược thân thiện: "hôm nay" / "ngày mai" / "còn N ngày". */
export function countdownLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "hôm nay";
  if (daysUntil === 1) return "ngày mai";
  return `còn ${daysUntil} ngày`;
}

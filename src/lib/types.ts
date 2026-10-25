/**
 * Kiểu dữ liệu + hằng số cho bản REBUILD "5 tính năng lõi" (2026-10-23).
 * App chỉ còn: 1) Đếm ngày yêu · 2) Cây tình yêu · 3) Note tình yêu ·
 * 4) Tương tác (nhịp tim "Nhớ bạn" + dấu vết) · 5) Định vị tạm thời.
 * KHÔNG còn kinh tế Xu/XP, shop, game, pet, chu kỳ, sự kiện, khung ảnh...
 *
 * File này chỉ chứa type + tiện ích thuần (ngày giờ địa phương, id, avatar).
 * State mặc định + normalize ở lib/model.ts; logic cây ở lib/tree.ts;
 * nội dung (mood, thư) ở lib/content.ts; tính năng ở lib/features.ts.
 */
export type PersonId = "A" | "B";
export type Rarity = "common" | "rare" | "legendary";

/** Mốc sửa gần nhất của một "mục" state, kèm slot của máy đã sửa — phục vụ merge
 *  2 máy (lib/merge.ts): mục theo người ưu tiên bản do CHÍNH chủ slot sửa. */
export interface SecStamp { t: string; by: PersonId }

/* ---------- Tiện ích chống dữ liệu hỏng (state từ server/cache có thể sai kiểu) ---------- */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
/** Số hữu hạn hoặc fallback; chuỗi số hợp lệ được parse thay vì reset (dữ liệu cũ hay ghi số dạng chuỗi). */
export function finiteNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}
export function objArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v.filter((x) => isPlainObject(x)) as T[]) : [];
}
export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
export function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
export function strOr(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

/* ---------- Avatar (12 tranh vẽ thật ở assets/art/avatars) ---------- */
export interface AvatarOption { id: string; label: string; bg: string; color: string }
export const AVATARS: AvatarOption[] = [
  { id: "svg-a", label: "Bé Hoa", bg: "#ffe4ec", color: "#f472b6" },
  { id: "svg-b", label: "Bé Sao", bg: "#dbeafe", color: "#60a5fa" },
  { id: "bunny", label: "Thỏ con", bg: "#fdf2f8", color: "#ec4899" },
  { id: "bear", label: "Gấu nâu", bg: "#fef3c7", color: "#b45309" },
  { id: "cat", label: "Mèo con", bg: "#ffedd5", color: "#ea580c" },
  { id: "dog", label: "Cún con", bg: "#fef9c3", color: "#a16207" },
  { id: "fox", label: "Cáo nhỏ", bg: "#fff7ed", color: "#f97316" },
  { id: "panda", label: "Gấu trúc", bg: "#f1f5f9", color: "#334155" },
  { id: "frog", label: "Ếch xanh", bg: "#dcfce7", color: "#16a34a" },
  { id: "pig", label: "Heo hồng", bg: "#fce7f3", color: "#db2777" },
  { id: "chick", label: "Gà con", bg: "#fefce8", color: "#eab308" },
  { id: "koala", label: "Koala", bg: "#e2e8f0", color: "#64748b" },
];
export function avatarById(id?: string): AvatarOption { return AVATARS.find((a) => a.id === id) || AVATARS[0]; }

/* ---------- ID ---------- */
export function uid(): string { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
export function genRoomCode(): string {
  // Sinh TỪNG ký tự cho đủ 6 (Math.random().toString(36).slice có thể cho mã ngắn hơn 6).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/* ---------- Ngày giờ theo GIỜ ĐỊA PHƯƠNG (người dùng ở Asia/Saigon) ----------
 * Mọi khái niệm "hôm nay" PHẢI dùng khóa này — cắt theo UTC sẽ lệch ngày lúc 7h sáng VN. */
export function dayKeyLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function today(): string { return dayKeyLocal(); }
/** Parse khóa "yyyy-mm-dd" CHẶT: ngày không tồn tại (vd 2025-02-31) bị loại, không lăn sang tháng sau. */
export function parseDateKey(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}
export const isValidDateKey = (s: unknown): boolean => parseDateKey(s) !== null;
/** Số thứ tự ngày theo giờ địa phương (epoch-day của ngày địa phương) — trừ hai khóa ngày bằng số này mới đúng qua tháng/năm. */
export function localDayNumber(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
/** Hiển thị khóa ngày kiểu Việt: 2024-02-14 -> "14/02/2024". */
export function formatDateVN(key: string): string {
  const d = parseDateKey(key);
  if (!d) return key;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/* ================= CORE 2 — CÂY TÌNH YÊU (một cây duy nhất) ================= */
export interface TreePlant {
  plantedAt: string;
  /** Tăng trưởng đã "ghi sổ" (ms) tại mốc growthAt — phần còn lại tích lũy theo thời gian thật */
  growthRecordedMs: number;
  growthAt: string;
  /** Tổng thời gian tăng tốc đã nhận từ chăm cây (ms) — merge cộng bù phần máy kia chưa có */
  totalBoostMs: number;
  water: number; sun: number; love: number;
  /** Mốc mà 3 chỉ số trên đang đúng (hao dần từ mốc này) */
  statsAt: string;
  careCount: number;
  lastCareAt: string;
  lastCareBySlot: PersonId | "";
  /** Lần chăm gần nhất của TỪNG NGƯỜI — phục vụ cooldown 60s/người + combo Song chăm 90s */
  lastCareAtBy: { A: string; B: string };
  /** TRƯỜNG CŨ (bản tăng trưởng): giai đoạn đã thông báo theo điểm lớn. Giữ để
   *  tương thích dữ liệu đã lưu — bản theo-ngày-yêu dùng couple.celebratedStages. */
  announcedStage: number;
  matureAt: string;
}

/* ================= CORE 3 — NOTE TÌNH YÊU ================= */
export interface LoveNote {
  id: string;
  authorSlot: PersonId;
  text: string;
  /** id mặt mood (lib/content MOODS) hoặc "" = không kèm mood */
  mood: string;
  createdAt: string;
  /** Mốc người NHẬN đã mở/đọc; "" = chưa xem. Người viết xem "đã xem" từ trường này. */
  readAt: string;
}
export const NOTE_TEXT_MAX = 300;
/** Chống spam: cùng một người không gửi 2 note quá sát nhau */
export const NOTE_MIN_INTERVAL_MS = 5000;
export const NOTES_CAP = 200;

/* ================= CORE 4 — NHỊP TIM "NHỚ BẠN" ================= */
export interface PingSlotState { total: number; lastAt: string; lastBurstAt: string; burst: number }
export interface PingsState { A: PingSlotState; B: PingSlotState; day: { date: string; A: number; B: number } }
/**
 * Nhịp nhớ KHÔNG CÓ GIỚI HẠN (spec đổi 2026-10-25 theo yêu cầu của chủ app):
 * không trần ngày, không thời gian chờ, không gộp chuỗi — mỗi lần gửi là một
 * nhịp RIÊNG (burst luôn = 1, lastBurstAt = mốc của chính nhịp đó) và mỗi nhịp
 * tự gọi một push notification riêng cho người ấy (notify-heartbeat).
 * Các hằng số PING_DAILY_MAX / PING_BURST_WINDOW_MS / PING_POP_COOLDOWN_MS đã
 * bị gỡ hẳn — đừng thêm lại mà không có spec mới.
 */

/* ================= CORE 5 — ĐỊNH VỊ TẠM THỜI ================= */
/**
 * Phiên chia sẻ vị trí TẠM THỜI của một người (per-slot, chính chủ ghi).
 * Chỉ snapshot (điểm mới nhất thắng) — KHÔNG lịch sử đường đi, KHÔNG theo dõi nền.
 * Hết hạn được SUY RA từ expiresAt ở mọi nơi hiển thị (shareStatus ở features.ts)
 * nên phiên hết hạn không bao giờ còn hiện "đang chia sẻ".
 */
export interface PresenceSlot {
  sharing: boolean;
  startedAt: string;
  /** ISO lúc hết phiên; "" = chia sẻ đến khi tự tắt */
  expiresAt: string;
  lat: number | null; lng: number | null; acc: number | null;
  /** Mốc của điểm vị trí gần nhất (tách khỏi `at` vì snapshot pin có thể mới hơn vị trí) */
  locAt: string;
  /** % pin 0..100; null = máy không đọc được (nhiều trình duyệt web) */
  battery: number | null;
  /** Mốc snapshot gần nhất (vị trí hoặc pin) */
  at: string;
}
export const defaultPresenceSlot = (): PresenceSlot => ({
  sharing: false, startedAt: "", expiresAt: "",
  lat: null, lng: null, acc: null, locAt: "", battery: null, at: "",
});

/* ================= WIDGET MÀN HÌNH CHÍNH (tùy chọn RIÊNG của từng người) ================= */
/**
 * Ba công tắc widget của MỘT người (mục theo slot như presence/noteLog — merge
 * ưu tiên tuyệt đối cho chính chủ slot): mỗi công tắc quyết định module đó có
 * được hiện trên widget MÀN HÌNH CHÍNH CỦA CHÍNH NGƯỜI ĐÓ hay không. Mặc định
 * TẮT CẢ BA — user muốn hiện phần nào thì tự bật phần đó trong Tài khoản.
 * Riêng công tắc `note`: nó là CỔNG RIÊNG TƯ phía người NHẬN — tắt thì note của
 * người ấy không bao giờ rời app ra màn hình chính của mình.
 */
export interface WidgetPrefs { day: boolean; note: boolean; tree: boolean }
export const defaultWidgetPrefs = (): WidgetPrefs => ({ day: false, note: false, tree: false });

/* ================= HOẠT ĐỘNG + THƯ RƠI (khoảnh khắc, không phải tính năng) ================= */
export interface Activity { id: string; actor: string; slot?: PersonId; text: string; icon: string; time: string }
export const ACTIVITIES_CAP = 40;

/** Một lá thư tình VỪA RƠI — chỉ là khoảnh khắc pop-up (không hộp thư, không sưu tập).
 *  Lưu bản mới nhất trong state để máy người kia cũng thấy thư rơi khi mở app. */
export interface LetterMoment {
  id: string; messageId: number; rarity: Rarity; source: string; at: string; bySlot: PersonId;
}

/* ================= STATE TỔNG ================= */
export interface AppState {
  roomCode: string;
  personA: string; personB: string;
  avatarA: string; avatarB: string;
  currentUser: PersonId;
  /** CORE 1 — đếm ngày yêu */
  couple: {
    startDate: string;
    /** Mốc + người sửa ngày bắt đầu gần nhất (last-writer-wins theo mốc này khi merge) */
    startSetAt: string;
    startSetBy: PersonId | "";
    /** Các mốc ngày (100/200/...) đã ghi nhận ăn mừng — hợp nhất 2 máy, bắn đúng 1 lần */
    celebrated: number[];
    /** Các GIAI ĐOẠN CÂY (1..7, theo ngày yêu — treeStageForDay) đã ăn mừng bằng
     *  thư rơi: union-merge 2 máy, mỗi giai đoạn bắn đúng 1 lần khi mở app. */
    celebratedStages: number[];
    pairedAt: string;
  };
  /** CORE 2 — cây tình yêu */
  tree: TreePlant;
  /** CORE 3 — note tình yêu (mới nhất đứng đầu) */
  notes: LoveNote[];
  /** Mốc gửi note gần nhất của từng người (chống spam 5 giây) */
  noteLog: { A: string; B: string };
  /** CORE 4 — nhịp tim + dấu vết (activities) */
  pings: PingsState;
  activities: Activity[];
  /** CORE 5 — định vị tạm thời */
  presence: { A: PresenceSlot; B: PresenceSlot };
  /** Widget màn hình chính — công tắc RIÊNG của từng người (mỗi người chỉ sửa
   *  phần của chính mình; xem WidgetPrefs) */
  widgetPrefs: { A: WidgetPrefs; B: WidgetPrefs };
  /** Lá thư rơi gần nhất (khoảnh khắc pop-up dùng chung 2 máy) */
  lastLetter: LetterMoment | null;
  updatedAt?: string;
  secTs?: Record<string, SecStamp>;
}

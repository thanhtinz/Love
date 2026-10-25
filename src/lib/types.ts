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

/* ================= SỰ KIỆN SÂU TRÊN CÂY (đợt "chăm cây 2") ================= */
/**
 * MỘT đợt sâu đang/đã xảy ra trên cây — sự kiện DÙNG CHUNG 2 máy.
 * - `id` xác định theo ngày xuất hiện ("pest-{dateKey}") nên 2 máy tự tính ra
 *   cùng một sự kiện (pestSpawnFor ở features.ts là hàm thuần theo seed) và
 *   merge hội tụ về đúng một bản (mergeTreePest ở merge.ts).
 * - Tối đa 1 đợt đang hoạt động; mỗi ngày tối đa 1 đợt (kể cả đã bắt/hết hạn).
 * - Sâu CHỈ ảnh hưởng sức sống (hao nhanh hơn một chút) — KHÔNG BAO GIỜ ảnh
 *   hưởng giai đoạn cây (giai đoạn chỉ đi theo ngày yêu).
 * - Không bắt kịp thì tự hết hạn sau ~12 giờ — không trừng phạt thêm.
 */
export interface TreePestEvent {
  /** "pest-{dateKey}" */
  id: string;
  /** Ngày địa phương của mốc xuất hiện */
  dateKey: string;
  /** ISO thời điểm sâu xuất hiện */
  appearedAt: string;
  status: "active" | "caught" | "expired";
  /** Người đã bắt ("" khi chưa bắt) */
  caughtBy: PersonId | "";
  caughtAt: string;
  expiredAt: string;
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

/* ================= CORE 5 — VỊ TRÍ TRỰC TIẾP ================= */
/**
 * Vị trí TRỰC TIẾP của một người (per-slot, chính chủ ghi) — KHÔNG phiên,
 * KHÔNG công tắc trong app: app đang mở + quyền vị trí của hệ điều hành đã
 * cấp là máy tự publish điểm mới nhất của mình vào đây (LocationSync lo),
 * người ấy mở "Bản đồ hai đứa" là thấy luôn. Chỉ giữ ĐIỂM MỚI NHẤT của mỗi
 * người (+ mốc của nó) — KHÔNG lịch sử đường đi, KHÔNG theo dõi nền.
 * Bản lưu cũ (mô hình phiên chia sẻ) bị normalize VỨT HẾT: vị trí bắt đầu
 * trống cho tới lần publish tiếp theo.
 */
export interface PresenceSlot {
  lat: number | null; lng: number | null; acc: number | null;
  /** Mốc của điểm vị trí gần nhất (tách khỏi `at` vì snapshot pin có thể mới hơn vị trí) */
  locAt: string;
  /** % pin 0..100; null = máy không đọc được (nhiều trình duyệt web) */
  battery: number | null;
  /** Mốc publish gần nhất (vị trí hoặc pin) */
  at: string;
}
export const defaultPresenceSlot = (): PresenceSlot => ({
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

/** Một lá thư tình VỪA RƠI — khoảnh khắc pop-up dùng chung 2 máy.
 *  Từ đợt "chất app" 2, mỗi khoảnh khắc thư rơi còn được GHI LẠI thành kỷ vật
 *  trong hộp thư đã giữ (KeptLetter bên dưới) — pop-up vẫn là khoảnh khắc,
 *  nhưng thư không còn tan biến khi đóng pop nữa. */
export interface LetterMoment {
  id: string; messageId: number; rarity: Rarity; source: string; at: string; bySlot: PersonId;
}

/* ================= KỶ VẬT (đợt "chất app" 2) ================= */
/** Nguồn gốc của một lá thư đã giữ: chăm cây rơi · combo Song chăm · cây lên giai đoạn. */
export type KeptLetterKind = "care" | "stage" | "combo";
export const KEPT_LETTERS_CAP = 100;

/**
 * Một lá thư tình ĐÃ GIỮ — kỷ vật chỉ-đọc trong "Hộp thư đã giữ".
 * `id` TÁI DÙNG id của LetterMoment gây ra nó: thư lên giai đoạn có id xác
 * định ("stageup-N") nên 2 máy ghi trùng sẽ khử trùng về đúng 1 bản khi
 * union-merge; thư chăm cây mang uid của khoảnh khắc đã đồng bộ qua lastLetter
 * nên cả 2 máy cũng hội tụ về cùng một id. `text` chụp lại tại thời điểm giữ.
 */
export interface KeptLetter {
  id: string;
  messageId: number;
  text: string;
  rarity: Rarity;
  kind: KeptLetterKind;
  /** Nhãn nguồn của khoảnh khắc ("Rơi khi chăm cây", "Mốc 25 lần chăm"...) */
  source: string;
  /** Người đã làm rơi lá thư này */
  bySlot: PersonId;
  /** ISO thời điểm thư rơi (= LetterMoment.at) */
  receivedAt: string;
}

/** Một mốc ngày yêu đã chạm tới + mốc thời gian ghi nhận (ISO).
 *  reachedAt có thể là "" với mốc được backfill từ bản lưu cũ (chỉ có
 *  celebrated, chưa có lịch sử) — ngày dương lịch thật của mốc luôn suy ra
 *  được từ startDate qua milestoneDateKey (lib/features). */
export interface MilestoneRecord { days: number; reachedAt: string }

/* ================= ẢNH CỦA HAI ĐỨA (đợt "chất app" 3) ================= */
/**
 * MỘT tấm ảnh thật của hai đứa, lưu ở Supabase Storage (bucket RIÊNG TƯ
 * "couple-photos", đường dẫn cố định "{coupleId}/photo.jpg" — đổi ảnh là ghi
 * đè tại chỗ). State chỉ giữ ĐƯỜNG DẪN + mốc sửa: hiển thị qua signed URL tạo
 * mới mỗi phiên; `updatedAt` vừa là khóa last-writer-wins khi merge 2 máy,
 * vừa làm khóa phá cache (ảnh đổi nhưng đường dẫn không đổi).
 * `bySlot` = người đã đặt ảnh gần nhất (hiển thị "do X đặt" + dấu vết).
 */
export interface CouplePhoto {
  path: string;
  updatedAt: string;
  bySlot: PersonId;
}

/* ================= DÂY KỶ NIỆM (kho ảnh treo trên dây) ================= */
/**
 * MỘT ảnh kỷ niệm treo trên "Dây kỷ niệm" (màn /memories): ảnh thật của hai
 * đứa lưu ở Supabase Storage — TÁI DÙNG bucket riêng tư "couple-photos" với
 * đường dẫn "{coupleId}/memories/{id}.jpg" (RLS của bucket khóa theo ĐOẠN ĐẦU
 * đường dẫn = id cặp đôi nên thư mục con memories/ được bao phủ sẵn — không
 * cần migration mới). State chỉ giữ ĐƯỜNG DẪN + metadata; hiển thị qua signed
 * URL xin theo lô (lib/photo.ts).
 * - `dateKey` là ngày MÀ KỶ NIỆM NÓI VỀ (người dùng tự đặt, mặc định hôm nay)
 *   — dây kể câu chuyện theo thứ tự thời gian của kỷ niệm, không theo ngày tải
 *   lên: sắp xếp theo dateKey tăng dần, hoà thì theo addedAt.
 * - `updatedAt` là khóa last-writer-wins khi 2 máy cùng sửa một ảnh.
 * - Quyền: CẢ HAI người đều thêm/sửa/xoá được mọi ảnh trên dây (tiền lệ ảnh
 *   của hai đứa — đây là kho chung của "chúng mình", không phải đồ riêng).
 * Xoá đi qua DANH SÁCH MỘ (removedMemoryIds trong AppState): id đã vào mộ thì
 * không bản sao cũ nào hồi sinh được ảnh — xem lib/memories.ts.
 */
export interface MemoryPhoto {
  id: string;
  /** Đường dẫn object trong bucket couple-photos: "{coupleId}/memories/{id}.jpg" */
  path: string;
  /** Ghi chú viết tay dưới khung ảnh (đã trim, tối đa MEMORY_CAPTION_MAX ký tự; "" = chỉ hiện ngày) */
  caption: string;
  /** Ngày của kỷ niệm (yyyy-mm-dd, giờ địa phương) */
  dateKey: string;
  /** Người đã treo ảnh này lên dây */
  bySlot: PersonId;
  /** ISO thời điểm treo lên */
  addedAt: string;
  /** ISO lần sửa gần nhất — khóa LWW khi merge */
  updatedAt: string;
}
/** Trần số ảnh trên dây — dây đầy thì báo thân thiện, không treo thêm được. */
export const MEMORIES_CAP = 30;
export const MEMORY_CAPTION_MAX = 60;

/* ================= NHIỆM VỤ MỖI NGÀY (đợt "nhiệm vụ chăm cây") ================= */
export type QuestKind = "water" | "sun" | "love" | "ping" | "note" | "care3" | "bothcare";

/** Tiến độ của MỘT nhiệm vụ trong ngày — dùng chung 2 máy (merge lấy max/union,
 *  xem lib/quests.ts). `count` tiến theo hành động thật; `byA`/`byB` ghi ai đã
 *  đóng góp (riêng "bothcare": count = mỗi người đã chăm ít nhất 1 lần chưa). */
export interface QuestProgress {
  kind: QuestKind;
  target: number;
  count: number;
  byA: number;
  byB: number;
  /** ISO lúc nhiệm vụ này hoàn thành; "" = chưa xong */
  completedAt: string;
}

/** Bộ nhiệm vụ của MỘT ngày: đúng 3 nhiệm vụ, chọn xác định theo dateKey
 *  (questsForDay) nên 2 máy luôn có cùng một bộ cho cùng một ngày. */
export interface DailyQuestsState {
  dateKey: string;
  quests: QuestProgress[];
  /** ISO lúc CẢ 3 nhiệm vụ xong; "" = chưa hoàn thành ngày */
  allCompletedAt: string;
}

export const QUEST_HISTORY_CAP = 120;

/* ================= TRẠNG THÁI CỦA NHAU (đợt "hiện diện sống") ================= */
/**
 * Trạng thái tự đặt của MỘT người (per-slot, CHỈ chính chủ ghi — reducer khóa):
 * một mood trong bộ preset (lib/content STATUS_MOODS) + một dòng tự viết ngắn
 * tùy chọn (<= STATUS_TEXT_MAX ký tự). Đồng bộ trực tiếp qua kênh sẵn có nên
 * người ấy thấy gần như ngay. Trạng thái chỉ HIỆN tối đa 24 giờ kể từ lúc
 * đặt; quá hạn là hết hạn và không hiện ở đâu nữa — phải đặt lại cái mới
 * (xem statusExpired/visibleStatus ở features.ts; state đã lưu không bị xoá,
 * hạn chỉ tính lúc hiển thị).
 */
export interface PersonStatus {
  /** id mood trong STATUS_MOODS */
  mood: string;
  text: string;
  updatedAt: string;
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
    /** Lịch sử mốc ngày yêu đã chạm (kỷ vật đợt 2): union-merge theo `days`,
     *  idempotent — song hành với `celebrated` (cờ chống ăn mừng lại). */
    milestoneHistory: MilestoneRecord[];
    pairedAt: string;
  };
  /** CORE 2 — cây tình yêu */
  tree: TreePlant;
  /** Đợt sâu gần nhất trên cây (sự kiện dùng chung, xem TreePestEvent);
   *  null = chưa từng có đợt sâu nào (bản lưu cũ cũng về null). */
  treePest: TreePestEvent | null;
  /** NHIỆM VỤ HÔM NAY (dùng chung 2 máy): bộ 3 nhiệm vụ của ngày hiện tại —
   *  hết ngày tự lăn sang bộ mới theo dateKey (không cần reset thủ công). */
  dailyQuests: DailyQuestsState;
  /** Các dateKey đã hoàn thành đủ 3 nhiệm vụ (mới nhất trước, trần 120) —
   *  dùng để tính chuỗi ngày chăm đủ (questStreak ở lib/quests.ts). */
  questHistory: string[];
  /** CORE 3 — note tình yêu (mới nhất đứng đầu) */
  notes: LoveNote[];
  /** Mốc gửi note gần nhất của từng người (chống spam 5 giây) */
  noteLog: { A: string; B: string };
  /** CORE 4 — nhịp tim + dấu vết (activities) */
  pings: PingsState;
  activities: Activity[];
  /** CORE 5 — vị trí trực tiếp */
  presence: { A: PresenceSlot; B: PresenceSlot };
  /** Widget màn hình chính — công tắc RIÊNG của từng người (mỗi người chỉ sửa
   *  phần của chính mình; xem WidgetPrefs) */
  widgetPrefs: { A: WidgetPrefs; B: WidgetPrefs };
  /** Lá thư rơi gần nhất (khoảnh khắc pop-up dùng chung 2 máy) */
  lastLetter: LetterMoment | null;
  /** HỘP THƯ ĐÃ GIỮ — kỷ vật thư tình (mới nhất đứng đầu, trần 100): union-merge
   *  theo id giữa 2 máy, xem lib/features (addKeptLetter/unionKeptLetters). */
  keptLetters: KeptLetter[];
  /** TRẠNG THÁI CỦA NHAU (per-slot, chính chủ ghi): cảm xúc hiện tại mỗi
   *  người tự đặt cho người ấy thấy; null = chưa đặt (bản lưu cũ -> null). */
  status: { A: PersonStatus | null; B: PersonStatus | null };
  /** ẢNH CỦA HAI ĐỨA (đợt 3): một ảnh thật duy nhất ở Storage; merge theo
   *  updatedAt (mới hơn thắng); bản lưu cũ chưa có trường -> null. */
  couplePhoto: CouplePhoto | null;
  /** DÂY KỶ NIỆM: ảnh đã HIỆN THỰC HOÁ (đã áp mộ + sắp theo ngày kỷ niệm +
   *  chặn MEMORIES_CAP — xem materializeMemories ở lib/memories.ts). Merge
   *  union theo id + LWW từng ảnh; bản lưu cũ chưa có trường -> []. */
  memories: MemoryPhoto[];
  /** MỘ XOÁ của dây kỷ niệm: id các ảnh đã bị gỡ — hợp nhất union giữa 2 máy
   *  và áp lên danh sách khi hiện thực hoá, nên một lần xoá thắng mọi bản sao
   *  cũ chưa kịp biết tin. Object trong Storage KHÔNG bị xoá theo (giữ tiền lệ
   *  ảnh hai đứa: state là nơi quyết định hiển thị; mộ làm ảnh vô hình vĩnh
   *  viễn trên cả 2 máy). */
  removedMemoryIds: string[];
  updatedAt?: string;
  secTs?: Record<string, SecStamp>;
}

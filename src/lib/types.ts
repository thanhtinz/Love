// Port từ bản web (lib/types.ts) — giữ nguyên shape state để dùng chung room_state trên Supabase.
// Khác biệt: màu shop dùng mã hex (React Native không có Tailwind), thêm state cho mini-game (games).
export type PersonId = "A" | "B";

/** Mốc thời gian của lần sửa gần nhất một "mục" trạng thái, kèm slot của máy đã sửa.
 *  Dùng để merge state 2 máy (xem lib/merge.ts): mục theo từng người ưu tiên bản do
 *  CHÍNH chủ nhân của slot đó sửa (stamp.by === slot), tránh bản sao cũ/hành động
 *  reset ngày của máy người kia đè lên dữ liệu mới của chủ nhân. */
export interface SecStamp { t: string; by: PersonId }

/** Kiểm tra plain object (dữ liệu JSON từ Supabase/cache có thể hỏng hoặc sai kiểu). */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
/** Số hữu hạn hoặc fallback — chặn NaN/Infinity lọt vào state (NaN là "number" nên typeof không đủ).
 *  Chuỗi số hợp lệ ("500") được PARSE thay vì reset về fallback: dữ liệu từ bản web cũ/backend
 *  có thể ghi số dạng chuỗi — bản cũ reset coins "500" -> 50, điểm game "50" -> 0, mất dữ liệu thật. */
export function finiteNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}
/** Mảng các plain object; mọi kiểu khác -> []. Chống state hỏng làm crash .map/.filter ở màn hình. */
export function objArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v.filter((x) => isPlainObject(x)) as T[]) : [];
}
export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

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

export type Rarity = "common" | "rare" | "legendary";
export type ShopCategory = "pot" | "scene" | "accessory";

export interface TreeState { xp: number; water: number; sun: number; love: number; careCount: number; lastCareAt: string; lastCareBy: string; statsAt: string; }

export interface PlantState {
  id: string;
  speciesId: string;
  plantedAt: string;
  growthRecordedMs: number;
  growthAt: string;
  totalBoostMs: number;
  water: number; sun: number; love: number; statsAt: string;
  careCount: number; lastCareAt: string; lastCareBy: string;
  /** Lần chăm gần nhất của TỪNG NGƯỜI trên cây này (ISO) — phục vụ cooldown chăm cây 60 giây/người/cây */
  lastCareAtBy: { A: string; B: string };
  announcedStage: number;
  matureAt: string;
  fruitReadyAt: string;
  harvestCount: number;
}
export interface CollectedTree {
  id: string; speciesId: string; plantedAt: string; maturedAt: string; collectedAt: string; careCount: number;
}
export interface Activity { id: string; actor: string; text: string; icon: string; time: string; /** Slot của người thực hiện (nếu hành động gắn với 1 người) — UI ưu tiên slot này thay vì suy ngược từ TÊN hiển thị (trùng tên/đổi tên sẽ suy sai). */ slot?: PersonId; }
export interface Note { id: string; author: string; authorSlot?: PersonId; text: string; color: string; createdAt: string; }
export interface BucketItem { id: string; text: string; done: boolean; createdAt: string; authorSlot?: PersonId; /** Mốc lần bật/tắt "đã xong" gần nhất — merge chọn bản có doneAt mới hơn thay vì "done=true luôn thắng" (bỏ đánh dấu không bao giờ có hiệu lực khi merge). */ doneAt?: string; }
export interface LoveLetter { id: string; messageId: number; rarity: Rarity; source: string; opened: boolean; droppedAt: string; openedAt: string; openedBy: string; /** Slot của người mở — nguồn sự thật cho chip người mở; openedBy (tên) chỉ để hiển thị dự phòng vì tên có thể trùng/đổi. */ openedBySlot?: PersonId; }
export interface DailyPerson { water: number; love: number; sun: number; bug: number }
/**
 * Nhiệm vụ ngày — tiến độ RIÊNG theo từng người (trước đây đếm chung cả vườn nên
 * một người làm xong thì người kia cũng hiện đã làm). Chỉ cờ caredA/caredB là chung
 * (phục vụ nhiệm vụ "cả hai cùng chăm"). Nhận thưởng cũng riêng: claimedA/claimedB.
 */
export interface DailyState {
  date: string;
  A: DailyPerson; B: DailyPerson;
  caredA: boolean; caredB: boolean;
  claimedA: string[]; claimedB: string[];
  /** Trường legacy của bản cũ (đếm chung) — chỉ dùng khi migration, không ghi nữa */
  water?: number; love?: number; sun?: number; bug?: number; claimed?: string[];
}
export const emptyDailyPerson = (): DailyPerson => ({ water: 0, love: 0, sun: 0, bug: 0 });
export function freshDailyState(date: string = today()): DailyState {
  return { date, A: emptyDailyPerson(), B: emptyDailyPerson(), caredA: false, caredB: false, claimedA: [], claimedB: [] };
}
/** Chuẩn hoá daily: hỗ trợ cả shape mới (theo người) lẫn shape cũ (đếm chung) với migration mềm. */
export function normalizeDaily(raw: Partial<DailyState> | undefined): DailyState {
  const base = freshDailyState((raw && raw.date) || today());
  if (!raw) return base;
  if (raw.A || raw.B) {
    const sanePerson = (p: Partial<DailyPerson> | undefined): DailyPerson => ({
      water: Math.max(0, Math.floor(finiteNum(p?.water, 0))),
      love: Math.max(0, Math.floor(finiteNum(p?.love, 0))),
      sun: Math.max(0, Math.floor(finiteNum(p?.sun, 0))),
      bug: Math.max(0, Math.floor(finiteNum(p?.bug, 0))),
    });
    return {
      ...base,
      A: sanePerson(isPlainObject(raw.A) ? raw.A : undefined),
      B: sanePerson(isPlainObject(raw.B) ? raw.B : undefined),
      caredA: Boolean(raw.caredA), caredB: Boolean(raw.caredB),
      claimedA: strArray(raw.claimedA),
      claimedB: strArray(raw.claimedB),
    };
  }
  // Migration shape cũ: tiến độ chung gán cho người đã chăm (caredA/caredB) nếu xác định được;
  // claimed cũ đưa vào cả hai danh sách để không ai nhận trùng phần thưởng đã phát.
  const legacy: DailyPerson = {
    water: Math.max(0, Math.floor(finiteNum(raw.water, 0))),
    love: Math.max(0, Math.floor(finiteNum(raw.love, 0))),
    sun: Math.max(0, Math.floor(finiteNum(raw.sun, 0))),
    bug: Math.max(0, Math.floor(finiteNum(raw.bug, 0))),
  };
  const who: PersonId | null = raw.caredA ? "A" : raw.caredB ? "B" : null;
  const claimed = strArray(raw.claimed);
  return {
    ...base,
    A: who === "A" ? legacy : emptyDailyPerson(),
    B: who === "B" ? legacy : emptyDailyPerson(),
    caredA: Boolean(raw.caredA), caredB: Boolean(raw.caredB),
    claimedA: [...claimed], claimedB: [...claimed],
  };
}
export interface MemoryItem { id: string; title: string; date: string; desc: string; imageUrl: string; author: string; authorSlot?: PersonId; createdAt: string; }
export interface LastLoveAction { kind: string; icon: string; label: string; by: PersonId; actor: string; at: string; memoAvatar?: string; }
export type FrameKind = "days" | "tree" | "mood";
/** XP vườn thưởng lần đầu xuất/ lưu mỗi khung trong ngày (chống farm: tối đa 3 khung/ngày) */
export const FRAME_XP_REWARD = 5;

/** State riêng của bản mobile cho 3 mini-game — lưu chung trong room_state JSON. */
export interface GamesState {
  /** Bắt tim bay: điểm cao nhất trong tuần (key = tuần ISO yyyy-Www) */
  heartBest: { week: string; A: number; B: number };
  /** Vòng quay: số lượt đã quay hôm nay của từng người */
  spin: { date: string; A: number; B: number };
  /** Hiểu ý nhau: đáp án trắc nghiệm của từng người trong ngày (mảng index lựa chọn theo câu) */
  quiz: { date: string; A: number[]; B: number[] };
  /** Bắt tim bay: số lượt chơi hôm nay của từng người */
  heartPlays: { date: string; A: number; B: number };
  /** Thưởng thắng game ngày (Ghép cặp ký ức / Xúc xắc hẹn hò): mỗi người nhận tối đa 1 lần/game/ngày */
  dailyWins: { date: string; memory: { A: number; B: number }; dice: { A: number; B: number } };
}
/** Chống spam hành động yêu thương: nghỉ 30 giây giữa 2 lần gửi, tối đa 20 lần/ngày/người */
export const LOVE_ACTION_COOLDOWN_MS = 30000;
export const LOVE_ACTION_DAILY_MAX = 20;
/** "Nhớ bạn" nhịp tim: trần 50 nhịp/ngày/người gửi; chạm cách nhau <= 5 giây gộp thành 1 chuỗi nhịp */
export const PING_DAILY_MAX = 50;
export const PING_BURST_WINDOW_MS = 5000;
/** Ngày đặc biệt: tối đa 50 sự kiện, tiêu đề tối đa 60 ký tự (như kỷ niệm) */
export const EVENTS_MAX = 50;
export const EVENT_TITLE_MAX = 60;
/** Khoảng cách tối thiểu giữa 2 lần thêm ghi chú/bucket/kỷ niệm liên tiếp của cùng một người */
export const CONTENT_ADD_MIN_INTERVAL_MS = 5000;
export const CONTENT_LIMITS = { note: 200, bucket: 120, memoryTitle: 60, memoryDesc: 300 };

/** Một người trong tính năng "Nhớ bạn" nhịp tim: tổng nhịp đã gửi, mốc nhịp gần nhất,
 *  mốc BẮT ĐẦU chuỗi nhịp hiện tại và độ dài chuỗi (chạm liên tục <= 5 giây). */
export interface PingSlotState { total: number; lastAt: string; lastBurstAt: string; burst: number }
/** Section `pings` — ghi bởi chính chủ slot; bộ đếm ngày chống spam trần 50/người. */
export interface PingsState { A: PingSlotState; B: PingSlotState; day: { date: string; A: number; B: number } }

/**
 * Ảnh chụp hiện diện NHẸ của một người (kế hoạch Hạng 2): chỉ chụp khi mở app /
 * bấm cập nhật tay — KHÔNG theo dõi nền, KHÔNG lưu lịch sử, snapshot mới ghi đè cũ.
 * shareBattery mặc định BẬT (pin không nhạy cảm); shareLocation mặc định TẮT và
 * chỉ có ý nghĩa khi hệ điều hành đã cấp quyền vị trí foreground.
 */
export interface PresenceSlotState {
  shareBattery: boolean;
  shareLocation: boolean;
  lat: number | null; lng: number | null; acc: number | null;
  /** % pin 0..100; null = máy không đọc được (web không hỗ trợ Battery API) */
  battery: number | null;
  /** Mốc chụp snapshot gần nhất (ISO) */
  at: string;
}
export interface PresenceState { A: PresenceSlotState; B: PresenceSlotState }
export const defaultPresenceSlot = (): PresenceSlotState => ({ shareBattery: true, shareLocation: false, lat: null, lng: null, acc: null, battery: null, at: "" });

/**
 * Chia sẻ chu kỳ (Meet You for Partners — Hạng 3): OPT-IN, mặc định TẮT.
 * Khi share=false, phía người ấy KHÔNG suy ra được gì từ section này.
 * Chỉ lưu ngày bắt đầu kỳ gần nhất + độ dài chu kỳ/kỳ — giai đoạn tính ở client.
 * KHÔNG log triệu chứng/y tế chi tiết. startEditDate: ngày bắt đầu chỉ sửa 1 lần/ngày.
 */
export interface CycleSlotState {
  share: boolean;
  lastStart: string;
  cycleLen: number;
  periodLen: number;
  startEditDate: string;
  updatedAt: string;
}
export interface CycleState { A: CycleSlotState; B: CycleSlotState }
export const defaultCycleSlot = (): CycleSlotState => ({ share: false, lastStart: "", cycleLen: 28, periodLen: 5, startEditDate: "", updatedAt: "" });

/**
 * Trang trí gói 1 (section `decor` dùng chung): mua bằng Xu Tim qua shop như đồ thường.
 * owned hợp nhất 2 máy khi merge; sceneBg/fence/path là id món đang trang bị ("" = mặc định);
 * placed tối đa 3 món theo thứ tự khe trái/giữa/phải. CHỈ mua-và-dùng — không tiến độ sưu tập.
 */
export interface DecorState { owned: string[]; sceneBg: string; fence: string; path: string; placed: string[] }

/**
 * Thú cưng chung sống trong vườn (Hạng 4): MỘT pet cho cả hai.
 * hunger/joy lưu kèm statsAt và hao dần theo giờ (suy ra khi hiển thị/chăm).
 * Lớn theo SỐ NGÀY KHÁC NHAU có chăm (careDays) — chăm nhiều trong 1 ngày không lớn nhanh hơn.
 */
export interface PetState {
  name: string;
  bornAt: string;
  hunger: number; joy: number; statsAt: string;
  careDays: string[];
  lastCareAt: string;
  lastCareAtBy: { A: string; B: string };
  careCount: { A: number; B: number };
  /** Số lần chăm ĐÃ ĐƯỢC THƯỞNG Xu trong ngày của từng người (trần thưởng/ngày) */
  rewardDay: { date: string; A: number; B: number };
}

/** Ngày đặc biệt dùng chung (Hạng 5): lặp hằng năm hoặc một lần; xoá bằng tombstone. */
export interface SpecialEvent {
  id: string; title: string; date: string; repeat: "yearly" | "once";
  createdBy: PersonId; createdAt: string; updatedAt: string;
}

export interface AppState {
  roomCode: string; personA: string; personB: string; startDate: string; currentUser: PersonId;
  tree: TreeState;
  moods: { A: string; B: string; date: string };
  notes: Note[]; bucket: BucketItem[];
  answers: { date: string; A: string; B: string };
  activities: Activity[];
  letters: LoveLetter[];
  /** Bộ sưu tập thư BỀN VỮNG: id thông điệp (số) đã từng sở hữu — tách khỏi mảng letters
   *  (letters bị cắt tối đa 100 lá khi xoay vòng, thư cũ biến mất khỏi hộp thư nhưng
   *  KHÔNG được mất khỏi bộ sưu tập). */
  letterCollection?: number[];
  daily: DailyState;
  streak: { count: number; lastDate: string };
  achievements: string[];
  coins: number;
  /** Neo số dư tại điểm đồng bộ chung gần nhất của 2 máy — merge cộng DELTA của cả hai
   *  phía so với neo này thay vì heuristic max/min (vốn làm mất thu nhập đồng thời). */
  coinsBase?: number;
  inventory: string[];
  equipped: Record<ShopCategory, string>;
  memories: MemoryItem[];
  lastLoveAction: LastLoveAction | null;
  onboarded: boolean;
  everOnboarded: boolean;
  gardenName: string;
  avatarA: string;
  avatarB: string;
  plants: PlantState[];
  selectedPlantId: string;
  treeCollection: CollectedTree[];
  games: GamesState;
  /** Lời nhắn yêu thương ghim lâu dài theo từng người (slot A/B) */
  loveNotes: { A: string; B: string };
  /** Khung màn hình đã nhận thưởng XP trong ngày (chống cộng dồn vô hạn) */
  frameRewards: { date: string; claimed: FrameKind[] };
  /** Giới hạn hành động yêu thương theo từng người gửi: số lần hôm nay + mốc gửi gần nhất */
  loveLimits: { date: string; counts: { A: number; B: number }; lastAt: { A: string; B: string } };
  /** Mốc thêm nội dung (ghi chú/bucket/kỷ niệm) gần nhất của từng người — chống spam */
  contentLog: { A: string; B: string };
  /**
   * TOMBSTONE: id các mục ĐÃ XOÁ (ghi chú/bucket/kỷ niệm). Merge full-state dạng union
   * theo id sẽ "hồi sinh" mục đã xoá nếu máy kia còn giữ bản cũ — tombstone hợp nhất
   * ở cả 2 phía và lọc mọi danh sách trong normalize/merge nên mục đã xoá là xoá hẳn.
   */
  deletedIds?: { notes: string[]; bucket: string[]; memories: string[]; events: string[] };
  /** Mốc thời gian (ISO) của lần ghi trạng thái gần nhất — dùng chống ghi đè realtime cũ */
  updatedAt?: string;
  /** Mốc sửa gần nhất theo từng mục trạng thái (khoá "daily:A", "moods:B", "letters"...) — phục vụ merge 2 máy, xem lib/merge.ts */
  secTs?: Record<string, SecStamp>;
  /** "Nhớ bạn" nhịp tim (Hạng 1) — per-slot, chủ slot ghi */
  pings: PingsState;
  /** Hiện diện nhẹ (Hạng 2) — per-slot, snapshot khi mở app/cập nhật tay */
  presence: PresenceState;
  /** Chia sẻ chu kỳ (Hạng 3) — per-slot, opt-in mặc định tắt */
  cycle: CycleState;
  /** Trang trí gói 1 — shared, mua qua shop */
  decor: DecorState;
  /** Thú cưng chung (Hạng 4) — shared */
  pet: PetState;
  /** Ngày đặc biệt (Hạng 5) — shared, tombstone trong deletedIds.events */
  events: SpecialEvent[];
}

export const STAGES = [
  { name: "Hạt giống", minXp: 0, desc: "Một hạt mầm tình yêu vừa được gieo" },
  { name: "Mầm non", minXp: 20, desc: "Mầm nhỏ đã nhú lên rồi nè!" },
  { name: "Cây con", minXp: 50, desc: "Cây con xanh mướt đáng yêu" },
  { name: "Cây lớn", minXp: 100, desc: "Tán lá sum suê, tình cảm vững chãi" },
  { name: "Nụ hoa", minXp: 180, desc: "Nụ hoa e ấp sắp nở" },
  { name: "Nở hoa", minXp: 280, desc: "Hoa nở rực rỡ, thơm ngát" },
  { name: "Cây trái tim", minXp: 400, desc: "Đỉnh cao! Cây kết trái tim lấp lánh" },
];
export function getStage(xp: number) {
  let idx = 0; STAGES.forEach((s, i) => { if (xp >= s.minXp) idx = i; });
  const next = STAGES[idx + 1];
  return { ...STAGES[idx], index: idx, next, progressToNext: next ? Math.min(100, Math.round(((xp - STAGES[idx].minXp) / (next.minXp - STAGES[idx].minXp)) * 100)) : 100 };
}
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
export function genRoomCode() {
  // Sinh TỪNG ký tự cho đủ 6: bản cũ Math.random().toString(36).slice(2,8) có thể cho
  // mã ngắn hơn 6 ký tự (vd 0.5 -> "0.i") — vườn tạo được nhưng đối tác không nhập nổi
  // vì màn Ghép cặp bắt mã đúng 6 ký tự.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
/**
 * Khóa ngày theo GIỜ ĐỊA PHƯƠNG của máy (người dùng ở Asia/Saigon).
 * Mọi logic "hôm nay" (nhiệm vụ ngày, mood, quiz, lượt quay, streak) PHẢI dùng khóa này —
 * trước đây today() cắt theo UTC nên ngày mới bắt đầu lúc 7h sáng giờ VN, gây lệch ngày.
 */
export function dayKeyLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function today() { return dayKeyLocal(); }
/**
 * Phân tích khóa ngày "yyyy-mm-dd" thành Date giờ địa phương — CHẶT: ngày không tồn tại
 * (vd 2025-02-31) bị loại. Bản cũ chỉ regex + isNaN(Date) nên "2025-02-31" bị JS Date
 * tự lăn sang 03-03 và QUA được kiểm tra ở màn Ghép cặp/Tài khoản/Kỷ niệm, lưu ngày sai
 * vào state. Trả về null khi không hợp lệ.
 */
export function parseDateKey(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}
export const isValidDateKey = (s: unknown): boolean => parseDateKey(s) !== null;
/**
 * Số thứ tự ngày theo GIỜ ĐỊA PHƯƠNG (epoch-day của ngày địa phương).
 * questionOfDay/quizOfDay PHẢI dùng số này: bản cũ dùng Math.floor(getTime()/86400000)
 * là ngày UTC — ở Việt Nam câu hỏi đổi lúc 7h sáng trong khi đáp án/nhiệm vụ reset lúc
 * 0h địa phương, khiến từ 0h–7h sáng app hiện câu hỏi của "hôm qua" và 7h lại lật câu
 * hỏi giữa ngày (đáp án đã niêm phong cho câu khác).
 */
export function localDayNumber(d: Date = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
export const CARE_MILESTONES = [10, 25, 50, 100, 150, 200, 300];

export const DECAY_PER_HOUR = { water: 2.5, sun: 1.8, love: 1.2 };
const clampStat = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
export function decayedStats(tree: TreeState, nowMs: number = Date.now()): { water: number; sun: number; love: number } {
  const base = { water: clampStat(tree.water || 0), sun: clampStat(tree.sun || 0), love: clampStat(tree.love || 0) };
  if (!tree.statsAt) return base;
  const hours = (nowMs - new Date(tree.statsAt).getTime()) / 3600000;
  if (!isFinite(hours) || hours <= 0) return base;
  return {
    water: clampStat(base.water - DECAY_PER_HOUR.water * hours),
    sun: clampStat(base.sun - DECAY_PER_HOUR.sun * hours),
    love: clampStat(base.love - DECAY_PER_HOUR.love * hours),
  };
}
export type TreeHealth = "happy" | "ok" | "need" | "wilted";
export function treeHealth(stats: { water: number; sun: number; love: number }): { status: TreeHealth; message: string; lowest: "water" | "sun" | "love" } {
  const entries = [["water", stats.water], ["sun", stats.sun], ["love", stats.love]] as const;
  const [lowest, min] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const msgs: Record<string, string> = {
    water: "Cây đang khát nước nè — tưới cho cây một chút nhé!",
    sun: "Cây đang thiếu nắng nè — cho cây tắm nắng đi!",
    love: "Cây đang nhớ yêu thương nè — bón tim cho cây nhé!",
  };
  if (min < 20) return { status: "wilted", message: msgs[lowest], lowest };
  if (min < 40) return { status: "need", message: msgs[lowest], lowest };
  if (min >= 70) return { status: "happy", message: "Cây đang rất hạnh phúc", lowest };
  return { status: "ok", message: "Cây đang ổn nè. Nhớ chăm đều để cây luôn tươi nhé!", lowest };
}

export const START_COINS = 50;
export const ONBOARD_GIFT_COINS = 30;
export const CARE_COINS: Record<"water" | "sun" | "love" | "bug", number> = { water: 5, sun: 5, love: 6, bug: 4 };
export const QUEST_COINS = 20;
export const LETTER_COINS: Record<Rarity, number> = { common: 10, rare: 25, legendary: 50 };

export const defaultGames: GamesState = {
  heartBest: { week: weekKey(), A: 0, B: 0 },
  spin: { date: today(), A: 0, B: 0 },
  quiz: { date: today(), A: [], B: [] },
  heartPlays: { date: today(), A: 0, B: 0 },
  dailyWins: { date: today(), memory: { A: 0, B: 0 }, dice: { A: 0, B: 0 } },
};

export const defaultState: AppState = {
  roomCode: "LOVE01", personA: "Bé A", personB: "Bé B", startDate: today(), currentUser: "A",
  tree: { xp: 0, water: 40, sun: 40, love: 40, careCount: 0, lastCareAt: "", lastCareBy: "", statsAt: new Date().toISOString() },
  // Mood mặc định RỖNG (chưa chọn): bản cũ để sẵn "joy"/"love" khiến vườn mới ngày đầu
  // hiện cả hai người "đã có mood" dù chưa ai chọn, và CTA Trang chủ bỏ qua bước chọn mood.
  moods: { A: "", B: "", date: today() },
  notes: [{ id: "seed1", author: "Bé A", text: "Chào mừng đến với khu vườn tình yêu của hai đứa mình", color: "#fbcfe8", createdAt: new Date().toISOString() }],
  bucket: [
    { id: "b1", text: "Cùng nhau đi Đà Lạt ngắm hoa", done: false, createdAt: new Date().toISOString() },
    { id: "b2", text: "Nấu một bữa ăn cùng nhau", done: true, createdAt: new Date().toISOString() },
  ],
  answers: { date: today(), A: "", B: "" },
  activities: [{ id: "a0", actor: "Hệ thống", text: "đã tạo khu vườn tình yêu", icon: "leaf", time: new Date().toISOString() }],
  letters: [],
  letterCollection: [],
  daily: freshDailyState(),
  streak: { count: 0, lastDate: "" },
  achievements: [],
  coins: START_COINS,
  inventory: ["pot-basic", "scene-auto", "acc-none"],
  equipped: { pot: "pot-basic", scene: "scene-auto", accessory: "acc-none" },
  memories: [{ id: "m0", title: "Ngày khu vườn tình yêu bắt đầu", date: today(), desc: "Ngày hai đứa gieo hạt mầm đầu tiên. Cùng nhau chăm cây lớn lên mỗi ngày nhé!", imageUrl: "", author: "Hệ thống", createdAt: new Date().toISOString() }],
  lastLoveAction: null,
  onboarded: false,
  everOnboarded: false,
  gardenName: "Khu Vườn Tình Yêu",
  avatarA: "svg-a",
  avatarB: "svg-b",
  plants: [],
  selectedPlantId: "",
  treeCollection: [],
  games: defaultGames,
  loveNotes: { A: "", B: "" },
  frameRewards: { date: today(), claimed: [] },
  loveLimits: { date: today(), counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } },
  contentLog: { A: "", B: "" },
  deletedIds: { notes: [], bucket: [], memories: [], events: [] },
  updatedAt: "",
  pings: {
    A: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 },
    B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 },
    day: { date: today(), A: 0, B: 0 },
  },
  presence: { A: defaultPresenceSlot(), B: defaultPresenceSlot() },
  cycle: { A: defaultCycleSlot(), B: defaultCycleSlot() },
  decor: { owned: [], sceneBg: "", fence: "", path: "", placed: [] },
  pet: {
    name: "Mochi", bornAt: new Date().toISOString(), hunger: 80, joy: 80, statsAt: new Date().toISOString(),
    careDays: [], lastCareAt: "", lastCareAtBy: { A: "", B: "" }, careCount: { A: 0, B: 0 },
    rewardDay: { date: today(), A: 0, B: 0 },
  },
  events: [],
};

/** Bỏ ký tự emoji khỏi chuỗi (dữ liệu state dùng chung với bản web cũ có thể còn sót). */
export function stripEmoji(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu, "").replace(/\s{2,}/g, " ").trim();
}
export const MOOD_LEGACY_MAP: Record<string, string> = {
  "\u{1F60A}": "joy", "\u{1F970}": "love", "\u{1F60D}": "heartEyes", "\u{1F634}": "sleepy",
  "\u{1F97A}": "pleading", "\u{1F624}": "huff", "\u{1F912}": "sick", "\u{1F389}": "celebrate",
  "\u{1F60C}": "calm", "\u{1F973}": "excited", "\u{1F622}": "sad", "\u{1F525}": "energetic",
};
export function normalizeMood(m: string): string { return MOOD_LEGACY_MAP[m] || m; }

/** Làm sạch secTs: chỉ giữ entry có t là chuỗi và by là "A"/"B". */
function sanitizeSecTs(v: unknown): Record<string, SecStamp> {
  if (!isPlainObject(v)) return {};
  const out: Record<string, SecStamp> = {};
  for (const [k, val] of Object.entries(v)) {
    if (isPlainObject(val) && typeof val.t === "string" && (val.by === "A" || val.by === "B")) out[k] = { t: val.t, by: val.by };
  }
  return out;
}
/** Xu Tim: số nguyên hữu hạn >= 0; NaN/chuỗi/số âm vô lý -> về START_COINS (NaN) hoặc 0 (âm). */
function saneCoins(v: unknown): number {
  // Qua finiteNum để chuỗi số ("500" từ dữ liệu cũ) được parse thay vì reset về 50.
  const n = finiteNum(v, Number.NaN);
  if (!Number.isFinite(n)) return START_COINS;
  return Math.max(0, Math.floor(n));
}

export function normalizeState(rawInput: Partial<AppState>): AppState {
  // Dữ liệu từ Supabase/cache có thể hỏng ở mọi mức (không phải object, mảng sai kiểu, NaN...)
  const raw: Partial<AppState> = isPlainObject(rawInput) ? rawInput : {};
  // messageId ép về SỐ: dữ liệu legacy/đồng bộ có thể mang messageId dạng chuỗi ("12") —
  // không ép thì bộ sưu tập so khớp Set<number> sẽ trượt và thư bị tính là chưa sở hữu.
  // Làm sạch TỪNG TRƯỜNG của thư: dữ liệu legacy/hỏng có thể mang rarity lạ (màn Thư tra
  // RARITY_STYLE[rarity] -> undefined -> crash), id không phải chuỗi (vỡ key/merge),
  // opened không phải boolean. Sau làm sạch: sắp xếp MỚI NHẤT TRƯỚC theo droppedAt —
  // reducer luôn chèn đầu, nhưng payload SET_STATE legacy/hỏng có thể đang cũ-trước
  // khiến các giới hạn hiển thị (3/5 lá đầu) cắt đúng những lá CŨ nhất.
  const RARITIES: Rarity[] = ["common", "rare", "legendary"];
  const slotOrUndef = (v: unknown): PersonId | undefined => (v === "A" || v === "B" ? v : undefined);
  const letters = objArray<LoveLetter>(raw.letters).map((l, i) => ({
    ...l,
    id: typeof l.id === "string" && l.id ? l.id : `letter-${i}`,
    messageId: Math.max(0, Math.floor(finiteNum(Number(l.messageId), 0))),
    rarity: RARITIES.includes(l.rarity) ? l.rarity : "common",
    source: typeof l.source === "string" ? l.source : "",
    opened: l.opened === true,
    droppedAt: typeof l.droppedAt === "string" ? l.droppedAt : "",
    openedAt: typeof l.openedAt === "string" ? l.openedAt : "",
    openedBy: typeof l.openedBy === "string" ? l.openedBy : "",
    openedBySlot: slotOrUndef(l.openedBySlot),
  })).sort((a, b) => (b.droppedAt || "").localeCompare(a.droppedAt || ""));
  // Bộ sưu tập bền vững = id đã lưu trước đó HỢP NHẤT id của mọi lá thư hiện còn trong hộp.
  // Chỉ giữ SỐ NGUYÊN >= 1: bản cũ Number(null)=0, Number(true)=1, 1.5, -5, 999 đều lọt
  // qua Number.isFinite, thổi phồng bộ đếm "Đã sưu tập x/36".
  const storedCollection = Array.isArray(raw.letterCollection)
    ? (raw.letterCollection as unknown[])
        // Chỉ nhận SỐ hoặc CHUỖI SỐ: Number(true)=1, Number(null)=0 phải bị loại TRƯỚC khi ép kiểu.
        .filter((x) => typeof x === "number" || (typeof x === "string" && x.trim() !== ""))
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n >= 1)
    : [];
  const letterCollection = [...new Set([...storedCollection, ...letters.map((l) => l.messageId)])];
  // Làm sạch từng trường cho ghi chú/bucket/kỷ niệm: objArray chỉ lọc phần tử không phải
  // object — object có text/title là SỐ vẫn lọt vào và vỡ khi render/slice ở tầng store.
  const strOr = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
  const notesAll = objArray<Note>(raw.notes).map((n, i) => ({
    ...n,
    id: typeof n.id === "string" && n.id ? n.id : `note-${i}`,
    author: strOr(n.author), authorSlot: slotOrUndef(n.authorSlot),
    text: strOr(n.text), color: strOr(n.color, "#fbcfe8"), createdAt: strOr(n.createdAt),
  }));
  const bucketAll = objArray<BucketItem>(raw.bucket).map((b, i) => ({
    ...b,
    id: typeof b.id === "string" && b.id ? b.id : `bucket-${i}`,
    text: strOr(b.text), done: b.done === true, createdAt: strOr(b.createdAt), authorSlot: slotOrUndef(b.authorSlot),
  }));
  const memoriesAll = objArray<MemoryItem>(raw.memories).map((m, i) => ({
    ...m,
    id: typeof m.id === "string" && m.id ? m.id : `memory-${i}`,
    title: strOr(m.title), date: strOr(m.date), desc: strOr(m.desc), imageUrl: strOr(m.imageUrl),
    author: strOr(m.author), authorSlot: slotOrUndef(m.authorSlot), createdAt: strOr(m.createdAt),
  }));
  // Tombstone: hợp lệ hoá danh sách id đã xoá (mỗi danh sách tối đa 500 id gần nhất)
  // rồi ÁP NGAY ở normalize — state chứa cả mục lẫn tombstone của nó thì mục bị loại.
  const saneDeleted = (v: unknown): string[] => [...new Set(strArray(v))].slice(-500);
  const deletedIds = {
    notes: saneDeleted(isPlainObject(raw.deletedIds) ? raw.deletedIds.notes : undefined),
    bucket: saneDeleted(isPlainObject(raw.deletedIds) ? raw.deletedIds.bucket : undefined),
    memories: saneDeleted(isPlainObject(raw.deletedIds) ? raw.deletedIds.memories : undefined),
    events: saneDeleted(isPlainObject(raw.deletedIds) ? raw.deletedIds.events : undefined),
  };
  const notes = notesAll.filter((n) => !deletedIds.notes.includes(n.id));
  const bucket = bucketAll.filter((b) => !deletedIds.bucket.includes(b.id));
  const memories = memoriesAll.filter((m) => !deletedIds.memories.includes(m.id));
  /* --- 6 section của gói tính năng 2026-10-23: làm sạch TỪNG TRƯỜNG như các section cũ,
     state cũ (chưa có các khoá này) nạp lên phải nhận giá trị mặc định sạch --- */
  const cnt0 = (v: unknown): number => Math.max(0, Math.floor(finiteNum(v, 0)));
  const numOrNull = (v: unknown, min: number, max: number): number | null => {
    const n = finiteNum(v, Number.NaN);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const sanePingSlot = (v: unknown): PingSlotState => {
    const o = isPlainObject(v) ? v : {};
    return { total: cnt0(o.total), lastAt: strOr(o.lastAt), lastBurstAt: strOr(o.lastBurstAt), burst: cnt0(o.burst) };
  };
  const pingsRaw = (isPlainObject(raw.pings) ? raw.pings : {}) as Partial<PingsState>;
  const pingsDayRaw = (isPlainObject(pingsRaw.day) ? pingsRaw.day : {}) as Partial<PingsState["day"]>;
  const pings: PingsState = {
    A: sanePingSlot(pingsRaw.A), B: sanePingSlot(pingsRaw.B),
    day: { date: strOr(pingsDayRaw.date) || today(), A: cnt0(pingsDayRaw.A), B: cnt0(pingsDayRaw.B) },
  };
  const sanePresenceSlot = (v: unknown): PresenceSlotState => {
    const o = isPlainObject(v) ? v : {};
    return {
      // Pin mặc định BẬT (chỉ tắt khi chủ slot chủ động tắt); vị trí mặc định TẮT (chỉ bật khi chủ động bật).
      shareBattery: o.shareBattery !== false,
      shareLocation: o.shareLocation === true,
      lat: numOrNull(o.lat, -90, 90), lng: numOrNull(o.lng, -180, 180),
      acc: numOrNull(o.acc, 0, 1000000),
      battery: numOrNull(o.battery, 0, 100),
      at: strOr(o.at),
    };
  };
  const presenceRaw = (isPlainObject(raw.presence) ? raw.presence : {}) as Partial<PresenceState>;
  const presence: PresenceState = { A: sanePresenceSlot(presenceRaw.A), B: sanePresenceSlot(presenceRaw.B) };
  const saneCycleSlot = (v: unknown): CycleSlotState => {
    const o = isPlainObject(v) ? v : {};
    const clampInt = (n: unknown, lo: number, hi: number, fb: number) => Math.max(lo, Math.min(hi, Math.round(finiteNum(n, fb))));
    return {
      share: o.share === true, // mặc định TẮT tuyệt đối — chỉ true khi chủ slot đã bật rõ ràng
      lastStart: isValidDateKey(o.lastStart) ? (o.lastStart as string) : "",
      cycleLen: clampInt(o.cycleLen, 21, 35, 28),
      periodLen: clampInt(o.periodLen, 3, 8, 5),
      startEditDate: strOr(o.startEditDate),
      updatedAt: strOr(o.updatedAt),
    };
  };
  const cycleRaw = (isPlainObject(raw.cycle) ? raw.cycle : {}) as Partial<CycleState>;
  const cycle: CycleState = { A: saneCycleSlot(cycleRaw.A), B: saneCycleSlot(cycleRaw.B) };
  const decorRaw = (isPlainObject(raw.decor) ? raw.decor : {}) as Partial<DecorState>;
  const decorOwned = [...new Set(strArray(decorRaw.owned))].slice(0, 100);
  const decor: DecorState = {
    owned: decorOwned,
    sceneBg: typeof decorRaw.sceneBg === "string" && decorOwned.includes(decorRaw.sceneBg) ? decorRaw.sceneBg : "",
    fence: typeof decorRaw.fence === "string" && decorOwned.includes(decorRaw.fence) ? decorRaw.fence : "",
    path: typeof decorRaw.path === "string" && decorOwned.includes(decorRaw.path) ? decorRaw.path : "",
    placed: [...new Set(strArray(decorRaw.placed))].filter((id) => decorOwned.includes(id)).slice(0, 3),
  };
  const petRaw = (isPlainObject(raw.pet) ? raw.pet : {}) as Partial<PetState>;
  const petCareRaw = (isPlainObject(petRaw.careCount) ? petRaw.careCount : {}) as Partial<PetState["careCount"]>;
  const petLastRaw = (isPlainObject(petRaw.lastCareAtBy) ? petRaw.lastCareAtBy : {}) as Partial<PetState["lastCareAtBy"]>;
  const petRewardRaw = (isPlainObject(petRaw.rewardDay) ? petRaw.rewardDay : {}) as Partial<PetState["rewardDay"]>;
  const pet: PetState = {
    name: (typeof petRaw.name === "string" && petRaw.name.trim() ? petRaw.name.trim().slice(0, 20) : "Mochi"),
    bornAt: strOr(petRaw.bornAt) || new Date().toISOString(),
    hunger: Math.max(0, Math.min(100, finiteNum(petRaw.hunger, 80))),
    joy: Math.max(0, Math.min(100, finiteNum(petRaw.joy, 80))),
    statsAt: strOr(petRaw.statsAt) || new Date().toISOString(),
    careDays: [...new Set(strArray(petRaw.careDays).filter((d) => isValidDateKey(d)))].sort().slice(-90),
    lastCareAt: strOr(petRaw.lastCareAt),
    lastCareAtBy: { A: strOr(petLastRaw.A), B: strOr(petLastRaw.B) },
    careCount: { A: cnt0(petCareRaw.A), B: cnt0(petCareRaw.B) },
    rewardDay: { date: strOr(petRewardRaw.date) || today(), A: cnt0(petRewardRaw.A), B: cnt0(petRewardRaw.B) },
  };
  const events = objArray<SpecialEvent>(raw.events).map((e, i) => ({
    id: typeof e.id === "string" && e.id ? e.id : `event-${i}`,
    title: strOr(e.title).slice(0, EVENT_TITLE_MAX),
    date: strOr(e.date),
    repeat: e.repeat === "yearly" ? "yearly" as const : "once" as const,
    createdBy: slotOrUndef(e.createdBy) ?? "A" as PersonId,
    createdAt: strOr(e.createdAt),
    updatedAt: strOr(e.updatedAt),
  })).filter((e) => isValidDateKey(e.date) && e.title.length > 0 && !deletedIds.events.includes(e.id)).slice(0, EVENTS_MAX);
  const rawActivities = objArray<Activity>(raw.activities);
  const treeRaw: Partial<TreeState> = isPlainObject(raw.tree) ? (raw.tree as Partial<TreeState>) : {};
  const hasHistory = Boolean(finiteNum(treeRaw.careCount, 0) > 0 || letters.length > 0 || notes.length > 1);
  const g = (isPlainObject(raw.games) ? raw.games : {}) as Partial<GamesState>;
  return {
    ...defaultState, ...raw,
    // Định danh + ngày bắt đầu: bản cũ để nguyên giá trị từ ...raw — currentUser lạ ("X")
    // làm myName rơi về personB và mọi logic slot lệch; personA/B không phải chuỗi làm
    // Text render vỡ; startDate không tồn tại (2025-02-31) làm Trang chủ hiện "Invalid Date".
    currentUser: raw.currentUser === "B" ? "B" : "A",
    roomCode: typeof raw.roomCode === "string" && raw.roomCode ? raw.roomCode : defaultState.roomCode,
    personA: typeof raw.personA === "string" && raw.personA ? raw.personA : defaultState.personA,
    personB: typeof raw.personB === "string" && raw.personB ? raw.personB : defaultState.personB,
    startDate: isValidDateKey(raw.startDate) ? (raw.startDate as string) : defaultState.startDate,
    answers: {
      date: isPlainObject(raw.answers) && typeof raw.answers.date === "string" && raw.answers.date ? raw.answers.date : today(),
      A: isPlainObject(raw.answers) && typeof raw.answers.A === "string" ? raw.answers.A : "",
      B: isPlainObject(raw.answers) && typeof raw.answers.B === "string" ? raw.answers.B : "",
    },
    deletedIds,
    moods: { ...defaultState.moods, ...(isPlainObject(raw.moods) ? raw.moods : {}), A: normalizeMood(isPlainObject(raw.moods) && typeof raw.moods.A === "string" && raw.moods.A ? raw.moods.A : defaultState.moods.A), B: normalizeMood(isPlainObject(raw.moods) && typeof raw.moods.B === "string" && raw.moods.B ? raw.moods.B : defaultState.moods.B), date: isPlainObject(raw.moods) && typeof raw.moods.date === "string" && raw.moods.date ? raw.moods.date : today() },
    tree: {
      ...defaultState.tree, ...treeRaw,
      xp: Math.max(0, finiteNum(treeRaw.xp, 0)),
      water: clampStat(finiteNum(treeRaw.water, defaultState.tree.water)),
      sun: clampStat(finiteNum(treeRaw.sun, defaultState.tree.sun)),
      love: clampStat(finiteNum(treeRaw.love, defaultState.tree.love)),
      careCount: Math.max(0, Math.floor(finiteNum(treeRaw.careCount, 0))),
      statsAt: treeRaw.statsAt || treeRaw.lastCareAt || defaultState.tree.statsAt,
    },
    letterCollection,
    daily: normalizeDaily(isPlainObject(raw.daily) ? raw.daily : undefined),
    streak: { count: Math.max(0, Math.floor(finiteNum(isPlainObject(raw.streak) ? raw.streak.count : undefined, 0))), lastDate: (isPlainObject(raw.streak) && typeof raw.streak.lastDate === "string") ? raw.streak.lastDate : "" },
    letters,
    achievements: strArray(raw.achievements),
    coins: saneCoins(raw.coins),
    coinsBase: typeof raw.coinsBase === "number" && Number.isFinite(raw.coinsBase) ? Math.max(0, Math.floor(raw.coinsBase)) : undefined,
    inventory: strArray(raw.inventory).length ? strArray(raw.inventory) : [...defaultState.inventory],
    equipped: {
      pot: typeof raw.equipped?.pot === "string" ? raw.equipped.pot : defaultState.equipped.pot,
      scene: typeof raw.equipped?.scene === "string" ? raw.equipped.scene : defaultState.equipped.scene,
      accessory: typeof raw.equipped?.accessory === "string" ? raw.equipped.accessory : defaultState.equipped.accessory,
    },
    memories,
    notes,
    bucket,
    lastLoveAction: isPlainObject(raw.lastLoveAction) ? { ...raw.lastLoveAction, icon: raw.lastLoveAction.icon || (raw.lastLoveAction as unknown as { emoji?: string }).emoji || "heart" } as LastLoveAction : null,
    onboarded: typeof raw.onboarded === "boolean" ? raw.onboarded : hasHistory,
    everOnboarded: typeof raw.everOnboarded === "boolean" ? raw.everOnboarded : hasHistory,
    gardenName: typeof raw.gardenName === "string" && raw.gardenName ? raw.gardenName : defaultState.gardenName,
    avatarA: typeof raw.avatarA === "string" && raw.avatarA ? raw.avatarA : defaultState.avatarA,
    avatarB: typeof raw.avatarB === "string" && raw.avatarB ? raw.avatarB : defaultState.avatarB,
    activities: rawActivities.map((a, i) => ({ ...a, id: typeof a.id === "string" && a.id ? a.id : `act-${i}`, actor: typeof a.actor === "string" ? a.actor : "", time: typeof a.time === "string" ? a.time : "", slot: slotOrUndef(a.slot), icon: a.icon || (a as unknown as { emoji?: string }).emoji || "leaf", text: stripEmoji(typeof a.text === "string" ? a.text : "") })),
    games: {
      heartBest: { ...defaultGames.heartBest, ...(isPlainObject(g.heartBest) ? g.heartBest : {}), A: Math.max(0, finiteNum(isPlainObject(g.heartBest) ? g.heartBest.A : undefined, 0)), B: Math.max(0, finiteNum(isPlainObject(g.heartBest) ? g.heartBest.B : undefined, 0)) },
      spin: { ...defaultGames.spin, ...(isPlainObject(g.spin) ? g.spin : {}), A: Math.max(0, Math.floor(finiteNum(isPlainObject(g.spin) ? g.spin.A : undefined, 0))), B: Math.max(0, Math.floor(finiteNum(isPlainObject(g.spin) ? g.spin.B : undefined, 0))) },
      quiz: { ...defaultGames.quiz, ...(isPlainObject(g.quiz) ? g.quiz : {}), A: Array.isArray(isPlainObject(g.quiz) ? g.quiz.A : undefined) ? (g.quiz!.A as unknown[]).map((n) => Number(n)).filter((n) => n === 0 || n === 1) : [], B: Array.isArray(isPlainObject(g.quiz) ? g.quiz.B : undefined) ? (g.quiz!.B as unknown[]).map((n) => Number(n)).filter((n) => n === 0 || n === 1) : [] },
      heartPlays: { ...defaultGames.heartPlays, ...(isPlainObject(g.heartPlays) ? g.heartPlays : {}), A: Math.max(0, Math.floor(finiteNum(isPlainObject(g.heartPlays) ? g.heartPlays.A : undefined, 0))), B: Math.max(0, Math.floor(finiteNum(isPlainObject(g.heartPlays) ? g.heartPlays.B : undefined, 0))) },
      dailyWins: (() => {
        const dw = isPlainObject(g.dailyWins) ? g.dailyWins : undefined;
        const cnt = (v: unknown) => Math.max(0, Math.floor(finiteNum(v, 0)));
        const pair = (v: unknown): { A: number; B: number } => (isPlainObject(v) ? { A: cnt(v.A), B: cnt(v.B) } : { A: 0, B: 0 });
        return {
          date: dw && typeof dw.date === "string" && dw.date ? dw.date : today(),
          memory: pair(dw?.memory),
          dice: pair(dw?.dice),
        };
      })(),
    },
    loveNotes: { A: typeof raw.loveNotes?.A === "string" ? raw.loveNotes.A : "", B: typeof raw.loveNotes?.B === "string" ? raw.loveNotes.B : "" },
    frameRewards: {
      date: typeof raw.frameRewards?.date === "string" && raw.frameRewards.date ? raw.frameRewards.date : today(),
      claimed: strArray(raw.frameRewards?.claimed).filter((k): k is FrameKind => k === "days" || k === "tree" || k === "mood"),
    },
    loveLimits: {
      date: typeof raw.loveLimits?.date === "string" && raw.loveLimits.date ? raw.loveLimits.date : today(),
      counts: { A: Math.max(0, Math.floor(finiteNum(raw.loveLimits?.counts?.A, 0))), B: Math.max(0, Math.floor(finiteNum(raw.loveLimits?.counts?.B, 0))) },
      lastAt: { A: typeof raw.loveLimits?.lastAt?.A === "string" ? raw.loveLimits.lastAt.A : "", B: typeof raw.loveLimits?.lastAt?.B === "string" ? raw.loveLimits.lastAt.B : "" },
    },
    contentLog: { A: typeof raw.contentLog?.A === "string" ? raw.contentLog.A : "", B: typeof raw.contentLog?.B === "string" ? raw.contentLog.B : "" },
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    secTs: sanitizeSecTs(raw.secTs),
    pings, presence, cycle, decor, pet, events,
  };
}

export const RARITY_STYLE: Record<Rarity, { label: string; border: string; bg: string; text: string }> = {
  common: { label: "Thường", border: "#f9a8d4", bg: "#fdf2f8", text: "#db2777" },
  rare: { label: "Hiếm", border: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  legendary: { label: "Huyền thoại", border: "#a78bfa", bg: "#f5f3ff", text: "#7c3aed" },
};

/** Số ngày yêu nhau tính từ startDate (ngày bắt đầu tính là ngày 1). */
export function daysTogether(startDate: string, nowMs: number = Date.now()): number {
  const start = new Date(startDate + "T00:00:00").getTime();
  if (!isFinite(start)) return 0;
  const d = Math.floor((nowMs - start) / 86400000) + 1;
  return Math.max(0, d);
}
export const MILESTONES = [100, 200, 300, 365, 500, 730, 1000, 1500, 2000, 3000];
export function nextMilestone(days: number): { target: number; remaining: number } {
  const t = MILESTONES.find((m) => m > days) || Math.ceil((days + 1) / 1000) * 1000;
  return { target: t, remaining: t - days };
}
/**
 * Streak HIỆU DỤNG để hiển thị: chuỗi chỉ còn sống khi lần chăm gần nhất là hôm nay
 * hoặc hôm qua. state.streak.count tự nó không bao giờ giảm (chỉ tính lại khi có lần
 * chăm tiếp theo) — hiện thẳng ra Trang chủ là "5 ngày liền" dù đã nghỉ chăm 3 ngày.
 */
export function effectiveStreak(s: { count: number; lastDate: string }, nowMs: number = Date.now()): number {
  if (!s.lastDate) return 0;
  const t = dayKeyLocal(new Date(nowMs));
  const y = dayKeyLocal(new Date(nowMs - 86400000));
  return s.lastDate === t || s.lastDate === y ? s.count : 0;
}

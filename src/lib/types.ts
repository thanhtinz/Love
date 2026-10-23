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
/** Số hữu hạn hoặc fallback — chặn NaN/Infinity lọt vào state (NaN là "number" nên typeof không đủ). */
export function finiteNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
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
export interface Activity { id: string; actor: string; text: string; icon: string; time: string; }
export interface Note { id: string; author: string; authorSlot?: PersonId; text: string; color: string; createdAt: string; }
export interface BucketItem { id: string; text: string; done: boolean; createdAt: string; authorSlot?: PersonId; }
export interface LoveLetter { id: string; messageId: number; rarity: Rarity; source: string; opened: boolean; droppedAt: string; openedAt: string; openedBy: string; }
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
/** Khoảng cách tối thiểu giữa 2 lần thêm ghi chú/bucket/kỷ niệm liên tiếp của cùng một người */
export const CONTENT_ADD_MIN_INTERVAL_MS = 5000;
export const CONTENT_LIMITS = { note: 200, bucket: 120, memoryTitle: 60, memoryDesc: 300 };

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
  /** Mốc thời gian (ISO) của lần ghi trạng thái gần nhất — dùng chống ghi đè realtime cũ */
  updatedAt?: string;
  /** Mốc sửa gần nhất theo từng mục trạng thái (khoá "daily:A", "moods:B", "letters"...) — phục vụ merge 2 máy, xem lib/merge.ts */
  secTs?: Record<string, SecStamp>;
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
export function genRoomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
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
  moods: { A: "joy", B: "love", date: today() },
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
  updatedAt: "",
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
  if (typeof v !== "number" || !Number.isFinite(v)) return START_COINS;
  return Math.max(0, Math.floor(v));
}

export function normalizeState(rawInput: Partial<AppState>): AppState {
  // Dữ liệu từ Supabase/cache có thể hỏng ở mọi mức (không phải object, mảng sai kiểu, NaN...)
  const raw: Partial<AppState> = isPlainObject(rawInput) ? rawInput : {};
  // messageId ép về SỐ: dữ liệu legacy/đồng bộ có thể mang messageId dạng chuỗi ("12") —
  // không ép thì bộ sưu tập so khớp Set<number> sẽ trượt và thư bị tính là chưa sở hữu.
  const letters = objArray<LoveLetter>(raw.letters).map((l) => ({ ...l, messageId: finiteNum(Number(l.messageId), 0) }));
  // Bộ sưu tập bền vững = id đã lưu trước đó HỢP NHẤT id của mọi lá thư hiện còn trong hộp.
  const storedCollection = Array.isArray(raw.letterCollection)
    ? raw.letterCollection.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  const letterCollection = [...new Set([...storedCollection, ...letters.map((l) => l.messageId)])];
  const notes = objArray<Note>(raw.notes);
  const bucket = objArray<BucketItem>(raw.bucket);
  const memories = objArray<MemoryItem>(raw.memories);
  const rawActivities = objArray<Activity>(raw.activities);
  const treeRaw: Partial<TreeState> = isPlainObject(raw.tree) ? (raw.tree as Partial<TreeState>) : {};
  const hasHistory = Boolean(finiteNum(treeRaw.careCount, 0) > 0 || letters.length > 0 || notes.length > 1);
  const g = (isPlainObject(raw.games) ? raw.games : {}) as Partial<GamesState>;
  return {
    ...defaultState, ...raw,
    moods: { ...defaultState.moods, ...(isPlainObject(raw.moods) ? raw.moods : {}), A: normalizeMood((raw.moods && raw.moods.A) || defaultState.moods.A), B: normalizeMood((raw.moods && raw.moods.B) || defaultState.moods.B) },
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
    activities: rawActivities.map((a) => ({ ...a, icon: a.icon || (a as unknown as { emoji?: string }).emoji || "leaf", text: stripEmoji(typeof a.text === "string" ? a.text : "") })),
    games: {
      heartBest: { ...defaultGames.heartBest, ...(isPlainObject(g.heartBest) ? g.heartBest : {}), A: Math.max(0, finiteNum(isPlainObject(g.heartBest) ? g.heartBest.A : undefined, 0)), B: Math.max(0, finiteNum(isPlainObject(g.heartBest) ? g.heartBest.B : undefined, 0)) },
      spin: { ...defaultGames.spin, ...(isPlainObject(g.spin) ? g.spin : {}), A: Math.max(0, Math.floor(finiteNum(isPlainObject(g.spin) ? g.spin.A : undefined, 0))), B: Math.max(0, Math.floor(finiteNum(isPlainObject(g.spin) ? g.spin.B : undefined, 0))) },
      quiz: { ...defaultGames.quiz, ...(isPlainObject(g.quiz) ? g.quiz : {}), A: Array.isArray(isPlainObject(g.quiz) ? g.quiz.A : undefined) ? (g.quiz!.A as number[]).filter((n) => n === 0 || n === 1) : [], B: Array.isArray(isPlainObject(g.quiz) ? g.quiz.B : undefined) ? (g.quiz!.B as number[]).filter((n) => n === 0 || n === 1) : [] },
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
      claimed: strArray(raw.frameRewards?.claimed) as FrameKind[],
    },
    loveLimits: {
      date: typeof raw.loveLimits?.date === "string" && raw.loveLimits.date ? raw.loveLimits.date : today(),
      counts: { A: Math.max(0, Math.floor(finiteNum(raw.loveLimits?.counts?.A, 0))), B: Math.max(0, Math.floor(finiteNum(raw.loveLimits?.counts?.B, 0))) },
      lastAt: { A: typeof raw.loveLimits?.lastAt?.A === "string" ? raw.loveLimits.lastAt.A : "", B: typeof raw.loveLimits?.lastAt?.B === "string" ? raw.loveLimits.lastAt.B : "" },
    },
    contentLog: { A: typeof raw.contentLog?.A === "string" ? raw.contentLog.A : "", B: typeof raw.contentLog?.B === "string" ? raw.contentLog.B : "" },
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    secTs: sanitizeSecTs(raw.secTs),
  };
}

export const RARITY_STYLE: Record<Rarity, { label: string; border: string; bg: string; text: string }> = {
  common: { label: "Thường", border: "#f9a8d4", bg: "#fdf2f8", text: "#db2777" },
  rare: { label: "Hiếm — Song chăm", border: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
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

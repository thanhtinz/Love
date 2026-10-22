export type PersonId = "A" | "B";
/* ---------- v3: tài khoản — bộ avatar chibi để chọn khi đăng ký ---------- */
export interface AvatarOption { id: string; emoji: string; label: string; bg: string }
export const AVATARS: AvatarOption[] = [
  { id: "svg-a", emoji: "🌸", label: "Bé Hoa (SVG)", bg: "#ffe4ec" },
  { id: "svg-b", emoji: "💙", label: "Bé Sao (SVG)", bg: "#dbeafe" },
  { id: "bunny", emoji: "🐰", label: "Thỏ con", bg: "#fdf2f8" },
  { id: "bear", emoji: "🐻", label: "Gấu nâu", bg: "#fef3c7" },
  { id: "cat", emoji: "🐱", label: "Mèo con", bg: "#ffedd5" },
  { id: "dog", emoji: "🐶", label: "Cún con", bg: "#fef9c3" },
  { id: "fox", emoji: "🦊", label: "Cáo nhỏ", bg: "#fff7ed" },
  { id: "panda", emoji: "🐼", label: "Gấu trúc", bg: "#f1f5f9" },
  { id: "frog", emoji: "🐸", label: "Ếch xanh", bg: "#dcfce7" },
  { id: "pig", emoji: "🐷", label: "Heo hồng", bg: "#fce7f3" },
  { id: "chick", emoji: "🐣", label: "Gà con", bg: "#fefce8" },
  { id: "koala", emoji: "🐨", label: "Koala", bg: "#e2e8f0" },
];
export function avatarById(id?: string): AvatarOption { return AVATARS.find((a) => a.id === id) || AVATARS[0]; }
export type Rarity = "common" | "rare" | "legendary";
export type ShopCategory = "pot" | "scene" | "accessory";
export interface TreeState { xp: number; water: number; sun: number; love: number; careCount: number; lastCareAt: string; lastCareBy: string; statsAt: string; }
export interface Activity { id: string; actor: string; text: string; time: string; emoji: string; }
export interface Note { id: string; author: string; text: string; color: string; createdAt: string; }
export interface BucketItem { id: string; text: string; done: boolean; createdAt: string; }
export interface LoveLetter { id: string; messageId: number; rarity: Rarity; source: string; opened: boolean; droppedAt: string; openedAt: string; openedBy: string; }
export interface DailyState { date: string; water: number; love: number; sun: number; bug: number; caredA: boolean; caredB: boolean; claimed: string[]; }
export interface MemoryItem { id: string; title: string; date: string; desc: string; imageUrl: string; author: string; createdAt: string; }
export interface LastLoveAction { kind: string; emoji: string; label: string; by: PersonId; actor: string; at: string; }
export interface AppState {
  roomCode: string; personA: string; personB: string; startDate: string; currentUser: PersonId;
  tree: TreeState;
  moods: { A: string; B: string; date: string };
  notes: Note[]; bucket: BucketItem[];
  answers: { date: string; A: string; B: string };
  activities: Activity[];
  letters: LoveLetter[];
  daily: DailyState;
  streak: { count: number; lastDate: string };
  achievements: string[];
  // --- v2 ---
  coins: number;
  inventory: string[];
  equipped: Record<ShopCategory, string>;
  memories: MemoryItem[];
  lastLoveAction: LastLoveAction | null;
  onboarded: boolean;
  everOnboarded: boolean;
  // --- v3: danh tính lấy từ tài khoản của 2 thành viên + tên khu vườn ---
  gardenName: string;
  avatarA: string;
  avatarB: string;
}
export const STAGES = [
  { name: "Hạt giống", emoji: "🌰", minXp: 0, desc: "Một hạt mầm tình yêu vừa được gieo", scale: 0.7 },
  { name: "Mầm non", emoji: "🌱", minXp: 20, desc: "Mầm nhỏ đã nhú lên rồi nè!", scale: 0.85 },
  { name: "Cây con", emoji: "🌿", minXp: 50, desc: "Cây con xanh mướt đáng yêu", scale: 1 },
  { name: "Cây lớn", emoji: "🌳", minXp: 100, desc: "Tán lá sum suê, tình cảm vững chãi", scale: 1.15 },
  { name: "Nụ hoa", emoji: "🌷", minXp: 180, desc: "Nụ hoa e ấp sắp nở", scale: 1.3 },
  { name: "Nở hoa", emoji: "🌸", minXp: 280, desc: "Hoa nở rực rỡ, thơm ngát", scale: 1.45 },
  { name: "Cây trái tim", emoji: "💖", minXp: 400, desc: "Đỉnh cao! Cây kết trái tim lấp lánh", scale: 1.6 },
];
export function getStage(xp: number) {
  let idx = 0; STAGES.forEach((s, i) => { if (xp >= s.minXp) idx = i; });
  const next = STAGES[idx + 1];
  return { ...STAGES[idx], index: idx, next, progressToNext: next ? Math.min(100, Math.round(((xp - STAGES[idx].minXp) / (next.minXp - STAGES[idx].minXp)) * 100)) : 100 };
}
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
export function genRoomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
export function today() { return new Date().toISOString().slice(0, 10); }
export const CARE_MILESTONES = [10, 25, 50, 100, 150, 200, 300];

/* ---------- v2: cây "sống thật" — chỉ số tự giảm theo thời gian ---------- */
/** Tốc độ giảm mỗi giờ, tính từ statsAt (mốc thời gian chỉ số được ghi lần cuối). */
export const DECAY_PER_HOUR = { water: 2.5, sun: 1.8, love: 1.2 };
const clampStat = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
/** Chỉ số THẬT sau khi trừ hao theo thời gian thực. Thuần hàm — dùng cho hiển thị + reducer (TICK / TREE_ACTION). */
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
    water: "Cây đang khát nước nè 🥺 — tưới cho cây một chút nhé!",
    sun: "Cây đang thiếu nắng nè 🌥️ — cho cây tắm nắng đi!",
    love: "Cây đang nhớ yêu thương nè 💔 — bón tim cho cây nhé!",
  };
  if (min < 20) return { status: "wilted", message: msgs[lowest], lowest };
  if (min < 40) return { status: "need", message: msgs[lowest], lowest };
  if (min >= 70) return { status: "happy", message: "Cây đang rất hạnh phúc, bướm bay quanh vườn 🦋", lowest };
  return { status: "ok", message: "Cây đang ổn nè 🌿 Nhớ chăm đều để cây luôn tươi nhé!", lowest };
}

/* ---------- v2: tiền tệ + phần thưởng Xu Tim ---------- */
export const START_COINS = 50;
export const ONBOARD_GIFT_COINS = 30;
export const CARE_COINS: Record<"water" | "sun" | "love" | "bug", number> = { water: 5, sun: 5, love: 6, bug: 4 };
export const QUEST_COINS = 20;
export const LETTER_COINS: Record<Rarity, number> = { common: 10, rare: 25, legendary: 50 };

export const defaultState: AppState = {
  roomCode: "LOVE01", personA: "Bé A", personB: "Bé B", startDate: today(), currentUser: "A",
  tree: { xp: 0, water: 40, sun: 40, love: 40, careCount: 0, lastCareAt: "", lastCareBy: "", statsAt: new Date().toISOString() },
  moods: { A: "😊", B: "🥰", date: today() },
  notes: [{ id: "seed1", author: "Bé A", text: "Chào mừng đến với khu vườn tình yêu của hai đứa mình 💕", color: "bg-pink-100", createdAt: new Date().toISOString() }],
  bucket: [
    { id: "b1", text: "Cùng nhau đi Đà Lạt ngắm hoa", done: false, createdAt: new Date().toISOString() },
    { id: "b2", text: "Nấu một bữa ăn cùng nhau", done: true, createdAt: new Date().toISOString() },
  ],
  answers: { date: today(), A: "", B: "" },
  activities: [{ id: "a0", actor: "Hệ thống", text: "đã tạo khu vườn tình yêu", time: new Date().toISOString(), emoji: "🌱" }],
  letters: [],
  daily: { date: today(), water: 0, love: 0, sun: 0, bug: 0, caredA: false, caredB: false, claimed: [] },
  streak: { count: 0, lastDate: "" },
  achievements: [],
  coins: START_COINS,
  inventory: ["pot-basic", "scene-auto", "acc-none"],
  equipped: { pot: "pot-basic", scene: "scene-auto", accessory: "acc-none" },
  memories: [{ id: "m0", title: "Ngày khu vườn tình yêu bắt đầu 🌱", date: today(), desc: "Ngày hai đứa gieo hạt mầm đầu tiên. Cùng nhau chăm cây lớn lên mỗi ngày nhé!", imageUrl: "", author: "Hệ thống", createdAt: new Date().toISOString() }],
  lastLoveAction: null,
  onboarded: false,
  everOnboarded: false,
  gardenName: "Khu Vườn Tình Yêu",
  avatarA: "svg-a",
  avatarB: "svg-b",
};
export function normalizeState(raw: Partial<AppState>): AppState {
  // State v1 chưa có field onboarded: nếu đã có lịch sử dùng app thì coi như đã onboard để không làm phiền lại
  const hasHistory = Boolean((raw.tree && raw.tree.careCount > 0) || (raw.letters && raw.letters.length > 0) || (raw.notes && raw.notes.length > 1) || (raw.personA && raw.personA !== "Bé A") || (raw.personB && raw.personB !== "Bé B"));
  return {
    ...defaultState, ...raw,
    tree: { ...defaultState.tree, ...(raw.tree || {}), statsAt: (raw.tree && (raw.tree.statsAt || raw.tree.lastCareAt)) || defaultState.tree.statsAt },
    daily: { ...defaultState.daily, ...(raw.daily || {}) },
    streak: { ...defaultState.streak, ...(raw.streak || {}) },
    letters: raw.letters || [],
    achievements: raw.achievements || [],
    coins: typeof raw.coins === "number" ? raw.coins : START_COINS,
    inventory: raw.inventory && raw.inventory.length ? raw.inventory : [...defaultState.inventory],
    equipped: { ...defaultState.equipped, ...(raw.equipped || {}) },
    memories: raw.memories || [],
    lastLoveAction: raw.lastLoveAction || null,
    onboarded: typeof raw.onboarded === "boolean" ? raw.onboarded : hasHistory,
    everOnboarded: typeof raw.everOnboarded === "boolean" ? raw.everOnboarded : hasHistory,
    gardenName: raw.gardenName || defaultState.gardenName,
    avatarA: raw.avatarA || defaultState.avatarA,
    avatarB: raw.avatarB || defaultState.avatarB,
  };
}
export const RARITY_STYLE: Record<Rarity, { label: string; ring: string; bg: string; text: string; emoji: string }> = {
  common: { label: "Thường", ring: "border-pink-300 bg-pink-50", bg: "bg-pink-100 text-pink-600", text: "text-pink-600", emoji: "💌" },
  rare: { label: "Hiếm ✨ Song chăm", ring: "border-amber-400 bg-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.45)]", bg: "bg-amber-100 text-amber-700", text: "text-amber-600", emoji: "✨💌" },
  legendary: { label: "Huyền thoại 👑", ring: "border-violet-400 bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 shadow-[0_0_32px_rgba(167,139,250,0.5)]", bg: "bg-violet-100 text-violet-700", text: "text-violet-600", emoji: "👑💌" },
};

// Port từ bản web (lib/types.ts) — giữ nguyên shape state để dùng chung room_state trên Supabase.
// Khác biệt: màu shop dùng mã hex (React Native không có Tailwind), thêm state cho mini-game (games).
export type PersonId = "A" | "B";

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
  announcedStage: number;
  matureAt: string;
  fruitReadyAt: string;
  harvestCount: number;
}
export interface CollectedTree {
  id: string; speciesId: string; plantedAt: string; maturedAt: string; collectedAt: string; careCount: number;
}
export interface Activity { id: string; actor: string; text: string; icon: string; time: string; }
export interface Note { id: string; author: string; text: string; color: string; createdAt: string; }
export interface BucketItem { id: string; text: string; done: boolean; createdAt: string; }
export interface LoveLetter { id: string; messageId: number; rarity: Rarity; source: string; opened: boolean; droppedAt: string; openedAt: string; openedBy: string; }
export interface DailyState { date: string; water: number; love: number; sun: number; bug: number; caredA: boolean; caredB: boolean; claimed: string[]; }
export interface MemoryItem { id: string; title: string; date: string; desc: string; imageUrl: string; author: string; createdAt: string; }
export interface LastLoveAction { kind: string; icon: string; label: string; by: PersonId; actor: string; at: string; }

/** State riêng của bản mobile cho 3 mini-game — lưu chung trong room_state JSON. */
export interface GamesState {
  /** Bắt tim bay: điểm cao nhất trong tuần (key = tuần ISO yyyy-Www) */
  heartBest: { week: string; A: number; B: number };
  /** Vòng quay: số lượt đã quay hôm nay của từng người */
  spin: { date: string; A: number; B: number };
  /** Hiểu ý nhau: đáp án trắc nghiệm của từng người trong ngày (mảng index lựa chọn theo câu) */
  quiz: { date: string; A: number[]; B: number[] };
}

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
export function today() { return new Date().toISOString().slice(0, 10); }
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
  daily: { date: today(), water: 0, love: 0, sun: 0, bug: 0, caredA: false, caredB: false, claimed: [] },
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

export function normalizeState(raw: Partial<AppState>): AppState {
  const hasHistory = Boolean((raw.tree && raw.tree.careCount > 0) || (raw.letters && raw.letters.length > 0) || (raw.notes && raw.notes.length > 1));
  const g = (raw.games || {}) as Partial<GamesState>;
  return {
    ...defaultState, ...raw,
    moods: { ...defaultState.moods, ...(raw.moods || {}), A: normalizeMood((raw.moods && raw.moods.A) || defaultState.moods.A), B: normalizeMood((raw.moods && raw.moods.B) || defaultState.moods.B) },
    tree: { ...defaultState.tree, ...(raw.tree || {}), statsAt: (raw.tree && (raw.tree.statsAt || raw.tree.lastCareAt)) || defaultState.tree.statsAt },
    daily: { ...defaultState.daily, ...(raw.daily || {}) },
    streak: { ...defaultState.streak, ...(raw.streak || {}) },
    letters: raw.letters || [],
    achievements: raw.achievements || [],
    coins: typeof raw.coins === "number" ? raw.coins : START_COINS,
    inventory: raw.inventory && raw.inventory.length ? raw.inventory : [...defaultState.inventory],
    equipped: { ...defaultState.equipped, ...(raw.equipped || {}) },
    memories: raw.memories || [],
    lastLoveAction: raw.lastLoveAction ? { ...raw.lastLoveAction, icon: raw.lastLoveAction.icon || (raw.lastLoveAction as unknown as { emoji?: string }).emoji || "heart" } : null,
    onboarded: typeof raw.onboarded === "boolean" ? raw.onboarded : hasHistory,
    everOnboarded: typeof raw.everOnboarded === "boolean" ? raw.everOnboarded : hasHistory,
    gardenName: raw.gardenName || defaultState.gardenName,
    avatarA: raw.avatarA || defaultState.avatarA,
    avatarB: raw.avatarB || defaultState.avatarB,
    activities: (raw.activities || []).map((a) => ({ ...a, icon: a.icon || (a as unknown as { emoji?: string }).emoji || "leaf", text: stripEmoji(a.text || "") })),
    games: {
      heartBest: { ...defaultGames.heartBest, ...(g.heartBest || {}) },
      spin: { ...defaultGames.spin, ...(g.spin || {}) },
      quiz: { ...defaultGames.quiz, ...(g.quiz || {}) },
    },
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

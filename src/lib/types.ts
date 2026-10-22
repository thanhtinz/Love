export type PersonId = "A" | "B";
export type Rarity = "common" | "rare" | "legendary";
export interface TreeState { xp: number; water: number; sun: number; love: number; careCount: number; lastCareAt: string; lastCareBy: string; }
export interface Activity { id: string; actor: string; text: string; time: string; emoji: string; }
export interface Note { id: string; author: string; text: string; color: string; createdAt: string; }
export interface BucketItem { id: string; text: string; done: boolean; createdAt: string; }
export interface LoveLetter { id: string; messageId: number; rarity: Rarity; source: string; opened: boolean; droppedAt: string; openedAt: string; openedBy: string; }
export interface DailyState { date: string; water: number; love: number; sun: number; bug: number; caredA: boolean; caredB: boolean; claimed: string[]; }
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
export const defaultState: AppState = {
  roomCode: "LOVE01", personA: "Bé A", personB: "Bé B", startDate: today(), currentUser: "A",
  tree: { xp: 0, water: 40, sun: 40, love: 40, careCount: 0, lastCareAt: "", lastCareBy: "" },
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
};
export function normalizeState(raw: Partial<AppState>): AppState {
  return { ...defaultState, ...raw, tree: { ...defaultState.tree, ...(raw.tree || {}) }, daily: { ...defaultState.daily, ...(raw.daily || {}) }, streak: { ...defaultState.streak, ...(raw.streak || {}) }, letters: raw.letters || [], achievements: raw.achievements || [] };
}
export const RARITY_STYLE: Record<Rarity, { label: string; ring: string; bg: string; text: string; emoji: string }> = {
  common: { label: "Thường", ring: "border-pink-300 bg-pink-50", bg: "bg-pink-100 text-pink-600", text: "text-pink-600", emoji: "💌" },
  rare: { label: "Hiếm ✨ Song chăm", ring: "border-amber-400 bg-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.45)]", bg: "bg-amber-100 text-amber-700", text: "text-amber-600", emoji: "✨💌" },
  legendary: { label: "Huyền thoại 👑", ring: "border-violet-400 bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 shadow-[0_0_32px_rgba(167,139,250,0.5)]", bg: "bg-violet-100 text-violet-700", text: "text-violet-600", emoji: "👑💌" },
};

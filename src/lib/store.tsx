"use client";
import React, { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { AppState, CARE_COINS, LETTER_COINS, LoveLetter, MemoryItem, ONBOARD_GIFT_COINS, QUEST_COINS, ShopCategory, decayedStats, defaultState, getStage, normalizeState, today, uid } from "./types";
import { shopItem } from "./data";
import { RealtimeSync } from "./realtime";

export type Action =
  | { type: "SET_STATE"; state: AppState }
  | { type: "TICK" }
  | { type: "SET_NAMES"; a: string; b: string }
  | { type: "SET_START"; date: string }
  | { type: "SET_USER"; user: "A" | "B" }
  | { type: "SET_ROOM"; code: string }
  | { type: "TREE_ACTION"; kind: "water" | "sun" | "love" | "bug"; actor: string; user: "A" | "B"; drop?: LoveLetter | null; combo?: boolean }
  | { type: "OPEN_LETTER"; id: string; opener: string }
  | { type: "CLAIM_QUEST"; questId: string; actor: string; rewardXp: number; drop?: LoveLetter | null }
  | { type: "ADD_XP"; xp: number }
  | { type: "SET_MOOD"; user: "A" | "B"; mood: string }
  | { type: "ADD_NOTE"; note: AppState["notes"][0] }
  | { type: "DEL_NOTE"; id: string }
  | { type: "ADD_BUCKET"; item: AppState["bucket"][0] }
  | { type: "TOGGLE_BUCKET"; id: string }
  | { type: "DEL_BUCKET"; id: string }
  | { type: "ANSWER"; user: "A" | "B"; text: string }
  // --- v2 ---
  | { type: "BUY_ITEM"; itemId: string; actor: string }
  | { type: "EQUIP_ITEM"; category: ShopCategory; itemId: string }
  | { type: "LOVE_ACTION"; kind: string; emoji: string; label: string; actor: string; user: "A" | "B" }
  | { type: "ADD_MEMORY"; memory: MemoryItem }
  | { type: "DEL_MEMORY"; id: string }
  | { type: "COMPLETE_ONBOARDING"; a: string; b: string; startDate: string; user: "A" | "B"; roomCode: string }
  | { type: "REOPEN_ONBOARDING" };

const KEY = "love-app-v1";
function pushAct(s: AppState, actor: string, text: string, emoji: string): AppState["activities"] {
  return [{ id: uid(), actor, text, time: new Date().toISOString(), emoji }, ...s.activities].slice(0, 40);
}
function freshDaily(s: AppState): AppState["daily"] {
  const t = today();
  return s.daily.date === t ? s.daily : { date: t, water: 0, love: 0, sun: 0, bug: 0, caredA: false, caredB: false, claimed: [] };
}
function unlock(s: AppState, ids: string[]): string[] {
  const set = new Set(s.achievements); ids.forEach((i) => set.add(i)); return [...set];
}
function checkAch(s: AppState): AppState {
  const ids: string[] = [];
  if (s.tree.careCount >= 1) ids.push("first");
  if (s.tree.careCount >= 25) ids.push("care25");
  const st = getStage(s.tree.xp).index;
  if (st >= 5) ids.push("bloom"); if (st >= 6) ids.push("hearttree");
  if (s.letters.filter((l) => l.opened).length >= 10) ids.push("collector10");
  if (s.streak.count >= 3) ids.push("streak3");
  if (s.daily.claimed.length >= 3) ids.push("questall");
  if (s.inventory.some((i) => !defaultState.inventory.includes(i))) ids.push("shopper");
  if (s.memories.length >= 3) ids.push("memories3");
  return { ...s, achievements: unlock(s, ids) };
}
/** Ghi chỉ số đã trừ hao vào tree + đóng dấu thời gian mới. */
function materializeDecay(tree: AppState["tree"]): AppState["tree"] {
  const d = decayedStats(tree);
  return { ...tree, water: d.water, sun: d.sun, love: d.love, statsAt: new Date().toISOString() };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE": return normalizeState(action.state);
    case "TICK": {
      // Áp decay theo thời gian thực + lật ngày cho nhiệm vụ. Không đổi gì -> trả nguyên state để khỏi broadcast vòng lặp.
      const d = decayedStats(state.tree);
      const drift = Math.abs(d.water - state.tree.water) + Math.abs(d.sun - state.tree.sun) + Math.abs(d.love - state.tree.love);
      const daily = freshDaily(state);
      if (drift < 0.5 && daily === state.daily) return state;
      return { ...state, tree: { ...state.tree, water: d.water, sun: d.sun, love: d.love, statsAt: new Date().toISOString() }, daily };
    }
    case "SET_NAMES": return { ...state, personA: action.a, personB: action.b };
    case "SET_START": return { ...state, startDate: action.date };
    case "SET_USER": return { ...state, currentUser: action.user };
    case "SET_ROOM": return { ...state, roomCode: action.code.toUpperCase() };
    case "TREE_ACTION": {
      // Cây sống thật: trừ hao trước theo thời gian đã trôi qua, rồi mới cộng phần chăm mới
      const base = materializeDecay(state.tree);
      const t = { ...base }; const oldStage = getStage(t.xp).index;
      if (action.kind === "water") { t.water = Math.min(100, t.water + 15); t.xp += 10; }
      if (action.kind === "sun") { t.sun = Math.min(100, t.sun + 15); t.xp += 10; }
      if (action.kind === "love") { t.love = Math.min(100, t.love + 15); t.xp += 12; }
      if (action.kind === "bug") { t.xp += 8; t.water = Math.min(100, t.water + 3); t.sun = Math.min(100, t.sun + 3); t.love = Math.min(100, t.love + 3); }
      t.careCount += 1; t.lastCareAt = new Date().toISOString(); t.lastCareBy = action.user;
      const daily = { ...freshDaily(state) };
      daily[action.kind] += 1; if (action.user === "A") daily.caredA = true; else daily.caredB = true;
      // streak
      const td = today(); let streak = { ...state.streak };
      if (streak.lastDate !== td) {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        streak = { count: streak.lastDate === y ? streak.count + 1 : 1, lastDate: td };
      }
      const label = { water: "tưới nước 💧", sun: "tắm nắng ☀️", love: "bón tim 💖", bug: "bắt sâu 🐛" }[action.kind];
      let acts = pushAct(state, action.actor, `vừa ${label} cho cây (+${CARE_COINS[action.kind]} Xu Tim 🪙)`, { water: "💧", sun: "☀️", love: "💖", bug: "🐛" }[action.kind]);
      let letters = state.letters; let ach = state.achievements;
      if (action.combo) { ach = unlock(state, ["combo"]); acts = [{ id: uid(), actor: "Combo", text: `Song chăm! ${action.actor} + người thương cùng chăm cây ✨`, time: new Date().toISOString(), emoji: "✨" }, ...acts].slice(0, 40); }
      const newStage = getStage(t.xp).index;
      if (newStage > oldStage) acts = [{ id: uid(), actor: "Cây tình yêu", text: `đã LÊN CẤP thành "${getStage(t.xp).name}" 🎉`, time: new Date().toISOString(), emoji: "🎉" }, ...acts].slice(0, 40);
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: "Cây tình yêu", text: `vừa rơi ra một lá thư ${action.drop.rarity === "legendary" ? "HUYỀN THOẠI 👑" : action.drop.rarity === "rare" ? "HIẾM ✨" : ""} — bấm vào thư dưới gốc cây để mở!`, time: new Date().toISOString(), emoji: "💌" }, ...acts].slice(0, 40); }
      return checkAch({ ...state, tree: t, daily, streak, letters, achievements: ach, activities: acts, coins: state.coins + CARE_COINS[action.kind] });
    }
    case "OPEN_LETTER": {
      const target = state.letters.find((x) => x.id === action.id);
      if (!target || target.opened) return state;
      const letters = state.letters.map((l) => (l.id === action.id ? { ...l, opened: true, openedAt: new Date().toISOString(), openedBy: action.opener } : l));
      const gain = LETTER_COINS[target.rarity];
      return checkAch({ ...state, letters, coins: state.coins + gain, activities: pushAct(state, action.opener, `đã mở một lá thư ${target.rarity === "legendary" ? "Huyền thoại 👑" : target.rarity === "rare" ? "Hiếm ✨" : "tình yêu 💌"} (+${gain} Xu Tim 🪙)`, "💌") });
    }
    case "CLAIM_QUEST": {
      if (freshDaily(state).claimed.includes(action.questId)) return state;
      const daily = { ...freshDaily(state), claimed: [...freshDaily(state).claimed, action.questId] };
      const tree = { ...state.tree, xp: state.tree.xp + action.rewardXp };
      let acts = pushAct(state, action.actor, `hoàn thành nhiệm vụ ngày, nhận +${action.rewardXp} XP và +${QUEST_COINS} Xu Tim 🎁`, "🎁");
      let letters = state.letters;
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: "Nhiệm vụ", text: "thưởng một lá thư tình yêu 💌 dưới gốc cây!", time: new Date().toISOString(), emoji: "💌" }, ...acts].slice(0, 40); }
      return checkAch({ ...state, daily, tree, letters, activities: acts, coins: state.coins + QUEST_COINS });
    }
    case "ADD_XP": return { ...state, tree: { ...state.tree, xp: state.tree.xp + action.xp } };
    case "SET_MOOD": {
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, moods: { ...state.moods, [action.user]: action.mood, date: today() }, activities: pushAct(state, name, `đổi mood thành ${action.mood}`, action.mood) };
    }
    case "ADD_NOTE": return { ...state, notes: [action.note, ...state.notes], activities: pushAct(state, action.note.author, "đã dán một ghi chú mới", "📌") };
    case "DEL_NOTE": return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case "ADD_BUCKET": return { ...state, bucket: [...state.bucket, action.item] };
    case "TOGGLE_BUCKET": return { ...state, bucket: state.bucket.map((b) => (b.id === action.id ? { ...b, done: !b.done } : b)) };
    case "DEL_BUCKET": return { ...state, bucket: state.bucket.filter((b) => b.id !== action.id) };
    case "ANSWER": {
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, answers: { date: today(), A: state.answers.A, B: state.answers.B, [action.user]: action.text }, activities: pushAct(state, name, "đã trả lời câu hỏi hôm nay", "💬") };
    }
    case "BUY_ITEM": {
      const item = shopItem(action.itemId);
      if (state.inventory.includes(item.id) || state.coins < item.price) return state;
      const next = checkAch({
        ...state,
        coins: state.coins - item.price,
        inventory: [...state.inventory, item.id],
        equipped: { ...state.equipped, [item.category]: item.id },
        activities: pushAct(state, action.actor, `đã mua "${item.name}" ${item.emoji} ở cửa hàng vườn (-${item.price} Xu Tim)`, "🛍️"),
      });
      return next;
    }
    case "EQUIP_ITEM": {
      if (!state.inventory.includes(action.itemId)) return state;
      return { ...state, equipped: { ...state.equipped, [action.category]: action.itemId } };
    }
    case "LOVE_ACTION": {
      return {
        ...state,
        lastLoveAction: { kind: action.kind, emoji: action.emoji, label: action.label, by: action.user, actor: action.actor, at: new Date().toISOString() },
        activities: pushAct(state, action.actor, `vừa ${action.label} ${action.emoji}`, action.emoji),
      };
    }
    case "ADD_MEMORY": {
      return checkAch({ ...state, memories: [action.memory, ...state.memories], activities: pushAct(state, action.memory.author, `đã thêm kỷ niệm "${action.memory.title}"`, "📸") });
    }
    case "DEL_MEMORY": return { ...state, memories: state.memories.filter((m) => m.id !== action.id) };
    case "COMPLETE_ONBOARDING": {
      const firstTime = !state.everOnboarded;
      return {
        ...state,
        personA: action.a || state.personA, personB: action.b || state.personB,
        startDate: action.startDate || state.startDate, currentUser: action.user,
        roomCode: (action.roomCode || state.roomCode).toUpperCase(),
        onboarded: true, everOnboarded: true,
        coins: firstTime ? state.coins + ONBOARD_GIFT_COINS : state.coins,
        activities: pushAct(state, "Khu vườn", firstTime ? `chào mừng hai bạn đến với Khu Vườn Tình Yêu! Tặng +${ONBOARD_GIFT_COINS} Xu Tim làm quà 🎁` : "đã cập nhật thông tin khu vườn", "🎉"),
      };
    }
    case "REOPEN_ONBOARDING": return { ...state, onboarded: false };
    default: return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; connected: boolean }>({ state: defaultState, dispatch: () => {}, connected: false });
export function LoveProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, defaultState);
  const [connected, setConnected] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const syncRef = useRef<RealtimeSync | null>(null);
  const isRemote = useRef(false);
  const stateRef = useRef(state); stateRef.current = state;
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) rawDispatch({ type: "SET_STATE", state: normalizeState(JSON.parse(raw)) }); } catch {} setHydrated(true); }, []);
  // v2: tick mỗi phút để cây "sống thật" (chỉ số tự giảm theo thời gian) + áp dụng ngay khi mở app
  useEffect(() => {
    if (!hydrated) return;
    rawDispatch({ type: "TICK" });
    const iv = setInterval(() => rawDispatch({ type: "TICK" }), 60000);
    return () => clearInterval(iv);
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    const sync = new RealtimeSync(state.roomCode, (payload) => {
      const p = payload as { kind?: string; state?: AppState };
      if (p?.kind === "state" && p.state && p.state.roomCode === stateRef.current.roomCode) { isRemote.current = true; rawDispatch({ type: "SET_STATE", state: p.state }); }
    });
    sync.connect(); syncRef.current = sync; setConnected(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) { try { const s = JSON.parse(e.newValue) as AppState; if (s.roomCode === stateRef.current.roomCode) { isRemote.current = true; rawDispatch({ type: "SET_STATE", state: s }); } } catch {} }
      if (e.key === "love-app-sync" && e.newValue) { try { const { payload } = JSON.parse(e.newValue); if (payload?.kind === "state") { isRemote.current = true; rawDispatch({ type: "SET_STATE", state: payload.state }); } } catch {} }
    };
    window.addEventListener("storage", onStorage);
    return () => { sync.disconnect(); window.removeEventListener("storage", onStorage); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, state.roomCode]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    if (isRemote.current) { isRemote.current = false; return; }
    syncRef.current?.send({ kind: "state", state });
  }, [state, hydrated]);
  const dispatch: React.Dispatch<Action> = (a) => { rawDispatch(a); };
  return <Ctx.Provider value={{ state, dispatch, connected }}>{children}</Ctx.Provider>;
}
export function useLove() { return useContext(Ctx); }
export function myName(s: AppState) { return s.currentUser === "A" ? s.personA : s.personB; }

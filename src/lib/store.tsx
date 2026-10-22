"use client";
import React, { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { AppState, LoveLetter, defaultState, getStage, normalizeState, today, uid } from "./types";
import { RealtimeSync } from "./realtime";

export type Action =
  | { type: "SET_STATE"; state: AppState }
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
  | { type: "ANSWER"; user: "A" | "B"; text: string };

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
  return { ...s, achievements: unlock(s, ids) };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_STATE": return normalizeState(action.state);
    case "SET_NAMES": return { ...state, personA: action.a, personB: action.b };
    case "SET_START": return { ...state, startDate: action.date };
    case "SET_USER": return { ...state, currentUser: action.user };
    case "SET_ROOM": return { ...state, roomCode: action.code.toUpperCase() };
    case "TREE_ACTION": {
      const t = { ...state.tree }; const oldStage = getStage(t.xp).index;
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
      let acts = pushAct(state, action.actor, `vừa ${label} cho cây`, { water: "💧", sun: "☀️", love: "💖", bug: "🐛" }[action.kind]);
      let letters = state.letters; let ach = state.achievements;
      if (action.combo) { ach = unlock(state, ["combo"]); acts = [{ id: uid(), actor: "Combo", text: `Song chăm! ${action.actor} + người thương cùng chăm cây ✨`, time: new Date().toISOString(), emoji: "✨" }, ...acts].slice(0, 40); }
      const newStage = getStage(t.xp).index;
      if (newStage > oldStage) acts = [{ id: uid(), actor: "Cây tình yêu", text: `đã LÊN CẤP thành "${getStage(t.xp).name}" 🎉`, time: new Date().toISOString(), emoji: "🎉" }, ...acts].slice(0, 40);
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: "Cây tình yêu", text: `vừa rơi ra một lá thư ${action.drop.rarity === "legendary" ? "HUYỀN THOẠI 👑" : action.drop.rarity === "rare" ? "HIẾM ✨" : ""} — bấm vào thư dưới gốc cây để mở!`, time: new Date().toISOString(), emoji: "💌" }, ...acts].slice(0, 40); }
      return checkAch({ ...state, tree: t, daily, streak, letters, achievements: ach, activities: acts });
    }
    case "OPEN_LETTER": {
      const letters = state.letters.map((l) => (l.id === action.id ? { ...l, opened: true, openedAt: new Date().toISOString(), openedBy: action.opener } : l));
      const l = state.letters.find((x) => x.id === action.id);
      return checkAch({ ...state, letters, activities: l ? pushAct(state, action.opener, `đã mở một lá thư ${l.rarity === "legendary" ? "Huyền thoại 👑" : l.rarity === "rare" ? "Hiếm ✨" : "tình yêu 💌"}`, "💌") : state.activities });
    }
    case "CLAIM_QUEST": {
      if (state.daily.claimed.includes(action.questId)) return state;
      const daily = { ...freshDaily(state), claimed: [...freshDaily(state).claimed, action.questId] };
      const tree = { ...state.tree, xp: state.tree.xp + action.rewardXp };
      let acts = pushAct(state, action.actor, `hoàn thành nhiệm vụ ngày, nhận +${action.rewardXp} XP 🎁`, "🎁");
      let letters = state.letters;
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: "Nhiệm vụ", text: "thưởng một lá thư tình yêu 💌 dưới gốc cây!", time: new Date().toISOString(), emoji: "💌" }, ...acts].slice(0, 40); }
      return checkAch({ ...state, daily, tree, letters, activities: acts });
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
    return () => { sync.disconnect(); window.removeEventListener("storage", onStorage); };
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

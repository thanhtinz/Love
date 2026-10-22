import React, { createContext, useContext, useEffect, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, CARE_COINS, CARE_MILESTONES, CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, FRAME_XP_REWARD, LETTER_COINS, LOVE_ACTION_COOLDOWN_MS, LOVE_ACTION_DAILY_MAX, LoveLetter, MemoryItem, PersonId, QUEST_COINS, ShopCategory, dayKeyLocal, defaultState, freshDailyState, today, uid, weekKey, type FrameKind } from "./types";
import { CARE_BOOST_MS, MAX_PLOTS, careStatus, createPlant, materializePlant, normalizeStateV5, speciesById, stageInfo, totalCareCount, totalMaturedCount } from "./plants";
import { MAX_DAILY_SPINS, moodLabel, pickMessage, quizOfDay, shopItem } from "./data";
import { useAuth } from "./auth";
import { getSupabase } from "./supabase";

export type CareKind = "water" | "sun" | "love" | "bug";
export type Action =
  | { type: "SET_STATE"; state: AppState }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "SET_START"; date: string }
  | { type: "TREE_ACTION"; kind: CareKind; actor: string; user: "A" | "B"; plantId: string; drop?: LoveLetter | null; combo?: boolean }
  | { type: "PLANT_SEED"; speciesId: string; actor: string }
  | { type: "SELECT_PLANT"; plantId: string }
  | { type: "STAGE_UP"; plantId: string; drop?: LoveLetter | null }
  | { type: "HARVEST_FRUIT"; plantId: string; actor: string }
  | { type: "COLLECT_PLANT"; plantId: string; actor: string }
  | { type: "OPEN_LETTER"; id: string; opener: string }
  | { type: "ADD_LETTER"; letter: LoveLetter; actor: string; text: string }
  | { type: "CLAIM_QUEST"; questId: string; actor: string; user: "A" | "B"; rewardXp: number; drop?: LoveLetter | null }
  | { type: "SET_LOVE_NOTE"; user: "A" | "B"; text: string }
  | { type: "CLAIM_FRAME_REWARD"; frame: FrameKind }
  | { type: "ADD_XP"; xp: number }
  | { type: "ADD_COINS"; coins: number; actor: string; text: string }
  | { type: "SET_MOOD"; user: "A" | "B"; mood: string }
  | { type: "ADD_NOTE"; note: AppState["notes"][0] }
  | { type: "DEL_NOTE"; id: string }
  | { type: "ADD_BUCKET"; item: AppState["bucket"][0] }
  | { type: "TOGGLE_BUCKET"; id: string }
  | { type: "DEL_BUCKET"; id: string }
  | { type: "ANSWER"; user: "A" | "B"; text: string }
  | { type: "BUY_ITEM"; itemId: string; actor: string }
  | { type: "EQUIP_ITEM"; category: ShopCategory; itemId: string }
  | { type: "LOVE_ACTION"; kind: string; icon: string; label: string; actor: string; user: "A" | "B" }
  | { type: "ADD_MEMORY"; memory: MemoryItem }
  | { type: "DEL_MEMORY"; id: string }
  | { type: "SETUP_GARDEN"; gardenName: string; startDate: string }
  | { type: "SET_IDENTITY"; a: string; b: string; avatarA: string; avatarB: string; user: "A" | "B"; roomCode: string }
  // --- mini-game ---
  | { type: "HEART_SCORE"; user: "A" | "B"; score: number; actor: string }
  | { type: "SPIN_USE"; user: "A" | "B" }
  | { type: "QUIZ_ANSWER"; user: "A" | "B"; answers: number[]; actor: string };

function pushAct(s: AppState, actor: string, text: string, icon: string): AppState["activities"] {
  return [{ id: uid(), actor, text, icon, time: new Date().toISOString() }, ...s.activities].slice(0, 40);
}
function freshDaily(s: AppState): AppState["daily"] {
  const t = today();
  return s.daily.date === t ? s.daily : freshDailyState(t);
}
/**
 * Sang ngày mới (giờ địa phương): reset toàn bộ trạng thái "hôm nay" theo TỪNG NGƯỜI —
 * mood, đáp án câu hỏi ngày, lượt quay, quiz, lượt chơi bắt tim, thưởng khung, giới hạn yêu thương.
 * Trước đây các trường này không được reset theo ngày nên hiển thị trạng thái của hôm qua như hôm nay.
 */
function rollDay(s: AppState): AppState {
  const t = today();
  let out = s;
  if (out.moods.date !== t) out = { ...out, moods: { A: "", B: "", date: t } };
  if (out.answers.date !== t) out = { ...out, answers: { date: t, A: "", B: "" } };
  if (out.games.spin.date !== t) out = { ...out, games: { ...out.games, spin: { date: t, A: 0, B: 0 } } };
  if (out.games.quiz.date !== t) out = { ...out, games: { ...out.games, quiz: { date: t, A: [], B: [] } } };
  if (out.games.heartPlays.date !== t) out = { ...out, games: { ...out.games, heartPlays: { date: t, A: 0, B: 0 } } };
  if (out.frameRewards.date !== t) out = { ...out, frameRewards: { date: t, claimed: [] } };
  if (out.loveLimits.date !== t) out = { ...out, loveLimits: { date: t, counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } } };
  return out;
}
/** Chống spam thêm nội dung: cùng một người không thêm ghi chú/bucket/kỷ niệm 2 lần quá sát nhau. Trả về true nếu được phép. */
function contentAddAllowed(s: AppState, slot: PersonId | undefined, nowMs: number): boolean {
  if (!slot) return true; // dữ liệu cũ không có slot -> không chặn
  const last = s.contentLog[slot];
  if (!last) return true;
  return nowMs - new Date(last).getTime() >= CONTENT_ADD_MIN_INTERVAL_MS;
}
function unlock(s: AppState, ids: string[]): string[] {
  const set = new Set(s.achievements); ids.forEach((i) => set.add(i)); return [...set];
}
function checkAch(s: AppState): AppState {
  const ids: string[] = [];
  const totalCare = totalCareCount(s);
  if (totalCare >= 1) ids.push("first");
  if (totalCare >= 25) ids.push("care25");
  const loveTree = s.plants.filter((p) => p.speciesId === "love-tree").sort((a, b) => b.growthRecordedMs - a.growthRecordedMs)[0];
  if (loveTree) { const li = stageInfo(loveTree).index; if (li >= 5) ids.push("bloom"); if (li >= 6) ids.push("hearttree"); }
  if (totalMaturedCount(s) >= 1) ids.push("firstMature");
  const speciesSeen = new Set<string>([...s.plants.map((p) => p.speciesId), ...s.treeCollection.map((c) => c.speciesId)]);
  if (speciesSeen.size >= 3) ids.push("species3");
  if (s.plants.some((p) => (p.harvestCount || 0) >= 1) || s.treeCollection.some((c) => c.speciesId === "strawberry")) ids.push("harvest1");
  if (s.letters.filter((l) => l.opened).length >= 10) ids.push("collector10");
  if (s.streak.count >= 3) ids.push("streak3");
  if (s.daily.claimedA.length >= 3 || s.daily.claimedB.length >= 3) ids.push("questall");
  if (s.inventory.some((i) => !defaultState.inventory.includes(i))) ids.push("shopper");
  if (s.memories.length >= 3) ids.push("memories3");
  return { ...s, achievements: unlock(s, ids) };
}

export function makeLetter(rarity: LoveLetter["rarity"], source: string, ownedIds: number[]): LoveLetter {
  const msg = pickMessage(rarity, ownedIds);
  return { id: uid(), messageId: msg.id, rarity, source, opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" };
}

/**
 * Quyết định thư rơi khi chăm cây (giữ cơ chế web): lên giai đoạn nhờ tăng tốc -> chắc chắn rơi;
 * combo Song chăm (người kia chăm < 90 giây trước) -> Hiếm; mốc tổng lần chăm -> Hiếm; còn lại ~35%.
 */
export function decideCareDrop(state: AppState, plantId: string, kind: CareKind): { drop: LoveLetter | null; combo: boolean } {
  const plant = state.plants.find((p) => p.id === plantId);
  if (!plant) return { drop: null, combo: false };
  const me = state.currentUser;
  const other = me === "A" ? "B" : "A";
  const lastCarePlant = state.plants.reduce((acc, p) => (p.lastCareAt > (acc?.lastCareAt || "") ? p : acc), state.plants[0]);
  const combo = Boolean(lastCarePlant && lastCarePlant.lastCareBy === other && lastCarePlant.lastCareAt && Date.now() - new Date(lastCarePlant.lastCareAt).getTime() < 90000);
  const newCareTotal = totalCareCount(state) + 1;
  const isMilestone = CARE_MILESTONES.includes(newCareTotal);
  // Phải tính trên cây ĐÃ materialize theo thời gian thật; bản cũ lấy growthRecordedMs thô (chưa ghi sổ)
  // ghi đè lên kết quả materialize khiến việc dự đoán "lên giai đoạn nhờ boost" bị sai lệch.
  const mat = materializePlant(plant);
  const before = stageInfo(mat).index;
  const boosted = { ...mat, growthRecordedMs: mat.growthRecordedMs + (mat.matureAt ? 0 : CARE_BOOST_MS[kind]) };
  const afterIdx = stageInfo(boosted).index;
  const stageUp = afterIdx > before;
  const sp = speciesById(plant.speciesId);
  const ownedIds = state.letters.map((l) => l.messageId);
  let rarity: LoveLetter["rarity"] | null = null; let source = "";
  if (stageUp) {
    const r = Math.random();
    if (r < sp.stageLetterLegendary) { rarity = "legendary"; source = "Lên giai đoạn — khoảnh khắc huyền thoại"; }
    else if (r < sp.stageLetterLegendary + sp.stageLetterRare || sp.stageLetterRare >= 1) { rarity = "rare"; source = "Lên giai đoạn mới"; }
    else { rarity = "common"; source = "Lên giai đoạn mới"; }
    if (stageInfo(boosted).mature) { rarity = Math.random() < 0.5 ? "legendary" : rarity; source = "Cây trưởng thành"; }
  } else if (combo) { rarity = "rare"; source = "Combo Song chăm"; }
  else if (isMilestone) { rarity = "rare"; source = `Mốc ${newCareTotal} lần chăm`; }
  else if (Math.random() < 0.35) { rarity = before >= 4 && Math.random() < 0.18 ? "legendary" : "common"; source = "Rơi ngẫu nhiên khi chăm cây"; }
  return { drop: rarity ? makeLetter(rarity, source, ownedIds) : null, combo };
}

/** Mốc updatedAt mới nhất đã biết (từ bản ghi của mình hoặc bản nhận được) — hỗ trợ guard chống ghi đè ngược trong SET_STATE. */
let syncTs = "";

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET": syncTs = ""; return defaultState;
    case "SET_STATE": {
      const incoming = normalizeStateV5(action.state);
      // Chống ghi đè ngược: bản trạng thái CŨ hơn (theo updatedAt) không được đè lên bản mới đang có —
      // đây là lỗi khiến thao tác vừa làm bị realtime/upsert cũ kéo lùi lại.
      const localTs = Math.max(state.updatedAt ? Date.parse(state.updatedAt) || 0 : 0, syncTs ? Date.parse(syncTs) || 0 : 0);
      const incTs = incoming.updatedAt ? Date.parse(incoming.updatedAt) || 0 : 0;
      if (incTs && localTs && incTs < localTs) return state;
      if (incTs) syncTs = incoming.updatedAt as string;
      return checkAch(incoming);
    }
    case "TICK": {
      let changed = false;
      const plants = state.plants.map((p) => {
        const m = materializePlant(p);
        if (Math.abs(m.growthRecordedMs - p.growthRecordedMs) > 1000 || Math.abs(m.water - p.water) + Math.abs(m.sun - p.sun) + Math.abs(m.love - p.love) >= 0.5 || m.matureAt !== p.matureAt || m.fruitReadyAt !== p.fruitReadyAt) changed = true;
        return changed ? m : p;
      });
      const rolled = rollDay(state);
      const daily = freshDaily(rolled);
      if (!changed && daily === rolled.daily && rolled === state) return state;
      return { ...rolled, plants: changed ? plants : rolled.plants, daily };
    }
    case "SET_START": return { ...state, startDate: action.date };
    case "TREE_ACTION": {
      const idx = state.plants.findIndex((p) => p.id === action.plantId);
      if (idx < 0) return state;
      // Khóa cứng ở tầng store (không chỉ UI): cooldown 60s/người/cây + chăm vào chỉ số đã đầy thì vô hiệu.
      // Lần chăm vô hiệu: không boost, không thư, không Xu/XP, không tính nhiệm vụ.
      if (!careStatus(state.plants[idx], action.kind, action.user).ok) return state;
      const boost = CARE_BOOST_MS[action.kind];
      const base = materializePlant(state.plants[idx]);
      const p = { ...base };
      const xpGain = { water: 10, sun: 10, love: 12, bug: 8 }[action.kind];
      if (action.kind === "water") p.water = Math.min(100, p.water + 15);
      if (action.kind === "sun") p.sun = Math.min(100, p.sun + 15);
      if (action.kind === "love") p.love = Math.min(100, p.love + 15);
      if (action.kind === "bug") { p.water = Math.min(100, p.water + 3); p.sun = Math.min(100, p.sun + 3); p.love = Math.min(100, p.love + 3); }
      if (!p.matureAt) { p.growthRecordedMs += boost; p.totalBoostMs += boost; }
      p.careCount += 1; p.lastCareAt = new Date().toISOString(); p.lastCareBy = action.user;
      p.lastCareAtBy = { ...(p.lastCareAtBy || { A: "", B: "" }), [action.user]: p.lastCareAt };
      const boosted = materializePlant(p);
      const careStage = stageInfo(boosted).index;
      const afterCare = { ...boosted, announcedStage: Math.max(boosted.announcedStage, careStage) };
      const plants = state.plants.map((x, i) => (i === idx ? afterCare : x));
      const t = { ...state.tree, xp: state.tree.xp + xpGain, careCount: totalCareCount({ ...state, plants }), lastCareAt: new Date().toISOString(), lastCareBy: action.user };
      // Tiến độ nhiệm vụ tính RIÊNG cho người vừa chăm (trước đây cộng chung cả vườn)
      const daily = { ...freshDaily(state) };
      daily[action.user] = { ...daily[action.user], [action.kind]: daily[action.user][action.kind] + 1 };
      if (action.user === "A") daily.caredA = true; else daily.caredB = true;
      const td = today(); let streak = { ...state.streak };
      if (streak.lastDate !== td) {
        // "Hôm qua" theo giờ địa phương (bản cũ trừ theo UTC nên streak đứt/sai quanh nửa đêm giờ VN)
        const y = dayKeyLocal(new Date(Date.now() - 86400000));
        streak = { count: streak.lastDate === y ? streak.count + 1 : 1, lastDate: td };
      }
      const spName = speciesById(afterCare.speciesId).name;
      const label = { water: "tưới nước", sun: "tắm nắng", love: "bón tim", bug: "bắt sâu" }[action.kind];
      let acts = pushAct(state, action.actor, `vừa ${label} cho ${spName} (+${CARE_COINS[action.kind]} Xu Tim)`, { water: "water", sun: "sunny", love: "heart", bug: "bug" }[action.kind]);
      let letters = state.letters; let ach = state.achievements;
      if (action.combo) { ach = unlock(state, ["combo"]); acts = [{ id: uid(), actor: "Combo", text: `Song chăm! ${action.actor} + người thương cùng chăm cây`, icon: "sparkles", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: spName, text: `vừa rơi ra một lá thư ${action.drop.rarity === "legendary" ? "HUYỀN THOẠI" : action.drop.rarity === "rare" ? "HIẾM" : ""} — mở Hộp thư để đọc nhé!`, icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      return checkAch({ ...state, tree: t, plants, daily, streak, letters, achievements: ach, activities: acts, coins: state.coins + CARE_COINS[action.kind] });
    }
    case "PLANT_SEED": {
      if (state.plants.length >= MAX_PLOTS) return state;
      const sp = speciesById(action.speciesId);
      if (sp.lockMaturedCount > 0 && totalMaturedCount(state) < sp.lockMaturedCount) return state;
      if (state.coins < sp.seedPrice) return state;
      const plant = createPlant(sp.id);
      return checkAch({
        ...state,
        coins: state.coins - sp.seedPrice,
        plants: [...state.plants, plant],
        selectedPlantId: plant.id,
        activities: pushAct(state, action.actor, `vừa gieo hạt ${sp.name}${sp.seedPrice ? ` (-${sp.seedPrice} Xu Tim)` : ""}`, "leaf"),
      });
    }
    case "SELECT_PLANT": {
      if (!state.plants.some((p) => p.id === action.plantId) || state.selectedPlantId === action.plantId) return state;
      return { ...state, selectedPlantId: action.plantId };
    }
    case "STAGE_UP": {
      const idx = state.plants.findIndex((p) => p.id === action.plantId);
      if (idx < 0) return state;
      const m = materializePlant(state.plants[idx]);
      const info = stageInfo(m);
      if (info.index <= m.announcedStage) return state;
      const sp = speciesById(m.speciesId);
      const plants = state.plants.map((x, i) => (i === idx ? { ...m, announcedStage: info.index } : x));
      let acts = pushAct(state, sp.name, info.mature ? `đã TRƯỞNG THÀNH — đạt giai đoạn cuối "${info.stage.name}"` : `đã bước sang giai đoạn "${info.stage.name}"`, info.mature ? "gift" : "leaf");
      let letters = state.letters;
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: sp.name, text: "mừng lên giai đoạn rơi ra một lá thư — mở Hộp thư để đọc nhé!", icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      const t = { ...state.tree, xp: state.tree.xp + sp.stageXp };
      return checkAch({ ...state, plants, tree: t, letters, activities: acts });
    }
    case "HARVEST_FRUIT": {
      const idx = state.plants.findIndex((p) => p.id === action.plantId);
      if (idx < 0) return state;
      const m = materializePlant(state.plants[idx]);
      const sp = speciesById(m.speciesId);
      if (sp.fruitCycleMs <= 0 || !m.matureAt || !m.fruitReadyAt || Date.now() < new Date(m.fruitReadyAt).getTime()) return state;
      const harvested = { ...m, fruitReadyAt: new Date(Date.now() + sp.fruitCycleMs).toISOString(), harvestCount: (m.harvestCount || 0) + 1 };
      const t = { ...state.tree, xp: state.tree.xp + sp.fruitXp };
      return checkAch({
        ...state,
        plants: state.plants.map((x, i) => (i === idx ? harvested : x)),
        tree: t,
        coins: state.coins + sp.fruitCoins,
        activities: pushAct(state, action.actor, `vừa thu hoạch quả chín của ${sp.name} (+${sp.fruitCoins} Xu Tim, +${sp.fruitXp} XP)`, "gift"),
      });
    }
    case "COLLECT_PLANT": {
      const idx = state.plants.findIndex((p) => p.id === action.plantId);
      if (idx < 0) return state;
      const m = materializePlant(state.plants[idx]);
      const sp = speciesById(m.speciesId);
      if (!m.matureAt || sp.fruitCycleMs > 0) return state;
      const collected = { id: m.id, speciesId: m.speciesId, plantedAt: m.plantedAt, maturedAt: m.matureAt, collectedAt: new Date().toISOString(), careCount: m.careCount };
      const plants = state.plants.filter((_, i) => i !== idx);
      const t = { ...state.tree, xp: state.tree.xp + sp.matureRewardXp };
      return checkAch({
        ...state,
        plants,
        tree: t,
        selectedPlantId: state.selectedPlantId === m.id ? (plants[0]?.id || "") : state.selectedPlantId,
        treeCollection: [collected, ...state.treeCollection],
        coins: state.coins + sp.matureRewardCoins,
        activities: pushAct(state, action.actor, `đã thu ${sp.name} trưởng thành vào kỷ niệm (+${sp.matureRewardCoins} Xu Tim, +${sp.matureRewardXp} XP)`, "trophy"),
      });
    }
    case "OPEN_LETTER": {
      const target = state.letters.find((x) => x.id === action.id);
      if (!target || target.opened) return state;
      const letters = state.letters.map((l) => (l.id === action.id ? { ...l, opened: true, openedAt: new Date().toISOString(), openedBy: action.opener } : l));
      const gain = LETTER_COINS[target.rarity];
      return checkAch({ ...state, letters, coins: state.coins + gain, activities: pushAct(state, action.opener, `đã mở một lá thư ${target.rarity === "legendary" ? "Huyền thoại" : target.rarity === "rare" ? "Hiếm" : "tình yêu"} (+${gain} Xu Tim)`, "mail") });
    }
    case "ADD_LETTER": {
      return { ...state, letters: [action.letter, ...state.letters].slice(0, 100), activities: pushAct(state, action.actor, action.text, "mail") };
    }
    case "CLAIM_QUEST": {
      // Nhận thưởng theo TỪNG NGƯỜI + idempotent: mỗi người chỉ nhận 1 lần/nhiệm vụ/ngày,
      // bấm lại hay realtime đồng bộ lại cũng không cộng trùng.
      const cur = freshDaily(state);
      const myClaimed = action.user === "A" ? cur.claimedA : cur.claimedB;
      if (myClaimed.includes(action.questId)) return state;
      const daily = action.user === "A" ? { ...cur, claimedA: [...cur.claimedA, action.questId] } : { ...cur, claimedB: [...cur.claimedB, action.questId] };
      const tree = { ...state.tree, xp: state.tree.xp + action.rewardXp };
      let acts = pushAct(state, action.actor, `hoàn thành nhiệm vụ ngày, nhận +${action.rewardXp} XP và +${QUEST_COINS} Xu Tim`, "gift");
      let letters = state.letters;
      if (action.drop) { letters = [action.drop, ...state.letters].slice(0, 100); acts = [{ id: uid(), actor: "Nhiệm vụ", text: "thưởng một lá thư tình yêu!", icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      return checkAch({ ...state, daily, tree, letters, activities: acts, coins: state.coins + QUEST_COINS });
    }
    case "ADD_XP": return { ...state, tree: { ...state.tree, xp: state.tree.xp + action.xp } };
    case "ADD_COINS": return { ...state, coins: state.coins + action.coins, activities: pushAct(state, action.actor, action.text, "gift") };
    case "SET_MOOD": {
      const name = action.user === "A" ? state.personA : state.personB;
      // Sang ngày mới thì mood của NGƯỜI KIA hôm qua không được mang sang (trước đây chỉ ghi đè ngày + slot của mình)
      const base = state.moods.date === today() ? state.moods : { A: "", B: "", date: today() };
      return { ...state, moods: { ...base, [action.user]: action.mood, date: today() }, activities: pushAct(state, name, `đổi tâm trạng: ${moodLabel(action.mood)}`, "happy") };
    }
    case "ADD_NOTE": {
      if (action.note.text.length > CONTENT_LIMITS.note) return state;
      if (!contentAddAllowed(state, action.note.authorSlot, Date.now())) return state;
      const next = action.note.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.note.authorSlot]: new Date().toISOString() } } : state;
      return { ...next, notes: [action.note, ...state.notes], activities: pushAct(state, action.note.author, "đã dán một ghi chú mới", "document-text") };
    }
    case "DEL_NOTE": return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case "ADD_BUCKET": {
      if (action.item.text.length > CONTENT_LIMITS.bucket) return state;
      if (!contentAddAllowed(state, action.item.authorSlot, Date.now())) return state;
      const next = action.item.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.item.authorSlot]: new Date().toISOString() } } : state;
      return { ...next, bucket: [...state.bucket, action.item] };
    }
    case "TOGGLE_BUCKET": return { ...state, bucket: state.bucket.map((b) => (b.id === action.id ? { ...b, done: !b.done } : b)) };
    case "DEL_BUCKET": return { ...state, bucket: state.bucket.filter((b) => b.id !== action.id) };
    case "ANSWER": {
      // Đáp án RIÊNG từng người + niêm phong: đã trả lời hôm nay thì không ghi đè;
      // sang ngày mới phải bắt đầu từ hai ô trống (bản cũ mang đáp án hôm qua của cả hai sang ngày mới).
      const cur = state.answers.date === today() ? state.answers : { date: today(), A: "", B: "" };
      if (cur[action.user]) return state;
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, answers: { ...cur, date: today(), [action.user]: action.text }, activities: pushAct(state, name, "đã trả lời câu hỏi hôm nay", "chatbubble") };
    }
    case "SET_LOVE_NOTE": {
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, loveNotes: { ...state.loveNotes, [action.user]: action.text }, activities: pushAct(state, name, "đã cập nhật lời nhắn yêu thương", "heart") };
    }
    case "CLAIM_FRAME_REWARD": {
      // Mỗi khung chỉ +XP lần đầu trong ngày (idempotent theo ngày + loại khung)
      const t = today();
      const fr = state.frameRewards.date === t ? state.frameRewards : { date: t, claimed: [] as FrameKind[] };
      if (fr.claimed.includes(action.frame)) return state;
      return { ...state, frameRewards: { date: t, claimed: [...fr.claimed, action.frame] }, tree: { ...state.tree, xp: state.tree.xp + FRAME_XP_REWARD } };
    }
    case "BUY_ITEM": {
      const item = shopItem(action.itemId);
      // Idempotent: đã sở hữu hoặc không đủ Xu thì không trừ tiền lần hai
      if (state.inventory.includes(item.id) || state.coins < item.price) return state;
      return checkAch({
        ...state,
        coins: state.coins - item.price,
        inventory: [...state.inventory, item.id],
        equipped: { ...state.equipped, [item.category]: item.id },
        activities: pushAct(state, action.actor, `đã mua "${item.name}" ở cửa hàng vườn (-${item.price} Xu Tim)`, "bag-handle"),
      });
    }
    case "EQUIP_ITEM": {
      if (!state.inventory.includes(action.itemId)) return state;
      return { ...state, equipped: { ...state.equipped, [action.category]: action.itemId } };
    }
    case "LOVE_ACTION": {
      // Chống spam theo NGƯỜI GỬI: nghỉ 30 giây giữa 2 lần + tối đa 20 lần/ngày (khóa ở tầng store)
      const t = today();
      const lim = state.loveLimits.date === t ? state.loveLimits : { date: t, counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } };
      const lastAt = lim.lastAt[action.user];
      if (lastAt && Date.now() - new Date(lastAt).getTime() < LOVE_ACTION_COOLDOWN_MS) return state;
      if (lim.counts[action.user] >= LOVE_ACTION_DAILY_MAX) return state;
      const nowIso = new Date().toISOString();
      return {
        ...state,
        loveLimits: { date: t, counts: { ...lim.counts, [action.user]: lim.counts[action.user] + 1 }, lastAt: { ...lim.lastAt, [action.user]: nowIso } },
        lastLoveAction: { kind: action.kind, icon: action.icon, label: action.label, by: action.user, actor: action.actor, at: nowIso, memoAvatar: action.user === "A" ? state.avatarA : state.avatarB },
        activities: pushAct(state, action.actor, `vừa ${action.label}`, action.icon),
      };
    }
    case "ADD_MEMORY": {
      if (action.memory.title.length > CONTENT_LIMITS.memoryTitle || action.memory.desc.length > CONTENT_LIMITS.memoryDesc) return state;
      if (!contentAddAllowed(state, action.memory.authorSlot, Date.now())) return state;
      const next = action.memory.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.memory.authorSlot]: new Date().toISOString() } } : state;
      return checkAch({ ...next, memories: [action.memory, ...next.memories], activities: pushAct(next, action.memory.author, `đã thêm kỷ niệm "${action.memory.title}"`, "camera") });
    }
    case "DEL_MEMORY": return { ...state, memories: state.memories.filter((m) => m.id !== action.id) };
    case "SETUP_GARDEN": {
      const firstTime = !state.everOnboarded;
      return {
        ...state,
        gardenName: action.gardenName || state.gardenName,
        startDate: action.startDate || state.startDate,
        onboarded: true, everOnboarded: true,
        coins: firstTime ? state.coins + 30 : state.coins,
        activities: pushAct(state, "Khu vườn", firstTime ? `chào mừng hai bạn đến với "${action.gardenName || state.gardenName}"! Tặng +30 Xu Tim làm quà` : "đã cập nhật thông tin khu vườn", "gift"),
      };
    }
    case "SET_IDENTITY": {
      if (state.personA === action.a && state.personB === action.b && state.avatarA === action.avatarA && state.avatarB === action.avatarB && state.currentUser === action.user && state.roomCode === action.roomCode) return state;
      return { ...state, personA: action.a, personB: action.b, avatarA: action.avatarA, avatarB: action.avatarB, currentUser: action.user, roomCode: action.roomCode };
    }
    case "HEART_SCORE": {
      const wk = weekKey();
      const hb = state.games.heartBest.week === wk ? { ...state.games.heartBest } : { week: wk, A: 0, B: 0 };
      // Lượt chơi + điểm đều lưu RIÊNG theo từng người; lượt chơi luôn được ghi nhận kể cả khi không phá kỷ lục
      const t = today();
      const hp = state.games.heartPlays.date === t ? { ...state.games.heartPlays } : { date: t, A: 0, B: 0 };
      hp[action.user] += 1;
      const isRecord = action.score > hb[action.user];
      if (isRecord) hb[action.user] = action.score;
      const games = { ...state.games, heartBest: hb, heartPlays: hp };
      if (!isRecord) return { ...state, games };
      return { ...state, games, activities: pushAct(state, action.actor, `vừa lập kỷ lục Bắt tim bay tuần này: ${action.score} điểm`, "heart") };
    }
    case "SPIN_USE": {
      // Lượt quay RIÊNG từng người + khóa cứng ở store: tối đa MAX_DAILY_SPINS lượt tính phí/ngày/người
      const sp = state.games.spin.date === today() ? { ...state.games.spin } : { date: today(), A: 0, B: 0 };
      if (sp[action.user] >= MAX_DAILY_SPINS) return state;
      sp[action.user] += 1;
      return { ...state, games: { ...state.games, spin: sp } };
    }
    case "QUIZ_ANSWER": {
      // Đáp án niêm phong theo từng người: đã nộp đủ câu hôm nay thì KHÔNG ghi đè (bản cũ cho sửa đáp án sau khi nộp)
      const qz = state.games.quiz.date === today() ? { ...state.games.quiz } : { date: today(), A: [] as number[], B: [] as number[] };
      const need = quizOfDay().length;
      if (qz[action.user].length >= need) return state;
      if (!Array.isArray(action.answers) || action.answers.length !== need || action.answers.some((a) => a !== 0 && a !== 1)) return state;
      return { ...state, games: { ...state.games, quiz: { ...qz, [action.user]: action.answers } }, activities: pushAct(state, action.actor, "đã trả lời trắc nghiệm Hiểu ý nhau hôm nay", "help-circle") };
    }
    default: return state;
  }
}

/* ---------- Provider: persist AsyncStorage + Supabase room_state + Broadcast realtime ---------- */
const gardenKey = (coupleId: string) => `love-garden-${coupleId}`;
const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; connected: boolean; hydrated: boolean }>({ state: defaultState, dispatch: () => {}, connected: false, hydrated: false });
export function useLove() { return useContext(Ctx); }
export function myName(s: AppState) { return s.currentUser === "A" ? s.personA : s.personB; }

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const coupleId = auth.couple?.id ?? null;
  const [state, rawDispatch] = useReducer(reducer, defaultState);
  const [connected, setConnected] = React.useState(false);
  const [hydratedFor, setHydratedFor] = React.useState<string | null>(null);
  const scope = coupleId ?? "lobby";
  const hydrated = hydratedFor === scope;
  const isRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const stateRef = useRef(state);
  const stampedRef = useRef<AppState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial: AppState | null = null;
      if (coupleId) {
        const sb = getSupabase();
        try {
          const { data } = await sb.from("room_state").select("state").eq("couple_id", coupleId).maybeSingle();
          const remote = (data as { state?: AppState } | null)?.state;
          if (remote && Object.keys(remote).length > 0) initial = normalizeStateV5(remote);
        } catch { /* dùng cache local */ }
        if (!initial) {
          try { const raw = await AsyncStorage.getItem(gardenKey(coupleId)); if (raw) initial = normalizeStateV5(JSON.parse(raw)); } catch { /* bỏ qua */ }
        }
      }
      if (cancelled) return;
      // Reset trước khi nạp state của vườn mới để updatedAt của vườn cũ không chặn state vườn mới (guard trong SET_STATE)
      rawDispatch({ type: "RESET" });
      rawDispatch({ type: "SET_STATE", state: initial ?? defaultState });
      setHydratedFor(scope);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const refreshedScope = useRef<string | null>(null);
  useEffect(() => {
    // Tải lại thông tin thành viên 1 lần mỗi vườn: tên/avatar người kia đổi ở máy họ
    // sẽ xuất hiện ở máy mình (trước đây chỉ nạp lúc đăng nhập nên dễ hiện tên cũ -> gây lẫn lộn người)
    if (!hydrated || !auth.couple) return;
    if (refreshedScope.current === scope) return;
    refreshedScope.current = scope;
    auth.refreshCouple();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scope]);

  useEffect(() => {
    if (!hydrated || !auth.couple || !auth.user) return;
    const mA = auth.couple.members.find((m) => m.slot === "A");
    const mB = auth.couple.members.find((m) => m.slot === "B");
    rawDispatch({
      type: "SET_IDENTITY",
      a: mA?.displayName || "Bé A",
      b: mB?.displayName || "Người thương",
      avatarA: mA?.avatar || "svg-a",
      avatarB: mB?.avatar || "svg-b",
      user: auth.couple.mySlot,
      roomCode: auth.couple.code,
    });
  }, [hydrated, auth.couple, auth.user]);

  useEffect(() => {
    if (!hydrated) return;
    rawDispatch({ type: "TICK" });
    const iv = setInterval(() => rawDispatch({ type: "TICK" }), 30000);
    return () => clearInterval(iv);
  }, [hydrated]);

  /* Realtime: Supabase Broadcast channel theo couple id */
  useEffect(() => {
    if (!hydrated || !coupleId) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`love-room-${coupleId}`)
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const p = payload as { kind?: string; state?: AppState };
        if (p?.kind === "state" && p.state) {
          // Chống ghi đè ngược: payload mang updatedAt CŨ hơn trạng thái đang có (vd máy người kia
          // phát lại bản chưa kịp nhận thao tác mới nhất) thì bỏ qua, không kéo lùi dữ liệu.
          const incomingTs = p.state.updatedAt || "";
          const localTs = stampedRef.current.updatedAt || stateRef.current.updatedAt || "";
          if (incomingTs && localTs && incomingTs <= localTs) return;
          isRemote.current = true;
          rawDispatch({ type: "SET_STATE", state: p.state });
        }
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => { try { sb.removeChannel(channel); } catch { /* bỏ qua */ } channelRef.current = null; setConnected(false); };
  }, [hydrated, coupleId]);

  /* Lưu: cache AsyncStorage + broadcast + debounce upsert room_state.
     Mọi bản ghi đều đóng dấu updatedAt để phía nhận so sánh độ mới. */
  useEffect(() => {
    if (!hydrated || !coupleId) return;
    const stamped: AppState = { ...state, updatedAt: new Date().toISOString() };
    stampedRef.current = stamped;
    syncTs = stamped.updatedAt as string;
    AsyncStorage.setItem(gardenKey(coupleId), JSON.stringify(stamped)).catch(() => {});
    if (isRemote.current) { isRemote.current = false; return; }
    try { channelRef.current?.send({ type: "broadcast", event: "state", payload: { kind: "state", state: stamped } }); } catch { /* bỏ qua */ }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const sb = getSupabase();
      sb.from("room_state").upsert({ couple_id: coupleId, state: stampedRef.current, updated_at: new Date().toISOString() }).then(() => {}, () => {});
    }, 800);
  }, [state, hydrated, coupleId]);

  return <Ctx.Provider value={{ state, dispatch: rawDispatch, connected, hydrated }}>{children}</Ctx.Provider>;
}

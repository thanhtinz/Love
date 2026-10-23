import { AppState, CARE_COINS, CARE_MILESTONES, CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, EVENT_TITLE_MAX, EVENTS_MAX, FRAME_XP_REWARD, LETTER_COINS, LOVE_ACTION_COOLDOWN_MS, LOVE_ACTION_DAILY_MAX, LoveLetter, MemoryItem, PING_BURST_WINDOW_MS, PING_DAILY_MAX, PersonId, PresenceSlotState, CycleSlotState, ShopCategory, SpecialEvent, dayKeyLocal, defaultState, freshDailyState, isValidDateKey, today, uid, weekKey, type FrameKind } from "./types";
import { CARE_BOOST_MS, MAX_PLOTS, careStatus, createPlant, materializePlant, normalizeStateV5, speciesById, stageInfo, totalCareCount, totalMaturedCount, type Species } from "./plants";
import { MAX_DAILY_SPINS, QUESTS, decorItem, moodLabel, pickMessage, pickMessageSeeded, quizOfDay, seeded01, shopItem, type SpinKind } from "./data";
import { PET_CARE_REWARD_COINS, PET_CARE_REWARD_DAILY_MAX, petCareStatus, petNeedsAt, petStageIndex, type PetCareKind } from "./features";
import { mergeStates, stampSections } from "./merge";
import { nowIso } from "./time";

/**
 * Reducer THUẦN của khu vườn (không React/Supabase/AsyncStorage) — tách khỏi
 * store.tsx để kiểm chứng trực tiếp bằng Node (scripts/test-logic.mjs).
 * Mọi "khóa cứng" chống spam/lỗi logic phải nằm ở đây, không chỉ ở UI.
 */

export type CareKind = "water" | "sun" | "love" | "bug";
export type Action =
  | { type: "SET_STATE"; state: AppState }
  | { type: "MERGE_STATE"; state: AppState; mySlot?: PersonId }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "SET_START"; date: string }
  | { type: "TREE_ACTION"; kind: CareKind; actor: string; user: "A" | "B"; plantId: string; drop?: LoveLetter | null; combo?: boolean }
  | { type: "PLANT_SEED"; speciesId: string; actor: string }
  | { type: "SELECT_PLANT"; plantId: string }
  | { type: "STAGE_UP"; plantId: string; drop?: LoveLetter | null }
  | { type: "HARVEST_FRUIT"; plantId: string; actor: string }
  | { type: "COLLECT_PLANT"; plantId: string; actor: string }
  | { type: "OPEN_LETTER"; id: string; opener: string; openerSlot?: PersonId }
  | { type: "ADD_LETTER"; letter: LoveLetter; actor: string; text: string }
  | { type: "CLAIM_QUEST"; questId: string; actor: string; user: "A" | "B"; rewardXp: number; drop?: LoveLetter | null }
  | { type: "SET_LOVE_NOTE"; user: "A" | "B"; text: string }
  | { type: "CLAIM_FRAME_REWARD"; frame: FrameKind }
  | { type: "ADD_XP"; xp: number }
  | { type: "ADD_COINS"; coins: number; actor: string; text: string }
  | { type: "SET_MOOD"; user: "A" | "B"; mood: string }
  | { type: "ADD_NOTE"; note: AppState["notes"][0] }
  | { type: "DEL_NOTE"; id: string }
  | { type: "ADD_BUCKET"; item: AppState["bucket"][0]; force?: boolean }
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
  | { type: "HEART_PLAY"; user: "A" | "B" }
  | { type: "HEART_SCORE"; user: "A" | "B"; score: number; actor: string }
  | { type: "GAME_WIN"; game: "memory" | "dice"; user: "A" | "B"; actor: string }
  | { type: "SPIN_USE"; user: "A" | "B" }
  | { type: "SPIN_RESOLVE"; user: "A" | "B"; actor: string; kind: SpinKind; amount: number; letter?: LoveLetter | null; bucketItem?: AppState["bucket"][0] | null }
  | { type: "QUIZ_ANSWER"; user: "A" | "B"; answers: number[]; actor: string }
  // --- gói tính năng 2026-10-23 ---
  | { type: "PING_SEND"; user: "A" | "B"; actor: string }
  | { type: "PRESENCE_SET"; user: "A" | "B"; patch: Partial<PresenceSlotState> }
  | { type: "CYCLE_SET"; user: "A" | "B"; patch: Partial<CycleSlotState> }
  | { type: "BUY_DECOR"; itemId: string; actor: string }
  | { type: "EQUIP_DECOR"; itemId: string }
  | { type: "PET_CARE"; kind: PetCareKind; user: "A" | "B"; actor: string }
  | { type: "PET_RENAME"; name: string }
  | { type: "EVENT_ADD"; event: SpecialEvent }
  | { type: "EVENT_EDIT"; event: SpecialEvent }
  | { type: "EVENT_DEL"; id: string };

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
 */
function rollDay(s: AppState): AppState {
  const t = today();
  let out = s;
  if (out.moods.date !== t) out = { ...out, moods: { A: "", B: "", date: t } };
  if (out.answers.date !== t) out = { ...out, answers: { date: t, A: "", B: "" } };
  if (out.games.spin.date !== t) out = { ...out, games: { ...out.games, spin: { date: t, A: 0, B: 0 } } };
  if (out.games.quiz.date !== t) out = { ...out, games: { ...out.games, quiz: { date: t, A: [], B: [] } } };
  if (out.games.heartPlays.date !== t) out = { ...out, games: { ...out.games, heartPlays: { date: t, A: 0, B: 0 } } };
  if (out.games.dailyWins.date !== t) out = { ...out, games: { ...out.games, dailyWins: { date: t, memory: { A: 0, B: 0 }, dice: { A: 0, B: 0 } } } };
  if (out.frameRewards.date !== t) out = { ...out, frameRewards: { date: t, claimed: [] } };
  if (out.loveLimits.date !== t) out = { ...out, loveLimits: { date: t, counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } } };
  if (out.pings.day.date !== t) out = { ...out, pings: { ...out.pings, day: { date: t, A: 0, B: 0 } } };
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

/** Id các thông điệp đã sở hữu = bộ sưu tập bền vững HỢP hộp thư hiện tại (ép số). */
export function ownedMessageIds(state: AppState): number[] {
  return [...new Set([...(state.letterCollection ?? []), ...state.letters.map((l) => Number(l.messageId))])].filter((n) => Number.isFinite(n));
}

/**
 * Tạo thư XÁC ĐỊNH theo seedKey (không Math.random): mọi máy cùng seed + cùng pool đã
 * sở hữu (tới mức pool "chưa sở hữu" còn/không) cho ra cùng thông điệp. Dùng cho thư rơi
 * từ sự kiện CẢ HAI máy cùng phát hiện độc lập — trước đây mỗi máy rút ngẫu nhiên một
 * nội dung khác nhau dưới cùng một id xác định, merge giữ bản cục bộ nên nội dung lá thư
 * đó khác nhau VĨNH VIỄN giữa hai điện thoại.
 */
export function makeLetterDeterministic(rarity: LoveLetter["rarity"], source: string, ownedIds: number[], seedKey: string, id?: string): LoveLetter {
  const msg = pickMessageSeeded(rarity, ownedIds, seedKey);
  return { id: id ?? uid(), messageId: msg.id, rarity, source, opened: false, droppedAt: new Date().toISOString(), openedAt: "", openedBy: "" };
}

/**
 * Thư mừng LÊN GIAI ĐOẠN: id + độ hiếm + nội dung đều xác định theo (cây, giai đoạn) và
 * tỉ lệ của loài — 2 máy mở app thấy cây lên giai đoạn sẽ tạo ra CÙNG một lá thư.
 */
export function makeStageUpDrop(state: AppState, plantId: string, stageIndex: number, mature: boolean): LoveLetter | null {
  const plant = state.plants.find((p) => p.id === plantId);
  if (!plant) return null;
  const sp: Species = speciesById(plant.speciesId);
  const seed = `stageup-${plantId}-${stageIndex}`;
  if (seeded01(seed + ":drop") >= 0.7) return null; // 70% có thư — cùng kết quả trên mọi máy
  const r = seeded01(seed + ":rarity");
  let rarity: LoveLetter["rarity"] = r < sp.stageLetterLegendary ? "legendary" : r < sp.stageLetterLegendary + sp.stageLetterRare || sp.stageLetterRare >= 1 ? "rare" : "common";
  if (mature && seeded01(seed + ":mature") < 0.5) rarity = "legendary";
  return makeLetterDeterministic(rarity, mature ? "Cây trưởng thành" : "Lên giai đoạn mới", ownedMessageIds(state), seed, seed);
}

/**
 * Quyết định thư rơi khi chăm cây: lên giai đoạn nhờ tăng tốc -> chắc chắn rơi;
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
  const mat = materializePlant(plant);
  const before = stageInfo(mat).index;
  const boosted = { ...mat, growthRecordedMs: mat.growthRecordedMs + (mat.matureAt ? 0 : CARE_BOOST_MS[kind]) };
  const afterIdx = stageInfo(boosted).index;
  const stageUp = afterIdx > before;
  const sp = speciesById(plant.speciesId);
  const ownedIds = [...new Set([...(state.letterCollection ?? []), ...state.letters.map((l) => Number(l.messageId))])].filter((n) => Number.isFinite(n));
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

/** Thêm id vào tombstone của một danh sách (khử trùng, tối đa 500 id gần nhất). */
function withTombstone(s: AppState, key: "notes" | "bucket" | "memories" | "events", id: string): AppState["deletedIds"] {
  const cur = s.deletedIds ?? { notes: [], bucket: [], memories: [], events: [] };
  if (cur[key].includes(id)) return cur;
  return { ...cur, [key]: [...cur[key], id].slice(-500) };
}

/**
 * Chèn một lá thư vào hộp + ghi messageId vào bộ sưu tập BỀN VỮNG — dùng chung cho MỌI
 * đường thư rơi (chăm cây/lên giai đoạn/nhiệm vụ/vòng quay/thêm tay). Trước đây chỉ
 * OPEN_LETTER và ADD_LETTER ghi collection; thư rơi từ 3 đường còn lại không được ghi
 * nên khi hộp thư xoay vòng 100 lá, lá chưa mở bị đẩy ra là MẤT khỏi bộ sưu tập vĩnh viễn.
 */
function insertLetter(s: AppState, letter: LoveLetter): { letters: LoveLetter[]; letterCollection: number[] } {
  const mid = Number(letter.messageId);
  return {
    letters: s.letters.some((l) => l.id === letter.id) ? s.letters : [letter, ...s.letters].slice(0, 100),
    letterCollection: Number.isFinite(mid) ? [...new Set([...(s.letterCollection ?? []), mid])] : (s.letterCollection ?? []),
  };
}
/** Cap cứng số lượng nội dung — trước đây notes/bucket/memories phình vô hạn, mỗi lần
 *  đồng bộ phải gửi cả state phình theo (letters đã cap 100, activities 40). */
export const CONTENT_CAPS = { notes: 200, bucket: 200, memories: 300 };

/** Mốc updatedAt mới nhất đã áp dụng (kể cả bản vừa bị guard chặn) — hỗ trợ SET_STATE chống ghi đè ngược. */
let lastAppliedTs = "";

export function gardenReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET": lastAppliedTs = ""; return defaultState;
    case "SET_STATE": {
      const incoming = normalizeStateV5(action.state);
      // Chống ghi đè ngược: bản trạng thái CŨ hơn (theo updatedAt) không được đè lên bản mới đang có.
      const localTs = Math.max(state.updatedAt ? Date.parse(state.updatedAt) || 0 : 0, lastAppliedTs ? Date.parse(lastAppliedTs) || 0 : 0);
      const incTs = incoming.updatedAt ? Date.parse(incoming.updatedAt) || 0 : 0;
      if (incTs && localTs && incTs < localTs) return state;
      if (incTs) lastAppliedTs = incoming.updatedAt as string;
      return checkAch(incoming);
    }
    case "MERGE_STATE": {
      // Đồng bộ từ máy người kia: MERGE theo từng mục (lib/merge.ts) thay vì thắng/thua
      // toàn cục — thao tác của hai máy trên các mục khác nhau cùng được giữ lại.
      const incoming = normalizeStateV5(action.state);
      const merged = mergeStates(state, incoming, action.mySlot ?? state.currentUser);
      if (merged.updatedAt) lastAppliedTs = merged.updatedAt;
      return checkAch(merged);
    }
    case "TICK": {
      let changed = false;
      const plants = state.plants.map((p) => {
        const m = materializePlant(p);
        // Cờ đổi phải tính RIÊNG từng cây: bản cũ dùng một biến `changed` chung cho cả
        // map — cây đầu tiên đổi là mọi cây phía sau đều bị thay bằng bản materialize
        // (kể cả cây không đổi), làm state luôn "mới" và kích hoạt lưu/phát đồng bộ thừa.
        const ownChanged = Math.abs(m.growthRecordedMs - p.growthRecordedMs) > 1000 || Math.abs(m.water - p.water) + Math.abs(m.sun - p.sun) + Math.abs(m.love - p.love) >= 0.5 || m.matureAt !== p.matureAt || m.fruitReadyAt !== p.fruitReadyAt;
        if (ownChanged) changed = true;
        return ownChanged ? m : p;
      });
      const rolled = rollDay(state);
      const daily = freshDaily(rolled);
      if (!changed && daily === rolled.daily && rolled === state) return state;
      return { ...rolled, plants: changed ? plants : rolled.plants, daily };
    }
    case "SET_START": return isValidDateKey(action.date) ? { ...state, startDate: action.date } : state;
    case "TREE_ACTION": {
      const idx = state.plants.findIndex((p) => p.id === action.plantId);
      if (idx < 0) return state;
      // Khóa cứng ở tầng store: cooldown 60s/người/cây + chăm vào chỉ số đã đầy thì vô hiệu.
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
      // Tiến độ nhiệm vụ tính RIÊNG cho người vừa chăm
      const daily = { ...freshDaily(state) };
      daily[action.user] = { ...daily[action.user], [action.kind]: daily[action.user][action.kind] + 1 };
      if (action.user === "A") daily.caredA = true; else daily.caredB = true;
      const td = today(); let streak = { ...state.streak };
      if (streak.lastDate !== td) {
        const y = dayKeyLocal(new Date(Date.now() - 86400000));
        streak = { count: streak.lastDate === y ? streak.count + 1 : 1, lastDate: td };
      }
      const spName = speciesById(afterCare.speciesId).name;
      const label = { water: "tưới nước", sun: "tắm nắng", love: "bón tim", bug: "bắt sâu" }[action.kind];
      let acts = pushAct(state, action.actor, `vừa ${label} cho ${spName} (+${CARE_COINS[action.kind]} Xu Tim)`, { water: "water", sun: "sunny", love: "heart", bug: "bug" }[action.kind]);
      let letters = state.letters; let letterCollection = state.letterCollection; let ach = state.achievements;
      if (action.combo) { ach = unlock(state, ["combo"]); acts = [{ id: uid(), actor: "Combo", text: `Song chăm! ${action.actor} + người thương cùng chăm cây`, icon: "sparkles", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      if (action.drop) { const ins = insertLetter(state, action.drop); letters = ins.letters; letterCollection = ins.letterCollection; acts = [{ id: uid(), actor: spName, text: `vừa rơi ra một lá thư ${action.drop.rarity === "legendary" ? "HUYỀN THOẠI" : action.drop.rarity === "rare" ? "HIẾM" : ""} — mở Hộp thư để đọc nhé!`, icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      return checkAch({ ...state, tree: t, plants, daily, streak, letters, letterCollection, achievements: ach, activities: acts, coins: state.coins + CARE_COINS[action.kind] });
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
      const stagesCrossed = info.index - m.announcedStage;
      const plants = state.plants.map((x, i) => (i === idx ? { ...m, announcedStage: info.index } : x));
      let acts = pushAct(state, sp.name, info.mature ? `đã TRƯỞNG THÀNH — đạt giai đoạn cuối "${info.stage.name}"` : `đã bước sang giai đoạn "${info.stage.name}"`, info.mature ? "gift" : "leaf");
      let letters = state.letters; let letterCollection = state.letterCollection;
      if (action.drop) { const ins = insertLetter(state, action.drop); letters = ins.letters; letterCollection = ins.letterCollection; acts = [{ id: uid(), actor: sp.name, text: "mừng lên giai đoạn rơi ra một lá thư — mở Hộp thư để đọc nhé!", icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      // XP cộng theo SỐ GIAI ĐOẠN đã vượt: bản cũ chỉ cộng 1 lần stageXp dù cây nhảy
      // nhiều giai đoạn trong thời gian vắng mặt (mở app sau vài ngày -> mất XP các giai đoạn bị nhảy qua).
      const t = { ...state.tree, xp: state.tree.xp + sp.stageXp * stagesCrossed };
      return checkAch({ ...state, plants, tree: t, letters, letterCollection, activities: acts });
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
      const letters = state.letters.map((l) => (l.id === action.id ? { ...l, opened: true, openedAt: new Date().toISOString(), openedBy: action.opener, openedBySlot: action.openerSlot ?? l.openedBySlot } : l));
      const gain = LETTER_COINS[target.rarity];
      // Ghi id vào bộ sưu tập BỀN VỮNG (ép số: messageId legacy có thể là chuỗi) — thư bị
      // cắt khỏi hộp khi xoay vòng 100 lá vẫn giữ được trong bộ sưu tập.
      const mid = Number(target.messageId);
      const letterCollection = Number.isFinite(mid) ? [...new Set([...(state.letterCollection ?? []), mid])] : state.letterCollection;
      return checkAch({ ...state, letters, letterCollection, coins: state.coins + gain, activities: pushAct(state, action.opener, `đã mở một lá thư ${target.rarity === "legendary" ? "Huyền thoại" : target.rarity === "rare" ? "Hiếm" : "tình yêu"} (+${gain} Xu Tim)`, "mail") });
    }
    case "ADD_LETTER": {
      // Chống trùng thư khi cùng một sự kiện được phát hiện ở cả 2 máy (id xác định, vd stageup-...)
      if (state.letters.some((l) => l.id === action.letter.id)) return state;
      const mid = Number(action.letter.messageId);
      const letterCollection = Number.isFinite(mid) ? [...new Set([...(state.letterCollection ?? []), mid])] : state.letterCollection;
      return { ...state, letters: [action.letter, ...state.letters].slice(0, 100), letterCollection, activities: pushAct(state, action.actor, action.text, "mail") };
    }
    case "CLAIM_QUEST": {
      // Nhận thưởng theo TỪNG NGƯỜI + idempotent. Toàn bộ điều kiện + phần thưởng lấy từ
      // BẢNG QUESTS ở tầng store — bản cũ tin hoàn toàn UI (không kiểm tiến độ, rewardXp do
      // màn hình truyền lên) nên dispatch thẳng là nhận được Xu/XP dù chưa làm nhiệm vụ.
      const quest = QUESTS.find((q) => q.id === action.questId);
      if (!quest) return state;
      const cur = freshDaily(state);
      const myClaimed = action.user === "A" ? cur.claimedA : cur.claimedB;
      if (myClaimed.includes(quest.id)) return state;
      const progress = quest.key === "water" ? cur[action.user].water
        : quest.key === "love" ? cur[action.user].love
        : (cur.caredA ? 1 : 0) + (cur.caredB ? 1 : 0);
      if (progress < quest.target) return state;
      const daily = action.user === "A" ? { ...cur, claimedA: [...cur.claimedA, quest.id] } : { ...cur, claimedB: [...cur.claimedB, quest.id] };
      const tree = { ...state.tree, xp: state.tree.xp + quest.rewardXp };
      let acts = pushAct(state, action.actor, `hoàn thành nhiệm vụ ngày, nhận +${quest.rewardXp} XP và +${quest.rewardCoins} Xu Tim`, "gift");
      let letters = state.letters; let letterCollection = state.letterCollection;
      if (action.drop && !state.letters.some((l) => l.id === action.drop!.id)) { const ins = insertLetter(state, action.drop); letters = ins.letters; letterCollection = ins.letterCollection; acts = [{ id: uid(), actor: "Nhiệm vụ", text: "thưởng một lá thư tình yêu!", icon: "mail", time: new Date().toISOString() }, ...acts].slice(0, 40); }
      return checkAch({ ...state, daily, tree, letters, letterCollection, activities: acts, coins: state.coins + quest.rewardCoins });
    }
    case "ADD_XP": {
      if (!Number.isFinite(action.xp)) return state;
      return { ...state, tree: { ...state.tree, xp: Math.max(0, state.tree.xp + action.xp) } };
    }
    case "ADD_COINS": {
      if (!Number.isFinite(action.coins)) return state;
      return { ...state, coins: Math.max(0, state.coins + action.coins), activities: pushAct(state, action.actor, action.text, "gift") };
    }
    case "SET_MOOD": {
      // No-op khi chọn lại đúng mood hiện tại của hôm nay: bản cũ vẫn ghi activity
      // "đổi tâm trạng" + phát đồng bộ cho một thao tác không thay đổi gì.
      if (state.moods.date === today() && state.moods[action.user] === action.mood) return state;
      const name = action.user === "A" ? state.personA : state.personB;
      const base = state.moods.date === today() ? state.moods : { A: "", B: "", date: today() };
      return { ...state, moods: { ...base, [action.user]: action.mood, date: today() }, activities: pushAct(state, name, `đổi tâm trạng: ${moodLabel(action.mood)}`, "happy") };
    }
    case "ADD_NOTE": {
      if (action.note.text.length > CONTENT_LIMITS.note) return state;
      if ((state.deletedIds?.notes ?? []).includes(action.note.id)) return state; // id đã bị xoá (tombstone) — không cho hồi sinh qua đồng bộ trễ
      if (!contentAddAllowed(state, action.note.authorSlot, Date.now())) return state;
      if (state.notes.length >= CONTENT_CAPS.notes) return state; // cap cứng — notes thêm mới nhất lên đầu
      const next = action.note.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.note.authorSlot]: new Date().toISOString() } } : state;
      return { ...next, notes: [action.note, ...state.notes].slice(0, CONTENT_CAPS.notes), activities: pushAct(state, action.note.author, "đã dán một ghi chú mới", "document-text") };
    }
    case "DEL_NOTE": return { ...state, notes: state.notes.filter((n) => n.id !== action.id), deletedIds: withTombstone(state, "notes", action.id) };
    case "ADD_BUCKET": {
      if (action.item.text.length > CONTENT_LIMITS.bucket) return state;
      if ((state.deletedIds?.bucket ?? []).includes(action.item.id)) return state; // tombstone
      // force = nội dung do HỆ THỐNG tạo (nhiệm vụ từ Vòng quay): vẫn giới hạn độ dài nhưng
      // không bị cổng 5 giây nuốt mất — bản cũ nhiệm vụ quay trúng có thể biến mất lặng lẽ
      // nếu người dùng vừa thêm bucket thủ công trước đó chưa đầy 5 giây.
      if (!action.force && !contentAddAllowed(state, action.item.authorSlot, Date.now())) return state;
      if (state.bucket.length >= CONTENT_CAPS.bucket) return state; // cap cứng — bucket thêm ở cuối
      const next = !action.force && action.item.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.item.authorSlot]: new Date().toISOString() } } : state;
      return { ...next, bucket: [...state.bucket, action.item].slice(-CONTENT_CAPS.bucket) };
    }
    case "TOGGLE_BUCKET": return { ...state, bucket: state.bucket.map((b) => (b.id === action.id ? { ...b, done: !b.done, doneAt: new Date().toISOString() } : b)) };
    case "DEL_BUCKET": return { ...state, bucket: state.bucket.filter((b) => b.id !== action.id), deletedIds: withTombstone(state, "bucket", action.id) };
    case "ANSWER": {
      // Đáp án RIÊNG từng người + niêm phong; độ dài cũng khóa ở store (UI đã maxLength 300).
      if (action.text.length > 300) return state;
      const cur = state.answers.date === today() ? state.answers : { date: today(), A: "", B: "" };
      if (cur[action.user]) return state;
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, answers: { ...cur, date: today(), [action.user]: action.text }, activities: pushAct(state, name, "đã trả lời câu hỏi hôm nay", "chatbubble") };
    }
    case "SET_LOVE_NOTE": {
      if (action.text.length > CONTENT_LIMITS.note) return state;
      // No-op khi lưu lại y nguyên: tránh spam nhật ký "đã cập nhật lời nhắn" mỗi lần bấm Lưu.
      if (state.loveNotes[action.user] === action.text) return state;
      const name = action.user === "A" ? state.personA : state.personB;
      return { ...state, loveNotes: { ...state.loveNotes, [action.user]: action.text }, activities: pushAct(state, name, "đã cập nhật lời nhắn yêu thương", "heart") };
    }
    case "CLAIM_FRAME_REWARD": {
      const t = today();
      const fr = state.frameRewards.date === t ? state.frameRewards : { date: t, claimed: [] as FrameKind[] };
      if (fr.claimed.includes(action.frame)) return state;
      return { ...state, frameRewards: { date: t, claimed: [...fr.claimed, action.frame] }, tree: { ...state.tree, xp: state.tree.xp + FRAME_XP_REWARD } };
    }
    case "BUY_ITEM": {
      const item = shopItem(action.itemId);
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
      // Khóa cả LOẠI: bản cũ chỉ kiểm "đã sở hữu" — dispatch EQUIP_ITEM với category khác
      // loại thật của món đồ (vd nhét chậu vào ô khung cảnh) là lọt qua store.
      if (shopItem(action.itemId).category !== action.category) return state;
      return { ...state, equipped: { ...state.equipped, [action.category]: action.itemId } };
    }
    case "LOVE_ACTION": {
      const t = today();
      const lim = state.loveLimits.date === t ? state.loveLimits : { date: t, counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } };
      const lastAt = lim.lastAt[action.user];
      if (lastAt && Date.now() - new Date(lastAt).getTime() < LOVE_ACTION_COOLDOWN_MS) return state;
      if (lim.counts[action.user] >= LOVE_ACTION_DAILY_MAX) return state;
      const nowStamp = new Date().toISOString();
      return {
        ...state,
        loveLimits: { date: t, counts: { ...lim.counts, [action.user]: lim.counts[action.user] + 1 }, lastAt: { ...lim.lastAt, [action.user]: nowStamp } },
        lastLoveAction: { kind: action.kind, icon: action.icon, label: action.label, by: action.user, actor: action.actor, at: nowStamp, memoAvatar: action.user === "A" ? state.avatarA : state.avatarB },
        // Hoạt động ghi kèm SLOT người gửi: dòng hoạt động ở màn Hành động yêu thương
        // trước đây suy ngược người gửi từ TÊN hiển thị — trùng tên/đổi tên là gán nhầm người.
        activities: [{ id: uid(), actor: action.actor, text: `vừa ${action.label}`, icon: action.icon, time: nowStamp, slot: action.user }, ...state.activities].slice(0, 40),
      };
    }
    case "ADD_MEMORY": {
      if (action.memory.title.length > CONTENT_LIMITS.memoryTitle || action.memory.desc.length > CONTENT_LIMITS.memoryDesc) return state;
      if ((state.deletedIds?.memories ?? []).includes(action.memory.id)) return state; // tombstone
      if (!contentAddAllowed(state, action.memory.authorSlot, Date.now())) return state;
      if (state.memories.length >= CONTENT_CAPS.memories) return state; // cap cứng — kỷ niệm mới nhất lên đầu
      const next = action.memory.authorSlot ? { ...state, contentLog: { ...state.contentLog, [action.memory.authorSlot]: new Date().toISOString() } } : state;
      return checkAch({ ...next, memories: [action.memory, ...next.memories].slice(0, CONTENT_CAPS.memories), activities: pushAct(next, action.memory.author, `đã thêm kỷ niệm "${action.memory.title}"`, "camera") });
    }
    case "DEL_MEMORY": return { ...state, memories: state.memories.filter((m) => m.id !== action.id), deletedIds: withTombstone(state, "memories", action.id) };
    case "SETUP_GARDEN": {
      const firstTime = !state.everOnboarded;
      return {
        ...state,
        gardenName: action.gardenName || state.gardenName,
        // Ngày không tồn tại (vd 2025-02-31) bị bỏ qua ở tầng store — không phụ thuộc UI validate.
        startDate: isValidDateKey(action.startDate) ? action.startDate : state.startDate,
        onboarded: true, everOnboarded: true,
        coins: firstTime ? state.coins + 30 : state.coins,
        activities: pushAct(state, "Khu vườn", firstTime ? `chào mừng hai bạn đến với "${action.gardenName || state.gardenName}"! Tặng +30 Xu Tim làm quà` : "đã cập nhật thông tin khu vườn", "gift"),
      };
    }
    case "SET_IDENTITY": {
      if (state.personA === action.a && state.personB === action.b && state.avatarA === action.avatarA && state.avatarB === action.avatarB && state.currentUser === action.user && state.roomCode === action.roomCode) return state;
      return { ...state, personA: action.a, personB: action.b, avatarA: action.avatarA, avatarB: action.avatarB, currentUser: action.user, roomCode: action.roomCode };
    }
    case "HEART_PLAY": {
      // Lượt chơi ghi nhận ngay khi BẮT ĐẦU vòng: bản cũ chỉ cộng lượt trong HEART_SCORE
      // (khi vòng kết thúc) nên bỏ ngang giữa vòng = 0 lượt đã ghi — chơi lại thoải mái
      // tới khi được điểm cao thì mới "tính", qua mặt giới hạn lượt + thưởng lần đầu ngày.
      const t = today();
      const hp = state.games.heartPlays.date === t ? { ...state.games.heartPlays } : { date: t, A: 0, B: 0 };
      hp[action.user] += 1;
      return { ...state, games: { ...state.games, heartPlays: hp } };
    }
    case "HEART_SCORE": {
      if (!Number.isFinite(action.score) || action.score < 0) return state;
      const wk = weekKey();
      const hb = state.games.heartBest.week === wk ? { ...state.games.heartBest } : { week: wk, A: 0, B: 0 };
      // Lượt chơi do HEART_PLAY ghi khi bắt đầu vòng — ở đây chỉ còn kỷ lục tuần.
      const isRecord = action.score > hb[action.user];
      if (isRecord) hb[action.user] = action.score;
      const games = { ...state.games, heartBest: hb };
      if (!isRecord) return { ...state, games };
      return { ...state, games, activities: pushAct(state, action.actor, `vừa lập kỷ lục Bắt tim bay tuần này: ${action.score} điểm`, "heart") };
    }
    case "GAME_WIN": {
      // Thưởng thắng game ngày: TỐI ĐA 1 lần/người/game/ngày, khóa cứng ở store.
      // memory: +20 Xu +10 XP · dice: +15 Xu +10 XP (XP vào XP vườn chung như ADD_XP).
      const t = today();
      const cur = state.games.dailyWins.date === t
        ? { date: t, memory: { ...state.games.dailyWins.memory }, dice: { ...state.games.dailyWins.dice } }
        : { date: t, memory: { A: 0, B: 0 }, dice: { A: 0, B: 0 } };
      if (cur[action.game][action.user] >= 1) return state;
      cur[action.game][action.user] += 1;
      const reward = action.game === "memory" ? { coins: 20, xp: 10 } : { coins: 15, xp: 10 };
      const gameName = action.game === "memory" ? "Ghép cặp ký ức" : "Xúc xắc hẹn hò";
      return checkAch({
        ...state,
        games: { ...state.games, dailyWins: cur },
        coins: state.coins + reward.coins,
        tree: { ...state.tree, xp: state.tree.xp + reward.xp },
        activities: pushAct(state, action.actor, `thắng ${gameName} — nhận thưởng ngày (+${reward.coins} Xu Tim, +${reward.xp} XP)`, "trophy"),
      });
    }
    case "SPIN_USE": {
      const sp = state.games.spin.date === today() ? { ...state.games.spin } : { date: today(), A: 0, B: 0 };
      if (sp[action.user] >= MAX_DAILY_SPINS) return state;
      sp[action.user] += 1;
      return { ...state, games: { ...state.games, spin: sp } };
    }
    case "SPIN_RESOLVE": {
      // Vòng quay NGUYÊN TỬ: trừ lượt + trao thưởng trong MỘT lần chuyển trạng thái.
      // Bản cũ dispatch SPIN_USE rồi mới dispatch thưởng riêng (ADD_COINS/ADD_XP/
      // ADD_LETTER/ADD_BUCKET) sau animation — tắt app giữa chừng hoặc một bản đồng bộ
      // chen vào giữa hai dispatch là lượt quay và phần thưởng lệch nhau vĩnh viễn.
      const t = today();
      const sp = state.games.spin.date === t ? { ...state.games.spin } : { date: t, A: 0, B: 0 };
      const freeSpin = action.kind === "again"; // ô "Thêm lượt": lượt này không bị trừ (giữ ngữ nghĩa cũ)
      if (!freeSpin) {
        if (sp[action.user] >= MAX_DAILY_SPINS) return state; // hết lượt: không thưởng gì cả
        sp[action.user] += 1;
      }
      let next: AppState = { ...state, games: { ...state.games, spin: sp } };
      if (action.kind === "coins") {
        const amt = Number.isFinite(action.amount) ? Math.max(0, Math.floor(action.amount)) : 0;
        next = { ...next, coins: next.coins + amt, activities: pushAct(next, action.actor, `quay Vòng quay yêu thương trúng +${amt} Xu Tim`, "gift") };
      } else if (action.kind === "xp") {
        const amt = Number.isFinite(action.amount) ? Math.max(0, Math.floor(action.amount)) : 0;
        next = { ...next, tree: { ...next.tree, xp: next.tree.xp + amt } };
      } else if (action.kind === "letter-common" || action.kind === "letter-rare") {
        const letter = action.letter;
        if (letter && !next.letters.some((l) => l.id === letter.id)) {
          const mid = Number(letter.messageId);
          const letterCollection = Number.isFinite(mid) ? [...new Set([...(next.letterCollection ?? []), mid])] : next.letterCollection;
          next = { ...next, letters: [letter, ...next.letters].slice(0, 100), letterCollection, activities: pushAct(next, action.actor, "vừa quay Vòng quay yêu thương và nhận một lá thư", "mail") };
        }
      } else if (action.kind === "mission") {
        const item = action.bucketItem;
        if (item && item.text.length <= CONTENT_LIMITS.bucket && !(next.deletedIds?.bucket ?? []).includes(item.id) && !next.bucket.some((b) => b.id === item.id)) {
          next = { ...next, bucket: [...next.bucket, item] };
        }
      }
      return next;
    }
    case "QUIZ_ANSWER": {
      const qz = state.games.quiz.date === today() ? { ...state.games.quiz } : { date: today(), A: [] as number[], B: [] as number[] };
      const need = quizOfDay().length;
      if (qz[action.user].length >= need) return state;
      if (!Array.isArray(action.answers) || action.answers.length !== need || action.answers.some((a) => a !== 0 && a !== 1)) return state;
      return { ...state, games: { ...state.games, quiz: { ...qz, [action.user]: action.answers } }, activities: pushAct(state, action.actor, "đã trả lời trắc nghiệm Hiểu ý nhau hôm nay", "help-circle") };
    }
    case "PING_SEND": {
      // "Nhớ bạn" nhịp tim — khóa cứng TRẦN 50 nhịp/ngày/người tại store (như LOVE_ACTION);
      // KHÔNG gắn Xu/XP: ping là cảm xúc thuần, gắn thưởng là bị farm ngay (kế hoạch Hạng 1).
      const t = today();
      const day = state.pings.day.date === t ? state.pings.day : { date: t, A: 0, B: 0 };
      if (day[action.user] >= PING_DAILY_MAX) return state;
      const nowMs = Date.now();
      const nowStr = new Date(nowMs).toISOString();
      const prev = state.pings[action.user];
      // Chạm liên tục <= 5 giây = cùng một CHUỖI nhịp (chất Jagat Miss You); chuỗi mới
      // cập nhật lastBurstAt — phía người nhận chỉ bật hiệu ứng theo lastBurstAt + cooldown 30s.
      const chained = Boolean(prev.lastAt) && nowMs - new Date(prev.lastAt).getTime() <= PING_BURST_WINDOW_MS;
      const burst = chained ? prev.burst + 1 : 1;
      const slot = { total: prev.total + 1, lastAt: nowStr, lastBurstAt: burst === 1 ? nowStr : prev.lastBurstAt, burst };
      const pings = { ...state.pings, day: { ...day, [action.user]: day[action.user] + 1 }, [action.user]: slot };
      // Nhật ký hoạt động chỉ ghi khi BẮT ĐẦU chuỗi (chạm dồn 20 lần không spam 20 dòng).
      const activities = burst === 1 ? pushAct(state, action.actor, "vừa gửi một nhịp tim nhớ bạn", "heart") : state.activities;
      return { ...state, pings, activities };
    }
    case "PRESENCE_SET": {
      // Snapshot hiện diện của CHÍNH chủ slot: chỉ nhận số hữu hạn trong miền hợp lệ;
      // patch không đổi gì -> no-op (mở app chụp lại cùng toạ độ/pin không phát đồng bộ thừa).
      const cur = state.presence[action.user];
      const patch = action.patch;
      const next = { ...cur };
      if (typeof patch.shareBattery === "boolean") next.shareBattery = patch.shareBattery;
      if (typeof patch.shareLocation === "boolean") next.shareLocation = patch.shareLocation;
      if (patch.lat !== undefined) {
        if (patch.lat !== null && (!Number.isFinite(patch.lat) || patch.lat < -90 || patch.lat > 90)) return state;
        next.lat = patch.lat === null ? null : Math.round(patch.lat * 100000) / 100000;
      }
      if (patch.lng !== undefined) {
        if (patch.lng !== null && (!Number.isFinite(patch.lng) || patch.lng < -180 || patch.lng > 180)) return state;
        next.lng = patch.lng === null ? null : Math.round(patch.lng * 100000) / 100000;
      }
      if (patch.acc !== undefined) next.acc = patch.acc === null || !Number.isFinite(patch.acc) || patch.acc < 0 ? null : Math.round(patch.acc);
      if (patch.battery !== undefined) next.battery = patch.battery === null || !Number.isFinite(patch.battery) ? null : Math.max(0, Math.min(100, Math.round(patch.battery)));
      if (typeof patch.at === "string") next.at = patch.at;
      if (JSON.stringify(next) === JSON.stringify(cur)) return state;
      return { ...state, presence: { ...state.presence, [action.user]: next } };
    }
    case "CYCLE_SET": {
      // Chu kỳ của CHÍNH chủ slot. Điều kiện cứng của kế hoạch Hạng 3: ngày bắt đầu kỳ
      // chỉ sửa tối đa 1 LẦN/NGÀY (dự đoán không bị nhiễu bởi sửa liên tục); độ dài
      // bị kẹp trong miền hợp lệ ở store, không tin UI.
      const cur = state.cycle[action.user];
      const patch: Partial<CycleSlotState> = { ...action.patch };
      const t = today();
      if (patch.lastStart !== undefined && patch.lastStart !== cur.lastStart) {
        if (patch.lastStart !== "" && !isValidDateKey(patch.lastStart)) return state;
        if (cur.startEditDate === t) delete patch.lastStart; // đã sửa hôm nay rồi — bỏ qua riêng trường này
        else patch.startEditDate = t;
      }
      if (patch.cycleLen !== undefined) patch.cycleLen = Math.max(21, Math.min(35, Math.round(patch.cycleLen) || cur.cycleLen));
      if (patch.periodLen !== undefined) patch.periodLen = Math.max(3, Math.min(8, Math.round(patch.periodLen) || cur.periodLen));
      if (patch.share !== undefined) patch.share = patch.share === true;
      const next: CycleSlotState = { ...cur, ...patch, updatedAt: new Date().toISOString() };
      const { updatedAt: _u1, ...nextCmp } = next;
      const { updatedAt: _u2, ...curCmp } = cur;
      if (JSON.stringify(nextCmp) === JSON.stringify(curCmp)) return state;
      return { ...state, cycle: { ...state.cycle, [action.user]: next } };
    }
    case "BUY_DECOR": {
      // Mua đồ decor bằng Xu Tim — cùng luật BUY_ITEM (đã sở hữu/không đủ tiền -> từ chối);
      // mua xong TRANG BỊ NGAY như đồ shop thường; vật đặt chỉ tự đặt khi còn khe trống.
      const item = decorItem(action.itemId);
      if (!item || state.decor.owned.includes(item.id) || state.coins < item.price) return state;
      const decor = { ...state.decor, owned: [...state.decor.owned, item.id], placed: [...state.decor.placed] };
      if (item.category === "scene") decor.sceneBg = item.id;
      else if (item.category === "fence") decor.fence = item.id;
      else if (item.category === "path") decor.path = item.id;
      else if (decor.placed.length < 3) decor.placed = [...decor.placed, item.id];
      return {
        ...state,
        coins: state.coins - item.price,
        decor,
        activities: pushAct(state, action.actor, `đã mua trang trí "${item.name}" cho vườn (-${item.price} Xu Tim)`, "bag-handle"),
      };
    }
    case "EQUIP_DECOR": {
      // Trang bị/gỡ đồ decor đã sở hữu. Cảnh/rào/lối đi: chạm lại món đang dùng = gỡ về mặc định.
      // Vật đặt: đang đặt -> gỡ ra; chưa đặt và đủ 3 khe -> thêm; đã đầy 3 khe -> THAY khe cuối
      // (xác định, UI báo trước) để không bao giờ vượt trần 3 vật.
      const item = decorItem(action.itemId);
      if (!item || !state.decor.owned.includes(item.id)) return state;
      const decor = { ...state.decor, placed: [...state.decor.placed] };
      if (item.category === "scene") decor.sceneBg = decor.sceneBg === item.id ? "" : item.id;
      else if (item.category === "fence") decor.fence = decor.fence === item.id ? "" : item.id;
      else if (item.category === "path") decor.path = decor.path === item.id ? "" : item.id;
      else if (decor.placed.includes(item.id)) decor.placed = decor.placed.filter((x) => x !== item.id);
      else if (decor.placed.length < 3) decor.placed = [...decor.placed, item.id];
      else decor.placed = [decor.placed[0], decor.placed[1], item.id];
      if (JSON.stringify(decor) === JSON.stringify(state.decor)) return state;
      return { ...state, decor };
    }
    case "PET_CARE": {
      // Chăm pet dùng CHUNG triết lý chăm cây: cooldown 60s/người + chỉ số đầy thì vô hiệu
      // (petCareStatus ở lib/features). Lớn theo NGÀY CHĂM KHÁC NHAU (careDays) — chăm dồn
      // trong ngày chỉ no/vui thêm chứ không lên giai đoạn. Thưởng +3 Xu, trần 5 lần/ngày/người.
      const nowMs = Date.now();
      if (!petCareStatus(state.pet, action.kind, action.user, nowMs).ok) return state;
      const needs = petNeedsAt(state.pet, nowMs);
      let hunger = needs.hunger;
      let joy = needs.joy;
      if (action.kind === "feed") { hunger = Math.min(100, hunger + 35); joy = Math.min(100, joy + 4); }
      if (action.kind === "pet") { joy = Math.min(100, joy + 22); }
      if (action.kind === "play") { joy = Math.min(100, joy + 32); hunger = Math.max(0, hunger - 6); }
      const t = today();
      const careDays = state.pet.careDays.includes(t) ? state.pet.careDays : [...state.pet.careDays, t].sort().slice(-90);
      const stageBefore = petStageIndex(state.pet);
      const stageAfter = petStageIndex({ ...state.pet, careDays });
      const rd = state.pet.rewardDay.date === t ? state.pet.rewardDay : { date: t, A: 0, B: 0 };
      const rewardDay = { ...rd };
      let coins = state.coins;
      if (rd[action.user] < PET_CARE_REWARD_DAILY_MAX) { coins += PET_CARE_REWARD_COINS; rewardDay[action.user] = rd[action.user] + 1; }
      const nowStr = new Date(nowMs).toISOString();
      const pet = {
        ...state.pet, hunger, joy, statsAt: nowStr, careDays,
        lastCareAt: nowStr,
        lastCareAtBy: { ...state.pet.lastCareAtBy, [action.user]: nowStr },
        careCount: { ...state.pet.careCount, [action.user]: state.pet.careCount[action.user] + 1 },
        rewardDay,
      };
      const careText = { feed: `vừa cho ${pet.name} ăn`, pet: `vừa vuốt ve ${pet.name}`, play: `vừa chơi cùng ${pet.name}` }[action.kind];
      let acts = pushAct(state, action.actor, `${careText}${coins > state.coins ? ` (+${PET_CARE_REWARD_COINS} Xu Tim)` : ""}`, "paw");
      if (stageAfter > stageBefore) {
        acts = [{ id: uid(), actor: pet.name, text: `đã lớn thêm một giai đoạn nhờ những ngày hai đứa chăm sóc!`, icon: "sparkles", time: nowStr }, ...acts].slice(0, 40);
      }
      return { ...state, pet, coins, activities: acts };
    }
    case "PET_RENAME": {
      const name = action.name.trim().slice(0, 20);
      if (!name || name === state.pet.name) return state;
      return { ...state, pet: { ...state.pet, name } };
    }
    case "EVENT_ADD": {
      // Ngày đặc biệt — cùng khóa với nội dung khác: tiêu đề <= 60 ký tự, ngày phải tồn tại
      // thật, trần 50 sự kiện, id đã xoá (tombstone) không hồi sinh, khoảng cách 5s/người.
      const ev = action.event;
      if (!ev.id || !ev.title.trim() || ev.title.length > EVENT_TITLE_MAX || !isValidDateKey(ev.date)) return state;
      if (state.events.some((e) => e.id === ev.id)) return state;
      if ((state.deletedIds?.events ?? []).includes(ev.id)) return state;
      if (state.events.length >= EVENTS_MAX) return state;
      if (!contentAddAllowed(state, ev.createdBy, Date.now())) return state;
      const clean: SpecialEvent = {
        id: ev.id, title: ev.title.trim(), date: ev.date,
        repeat: ev.repeat === "yearly" ? "yearly" : "once",
        createdBy: ev.createdBy === "B" ? "B" : "A",
        createdAt: ev.createdAt || new Date().toISOString(),
        updatedAt: ev.updatedAt || new Date().toISOString(),
      };
      const actor = clean.createdBy === "A" ? state.personA : state.personB;
      const next = { ...state, contentLog: { ...state.contentLog, [clean.createdBy]: new Date().toISOString() } };
      return { ...next, events: [clean, ...state.events], activities: pushAct(next, actor, `đã thêm ngày đặc biệt "${clean.title}"`, "calendar") };
    }
    case "EVENT_EDIT": {
      const idx = state.events.findIndex((e) => e.id === action.event.id);
      if (idx < 0) return state;
      if (!action.event.title.trim() || action.event.title.length > EVENT_TITLE_MAX || !isValidDateKey(action.event.date)) return state;
      const cur = state.events[idx];
      const edited: SpecialEvent = { ...cur, title: action.event.title.trim(), date: action.event.date, repeat: action.event.repeat === "yearly" ? "yearly" : "once", updatedAt: new Date().toISOString() };
      if (JSON.stringify(edited) === JSON.stringify({ ...cur, updatedAt: edited.updatedAt })) return state;
      return { ...state, events: state.events.map((e, i) => (i === idx ? edited : e)) };
    }
    case "EVENT_DEL": {
      if (!state.events.some((e) => e.id === action.id)) return state;
      return { ...state, events: state.events.filter((e) => e.id !== action.id), deletedIds: withTombstone(state, "events", action.id) };
    }
    default: return state;
  }
}

/**
 * Reducer + đóng dấu secTs cho các action CỤC BỘ (provider dùng hàm này).
 * SET_STATE/MERGE_STATE/RESET giữ nguyên dấu của bản ghi gốc.
 */
export function dispatchWithStamps(state: AppState, action: Action): AppState {
  const next = gardenReducer(state, action);
  if (next === state) return next;
  if (action.type === "SET_STATE" || action.type === "MERGE_STATE" || action.type === "RESET") return next;
  return stampSections(state, next, next.currentUser, nowIso());
}

import {
  AppState, Birthday, CouplePhoto, LetterMoment, LoveNote, MEMORIES_CAP, MemoryPhoto, NOTE_MIN_INTERVAL_MS, NOTE_TEXT_MAX, NOTES_CAP,
  PersonId, PersonStatus, PresenceSlot, SPECIAL_DATES_CAP, SpecialDate, TreePestEvent, WidgetPrefs, formatDateVN, isValidDateKey,
  parseDateKey, today, uid,
} from "./types";
import { defaultState, normalizeState } from "./model";
import { applyCare, applyVitalityBonus, careStatus, isPestActive, pestAdjustedTree } from "./tree";
import { addKeptLetter, keptLetterFromMoment, recordMilestone } from "./features";
import { materializeMemories, sanitizeMemory, sanitizeMemoryCaption } from "./memories";
import { materializeSpecialDates, sanitizeBirthday, sanitizeSpecialDate, sanitizeSpecialTitle } from "./specialDays";
import { advanceDailyQuests, emptyDailyQuests, unionQuestHistory, type QuestEvent } from "./quests";
import { STATUS_TEXT_MAX, statusMoodById } from "./content";
import { mergeStates, stampSections } from "./merge";
import { nowIso } from "./time";

/**
 * Reducer THUẦN của bản rebuild (không React/Supabase/AsyncStorage) — kiểm chứng
 * trực tiếp bằng Node (scripts/test-logic.mjs). Mọi "khóa cứng" chống spam/lỗi
 * logic nằm ở đây, không chỉ ở UI: cooldown chăm cây, trần note 300 ký tự +
 * giãn cách 5 giây. Ngoại lệ có chủ đích: nhịp nhớ
 * KHÔNG khóa gì cả — không trần, không chờ, mỗi nhịp là một sự kiện riêng.
 */

export type CareKind = "water" | "sun" | "love" | "bug";
export type Action =
  | { type: "SET_STATE"; state: AppState }
  | { type: "MERGE_STATE"; state: AppState; mySlot?: PersonId }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "SET_IDENTITY"; a: string; b: string; avatarA: string; avatarB: string; user: PersonId; roomCode: string }
  | { type: "SET_START_DATE"; date: string; user: PersonId; actor: string }
  | { type: "MARK_MILESTONE"; days: number; actor: string }
  | { type: "TREE_CARE"; kind: CareKind; user: PersonId; actor: string; drop?: LetterMoment | null; combo?: boolean }
  | { type: "PEST_SPAWN"; event: TreePestEvent }
  | { type: "PEST_EXPIRE"; id: string }
  | { type: "CELEBRATE_TREE_STAGE"; stage: number; drop?: LetterMoment | null }
  | { type: "NOTE_ADD"; note: LoveNote; user: PersonId }
  | { type: "NOTE_READ"; id: string; user: PersonId }
  | { type: "PING_SEND"; user: PersonId; actor: string }
  | { type: "PRESENCE_SNAPSHOT"; user: PersonId; lat: number | null; lng: number | null; acc: number | null; battery: number | null; at: string }
  | { type: "STATUS_SET"; user: PersonId; status: PersonStatus | null }
  | { type: "WIDGET_PREFS_SET"; user: PersonId; prefs: Partial<WidgetPrefs> }
  | { type: "COUPLE_PHOTO_SET"; photo: CouplePhoto; user: PersonId; actor: string }
  | { type: "MEMORY_ADD"; memory: MemoryPhoto; user: PersonId; actor: string }
  | { type: "MEMORY_UPDATE"; id: string; caption: string; dateKey: string; user: PersonId }
  | { type: "MEMORY_REMOVE"; id: string; user: PersonId; actor: string }
  | { type: "BIRTHDAY_SET"; slot: PersonId; user: PersonId; birthday: Birthday | null }
  | { type: "SPECIAL_ADD"; item: SpecialDate; user: PersonId; actor: string }
  | { type: "SPECIAL_UPDATE"; id: string; title: string; dateKey: string; yearly: boolean; user: PersonId }
  | { type: "SPECIAL_REMOVE"; id: string; user: PersonId; actor: string };

function pushAct(s: AppState, actor: string, text: string, icon: string, slot?: PersonId): AppState["activities"] {
  return [{ id: uid(), actor, text, icon, time: nowIso(), slot }, ...s.activities].slice(0, 40);
}
const nameOf = (s: AppState, slot: PersonId): string => (slot === "A" ? s.personA : s.personB);

/**
 * Gắn tiến độ NHIỆM VỤ NGÀY vào kết quả của một hành động thật (chăm cây /
 * nhịp nhớ / note — chỉ gọi SAU khi hành động đã qua khóa cứng của nó). Khi
 * hành động này làm đủ 3/3: ghi ngày vào lịch sử chuỗi + cây nhận +8 sức sống
 * + 1 dòng dấu vết — tất cả đúng 1 lần (advanceDailyQuests chỉ bật cờ
 * justCompletedAll ở lần chuyển trạng thái đó).
 */
function withQuestProgress(out: AppState, ev: QuestEvent, actor: string, nowIsoStr: string): AppState {
  const { dq, justCompletedAll } = advanceDailyQuests(out.dailyQuests, ev, nowIsoStr);
  if (!justCompletedAll) return dq === out.dailyQuests ? out : { ...out, dailyQuests: dq };
  const rewarded: AppState = {
    ...out,
    dailyQuests: dq,
    questHistory: unionQuestHistory(out.questHistory, [dq.dateKey]),
    tree: applyVitalityBonus(out.tree),
  };
  return {
    ...rewarded,
    activities: pushAct(rewarded, actor, "vừa hoàn thành đủ 3 nhiệm vụ hôm nay — cây nhận thêm sức sống và hào quang vàng", "sparkles", ev.slot),
  };
}

const CARE_TEXT: Record<CareKind, { text: string; icon: string }> = {
  water: { text: "vừa tưới nước cho cây", icon: "water" },
  sun: { text: "vừa cho cây tắm nắng", icon: "sunny" },
  love: { text: "vừa gửi lời yêu cho cây", icon: "heart" },
  bug: { text: "vừa bắt sâu cho cây", icon: "bug" },
};

/** Mốc updatedAt mới nhất đã áp dụng — hỗ trợ SET_STATE chống ghi đè ngược. */
let lastAppliedTs = "";

export function gardenReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET": lastAppliedTs = ""; return defaultState;
    case "SET_STATE": {
      const incoming = normalizeState(action.state);
      const localTs = Math.max(state.updatedAt ? Date.parse(state.updatedAt) || 0 : 0, lastAppliedTs ? Date.parse(lastAppliedTs) || 0 : 0);
      const incTs = incoming.updatedAt ? Date.parse(incoming.updatedAt) || 0 : 0;
      if (incTs && localTs && incTs < localTs) return state;
      if (incTs) lastAppliedTs = incoming.updatedAt as string;
      return incoming;
    }
    case "MERGE_STATE": {
      const incoming = normalizeState(action.state);
      const merged = mergeStates(state, incoming, action.mySlot ?? state.currentUser);
      if (merged.updatedAt) lastAppliedTs = merged.updatedAt;
      return merged;
    }
    case "TICK": {
      const nowMs = Date.now();
      // Ghi sổ hao — kể cả phần hao THÊM vì sâu (tính từ cây gốc nên không trừ trùng).
      const m = pestAdjustedTree(state.tree, state.treePest, nowMs);
      const treeChanged = Math.abs(m.growthRecordedMs - state.tree.growthRecordedMs) > 1000
        || Math.abs(m.water - state.tree.water) + Math.abs(m.sun - state.tree.sun) + Math.abs(m.love - state.tree.love) >= 0.5
        || m.matureAt !== state.tree.matureAt;
      const t = today();
      const dayRolled = state.pings.day.date !== t;
      const questsRolled = state.dailyQuests.dateKey !== t;
      if (!treeChanged && !dayRolled && !questsRolled) return state;
      return {
        ...state,
        tree: treeChanged ? m : state.tree,
        pings: dayRolled ? { ...state.pings, day: { date: t, A: 0, B: 0 } } : state.pings,
        dailyQuests: questsRolled ? emptyDailyQuests(t) : state.dailyQuests,
      };
    }
    case "SET_IDENTITY": {
      if (state.personA === action.a && state.personB === action.b && state.avatarA === action.avatarA
        && state.avatarB === action.avatarB && state.currentUser === action.user && state.roomCode === action.roomCode) return state;
      return { ...state, personA: action.a, personB: action.b, avatarA: action.avatarA, avatarB: action.avatarB, currentUser: action.user, roomCode: action.roomCode };
    }

    /* ---------- CORE 1: đếm ngày yêu ---------- */
    case "SET_START_DATE": {
      const d = parseDateKey(action.date);
      if (!d || !isValidDateKey(action.date)) return state;
      if (d.getTime() > Date.now()) return state; // ngày bắt đầu không thể ở tương lai
      if (state.couple.startDate === action.date) return state;
      const couple = { ...state.couple, startDate: action.date, startSetAt: nowIso(), startSetBy: action.user };
      return { ...state, couple, activities: pushAct(state, action.actor, `vừa đổi ngày bắt đầu yêu thành ${formatDateVN(action.date)}`, "heart", action.user) };
    }
    case "MARK_MILESTONE": {
      // Ghi mốc + LỊCH SỬ mốc (kỷ vật đợt 2) đúng 1 lần. Nếu cờ celebrated đã
      // có mà lịch sử chưa có (dữ liệu cũ/backfill thiếu) thì chỉ bổ sung lịch
      // sử, không thêm dòng dấu vết lần hai.
      const hasDay = state.couple.celebrated.includes(action.days);
      const hasHist = state.couple.milestoneHistory.some((h) => h.days === action.days);
      if (hasDay && hasHist) return state;
      const couple = {
        ...state.couple,
        celebrated: hasDay ? state.couple.celebrated : [...state.couple.celebrated, action.days].sort((a, b) => a - b),
        milestoneHistory: recordMilestone(state.couple.milestoneHistory, action.days, nowIso()),
      };
      if (hasDay) return { ...state, couple };
      return { ...state, couple, activities: pushAct(state, action.actor, `vừa chạm mốc ${action.days} ngày yêu cùng nhau`, "sparkles", state.currentUser) };
    }

    /* ---------- CORE 2: cây tình yêu ---------- */
    case "PEST_SPAWN": {
      // Ghi sổ một đợt sâu — IDEMPOTENT tuyệt đối: đang có sâu sống / trùng id /
      // cùng ngày đã có đợt sâu thì bỏ qua. Sự kiện do pestSpawnFor (thuần,
      // theo seed) tính nên 2 máy dispatch cùng một sự kiện và hội tụ.
      const ev = action.event;
      if (!ev || typeof ev.id !== "string" || !ev.id || !isValidDateKey(ev.dateKey)) return state;
      if (!isFinite(new Date(ev.appearedAt).getTime())) return state;
      const nowMs = Date.now();
      if (isPestActive(state.treePest, nowMs)) return state;
      if (state.treePest && (state.treePest.id === ev.id || state.treePest.dateKey === ev.dateKey)) return state;
      const clean: TreePestEvent = {
        id: ev.id, dateKey: ev.dateKey, appearedAt: ev.appearedAt,
        status: "active", caughtBy: "", caughtAt: "", expiredAt: "",
      };
      return { ...state, treePest: clean };
    }
    case "PEST_EXPIRE": {
      const pest = state.treePest;
      if (!pest || pest.id !== action.id || pest.status !== "active") return state;
      return {
        ...state,
        treePest: { ...pest, status: "expired", expiredAt: nowIso() },
      };
    }
    case "TREE_CARE": {
      const nowMs = Date.now();
      // Materialize KÈM hao thêm vì sâu (từ cây gốc) để lần chăm ghi sổ đúng
      // sức sống thật tại now — phần hao-sâu không bị "tha" khi chăm cây.
      const mat = pestAdjustedTree(state.tree, state.treePest, nowMs);
      // Khóa cứng tại reducer: cooldown 60s/người + chỉ số đã đầy thì lần chăm VÔ HIỆU
      // (không boost, không thư, không dấu vết) — UI chỉ là lớp hiển thị của luật này.
      // "Bắt sâu" còn khóa theo SỰ KIỆN: không có sâu sống trên cây thì vô hiệu.
      const cs = careStatus(mat, action.kind, action.user, nowMs, state.treePest);
      if (!cs.ok) return state;
      const cared = applyCare(mat, action.kind, action.user, nowMs);
      // Bắt sâu thành công -> KẾT THÚC đợt sâu ngay trong cùng hành động chăm
      // (ghi người bắt + mốc bắt); các lần chăm khác không đụng vào sự kiện.
      const treePest = action.kind === "bug" && isPestActive(state.treePest, nowMs) && state.treePest
        ? { ...state.treePest, status: "caught" as const, caughtBy: action.user, caughtAt: new Date(nowMs).toISOString() }
        : state.treePest;
      let activities = pushAct(state, action.actor, CARE_TEXT[action.kind].text, CARE_TEXT[action.kind].icon, action.user);
      let out: AppState = { ...state, tree: cared, treePest, activities };
      if (action.combo) {
        activities = pushAct(out, action.actor, "vừa tạo combo Song chăm với người ấy", "sparkles", action.user);
        out = { ...out, activities };
      }
      if (action.drop) {
        // Thư rơi = khoảnh khắc pop + KỶ VẬT (đợt 2): ghi ngay vào hộp thư đã
        // giữ cùng hành động làm rơi thư, để thư giữ được kể cả khi pop bị bỏ
        // lỡ; khử trùng theo id của khoảnh khắc khi merge 2 máy.
        out = {
          ...out,
          lastLetter: action.drop,
          keptLetters: addKeptLetter(out.keptLetters, keptLetterFromMoment(action.drop, action.combo ? "combo" : "care")),
          activities: pushAct(out, action.actor, "vừa làm rơi một lá thư tình", "mail", action.user),
        };
      }
      // Hành động chăm THÀNH CÔNG tính vào nhiệm vụ ngày (kể cả bắt sâu).
      return withQuestProgress(out, { type: "care", kind: action.kind, slot: action.user }, action.actor, new Date(nowMs).toISOString());
    }
    case "CELEBRATE_TREE_STAGE": {
      // Giai đoạn cây nay ĐI THEO NGÀY YÊU (treeStageForDay): khi mở app thấy
      // giai đoạn theo ngày đã vượt mọi giai đoạn từng ăn mừng, hook sẽ dispatch
      // action này đúng 1 lần/giai đoạn — ghi celebratedStages (union-merge 2
      // máy) + thư rơi + 1 dòng nhật ký. Đã ăn mừng rồi -> no-op tuyệt đối.
      const stage = Math.floor(action.stage);
      if (!isFinite(stage) || stage < 1 || stage > 7) return state;
      if (state.couple.celebratedStages.includes(stage)) return state;
      const couple = { ...state.couple, celebratedStages: [...state.couple.celebratedStages, stage].sort((a, b) => a - b) };
      let out: AppState = { ...state, couple };
      const actorSlot = action.drop ? action.drop.bySlot : state.currentUser;
      out = { ...out, activities: pushAct(out, nameOf(out, actorSlot), "Cây tình yêu đã lên giai đoạn mới", "sparkles", actorSlot) };
      if (action.drop) {
        // Thư lên giai đoạn cũng thành kỷ vật (kind "stage") — id xác định
        // "stageup-N" nên 2 máy cùng ghi sẽ hội tụ về đúng 1 bản khi merge.
        out = { ...out, lastLetter: action.drop, keptLetters: addKeptLetter(out.keptLetters, keptLetterFromMoment(action.drop, "stage")) };
      }
      return out;
    }

    /* ---------- CORE 3: note tình yêu ---------- */
    case "NOTE_ADD": {
      const note = action.note;
      if (note.authorSlot !== action.user) return state;
      const text = (note.text || "").trim();
      if (!text || text.length > NOTE_TEXT_MAX) return state;
      const createdMs = new Date(note.createdAt).getTime();
      if (!isFinite(createdMs)) return state;
      // Giãn cách 5 giây/người — khóa cứng ở reducer, không chỉ khóa nút ở UI.
      const last = state.noteLog[action.user];
      if (last && createdMs - new Date(last).getTime() < NOTE_MIN_INTERVAL_MS) return state;
      if (state.notes.some((n) => n.id === note.id)) return state;
      const clean: LoveNote = { ...note, text, readAt: "" };
      const out: AppState = {
        ...state,
        notes: [clean, ...state.notes].slice(0, NOTES_CAP),
        noteLog: { ...state.noteLog, [action.user]: note.createdAt },
        activities: pushAct(state, nameOf(state, action.user), "vừa gửi một note tình yêu", "document-text", action.user),
      };
      return withQuestProgress(out, { type: "note", slot: action.user }, nameOf(state, action.user), note.createdAt);
    }
    case "NOTE_READ": {
      const target = state.notes.find((n) => n.id === action.id);
      if (!target || target.authorSlot === action.user || target.readAt) return state;
      const notes = state.notes.map((n) => (n.id === action.id ? { ...n, readAt: nowIso() } : n));
      return { ...state, notes };
    }

    /* ---------- CORE 4: nhịp tim "Nhớ bạn" ---------- */
    case "PING_SEND": {
      // Nhịp nhớ KHÔNG GIỚI HẠN (spec đổi 2026-10-25): không trần ngày, không
      // gộp chuỗi — MỖI lần gửi là một nhịp riêng biệt: bộ đếm +1, slot mang
      // mốc của chính nhịp này (burst luôn = 1, lastBurstAt = lastAt) để phía
      // người nhận bật hiệu ứng theo từng nhịp, và mỗi nhịp ghi 1 dòng dấu vết
      // (nhật ký tự chặn ở 40 dòng như mọi hoạt động khác). Phía UI gọi thêm
      // notify-heartbeat để mỗi nhịp có một push riêng — xem lib/push.ts.
      const t = today();
      const day = state.pings.day.date === t ? state.pings.day : { date: t, A: 0, B: 0 };
      const nowStr = new Date().toISOString();
      const prev = state.pings[action.user];
      const slot = { total: prev.total + 1, lastAt: nowStr, lastBurstAt: nowStr, burst: 1 };
      const pings = { ...state.pings, day: { ...day, [action.user]: day[action.user] + 1 }, [action.user]: slot };
      const activities = pushAct(state, action.actor, "đang nhớ bạn", "heart", action.user);
      const out: AppState = { ...state, pings, activities };
      return withQuestProgress(out, { type: "ping", slot: action.user }, action.actor, nowStr);
    }

    /* ---------- CORE 5: vị trí trực tiếp ---------- */
    case "PRESENCE_SNAPSHOT": {
      // Publish ĐIỂM MỚI NHẤT của chính chủ slot (LocationSync gọi khi app
      // đang mở + đã có quyền vị trí) — không phiên, không cổng bật/tắt.
      // Snapshot không có điểm vị trí (chỉ pin/giờ) thì giữ nguyên điểm cũ.
      const prev = state.presence[action.user];
      const atMs = new Date(action.at).getTime();
      if (!isFinite(atMs)) return state;
      const sameFix = action.lat === prev.lat && action.lng === prev.lng && action.battery === prev.battery;
      if (sameFix && atMs - new Date(prev.at || 0).getTime() < 60000) return state; // publish trùng trong 1 phút — bỏ qua cho khỏi phát đồng bộ thừa
      const slot: PresenceSlot = {
        lat: prev.lat, lng: prev.lng, acc: prev.acc, locAt: prev.locAt,
        battery: action.battery ?? prev.battery,
        at: action.at,
        ...(action.lat != null && action.lng != null ? { lat: action.lat, lng: action.lng, acc: action.acc, locAt: action.at } : null),
      };
      return { ...state, presence: { ...state.presence, [action.user]: slot } };
    }

    /* ---------- TRẠNG THÁI CỦA NHAU ---------- */
    case "STATUS_SET": {
      // Mỗi người CHỈ ghi trạng thái của CHÍNH slot mình: action luôn ghi vào
      // đúng slot action.user (store chỉ dispatch với user = currentUser của
      // máy gửi) — không có đường nào ghi hộ trạng thái của slot kia.
      // status null = xoá trạng thái. Mood lạ (ngoài bộ preset) bị từ chối.
      const raw = action.status;
      let clean: PersonStatus | null = null;
      if (raw) {
        if (!statusMoodById(raw.mood)) return state;
        clean = {
          mood: raw.mood,
          text: (raw.text || "").trim().slice(0, STATUS_TEXT_MAX),
          updatedAt: raw.updatedAt && isFinite(new Date(raw.updatedAt).getTime()) ? raw.updatedAt : nowIso(),
        };
      }
      if (JSON.stringify(state.status[action.user]) === JSON.stringify(clean)) return state;
      return { ...state, status: { ...state.status, [action.user]: clean } };
    }

    /* ---------- Ảnh của hai đứa (đợt 3): đặt SAU khi upload Storage thành công ---------- */
    case "COUPLE_PHOTO_SET": {
      // UI chỉ dispatch action này sau khi file đã lên Storage xong. Reducer
      // vẫn khóa cứng shape: path không rỗng + updatedAt là mốc ISO đọc được +
      // bySlot đúng người thao tác. Đặt lại đúng cùng một mốc -> no-op (tránh
      // phát đồng bộ thừa khi 2 máy cùng nhận một sự kiện).
      const p = action.photo;
      if (!p || typeof p.path !== "string" || !p.path.trim()) return state;
      if (p.bySlot !== action.user) return state;
      if (!isFinite(new Date(p.updatedAt).getTime())) return state;
      const prev = state.couplePhoto;
      if (prev && prev.path === p.path && prev.updatedAt === p.updatedAt && prev.bySlot === p.bySlot) return state;
      return {
        ...state,
        couplePhoto: { path: p.path, updatedAt: p.updatedAt, bySlot: p.bySlot },
        activities: pushAct(state, action.actor, "vừa đặt ảnh của hai đứa", "heart", action.user),
      };
    }

    /* ---------- DÂY KỶ NIỆM (kho ảnh treo trên dây) ---------- */
    case "MEMORY_ADD": {
      // Treo ảnh lên dây — UI chỉ dispatch SAU khi file đã lên Storage xong
      // (như COUPLE_PHOTO_SET). Quyền: CẢ HAI người đều treo được (kho chung
      // của "chúng mình", theo tiền lệ ảnh hai đứa) — nhưng bySlot phải đúng
      // người đang thao tác. Khóa cứng tại reducer: shape qua sanitize, id đã
      // có hoặc đã nằm trong MỘ thì không treo lại được, dây đủ MEMORIES_CAP
      // thì từ chối (UI báo thân thiện từ trước khi chọn ảnh).
      const clean = sanitizeMemory(action.memory);
      if (!clean || clean.bySlot !== action.user) return state;
      if (state.removedMemoryIds.includes(clean.id)) return state;
      if (state.memories.some((m) => m.id === clean.id)) return state;
      if (state.memories.length >= MEMORIES_CAP) return state;
      return {
        ...state,
        memories: materializeMemories([...state.memories, clean], state.removedMemoryIds),
        activities: pushAct(state, action.actor, "vừa treo một ảnh kỷ niệm lên dây", "images", action.user),
      };
    }
    case "MEMORY_UPDATE": {
      // Sửa ghi chú / ngày của kỷ niệm — CẢ HAI người đều sửa được (kho
      // chung). Ngày không tồn tại -> từ chối cả hành động; ghi chú qua
      // sanitize (trim + trần 60). Không đổi gì -> no-op (khỏi phát đồng bộ
      // thừa). updatedAt = mốc sửa này là khóa LWW khi merge 2 máy.
      if (!isValidDateKey(action.dateKey)) return state;
      const prev = state.memories.find((m) => m.id === action.id);
      if (!prev) return state;
      const caption = sanitizeMemoryCaption(action.caption);
      if (prev.caption === caption && prev.dateKey === action.dateKey) return state;
      const next: MemoryPhoto = { ...prev, caption, dateKey: action.dateKey, updatedAt: nowIso() };
      return {
        ...state,
        memories: materializeMemories(state.memories.map((m) => (m.id === action.id ? next : m)), state.removedMemoryIds),
      };
    }
    case "MEMORY_REMOVE": {
      // Gỡ ảnh khỏi dây — CẢ HAI người đều gỡ được. Xoá = ghi id vào MỘ rồi
      // hiện thực hoá lại danh sách: mộ đi cùng state qua mọi lần merge nên
      // bản sao cũ ở máy kia không hồi sinh được ảnh. Object trong Storage
      // không bị xoá (vô hình vĩnh viễn nhờ mộ là đủ — xem types.ts).
      const prev = state.memories.find((m) => m.id === action.id);
      if (!prev) return state;
      const removedMemoryIds = state.removedMemoryIds.includes(action.id)
        ? state.removedMemoryIds
        : [...state.removedMemoryIds, action.id];
      return {
        ...state,
        removedMemoryIds,
        memories: materializeMemories(state.memories, removedMemoryIds),
        activities: pushAct(state, action.actor, "vừa gỡ một ảnh kỷ niệm khỏi dây", "images", action.user),
      };
    }

    /* ---------- NGÀY KỶ NIỆM: sinh nhật riêng theo slot + ngày đặc biệt chung ---------- */
    case "BIRTHDAY_SET": {
      // Sinh nhật là dữ kiện RIÊNG theo slot (như trạng thái): CHỈ chính chủ
      // slot mới ghi được — action mang slot khác user bị từ chối thẳng, nên
      // không có đường nào đặt hộ sinh nhật của người ấy. birthday null = xoá.
      // Ngày/tháng qua sanitize (29/02 hợp lệ; 30/02, 31/04 bị loại) — dữ kiện
      // cá nhân nên KHÔNG ghi dòng dấu vết như các hành động chung.
      if (action.slot !== action.user) return state;
      const clean = action.birthday === null ? null : sanitizeBirthday(action.birthday);
      if (action.birthday !== null && !clean) return state;
      if (JSON.stringify(state.birthdays[action.slot]) === JSON.stringify(clean)) return state;
      return { ...state, birthdays: { ...state.birthdays, [action.slot]: clean } };
    }
    case "SPECIAL_ADD": {
      // Thêm ngày đặc biệt — CẢ HAI người đều thêm được (kho chung "chúng
      // mình", tiền lệ MEMORY_ADD) nhưng bySlot phải đúng người thao tác.
      // Khóa cứng: shape qua sanitize (tiêu đề trim + trần 40, ngày phải tồn
      // tại), id đã có hoặc đã nằm trong MỘ thì không thêm lại được, đủ
      // SPECIAL_DATES_CAP thì từ chối (UI báo thân thiện từ trước).
      const clean = sanitizeSpecialDate(action.item);
      if (!clean || clean.bySlot !== action.user) return state;
      if (state.removedSpecialDateIds.includes(clean.id)) return state;
      if (state.specialDates.some((d) => d.id === clean.id)) return state;
      if (state.specialDates.length >= SPECIAL_DATES_CAP) return state;
      return {
        ...state,
        specialDates: materializeSpecialDates([...state.specialDates, clean], state.removedSpecialDateIds),
        activities: pushAct(state, action.actor, `vừa thêm ngày kỷ niệm “${clean.title}”`, "calendar", action.user),
      };
    }
    case "SPECIAL_UPDATE": {
      // Sửa tiêu đề/ngày/cờ lặp — CẢ HAI người đều sửa được. Ngày không tồn
      // tại hoặc tiêu đề rỗng sau trim -> từ chối cả hành động; không đổi gì
      // -> no-op. updatedAt = mốc sửa này là khóa LWW khi merge 2 máy.
      if (!isValidDateKey(action.dateKey)) return state;
      const title = sanitizeSpecialTitle(action.title);
      if (!title) return state;
      const prev = state.specialDates.find((d) => d.id === action.id);
      if (!prev) return state;
      if (prev.title === title && prev.dateKey === action.dateKey && prev.yearly === action.yearly) return state;
      const next: SpecialDate = { ...prev, title, dateKey: action.dateKey, yearly: action.yearly, updatedAt: nowIso() };
      return {
        ...state,
        specialDates: materializeSpecialDates(state.specialDates.map((d) => (d.id === action.id ? next : d)), state.removedSpecialDateIds),
      };
    }
    case "SPECIAL_REMOVE": {
      // Xoá ngày đặc biệt — CẢ HAI người đều xoá được. Xoá = ghi id vào MỘ
      // rồi hiện thực hoá lại (đúng khuôn MEMORY_REMOVE): mộ đi cùng state
      // qua mọi lần merge nên bản sao cũ ở máy kia không hồi sinh được ngày.
      const prev = state.specialDates.find((d) => d.id === action.id);
      if (!prev) return state;
      const removedSpecialDateIds = state.removedSpecialDateIds.includes(action.id)
        ? state.removedSpecialDateIds
        : [...state.removedSpecialDateIds, action.id];
      return {
        ...state,
        removedSpecialDateIds,
        specialDates: materializeSpecialDates(state.specialDates, removedSpecialDateIds),
        activities: pushAct(state, action.actor, `vừa xoá ngày kỷ niệm “${prev.title}”`, "calendar", action.user),
      };
    }

    /* ---------- Widget màn hình chính: công tắc RIÊNG của từng người ---------- */
    case "WIDGET_PREFS_SET": {
      // Chỉ ghi vào slot của CHÍNH người thao tác (action.user) — không có đường
      // nào sửa công tắc của người ấy từ máy này. Chỉ nhận boolean thật; giá trị
      // không đổi -> no-op (tránh phát đồng bộ thừa).
      const prev = state.widgetPrefs[action.user];
      const clean = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
      const nextPrefs: WidgetPrefs = {
        day: clean(action.prefs.day, prev.day),
        note: clean(action.prefs.note, prev.note),
        tree: clean(action.prefs.tree, prev.tree),
      };
      if (nextPrefs.day === prev.day && nextPrefs.note === prev.note && nextPrefs.tree === prev.tree) return state;
      return { ...state, widgetPrefs: { ...state.widgetPrefs, [action.user]: nextPrefs } };
    }
  }
}

/** Reducer + đóng dấu secTs cho merge 2 máy (chỉ action cục bộ mới đóng dấu). */
export function dispatchWithStamps(state: AppState, action: Action): AppState {
  const next = gardenReducer(state, action);
  if (next === state) return next;
  if (action.type === "SET_STATE" || action.type === "MERGE_STATE" || action.type === "RESET") return next;
  return stampSections(state, next, next.currentUser, nowIso());
}

import {
  AppState, LetterMoment, LoveNote, NOTE_MIN_INTERVAL_MS, NOTE_TEXT_MAX, NOTES_CAP,
  PING_BURST_WINDOW_MS, PING_DAILY_MAX, PersonId, WidgetPrefs, formatDateVN, isValidDateKey,
  parseDateKey, today, uid,
} from "./types";
import { defaultState, normalizeState } from "./model";
import { applyCare, careStatus, materializeTree } from "./tree";
import { mergeStates, stampSections } from "./merge";
import { nowIso } from "./time";

/**
 * Reducer THUẦN của bản rebuild (không React/Supabase/AsyncStorage) — kiểm chứng
 * trực tiếp bằng Node (scripts/test-logic.mjs). Mọi "khóa cứng" chống spam/lỗi
 * logic nằm ở đây, không chỉ ở UI: cooldown chăm cây, trần note 300 ký tự +
 * giãn cách 5 giây, trần 50 nhịp/ngày, hết hạn phiên vị trí.
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
  | { type: "CELEBRATE_TREE_STAGE"; stage: number; drop?: LetterMoment | null }
  | { type: "NOTE_ADD"; note: LoveNote; user: PersonId }
  | { type: "NOTE_READ"; id: string; user: PersonId }
  | { type: "PING_SEND"; user: PersonId; actor: string }
  | { type: "PRESENCE_START"; user: PersonId; durationMs: number | null; actor: string }
  | { type: "PRESENCE_STOP"; user: PersonId; actor: string; reason: "manual" | "expired" }
  | { type: "PRESENCE_SNAPSHOT"; user: PersonId; lat: number | null; lng: number | null; acc: number | null; battery: number | null; at: string }
  | { type: "WIDGET_PREFS_SET"; user: PersonId; prefs: Partial<WidgetPrefs> };

function pushAct(s: AppState, actor: string, text: string, icon: string, slot?: PersonId): AppState["activities"] {
  return [{ id: uid(), actor, text, icon, time: nowIso(), slot }, ...s.activities].slice(0, 40);
}
const nameOf = (s: AppState, slot: PersonId): string => (slot === "A" ? s.personA : s.personB);

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
      const m = materializeTree(state.tree, nowMs);
      const treeChanged = Math.abs(m.growthRecordedMs - state.tree.growthRecordedMs) > 1000
        || Math.abs(m.water - state.tree.water) + Math.abs(m.sun - state.tree.sun) + Math.abs(m.love - state.tree.love) >= 0.5
        || m.matureAt !== state.tree.matureAt;
      const t = today();
      const dayRolled = state.pings.day.date !== t;
      if (!treeChanged && !dayRolled) return state;
      return {
        ...state,
        tree: treeChanged ? m : state.tree,
        pings: dayRolled ? { ...state.pings, day: { date: t, A: 0, B: 0 } } : state.pings,
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
      if (state.couple.celebrated.includes(action.days)) return state;
      const couple = { ...state.couple, celebrated: [...state.couple.celebrated, action.days].sort((a, b) => a - b) };
      return { ...state, couple, activities: pushAct(state, action.actor, `vừa chạm mốc ${action.days} ngày yêu cùng nhau`, "sparkles", state.currentUser) };
    }

    /* ---------- CORE 2: cây tình yêu ---------- */
    case "TREE_CARE": {
      const nowMs = Date.now();
      const mat = materializeTree(state.tree, nowMs);
      // Khóa cứng tại reducer: cooldown 60s/người + chỉ số đã đầy thì lần chăm VÔ HIỆU
      // (không boost, không thư, không dấu vết) — UI chỉ là lớp hiển thị của luật này.
      const cs = careStatus(mat, action.kind, action.user, nowMs);
      if (!cs.ok) return state;
      const cared = applyCare(mat, action.kind, action.user, nowMs);
      let activities = pushAct(state, action.actor, CARE_TEXT[action.kind].text, CARE_TEXT[action.kind].icon, action.user);
      let out: AppState = { ...state, tree: cared, activities };
      if (action.combo) {
        activities = pushAct(out, action.actor, "vừa tạo combo Song chăm với người ấy", "sparkles", action.user);
        out = { ...out, activities };
      }
      if (action.drop) {
        out = { ...out, lastLetter: action.drop, activities: pushAct(out, action.actor, "vừa làm rơi một lá thư tình", "mail", action.user) };
      }
      return out;
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
      if (action.drop) out = { ...out, lastLetter: action.drop };
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
      return {
        ...state,
        notes: [clean, ...state.notes].slice(0, NOTES_CAP),
        noteLog: { ...state.noteLog, [action.user]: note.createdAt },
        activities: pushAct(state, nameOf(state, action.user), "vừa gửi một note tình yêu", "document-text", action.user),
      };
    }
    case "NOTE_READ": {
      const target = state.notes.find((n) => n.id === action.id);
      if (!target || target.authorSlot === action.user || target.readAt) return state;
      const notes = state.notes.map((n) => (n.id === action.id ? { ...n, readAt: nowIso() } : n));
      return { ...state, notes };
    }

    /* ---------- CORE 4: nhịp tim "Nhớ bạn" ---------- */
    case "PING_SEND": {
      // Trần 50 nhịp/ngày/người gửi khóa cứng tại reducer; ping là cảm xúc thuần —
      // app này KHÔNG có tiền tệ/XP nên không có gì để farm.
      const t = today();
      const day = state.pings.day.date === t ? state.pings.day : { date: t, A: 0, B: 0 };
      if (day[action.user] >= PING_DAILY_MAX) return state;
      const nowMs = Date.now();
      const nowStr = new Date(nowMs).toISOString();
      const prev = state.pings[action.user];
      // Chạm liên tục <= 5 giây = cùng một CHUỖI nhịp: chuỗi giữ nguyên lastBurstAt
      // (mốc bắt đầu chuỗi) — phía người nhận chỉ bật hiệu ứng theo chuỗi + cooldown 30s.
      const chained = Boolean(prev.lastAt) && nowMs - new Date(prev.lastAt).getTime() <= PING_BURST_WINDOW_MS;
      const burst = chained ? prev.burst + 1 : 1;
      const slot = { total: prev.total + 1, lastAt: nowStr, lastBurstAt: burst === 1 ? nowStr : prev.lastBurstAt, burst };
      const pings = { ...state.pings, day: { ...day, [action.user]: day[action.user] + 1 }, [action.user]: slot };
      // Dấu vết chỉ ghi khi BẮT ĐẦU chuỗi (chạm dồn 20 lần không spam 20 dòng).
      const activities = burst === 1 ? pushAct(state, action.actor, "vừa gửi một nhịp tim nhớ bạn", "heart", action.user) : state.activities;
      return { ...state, pings, activities };
    }

    /* ---------- CORE 5: định vị tạm thời ---------- */
    case "PRESENCE_START": {
      const nowMs = Date.now();
      const prev = state.presence[action.user];
      const slot = {
        ...prev, sharing: true,
        startedAt: new Date(nowMs).toISOString(),
        expiresAt: action.durationMs ? new Date(nowMs + action.durationMs).toISOString() : "",
        // Phiên mới bắt đầu sạch: toạ độ của phiên cũ không được "sống lại" trước
        // khi snapshot đầu tiên của phiên này tới.
        lat: null, lng: null, acc: null, locAt: "", at: "",
      };
      return {
        ...state,
        presence: { ...state.presence, [action.user]: slot },
        activities: pushAct(state, action.actor, "bắt đầu chia sẻ vị trí tạm thời", "location", action.user),
      };
    }
    case "PRESENCE_STOP": {
      const prev = state.presence[action.user];
      if (!prev.sharing) return state;
      // Kết thúc phiên = xoá toạ độ khỏi state đồng bộ: vị trí tạm thời thì khi
      // hết phiên, phía người ấy không còn thấy vị trí nữa (kể cả trong dữ liệu thô).
      const slot = { ...prev, sharing: false, lat: null, lng: null, acc: null, locAt: "" };
      return {
        ...state,
        presence: { ...state.presence, [action.user]: slot },
        activities: pushAct(state, action.actor, action.reason === "expired" ? "đã hết phiên chia sẻ vị trí tạm thời" : "đã dừng chia sẻ vị trí", "location", action.user),
      };
    }
    case "PRESENCE_SNAPSHOT": {
      const prev = state.presence[action.user];
      if (!prev.sharing) return state; // phiên đã dừng thì snapshot đến muộn cũng không hồi sinh
      const atMs = new Date(action.at).getTime();
      if (!isFinite(atMs)) return state;
      // Snapshot đến SAU lúc hết hạn: phiên tự kết thúc tại đây (kèm dấu vết, đúng 1 lần).
      if (prev.expiresAt && atMs > new Date(prev.expiresAt).getTime()) {
        return {
          ...state,
          presence: { ...state.presence, [action.user]: { ...prev, sharing: false, lat: null, lng: null, acc: null, locAt: "" } },
          activities: pushAct(state, nameOf(state, action.user), "đã hết phiên chia sẻ vị trí tạm thời", "location", action.user),
        };
      }
      const sameFix = action.lat === prev.lat && action.lng === prev.lng && action.battery === prev.battery;
      if (sameFix && atMs - new Date(prev.at || 0).getTime() < 60000) return state; // chụp trùng trong 1 phút — bỏ qua cho khỏi phát đồng bộ thừa
      const slot = {
        ...prev,
        battery: action.battery ?? prev.battery,
        at: action.at,
        ...(action.lat != null && action.lng != null ? { lat: action.lat, lng: action.lng, acc: action.acc, locAt: action.at } : null),
      };
      return { ...state, presence: { ...state.presence, [action.user]: slot } };
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

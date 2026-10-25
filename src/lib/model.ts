import {
  AppState, Activity, CouplePhoto, KeptLetter, LoveNote, PersonId, PingsState, PresenceSlot, WidgetPrefs,
  AVATARS, boolOr, defaultPresenceSlot, defaultWidgetPrefs, finiteNum, isPlainObject, isValidDateKey,
  objArray, strOr, today,
} from "./types";
import { createTree, normalizeTree } from "./tree";
import { isMoodId, messageById } from "./content";
import { MILESTONES, unionKeptLetters, unionMilestoneHistory } from "./features";

/**
 * State mặc định + NORMALIZE cho bản rebuild 5 lõi.
 *
 * Nguyên tắc an toàn (kế thừa bài học bản cũ): state từ Supabase room_state /
 * cache có thể là BẤT KỲ shape nào — đặc biệt là state của BẢN APP CŨ (cây nhiều
 * loài, Xu, game, shop...). Normalize KHÔNG BAO GIỜ throw và KHÔNG BAO GIỜ giữ
 * trường lạ: nó dựng một AppState mới hoàn chỉnh, chỉ "cứu" những gì khớp shape
 * mới một cách rõ ràng:
 * - couple.startDate: lấy từ couple.startDate (mới) hoặc startDate top-level (cũ) nếu là ngày hợp lệ.
 * - tree: lấy từ tree (mới) hoặc plants[0] (cũ — chính là Cây Tình Yêu của hai đứa) khi có plantedAt/growthRecordedMs.
 * - notes/pings/presence/activities: chỉ khi từng mục khớp shape mới.
 * Còn lại mặc định tươi mới — app cũ nâng cấp lên không crash, không hiện dữ liệu ma.
 */

export const defaultPings = (): PingsState => ({
  A: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 },
  B: { total: 0, lastAt: "", lastBurstAt: "", burst: 0 },
  day: { date: today(), A: 0, B: 0 },
});

export const defaultState: AppState = {
  roomCode: "LOVE01",
  personA: "Bé A",
  personB: "Bé B",
  avatarA: "svg-a",
  avatarB: "svg-b",
  currentUser: "A",
  couple: { startDate: today(), startSetAt: "", startSetBy: "", celebrated: [], celebratedStages: [], milestoneHistory: [], pairedAt: new Date().toISOString() },
  tree: createTree(),
  notes: [],
  noteLog: { A: "", B: "" },
  pings: defaultPings(),
  activities: [],
  presence: { A: defaultPresenceSlot(), B: defaultPresenceSlot() },
  widgetPrefs: { A: defaultWidgetPrefs(), B: defaultWidgetPrefs() },
  lastLetter: null,
  keptLetters: [],
  couplePhoto: null,
};

const avatarOr = (v: unknown, fallback: string): string =>
  typeof v === "string" && AVATARS.some((a) => a.id === v) ? v : fallback;
const slotOr = (v: unknown): PersonId | "" => (v === "A" || v === "B" ? v : "");

function normalizePingSlot(raw: unknown): PingsState["A"] {
  const r = isPlainObject(raw) ? raw : {};
  return {
    total: Math.max(0, Math.floor(finiteNum(r.total, 0))),
    lastAt: strOr(r.lastAt, ""),
    lastBurstAt: strOr(r.lastBurstAt, ""),
    burst: Math.max(0, Math.floor(finiteNum(r.burst, 0))),
  };
}

function normalizePresenceSlot(raw: unknown): PresenceSlot {
  const base = defaultPresenceSlot();
  if (!isPlainObject(raw) || typeof raw.sharing !== "boolean") return base;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    sharing: raw.sharing,
    startedAt: strOr(raw.startedAt, ""),
    expiresAt: strOr(raw.expiresAt, ""),
    lat: num(raw.lat), lng: num(raw.lng), acc: num(raw.acc),
    locAt: strOr(raw.locAt, ""),
    battery: num(raw.battery),
    at: strOr(raw.at, ""),
  };
}

/** Công tắc widget của một người: chỉ nhận boolean thật, còn lại mặc định TẮT
 *  (dữ liệu cũ chưa có trường này -> cả ba tắt, đúng cam kết "muốn thì tự bật"). */
function normalizeWidgetPrefs(raw: unknown): WidgetPrefs {
  const r = isPlainObject(raw) ? raw : {};
  return { day: boolOr(r.day, false), note: boolOr(r.note, false), tree: boolOr(r.tree, false) };
}

function normalizeNote(raw: unknown): LoveNote | null {
  if (!isPlainObject(raw)) return null;
  const authorSlot = slotOr(raw.authorSlot);
  if (!authorSlot || typeof raw.text !== "string" || !raw.text.trim()) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "",
    authorSlot,
    text: raw.text.slice(0, 300),
    mood: isMoodId(raw.mood) ? raw.mood : "",
    createdAt: strOr(raw.createdAt, ""),
    readAt: strOr(raw.readAt, ""),
  };
}

const ACTIVITY_ICONS = new Set(["water", "sunny", "heart", "bug", "sparkles", "mail", "location", "document-text", "people", "leaf"]);
function normalizeActivity(raw: unknown): Activity | null {
  if (!isPlainObject(raw) || typeof raw.text !== "string" || typeof raw.time !== "string") return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "",
    actor: strOr(raw.actor, ""),
    slot: slotOr(raw.slot) || undefined,
    text: raw.text,
    icon: typeof raw.icon === "string" && ACTIVITY_ICONS.has(raw.icon) ? raw.icon : "heart",
    time: raw.time,
  };
}

/** Một kỷ vật thư đã giữ: id + messageId thuộc kho 36 thư là điều kiện cứng;
 *  text thiếu/hỏng thì chụp lại từ kho theo messageId thay vì đánh rơi kỷ vật. */
function normalizeKeptLetter(raw: unknown): KeptLetter | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  const messageId = Math.floor(finiteNum(raw.messageId, 0));
  if (messageId < 1 || messageId > 36) return null;
  return {
    id: raw.id,
    messageId,
    text: typeof raw.text === "string" && raw.text.trim() ? raw.text : messageById(messageId).text,
    rarity: raw.rarity === "rare" || raw.rarity === "legendary" ? raw.rarity : "common",
    kind: raw.kind === "stage" || raw.kind === "combo" ? raw.kind : "care",
    source: strOr(raw.source, ""),
    bySlot: slotOr(raw.bySlot) || "A",
    receivedAt: strOr(raw.receivedAt, ""),
  };
}

/** Ảnh của hai đứa: chỉ nhận khi có path dạng chuỗi không rỗng + bySlot hợp lệ;
 *  updatedAt thiếu/hỏng -> "" (vẫn giữ ảnh, chỉ yếu thế khi merge). */
function normalizeCouplePhoto(raw: unknown): CouplePhoto | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.path !== "string" || !raw.path.trim()) return null;
  const bySlot = slotOr(raw.bySlot);
  if (!bySlot) return null;
  return { path: raw.path, updatedAt: strOr(raw.updatedAt, ""), bySlot };
}

export function normalizeState(rawInput: unknown): AppState {
  const raw: Record<string, unknown> = isPlainObject(rawInput) ? rawInput : {};
  const base: AppState = {
    ...defaultState,
    couple: { ...defaultState.couple },
    tree: createTree(),
    pings: defaultPings(),
    presence: { A: defaultPresenceSlot(), B: defaultPresenceSlot() },
    widgetPrefs: { A: defaultWidgetPrefs(), B: defaultWidgetPrefs() },
  };

  /* --- Định danh (sẽ bị SET_IDENTITY ghi đè từ hồ sơ Supabase ngay sau khi tải) --- */
  base.roomCode = strOr(raw.roomCode, base.roomCode) || base.roomCode;
  base.personA = strOr(raw.personA, base.personA) || base.personA;
  base.personB = strOr(raw.personB, base.personB) || base.personB;
  base.avatarA = avatarOr(raw.avatarA, base.avatarA);
  base.avatarB = avatarOr(raw.avatarB, base.avatarB);
  base.currentUser = raw.currentUser === "B" ? "B" : "A";

  /* --- CORE 1: ngày bắt đầu yêu --- */
  const rawCouple = isPlainObject(raw.couple) ? raw.couple : {};
  const startDate = isValidDateKey(rawCouple.startDate) ? (rawCouple.startDate as string)
    : isValidDateKey(raw.startDate) ? (raw.startDate as string)
    : base.couple.startDate;
  const celebratedRaw = Array.isArray(rawCouple.celebrated) ? rawCouple.celebrated : [];
  const celebratedStagesRaw = Array.isArray(rawCouple.celebratedStages) ? rawCouple.celebratedStages : [];
  const celebratedList = [...new Set(celebratedRaw.map((n) => Math.floor(finiteNum(n, 0))).filter((n) => MILESTONES.includes(n)))];
  // Lịch sử mốc: parse các bản ghi hợp lệ rồi BACKFILL mọi mốc đã có trong
  // celebrated mà chưa có lịch sử (bản lưu cũ) bằng reachedAt "" — ngày thật
  // của mốc luôn suy ra được từ startDate (milestoneDateKey).
  const historyRaw = Array.isArray(rawCouple.milestoneHistory) ? rawCouple.milestoneHistory : [];
  const historyParsed = historyRaw
    .filter((h) => isPlainObject(h))
    .map((h) => ({ days: Math.floor(finiteNum((h as Record<string, unknown>).days, 0)), reachedAt: strOr((h as Record<string, unknown>).reachedAt, "") }));
  base.couple = {
    startDate,
    startSetAt: strOr(rawCouple.startSetAt, ""),
    startSetBy: slotOr(rawCouple.startSetBy),
    celebrated: celebratedList,
    // Mặc định [] cho dữ liệu cũ: cặp đôi đang ở giai đoạn nào sẽ nhận đúng MỘT
    // lá thư "lên giai đoạn" cho giai đoạn hiện tại ở lần mở app đầu tiên.
    celebratedStages: [...new Set(celebratedStagesRaw.map((n) => Math.floor(finiteNum(n, 0))).filter((n) => n >= 1 && n <= 7))].sort((a, b) => a - b),
    milestoneHistory: unionMilestoneHistory(historyParsed, celebratedList.map((days) => ({ days, reachedAt: "" }))),
    pairedAt: strOr(rawCouple.pairedAt, "") || base.couple.pairedAt,
  };

  /* --- CORE 2: cây — shape mới nằm ở `tree`; bản cũ nằm ở plants[0] (cùng cấu trúc lõi) --- */
  const rawTree = isPlainObject(raw.tree) && typeof (raw.tree as { plantedAt?: unknown }).plantedAt === "string"
    ? raw.tree
    : null;
  const rawPlants = Array.isArray(raw.plants) ? raw.plants : [];
  const legacyPlant = rawPlants.length > 0 && isPlainObject(rawPlants[0])
    && typeof (rawPlants[0] as { plantedAt?: unknown }).plantedAt === "string"
    ? rawPlants[0]
    : null;
  base.tree = normalizeTree(rawTree ?? legacyPlant ?? undefined);

  /* --- CORE 3: notes (chỉ nhận mục khớp shape mới — note bản cũ dùng tên tác giả, bỏ) --- */
  const notes = objArray<unknown>(raw.notes).map(normalizeNote).filter((n): n is LoveNote => Boolean(n && n.id));
  base.notes = notes.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 200);
  const rawNoteLog = isPlainObject(raw.noteLog) ? raw.noteLog : {};
  base.noteLog = { A: strOr(rawNoteLog.A, ""), B: strOr(rawNoteLog.B, "") };

  /* --- CORE 4: pings + activities --- */
  const rawPings = isPlainObject(raw.pings) ? raw.pings : {};
  const rawPingDay = isPlainObject(rawPings.day) ? rawPings.day : {};
  base.pings = {
    A: normalizePingSlot(rawPings.A),
    B: normalizePingSlot(rawPings.B),
    day: {
      date: isValidDateKey(rawPingDay.date) ? (rawPingDay.date as string) : today(),
      A: Math.max(0, Math.floor(finiteNum(rawPingDay.A, 0))),
      B: Math.max(0, Math.floor(finiteNum(rawPingDay.B, 0))),
    },
  };
  base.activities = objArray<unknown>(raw.activities).map(normalizeActivity).filter((a): a is Activity => Boolean(a && a.id))
    .sort((a, b) => (b.time || "").localeCompare(a.time || "")).slice(0, 40);

  /* --- CORE 5: presence (chỉ nhận slot có cờ sharing dạng boolean — shape cũ khác hẳn, bỏ) --- */
  const rawPresence = isPlainObject(raw.presence) ? raw.presence : {};
  base.presence = { A: normalizePresenceSlot(rawPresence.A), B: normalizePresenceSlot(rawPresence.B) };

  /* --- Widget: công tắc riêng theo slot (bản cũ không có -> mặc định tắt cả ba) --- */
  const rawWidgetPrefs = isPlainObject(raw.widgetPrefs) ? raw.widgetPrefs : {};
  base.widgetPrefs = { A: normalizeWidgetPrefs(rawWidgetPrefs.A), B: normalizeWidgetPrefs(rawWidgetPrefs.B) };

  /* --- Hộp thư đã giữ (kỷ vật đợt 2): bản cũ chưa có trường -> [].
   *  unionKeptLetters lo khử trùng theo id + sắp mới nhất trước + trần 100. --- */
  base.keptLetters = unionKeptLetters([], objArray<unknown>(raw.keptLetters).map(normalizeKeptLetter).filter((k): k is KeptLetter => Boolean(k)));

  /* --- Ảnh của hai đứa (đợt 3): bản cũ chưa có trường -> null (chưa đặt ảnh) --- */
  base.couplePhoto = normalizeCouplePhoto(raw.couplePhoto);

  /* --- Thư rơi gần nhất: messageId phải thuộc kho 36 thư --- */
  const rawLetter = isPlainObject(raw.lastLetter) ? raw.lastLetter : null;
  if (rawLetter) {
    const mid = Math.floor(finiteNum(rawLetter.messageId, 0));
    const bySlot = slotOr(rawLetter.bySlot);
    if (mid >= 1 && mid <= 36 && bySlot && typeof rawLetter.id === "string" && rawLetter.id) {
      base.lastLetter = {
        id: rawLetter.id, messageId: mid,
        rarity: rawLetter.rarity === "rare" || rawLetter.rarity === "legendary" ? rawLetter.rarity : "common",
        source: strOr(rawLetter.source, ""),
        at: strOr(rawLetter.at, ""),
        bySlot,
      };
    }
  }

  base.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : undefined;
  if (isPlainObject(raw.secTs)) {
    const secTs: Record<string, { t: string; by: PersonId }> = {};
    for (const [k, v] of Object.entries(raw.secTs)) {
      if (isPlainObject(v) && typeof v.t === "string" && (v.by === "A" || v.by === "B")) secTs[k] = { t: v.t, by: v.by };
    }
    base.secTs = secTs;
  }
  return base;
}

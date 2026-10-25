import {
  AppState, CouplePhoto, LoveNote, PersonId, PresenceSlot, SecStamp, TreePestEvent, TreePlant, WidgetPrefs, defaultWidgetPrefs,
} from "./types";
import { totalGrowthMs } from "./tree";
import { unionKeptLetters, unionMilestoneHistory } from "./features";
import { mergeMemories } from "./memories";
import { mergeDailyQuests, unionQuestHistory } from "./quests";

/**
 * MERGE STATE GIỮA 2 MÁY — chống mất thao tác khi đồng bộ full-state qua
 * room_state + Broadcast (backend giữ nguyên). Kế thừa thiết kế đã kiểm chứng
 * của bản cũ, thu gọn cho 5 lõi:
 * 1) Mục RIÊNG THEO NGƯỜI (pings, presence, noteLog): quyết theo dấu secTs —
 *    ưu tiên tuyệt đối cho bản do CHÍNH chủ slot sửa (stamp.by === slot), nhờ
 *    vậy máy người kia không bao giờ đè được dữ liệu cá nhân của chủ nhân.
 * 2) Mục SƯU TẬP (notes, activities): hợp nhất theo id. Note: readAt lấy mốc
 *    đọc ĐẦU TIÊN (đã xem là đã xem, không "chưa xem" lại).
 * 3) Cây: hợp nhất theo từng trường đơn điệu — lần chăm máy này chưa có ở máy
 *    kia được cộng bù qua chênh lệch totalBoostMs/careCount.
 * 4) Ngày bắt đầu yêu: last-writer-wins theo startSetAt; celebrated hợp nhất.
 * 5) Thư rơi gần nhất: bản `at` mới hơn thắng (cùng một sự kiện lên giai đoạn có
 *    id xác định nên 2 máy hội tụ về đúng một lá).
 * 6) Kỷ vật (đợt 2): hộp thư đã giữ hợp nhất theo id (receivedAt sớm hơn thắng),
 *    lịch sử mốc hợp nhất theo số ngày — cả hai đều thuần union, không máy nào
 *    làm mất kỷ vật của máy kia.
 * 7) Ảnh của hai đứa (đợt 3): last-writer-wins theo couplePhoto.updatedAt —
 *    ảnh là MỘT vật duy nhất ghi đè tại chỗ trên Storage, nên mốc mới hơn là
 *    chân lý; phía chưa có ảnh luôn thua phía đã có.
 * 8) Dây kỷ niệm: bộ sưu tập union theo id + LWW từng ảnh theo updatedAt;
 *    danh sách MỘ xoá hợp nhất union và áp khi hiện thực hoá — một lần xoá ở
 *    máy nào cũng thắng mọi bản sao cũ ở máy kia (lib/memories.ts).
 */

const SLOTS: PersonId[] = ["A", "B"];

function stampOf(s: AppState, key: string): SecStamp | undefined {
  return s.secTs ? s.secTs[key] : undefined;
}

/** Chọn bên thắng cho một mục theo slot: ưu tiên chủ nhân slot, rồi tới mốc thời gian. */
function slotWinner(local: AppState, remote: AppState, key: string, slot: PersonId, remoteNewer: boolean): "local" | "remote" {
  const k = `${key}:${slot}`;
  const ls = stampOf(local, k);
  const rs = stampOf(remote, k);
  const lOwner = Boolean(ls && ls.by === slot);
  const rOwner = Boolean(rs && rs.by === slot);
  if (lOwner && !rOwner) return "local";
  if (rOwner && !lOwner) return "remote";
  if (ls && rs) return ls.t >= rs.t ? "local" : "remote";
  if (ls) return "local";
  if (rs) return "remote";
  if (remote.currentUser === slot && local.currentUser !== slot) return "remote";
  if (local.currentUser === slot && remote.currentUser !== slot) return "local";
  return remoteNewer ? "remote" : "local";
}

/* ---------- Cây (một cây duy nhất) ---------- */
export function mergeTreePair(l: TreePlant, r: TreePlant): TreePlant {
  const base = (r.growthAt || "") > (l.growthAt || "") ? r : l;
  const other = base === l ? r : l;
  // Cộng bù lần chăm mà phía base chưa có (nhận biết qua totalBoostMs lớn hơn).
  let growth = base.growthRecordedMs;
  if (other.totalBoostMs > base.totalBoostMs) growth += other.totalBoostMs - base.totalBoostMs;
  growth = Math.min(growth, totalGrowthMs());
  // Chỉ số: bên nào có lần chăm SAU mốc statsAt của bên kia thì chỉ số bên đó mới nhất.
  let statsSrc = base;
  const careL = l.lastCareAt || "";
  const careR = r.lastCareAt || "";
  if (careL > (r.statsAt || "") && careL >= careR) statsSrc = l;
  else if (careR > (l.statsAt || "") && careR > careL) statsSrc = r;
  else if ((l.statsAt || "") > (base.statsAt || "")) statsSrc = l;
  else if ((r.statsAt || "") > (base.statsAt || "")) statsSrc = r;
  const careSide = careL >= careR ? l : r;
  const growthAt = (l.growthAt || "") >= (r.growthAt || "") ? l.growthAt : r.growthAt;
  const matureAt = l.matureAt && r.matureAt ? (l.matureAt <= r.matureAt ? l.matureAt : r.matureAt) : (l.matureAt || r.matureAt);
  return {
    ...base,
    growthRecordedMs: growth,
    growthAt,
    // Giữ bất biến statsAt == growthAt như materializeTree vẫn duy trì.
    statsAt: growthAt,
    water: statsSrc.water, sun: statsSrc.sun, love: statsSrc.love,
    totalBoostMs: Math.max(l.totalBoostMs, r.totalBoostMs),
    careCount: Math.max(l.careCount, r.careCount),
    announcedStage: Math.max(l.announcedStage, r.announcedStage),
    lastCareAt: careSide.lastCareAt,
    lastCareBySlot: careSide.lastCareBySlot,
    lastCareAtBy: {
      A: (l.lastCareAtBy?.A || "") >= (r.lastCareAtBy?.A || "") ? (l.lastCareAtBy?.A || "") : (r.lastCareAtBy?.A || ""),
      B: (l.lastCareAtBy?.B || "") >= (r.lastCareAtBy?.B || "") ? (l.lastCareAtBy?.B || "") : (r.lastCareAtBy?.B || ""),
    },
    matureAt,
    plantedAt: (l.plantedAt || "") <= (r.plantedAt || "") ? l.plantedAt : r.plantedAt,
  };
}

/* ---------- Ảnh của hai đứa: LWW theo updatedAt ---------- */
export function mergeCouplePhoto(l: CouplePhoto | null, r: CouplePhoto | null): CouplePhoto | null {
  if (!l) return r;
  if (!r) return l;
  return (r.updatedAt || "") > (l.updatedAt || "") ? r : l;
}

/* ---------- Sự kiện sâu: một sự kiện dùng chung, hội tụ xác định ---------- */
/**
 * Merge đợt sâu giữa 2 máy:
 * - Khác id (mỗi máy ghi một đợt khác nhau): đợt xuất hiện MUỘN hơn thắng
 *   (đợt cũ hơn coi như đã qua — không bao giờ có 2 đợt chồng nhau).
 * - Cùng id: trạng thái "đã kết thúc" thắng "đang sống" — đã bắt (bản caughtAt
 *   sớm nhất) thắng đã hết hạn, hết hạn thắng đang sống. Nhờ vậy máy chưa kịp
 *   biết sâu đã bị bắt không bao giờ "hồi sinh" đợt sâu đó.
 */
export function mergeTreePest(l: TreePestEvent | null, r: TreePestEvent | null): TreePestEvent | null {
  if (!l) return r;
  if (!r) return l;
  if (l.id !== r.id) return (r.appearedAt || "") > (l.appearedAt || "") ? r : l;
  const rank = (p: TreePestEvent): number => (p.status === "caught" ? 2 : p.status === "expired" ? 1 : 0);
  if (rank(l) !== rank(r)) return rank(l) > rank(r) ? l : r;
  if (l.status === "caught" && r.status === "caught") {
    return (r.caughtAt || "") < (l.caughtAt || "") ? r : l;
  }
  return l;
}

/* ---------- Merge chính ---------- */
export function mergeStates(local: AppState, remote: AppState, mySlot: PersonId): AppState {
  const lt = local.updatedAt || "";
  const rt = remote.updatedAt || "";
  const remoteNewer = rt > lt;
  const newer = remoteNewer ? remote : local;

  const secTs: Record<string, SecStamp> = {};
  for (const k of new Set([...Object.keys(local.secTs || {}), ...Object.keys(remote.secTs || {})])) {
    const a = local.secTs?.[k];
    const b = remote.secTs?.[k];
    const w = a && b ? (a.t >= b.t ? a : b) : (a || b);
    if (w) secTs[k] = w;
  }
  const stampFrom = (key: string, side: AppState) => {
    const st = stampOf(side, key);
    if (st) secTs[key] = st; else delete secTs[key];
  };
  const pickSlot = <T,>(key: string, slot: PersonId, lval: T, rval: T): T => {
    if (JSON.stringify(lval) === JSON.stringify(rval)) return lval;
    const w = slotWinner(local, remote, key, slot, remoteNewer);
    stampFrom(`${key}:${slot}`, w === "local" ? local : remote);
    return w === "local" ? lval : rval;
  };

  /* --- CORE 1: ngày bắt đầu — LWW theo startSetAt; celebrated hợp nhất --- */
  const coupleSide = (remote.couple.startSetAt || "") > (local.couple.startSetAt || "") ? remote : local;
  const couple = {
    startDate: coupleSide.couple.startDate,
    startSetAt: coupleSide.couple.startSetAt,
    startSetBy: coupleSide.couple.startSetBy,
    celebrated: [...new Set([...local.couple.celebrated, ...remote.couple.celebrated])].sort((a, b) => a - b),
    celebratedStages: [...new Set([...(local.couple.celebratedStages || []), ...(remote.couple.celebratedStages || [])])].sort((a, b) => a - b),
    milestoneHistory: unionMilestoneHistory(local.couple.milestoneHistory || [], remote.couple.milestoneHistory || []),
    pairedAt: [local.couple.pairedAt, remote.couple.pairedAt].filter(Boolean).sort()[0] || "",
  };
  if (coupleSide === remote) stampFrom("couple", remote); else stampFrom("couple", local);

  /* --- CORE 2: cây --- */
  const tree = mergeTreePair(local.tree, remote.tree);

  /* --- CORE 3: notes — union theo id; readAt lấy mốc đọc đầu tiên --- */
  const noteMap = new Map<string, LoveNote>(local.notes.map((n) => [n.id, n]));
  for (const rn of remote.notes) {
    const ln = noteMap.get(rn.id);
    if (!ln) { noteMap.set(rn.id, rn); continue; }
    const readAt = ln.readAt && rn.readAt ? (ln.readAt <= rn.readAt ? ln.readAt : rn.readAt) : (ln.readAt || rn.readAt);
    if (readAt !== ln.readAt) noteMap.set(rn.id, { ...ln, readAt });
  }
  const notes = [...noteMap.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 200);
  const noteLog = {
    A: pickSlot("noteLog", "A", local.noteLog.A, remote.noteLog.A),
    B: pickSlot("noteLog", "B", local.noteLog.B, remote.noteLog.B),
  };

  /* --- CORE 4: pings (per-slot) + bộ đếm ngày (đơn điệu trong ngày -> max) + activities --- */
  const pingsDay = local.pings.day.date !== remote.pings.day.date
    ? (local.pings.day.date > remote.pings.day.date ? local.pings.day : remote.pings.day)
    : { date: local.pings.day.date, A: Math.max(local.pings.day.A, remote.pings.day.A), B: Math.max(local.pings.day.B, remote.pings.day.B) };
  const pings = {
    A: pickSlot("pings", "A", local.pings.A, remote.pings.A),
    B: pickSlot("pings", "B", local.pings.B, remote.pings.B),
    day: pingsDay,
  };
  const actMap = new Map(local.activities.map((a) => [a.id, a]));
  for (const ra of remote.activities) if (!actMap.has(ra.id)) actMap.set(ra.id, ra);
  const activities = [...actMap.values()].sort((a, b) => (b.time || "").localeCompare(a.time || "")).slice(0, 40);

  /* --- CORE 5: presence (per-slot, chủ slot thắng) --- */
  const presence: { A: PresenceSlot; B: PresenceSlot } = {
    A: pickSlot("presence", "A", local.presence.A, remote.presence.A),
    B: pickSlot("presence", "B", local.presence.B, remote.presence.B),
  };

  /* --- Widget: công tắc RIÊNG theo slot (chủ slot thắng — máy người kia không
   *  bao giờ đè được lựa chọn widget của mình). Bản cũ thiếu trường -> mặc định. --- */
  const widgetPrefs: { A: WidgetPrefs; B: WidgetPrefs } = {
    A: pickSlot("widgetPrefs", "A", local.widgetPrefs?.A ?? defaultWidgetPrefs(), remote.widgetPrefs?.A ?? defaultWidgetPrefs()),
    B: pickSlot("widgetPrefs", "B", local.widgetPrefs?.B ?? defaultWidgetPrefs(), remote.widgetPrefs?.B ?? defaultWidgetPrefs()),
  };

  /* --- Trạng thái của nhau: RIÊNG theo slot như presence/widgetPrefs — chủ
   *  slot thắng tuyệt đối (mỗi người chỉ ghi trạng thái của chính mình). --- */
  const status = {
    A: pickSlot("status", "A", local.status?.A ?? null, remote.status?.A ?? null),
    B: pickSlot("status", "B", local.status?.B ?? null, remote.status?.B ?? null),
  };

  /* --- Thư rơi gần nhất: mốc `at` mới hơn thắng --- */
  const lastLetter = !local.lastLetter ? remote.lastLetter
    : !remote.lastLetter ? local.lastLetter
    : (remote.lastLetter.at || "") > (local.lastLetter.at || "") ? remote.lastLetter : local.lastLetter;

  /* --- Hộp thư đã giữ: union theo id (bản receivedAt sớm hơn thắng), trần 100 --- */
  const keptLetters = unionKeptLetters(local.keptLetters || [], remote.keptLetters || []);

  /* --- Ảnh của hai đứa: LWW theo updatedAt (null luôn thua ảnh đã đặt) --- */
  const couplePhoto = mergeCouplePhoto(local.couplePhoto ?? null, remote.couplePhoto ?? null);
  if (couplePhoto === remote.couplePhoto) stampFrom("couplePhoto", remote); else stampFrom("couplePhoto", local);

  /* --- Dây kỷ niệm: union theo id + LWW từng ảnh; mộ xoá union rồi áp khi
   *     hiện thực hoá (bản cũ thiếu trường -> rỗng). --- */
  const { memories, removedMemoryIds } = mergeMemories(
    local.memories ?? [], remote.memories ?? [],
    local.removedMemoryIds ?? [], remote.removedMemoryIds ?? [],
  );

  /* --- Sự kiện sâu trên cây: hội tụ xác định (xem mergeTreePest) --- */
  const treePest = mergeTreePest(local.treePest ?? null, remote.treePest ?? null);

  /* --- Nhiệm vụ ngày: tiến độ đơn điệu trong ngày -> hợp nhất hội tụ;
   *     lịch sử ngày hoàn thành: union (xem lib/quests.ts) --- */
  const dailyQuests = mergeDailyQuests(local.dailyQuests, remote.dailyQuests);
  const questHistory = unionQuestHistory(local.questHistory || [], remote.questHistory || []);

  return {
    ...newer,
    currentUser: local.currentUser,
    roomCode: newer.roomCode,
    personA: newer.personA, personB: newer.personB,
    avatarA: newer.avatarA, avatarB: newer.avatarB,
    couple, tree, treePest, dailyQuests, questHistory, notes, noteLog, pings, activities, presence, widgetPrefs, status, lastLetter, keptLetters, couplePhoto, memories, removedMemoryIds,
    updatedAt: lt >= rt ? lt : rt,
    secTs,
  };
}

/* ---------- Đóng dấu secTs sau mỗi action cục bộ ---------- */
interface SlotSpec { key: string; get: (s: AppState, slot: PersonId) => unknown }
const SLOT_SPECS: SlotSpec[] = [
  { key: "pings", get: (s, slot) => s.pings[slot] },
  { key: "presence", get: (s, slot) => s.presence[slot] },
  { key: "noteLog", get: (s, slot) => s.noteLog[slot] },
  { key: "widgetPrefs", get: (s, slot) => s.widgetPrefs[slot] },
  { key: "status", get: (s, slot) => s.status[slot] },
];
const SHARED_SPECS: { key: string; get: (s: AppState) => unknown }[] = [
  { key: "couple", get: (s) => s.couple },
  { key: "tree", get: (s) => s.tree },
  { key: "treePest", get: (s) => s.treePest },
  { key: "dailyQuests", get: (s) => s.dailyQuests },
  { key: "questHistory", get: (s) => s.questHistory },
  { key: "notes", get: (s) => s.notes },
  { key: "activities", get: (s) => s.activities },
  { key: "lastLetter", get: (s) => s.lastLetter },
  { key: "keptLetters", get: (s) => s.keptLetters },
  { key: "couplePhoto", get: (s) => s.couplePhoto },
  { key: "memories", get: (s) => s.memories },
  { key: "removedMemoryIds", get: (s) => s.removedMemoryIds },
];

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/**
 * Sau một action CỤC BỘ: mục nào thay đổi thì đóng dấu {t, by} mới — máy kia
 * merge sẽ biết mục nào do chính chủ nhân slot sửa gần nhất.
 * Trả về chính `next` (cùng reference) nếu không mục nào đổi.
 */
export function stampSections(prev: AppState, next: AppState, by: PersonId, stampIso: string): AppState {
  if (prev === next) return next;
  const stamps: Record<string, SecStamp> = { ...(next.secTs || {}) };
  let changed = false;
  for (const spec of SLOT_SPECS) {
    for (const slot of SLOTS) {
      if (!sameValue(spec.get(prev, slot), spec.get(next, slot))) {
        stamps[`${spec.key}:${slot}`] = { t: stampIso, by };
        changed = true;
      }
    }
  }
  for (const spec of SHARED_SPECS) {
    if (!sameValue(spec.get(prev), spec.get(next))) {
      stamps[spec.key] = { t: stampIso, by };
      changed = true;
    }
  }
  return changed ? { ...next, secTs: stamps } : next;
}

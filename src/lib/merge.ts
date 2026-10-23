import {
  AppState, PersonId, PlantState, SecStamp, defaultState,
} from "./types";
import { speciesById, totalGrowthMs } from "./plants";

/**
 * MERGE STATE GIỮA 2 MÁY — chống mất thao tác khi đồng bộ full-state.
 *
 * Bối cảnh: state vườn lưu nguyên khối trong room_state + Broadcast (giữ nguyên
 * backend). Nếu chỉ "bản nào updatedAt mới hơn thắng tất" (last-writer-wins) thì
 * khi 2 máy thao tác gần như đồng thời, thao tác của máy "thua" bị xoá sạch dù
 * hai thao tác chẳng liên quan nhau (vd A đặt mood, B tưới cây cùng lúc).
 *
 * Thiết kế merge ở đây (thuần hàm, kiểm chứng bằng scripts/test-logic.mjs):
 * 1) Mục RIÊNG THEO NGƯỜI (mood, đáp án, quiz, lượt quay, điểm game, love note,
 *    giới hạn, nhật ký nội dung — khoá theo slot A/B): quyết định theo dấu secTs.
 *    Ưu tiên tuyệt đối cho bản do CHÍNH chủ nhân slot sửa (stamp.by === slot) —
 *    nhờ vậy việc máy người kia "reset ngày" (ghi mood rỗng cho cả hai theo bản
 *    sao cũ của họ) không đè được mood chủ nhân vừa đặt. Thiếu dấu thì suy ra từ
 *    currentUser của bản ghi (máy nào lưu bản đó).
 *    Riêng các mục ĐƠN ĐIỆU trong ngày (tiến độ nhiệm vụ, lượt quay, lượt chơi,
 *    kỷ lục tuần, danh sách đã nhận thưởng) merge bằng max/union — chính xác
 *    tuyệt đối, không cần dấu thời gian.
 * 2) Mục SƯU TẬP (thư, ghi chú, bucket, kỷ niệm, hoạt động, huy hiệu, kho đồ,
 *    cây đã thu): hợp nhất theo id (union). Thư: bản "đã mở" thắng.
 * 3) Cây: hợp nhất theo id + theo từng trường đơn điệu (xem mergePlantPair) —
 *    lần chăm cây của máy này mà máy kia chưa có sẽ được cộng bù qua chênh lệch
 *    totalBoostMs/careCount.
 * 4) Mục CHUNG còn lại (ví chung, XP, equipped, streak, tên vườn...): theo
 *    updatedAt mới hơn; riêng coins có heuristic theo kho đồ (xem mergeStates) và
 *    XP luôn lấy max (XP chỉ tăng).
 *
 * GIỚI HẠN CÒN LẠI (nói thẳng):
 * - Coins: khi cả 2 phía cùng neo coinsBase (điểm đồng bộ chung gần nhất), merge cộng
 *   ĐÚNG delta của cả hai (thu nhập đồng thời không mất, mua ở 2 máy trừ đúng 2 lần).
 *   Chỉ khi hai phía lệch neo (một phía chưa từng nhận bản đã neo) mới rơi về heuristic
 *   kho đồ cũ: cùng mua 2 món khác nhau thì lấy số nhỏ hơn (không tạo tiền từ hư không,
 *   nhưng có thể trừ trùng một lần).
 * - Thư rơi do 2 máy cùng phát hiện "lên giai đoạn" được chống trùng bằng id xác
 *   định (stageup-<plantId>-<stage>) ở màn hình Vườn; thư rơi ngẫu nhiên khi chăm
 *   chỉ do máy người chăm tạo nên không trùng.
 * - Hai lần chăm CÙNG một cây bởi 2 người trong cùng một cửa sổ đồng bộ (~1 giây)
 *   vẫn có thể mất một lần (chỉ số cây lấy theo lần chăm mới hơn; boost được cộng
 *   bù qua totalBoostMs nên phần "tăng trưởng" không mất).
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

/* ---------- Cây ---------- */

function mergePlantPair(l: PlantState, r: PlantState): PlantState {
  const base = (r.growthAt || "") > (l.growthAt || "") ? r : l;
  const other = base === l ? r : l;
  // Cộng bù lần chăm mà phía base chưa có: nhận biết qua totalBoostMs/careCount lớn hơn.
  let growth = base.growthRecordedMs;
  if (other.totalBoostMs > base.totalBoostMs) growth += other.totalBoostMs - base.totalBoostMs;
  const total = totalGrowthMs(speciesById(base.speciesId));
  growth = Math.min(growth, total);
  // Chỉ số: bên nào có lần chăm SAU mốc statsAt của bên kia thì chỉ số của bên đó mới nhất.
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
  let fruitReadyAt: string;
  if (l.harvestCount !== r.harvestCount) fruitReadyAt = l.harvestCount > r.harvestCount ? l.fruitReadyAt : r.fruitReadyAt;
  else if (!l.fruitReadyAt || !r.fruitReadyAt) fruitReadyAt = l.fruitReadyAt || r.fruitReadyAt;
  else fruitReadyAt = l.fruitReadyAt >= r.fruitReadyAt ? l.fruitReadyAt : r.fruitReadyAt;
  return {
    ...base,
    growthRecordedMs: growth,
    growthAt,
    // Giữ bất biến statsAt == growthAt như materializePlant vẫn duy trì.
    statsAt: growthAt,
    water: statsSrc.water, sun: statsSrc.sun, love: statsSrc.love,
    totalBoostMs: Math.max(l.totalBoostMs, r.totalBoostMs),
    careCount: Math.max(l.careCount, r.careCount),
    harvestCount: Math.max(l.harvestCount, r.harvestCount),
    announcedStage: Math.max(l.announcedStage, r.announcedStage),
    lastCareAt: careSide.lastCareAt,
    lastCareBy: careSide.lastCareBy,
    lastCareAtBy: {
      A: (l.lastCareAtBy?.A || "") >= (r.lastCareAtBy?.A || "") ? (l.lastCareAtBy?.A || "") : (r.lastCareAtBy?.A || ""),
      B: (l.lastCareAtBy?.B || "") >= (r.lastCareAtBy?.B || "") ? (l.lastCareAtBy?.B || "") : (r.lastCareAtBy?.B || ""),
    },
    matureAt,
    fruitReadyAt,
    plantedAt: (l.plantedAt || "") <= (r.plantedAt || "") ? l.plantedAt : r.plantedAt,
  };
}

export function mergePlants(local: PlantState[], remote: PlantState[]): PlantState[] {
  const byId = new Map<string, PlantState>();
  for (const p of local) byId.set(p.id, p);
  for (const p of remote) {
    const ex = byId.get(p.id);
    byId.set(p.id, ex ? mergePlantPair(ex, p) : p);
  }
  return [...byId.values()];
}

/* ---------- Merge chính ---------- */

export function mergeStates(local: AppState, remote: AppState, mySlot: PersonId): AppState {
  const lt = local.updatedAt || "";
  const rt = remote.updatedAt || "";
  const remoteNewer = rt > lt;
  const newer = remoteNewer ? remote : local;
  const older = remoteNewer ? local : remote;

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

  /* --- moods / answers: theo ngày, trong ngày theo từng slot --- */
  function mergeDatedPair<T extends { date: string }>(
    key: string,
    lsec: T & Record<PersonId, string>,
    rsec: T & Record<PersonId, string>,
  ): T & Record<PersonId, string> {
    if (lsec.date !== rsec.date) return (lsec.date > rsec.date ? lsec : rsec) as T & Record<PersonId, string>;
    const out = { ...lsec } as T & Record<PersonId, string>;
    for (const slot of SLOTS) {
      const w = slotWinner(local, remote, key, slot, remoteNewer);
      out[slot] = (w === "local" ? lsec : rsec)[slot];
      stampFrom(`${key}:${slot}`, w === "local" ? local : remote);
    }
    return out;
  }
  const moods = mergeDatedPair("moods", local.moods, remote.moods);
  const answers = mergeDatedPair("answers", local.answers, remote.answers);

  /* --- daily: đơn điệu trong ngày -> max/union; khác ngày lấy ngày mới hơn --- */
  let daily = local.daily;
  if (local.daily.date !== remote.daily.date) {
    daily = local.daily.date > remote.daily.date ? local.daily : remote.daily;
  } else {
    const d = { ...local.daily };
    for (const slot of SLOTS) {
      const a = local.daily[slot];
      const b = remote.daily[slot];
      d[slot] = {
        water: Math.max(a.water, b.water), love: Math.max(a.love, b.love),
        sun: Math.max(a.sun, b.sun), bug: Math.max(a.bug, b.bug),
      };
    }
    d.caredA = local.daily.caredA || remote.daily.caredA;
    d.caredB = local.daily.caredB || remote.daily.caredB;
    d.claimedA = [...new Set([...local.daily.claimedA, ...remote.daily.claimedA])];
    d.claimedB = [...new Set([...local.daily.claimedB, ...remote.daily.claimedB])];
    daily = d;
  }

  /* --- games --- */
  const games = { ...local.games };
  if (local.games.spin.date !== remote.games.spin.date) games.spin = local.games.spin.date > remote.games.spin.date ? local.games.spin : remote.games.spin;
  else games.spin = { date: local.games.spin.date, A: Math.max(local.games.spin.A, remote.games.spin.A), B: Math.max(local.games.spin.B, remote.games.spin.B) };
  if (local.games.heartPlays.date !== remote.games.heartPlays.date) games.heartPlays = local.games.heartPlays.date > remote.games.heartPlays.date ? local.games.heartPlays : remote.games.heartPlays;
  else games.heartPlays = { date: local.games.heartPlays.date, A: Math.max(local.games.heartPlays.A, remote.games.heartPlays.A), B: Math.max(local.games.heartPlays.B, remote.games.heartPlays.B) };
  if (local.games.heartBest.week !== remote.games.heartBest.week) games.heartBest = local.games.heartBest.week > remote.games.heartBest.week ? local.games.heartBest : remote.games.heartBest;
  else games.heartBest = { week: local.games.heartBest.week, A: Math.max(local.games.heartBest.A, remote.games.heartBest.A), B: Math.max(local.games.heartBest.B, remote.games.heartBest.B) };
  if (local.games.dailyWins.date !== remote.games.dailyWins.date) games.dailyWins = local.games.dailyWins.date > remote.games.dailyWins.date ? local.games.dailyWins : remote.games.dailyWins;
  else games.dailyWins = {
    date: local.games.dailyWins.date,
    memory: { A: Math.max(local.games.dailyWins.memory.A, remote.games.dailyWins.memory.A), B: Math.max(local.games.dailyWins.memory.B, remote.games.dailyWins.memory.B) },
    dice: { A: Math.max(local.games.dailyWins.dice.A, remote.games.dailyWins.dice.A), B: Math.max(local.games.dailyWins.dice.B, remote.games.dailyWins.dice.B) },
  };
  if (local.games.quiz.date !== remote.games.quiz.date) games.quiz = local.games.quiz.date > remote.games.quiz.date ? local.games.quiz : remote.games.quiz;
  else {
    const quiz = { date: local.games.quiz.date, A: local.games.quiz.A, B: local.games.quiz.B };
    for (const slot of SLOTS) {
      const a = local.games.quiz[slot];
      const b = remote.games.quiz[slot];
      if (a.length !== b.length) { quiz[slot] = a.length > b.length ? a : b; stampFrom(`games.quiz:${slot}`, a.length > b.length ? local : remote); }
      else if (a.length > 0 && a.join(",") !== b.join(",")) {
        const w = slotWinner(local, remote, "games.quiz", slot, remoteNewer);
        quiz[slot] = w === "local" ? a : b;
        stampFrom(`games.quiz:${slot}`, w === "local" ? local : remote);
      }
    }
    games.quiz = quiz;
  }

  /* --- loveNotes / loveLimits / contentLog --- */
  const loveNotes = { ...local.loveNotes };
  for (const slot of SLOTS) {
    if (local.loveNotes[slot] !== remote.loveNotes[slot]) {
      const w = slotWinner(local, remote, "loveNotes", slot, remoteNewer);
      loveNotes[slot] = (w === "local" ? local : remote).loveNotes[slot];
      stampFrom(`loveNotes:${slot}`, w === "local" ? local : remote);
    }
  }
  let loveLimits = local.loveLimits;
  if (local.loveLimits.date !== remote.loveLimits.date) {
    loveLimits = local.loveLimits.date > remote.loveLimits.date ? local.loveLimits : remote.loveLimits;
  } else {
    const ll = { date: local.loveLimits.date, counts: { ...local.loveLimits.counts }, lastAt: { ...local.loveLimits.lastAt } };
    for (const slot of SLOTS) {
      const a = { c: local.loveLimits.counts[slot], at: local.loveLimits.lastAt[slot] };
      const b = { c: remote.loveLimits.counts[slot], at: remote.loveLimits.lastAt[slot] };
      const win = b.c > a.c || (b.c === a.c && b.at > a.at) ? b : a;
      ll.counts[slot] = win.c;
      ll.lastAt[slot] = win.at;
    }
    loveLimits = ll;
  }
  const contentLog = {
    A: (local.contentLog.A || "") >= (remote.contentLog.A || "") ? local.contentLog.A : remote.contentLog.A,
    B: (local.contentLog.B || "") >= (remote.contentLog.B || "") ? local.contentLog.B : remote.contentLog.B,
  };

  /* --- frameRewards --- */
  let frameRewards = local.frameRewards;
  if (local.frameRewards.date !== remote.frameRewards.date) {
    frameRewards = local.frameRewards.date > remote.frameRewards.date ? local.frameRewards : remote.frameRewards;
  } else {
    frameRewards = { date: local.frameRewards.date, claimed: [...new Set([...local.frameRewards.claimed, ...remote.frameRewards.claimed])] };
  }

  /* --- sưu tập: union theo id --- */
  const letterMap = new Map(local.letters.map((l) => [l.id, l]));
  for (const rl of remote.letters) {
    const ll = letterMap.get(rl.id);
    if (!ll) letterMap.set(rl.id, rl);
    else if (rl.opened && !ll.opened) letterMap.set(rl.id, rl);
    // Cả hai bản đều đã mở (2 máy mở gần như đồng thời): ưu tiên bản ghi được SLOT người
    // mở — bản chỉ có tên hiển thị có thể gán nhầm người khi trùng tên/đổi tên.
    else if (rl.opened && ll.opened && rl.openedBySlot && !ll.openedBySlot) letterMap.set(rl.id, rl);
    // Cùng id nhưng KHÁC nội dung (lệch dữ liệu lịch sử): chọn XÁC ĐỊNH để 2 chiều
    // merge hội tụ về cùng một bản — bản đã mở thắng; ngang nhau thì messageId nhỏ
    // hơn thắng. Bản cũ giữ bản cục bộ theo updatedAt nên 2 máy giữ 2 nội dung mãi mãi.
    else if (Number(ll.messageId) !== Number(rl.messageId) && ll.opened === rl.opened && Number(rl.messageId) < Number(ll.messageId)) letterMap.set(rl.id, rl);
    else if (rl.opened === ll.opened && remoteNewer) letterMap.set(rl.id, rl);
  }
  const letters = [...letterMap.values()].sort((a, b) => (b.droppedAt || "").localeCompare(a.droppedAt || "")).slice(0, 100);
  // Bộ sưu tập thư bền vững: union letterCollection của 2 phía + id (ép SỐ) của mọi lá thư
  // hai phía đang giữ — thư bị cắt khỏi hộp thư khi xoay vòng vẫn không mất khỏi sưu tập.
  const letterCollection = [...new Set([
    ...(local.letterCollection ?? []),
    ...(remote.letterCollection ?? []),
    ...local.letters.map((l) => Number(l.messageId)),
    ...remote.letters.map((l) => Number(l.messageId)),
  ].map((n) => Number(n)).filter((n) => Number.isFinite(n)))];

  const unionById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const m = new Map(a.map((x) => [x.id, x]));
    for (const x of b) if (!m.has(x.id)) m.set(x.id, x);
    return [...m.values()];
  };
  // TOMBSTONE: hợp nhất danh sách id đã xoá của 2 phía (tối đa 500 id gần nhất mỗi loại)
  // rồi lọc cả 3 danh sách — mục đã xoá ở BẤT KỲ máy nào cũng không bị union hồi sinh.
  const unionDeleted = (a?: string[], b?: string[]): string[] => [...new Set([...(a ?? []), ...(b ?? [])])].slice(-500);
  const deletedIds = {
    notes: unionDeleted(local.deletedIds?.notes, remote.deletedIds?.notes),
    bucket: unionDeleted(local.deletedIds?.bucket, remote.deletedIds?.bucket),
    memories: unionDeleted(local.deletedIds?.memories, remote.deletedIds?.memories),
  };
  const notes = unionById(local.notes, remote.notes).filter((n) => !deletedIds.notes.includes(n.id)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const bucketMap = new Map(local.bucket.map((x) => [x.id, x]));
  for (const rb of remote.bucket) {
    const lb = bucketMap.get(rb.id);
    if (!lb) bucketMap.set(rb.id, rb);
    // Có doneAt (mốc bật/tắt gần nhất): bản doneAt MỚI HƠN thắng toàn bộ — nhờ vậy BỎ
    // đánh dấu "đã xong" cũng có hiệu lực. Dữ liệu cũ chưa có doneAt: giữ luật cũ
    // "done=true thắng" (một lần bật không bị bản cũ chưa bật ghi đè mất).
    else if (lb.doneAt || rb.doneAt) {
      if ((rb.doneAt || "") > (lb.doneAt || "")) bucketMap.set(rb.id, rb);
    }
    else if (rb.done && !lb.done) bucketMap.set(rb.id, { ...lb, done: true });
  }
  const bucket = [...bucketMap.values()].filter((b) => !deletedIds.bucket.includes(b.id)).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const memories = unionById(local.memories, remote.memories).filter((m) => !deletedIds.memories.includes(m.id)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const activities = unionById(local.activities, remote.activities).sort((a, b) => (b.time || "").localeCompare(a.time || "")).slice(0, 40);
  const achievements = [...new Set([...local.achievements, ...remote.achievements])];
  const inventory = [...new Set([...local.inventory, ...remote.inventory])];
  const treeCollection = unionById(local.treeCollection, remote.treeCollection).sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));

  /* --- cây --- */
  // treeCollection đóng vai trò TOMBSTONE cho plants: cây đã thu ở BẤT KỲ máy nào
  // cũng không được hồi sinh từ bản sao cũ của máy kia (bản cũ union theo id vô điều
  // kiện -> thu cây xong nó mọc lại, thu lần 2 ăn thưởng trưởng thành + XP lần nữa).
  const collectedIds = new Set(treeCollection.map((c) => c.id));
  const plants = mergePlants(local.plants, remote.plants).filter((p) => !collectedIds.has(p.id));

  /* --- ví chung: suy luận theo kho đồ để không mất/không nhân tiền khi 2 máy cùng thao tác --- */
  const invL = new Set(local.inventory);
  const invR = new Set(remote.inventory);
  const lGrew = local.inventory.some((i) => !invR.has(i));
  const rGrew = remote.inventory.some((i) => !invL.has(i));
  let coins: number;
  const baseL = typeof local.coinsBase === "number" && Number.isFinite(local.coinsBase) ? local.coinsBase : undefined;
  const baseR = typeof remote.coinsBase === "number" && Number.isFinite(remote.coinsBase) ? remote.coinsBase : undefined;
  if (baseL != null && baseL === baseR) {
    // Cùng neo: cộng delta của CẢ HAI phía so với neo chung — thu nhập đồng thời không
    // bị mất (max cũ nuốt phần nhỏ hơn) và 2 lần mua ở 2 máy trừ đúng 2 lần.
    coins = Math.max(0, baseL + (local.coins - baseL) + (remote.coins - baseL));
  }
  else if (lGrew && !rGrew) coins = local.coins;
  else if (rGrew && !lGrew) coins = remote.coins;
  else if (!lGrew && !rGrew) coins = Math.max(local.coins, remote.coins);
  else coins = Math.min(local.coins, remote.coins);

  const tree = {
    ...newer.tree,
    xp: Math.max(local.tree.xp, remote.tree.xp),
    careCount: Math.max(local.tree.careCount, remote.tree.careCount),
  };
  const streak = local.streak.lastDate === remote.streak.lastDate
    ? { lastDate: local.streak.lastDate, count: Math.max(local.streak.count, remote.streak.count) }
    : (local.streak.lastDate > remote.streak.lastDate ? local.streak : remote.streak);

  // equipped quyết theo DẤU MỤC "equipped" thay vì updatedAt toàn cục: trang bị lại ở
  // máy cũ-hơn-toàn-cục (nhưng vừa trang bị) không bị bản chung mới hơn nuốt mất.
  const eqStampL = stampOf(local, "equipped");
  const eqStampR = stampOf(remote, "equipped");
  const eqSide = eqStampL && eqStampR ? (eqStampL.t >= eqStampR.t ? local : remote) : (eqStampL ? local : eqStampR ? remote : newer);
  const equipped = { ...eqSide.equipped };
  for (const cat of ["pot", "scene", "accessory"] as const) {
    if (!inventory.includes(equipped[cat])) {
      const alt = older.equipped[cat];
      equipped[cat] = inventory.includes(alt) ? alt : defaultState.equipped[cat];
    }
  }

  const lastLoveAction = (() => {
    if (!local.lastLoveAction) return remote.lastLoveAction;
    if (!remote.lastLoveAction) return local.lastLoveAction;
    return (local.lastLoveAction.at || "") >= (remote.lastLoveAction.at || "") ? local.lastLoveAction : remote.lastLoveAction;
  })();

  const selectedPlantId = plants.some((p) => p.id === local.selectedPlantId)
    ? local.selectedPlantId
    : (plants[0]?.id || "");

  return {
    ...newer,
    currentUser: local.currentUser,
    roomCode: newer.roomCode,
    personA: newer.personA, personB: newer.personB,
    avatarA: newer.avatarA, avatarB: newer.avatarB,
    gardenName: newer.gardenName, startDate: newer.startDate,
    onboarded: local.onboarded || remote.onboarded,
    everOnboarded: local.everOnboarded || remote.everOnboarded,
    tree, coins, coinsBase: coins, streak, equipped, inventory, achievements,
    moods, answers, daily, games, loveNotes, loveLimits, contentLog, frameRewards,
    letters, letterCollection, notes, bucket, memories, activities, treeCollection, deletedIds,
    plants, selectedPlantId, lastLoveAction,
    updatedAt: lt >= rt ? lt : rt,
    secTs,
  };
}

/* ---------- Đóng dấu secTs sau mỗi action cục bộ ---------- */

interface SlotSpec { key: string; get: (s: AppState, slot: PersonId) => unknown }
const SLOT_SPECS: SlotSpec[] = [
  { key: "moods", get: (s, slot) => s.moods[slot] },
  { key: "answers", get: (s, slot) => s.answers[slot] },
  { key: "daily", get: (s, slot) => ({ p: s.daily[slot], claimed: slot === "A" ? s.daily.claimedA : s.daily.claimedB, cared: slot === "A" ? s.daily.caredA : s.daily.caredB }) },
  { key: "games.spin", get: (s, slot) => s.games.spin[slot] },
  { key: "games.quiz", get: (s, slot) => s.games.quiz[slot] },
  { key: "games.heartBest", get: (s, slot) => s.games.heartBest[slot] },
  { key: "games.heartPlays", get: (s, slot) => s.games.heartPlays[slot] },
  { key: "games.dailyWins", get: (s, slot) => ({ m: s.games.dailyWins.memory[slot], d: s.games.dailyWins.dice[slot] }) },
  { key: "loveNotes", get: (s, slot) => s.loveNotes[slot] },
  { key: "loveLimits", get: (s, slot) => ({ c: s.loveLimits.counts[slot], at: s.loveLimits.lastAt[slot] }) },
  { key: "contentLog", get: (s, slot) => s.contentLog[slot] },
];
const SHARED_SPECS: { key: string; get: (s: AppState) => unknown }[] = [
  { key: "letters", get: (s) => s.letters },
  { key: "letterCollection", get: (s) => s.letterCollection },
  { key: "deletedIds", get: (s) => s.deletedIds },
  { key: "notes", get: (s) => s.notes },
  { key: "bucket", get: (s) => s.bucket },
  { key: "memories", get: (s) => s.memories },
  { key: "activities", get: (s) => s.activities },
  { key: "achievements", get: (s) => s.achievements },
  { key: "inventory", get: (s) => s.inventory },
  { key: "treeCollection", get: (s) => s.treeCollection },
  { key: "coins", get: (s) => s.coins },
  { key: "tree", get: (s) => s.tree },
  { key: "streak", get: (s) => s.streak },
  { key: "equipped", get: (s) => s.equipped },
  { key: "frameRewards", get: (s) => s.frameRewards },
  { key: "lastLoveAction", get: (s) => s.lastLoveAction },
];

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/**
 * Sau một action CỤC BỘ: mục nào thay đổi thì đóng dấu {t, by} mới.
 * Nhờ đó máy kia merge sẽ biết mục nào do chính chủ nhân slot sửa gần nhất.
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

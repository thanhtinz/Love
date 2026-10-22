import {
  AppState, CollectedTree, DECAY_PER_HOUR, PlantState, TreeState,
  getStage, normalizeState, uid,
} from "./types";

/**
 * V5 — Vườn nhiều cây, tăng trưởng theo THỜI GIAN THẬT.
 * Module thuần (không React) để kiểm chứng bằng script Node.
 *
 * Mô hình thời gian:
 * - Mỗi cây lưu growthRecordedMs (tăng trưởng đã "ghi sổ") tại mốc growthAt.
 * - Tăng trưởng hiệu dụng tại thời điểm now = ghi sổ + tích lũy từ growthAt -> now,
 *   tính theo từng bước <= 5 phút: mỗi bước trừ hao chỉ số theo hệ số loài rồi nhân
 *   tốc độ theo sức khỏe tại bước đó: chỉ số thấp nhất >= 40 -> x1 · 20..40 -> x0.5 · < 20 (héo) -> x0.
 * - Chăm cây: cộng chỉ số + cộng "tăng tốc" (boost) quy đổi thẳng thành thời gian tăng trưởng.
 * - Giai đoạn suy ra từ tăng trưởng tích lũy so với bảng thời lượng của loài — không lưu stage cứng.
 */

export const HOUR = 3600000;
export const MAX_PLOTS = 4;
/** Tăng tốc quy đổi thời gian khi chăm cây (ms) */
export const CARE_BOOST_MS: Record<"water" | "sun" | "love" | "bug", number> = {
  water: 30 * 60 * 1000,
  sun: 30 * 60 * 1000,
  love: 45 * 60 * 1000,
  bug: 20 * 60 * 1000,
};

export interface StageDef { name: string; desc: string; durationMs: number }
export interface Species {
  id: string;
  name: string;
  desc: string;
  trait: string;
  seedPrice: number;
  stages: StageDef[];
  /** Hệ số hao chỉ số (nhân với DECAY_PER_HOUR gốc) */
  waterDecayMul: number;
  sunDecayMul: number;
  /** Xu thưởng khi thu cây trưởng thành vào kỷ niệm */
  matureRewardCoins: number;
  matureRewardXp: number;
  /** XP vườn thưởng khi lên 1 giai đoạn */
  stageXp: number;
  /** Dâu tây: chu kỳ ra quả sau trưởng thành; 0 = không có quả */
  fruitCycleMs: number;
  fruitCoins: number;
  fruitXp: number;
  /** Số cây trưởng thành (đã thu vào kỷ niệm) tối thiểu mới được gieo; 0 = không khóa */
  lockMaturedCount: number;
  /** Thư rơi khi lên giai đoạn: tỉ lệ legendary / rare (loài thường: 0 / 1 = luôn Hiếm; nở rộ cuối -> Huyền thoại xử lý riêng) */
  stageLetterRare: number;
  stageLetterLegendary: number;
}

const h = (n: number) => n * HOUR;

export const SPECIES: Species[] = [
  {
    id: "love-tree", name: "Cây Tình Yêu",
    desc: "Loài cây biểu tượng của khu vườn: cân bằng, bền bỉ, kết trái tim khi trưởng thành.",
    trait: "Cân bằng mọi mặt — lựa chọn an toàn cho cặp đôi mới trồng.",
    seedPrice: 0,
    stages: [
      { name: "Hạt giống", desc: "Một hạt mầm tình yêu vừa được gieo", durationMs: h(12) },
      { name: "Mầm non", desc: "Mầm nhỏ đã nhú lên rồi nè!", durationMs: h(18) },
      { name: "Cây con", desc: "Cây con xanh mướt đáng yêu", durationMs: h(24) },
      { name: "Cây lớn", desc: "Tán lá sum suê, tình cảm vững chãi", durationMs: h(36) },
      { name: "Nụ hoa", desc: "Nụ hoa e ấp sắp nở", durationMs: h(36) },
      { name: "Nở hoa", desc: "Hoa nở rực rỡ, thơm ngát", durationMs: h(42) },
      { name: "Cây trái tim", desc: "Đỉnh cao! Cây kết trái tim lấp lánh", durationMs: 0 },
    ],
    waterDecayMul: 1, sunDecayMul: 1,
    matureRewardCoins: 60, matureRewardXp: 50, stageXp: 20,
    fruitCycleMs: 0, fruitCoins: 0, fruitXp: 0, lockMaturedCount: 0,
    stageLetterRare: 1, stageLetterLegendary: 0,
  },
  {
    id: "sunflower", name: "Hoa Hướng Dương",
    desc: "Lớn nhanh nhất vườn, luôn hướng về phía mặt trời — nhưng cũng khát nắng nhất.",
    trait: "Trưởng thành chỉ ~2 ngày; hao nắng nhanh gấp 1.8 lần, nhớ cho tắm nắng đều.",
    seedPrice: 30,
    stages: [
      { name: "Hạt hướng dương", desc: "Hạt nhỏ chứa cả một mặt trời", durationMs: h(8) },
      { name: "Mầm nảy", desc: "Mầm đội đất vươn lên đón nắng", durationMs: h(10) },
      { name: "Cây con vươn nắng", desc: "Thân vươn dài, lá xòe rộng", durationMs: h(12) },
      { name: "Nụ hoa hướng dương", desc: "Nụ hoa to dần, ngẩng cao đầu", durationMs: h(18) },
      { name: "Nở hoa rực rỡ", desc: "Bông hướng dương vàng rực cả góc vườn", durationMs: 0 },
    ],
    waterDecayMul: 1.1, sunDecayMul: 1.8,
    matureRewardCoins: 40, matureRewardXp: 35, stageXp: 15,
    fruitCycleMs: 0, fruitCoins: 0, fruitXp: 0, lockMaturedCount: 0,
    stageLetterRare: 1, stageLetterLegendary: 0,
  },
  {
    id: "sakura", name: "Anh Đào Sakura",
    desc: "Nàng thơ của khu vườn: tán hồng mộng mơ, thư tình rơi ra cũng quý hơn hẳn.",
    trait: "Khi lên giai đoạn, tỉ lệ rơi thư Hiếm/Huyền thoại cao hơn mọi loài khác.",
    seedPrice: 80,
    stages: [
      { name: "Hạt anh đào", desc: "Hạt nhỏ mơ về mùa xuân", durationMs: h(16) },
      { name: "Mầm anh đào", desc: "Mầm hồng nhạt vừa nhú", durationMs: h(20) },
      { name: "Cây con", desc: "Cành non mảnh mai, lá xanh nhạt", durationMs: h(24) },
      { name: "Cây lớn", desc: "Tán bắt đầu xòe, cành khẳng khiu đẹp", durationMs: h(28) },
      { name: "Nụ anh đào", desc: "Nụ hồng chúm chím khắp cành", durationMs: h(32) },
      { name: "Hoa anh đào nở rộ", desc: "Cả cây phủ hồng — mùa xuân của hai đứa", durationMs: 0 },
    ],
    waterDecayMul: 1, sunDecayMul: 0.9,
    matureRewardCoins: 90, matureRewardXp: 70, stageXp: 22,
    fruitCycleMs: 0, fruitCoins: 0, fruitXp: 0, lockMaturedCount: 0,
    stageLetterRare: 0.55, stageLetterLegendary: 0.3,
  },
  {
    id: "cactus", name: "Xương Rồng Chibi",
    desc: "Bé xương rồng lì lợm đáng yêu: gần như không cần tưới, lớn chậm mà chắc.",
    trait: "Hao nước cực chậm (chỉ 0.25 lần) — hợp cặp đôi bận rộn; tổng ~10 ngày.",
    seedPrice: 60,
    stages: [
      { name: "Hạt xương rồng", desc: "Hạt bé xíu, kiên nhẫn từ trong trứng nước", durationMs: h(24) },
      { name: "Mầm trụ nhỏ", desc: "Một trụ xanh mập mạp vừa nhú", durationMs: h(36) },
      { name: "Trụ non", desc: "Trụ cao dần, gai mềm như nhung", durationMs: h(48) },
      { name: "Trụ lớn", desc: "Trụ chắc khỏe, xanh đậm", durationMs: h(60) },
      { name: "Ra tay con", desc: "Mọc thêm tay con vẫy chào", durationMs: h(72) },
      { name: "Nở hoa đỉnh", desc: "Hoa rực nở trên đỉnh đầu — phần thưởng của kiên nhẫn", durationMs: 0 },
    ],
    waterDecayMul: 0.25, sunDecayMul: 1.2,
    matureRewardCoins: 80, matureRewardXp: 60, stageXp: 18,
    fruitCycleMs: 0, fruitCoins: 0, fruitXp: 0, lockMaturedCount: 0,
    stageLetterRare: 1, stageLetterLegendary: 0,
  },
  {
    id: "strawberry", name: "Dâu Tây",
    desc: "Bụi dâu sai quả: trưởng thành rồi cứ 12 giờ lại có quả chín để thu hoạch.",
    trait: "Thu hoạch quả nhận Xu Tim + XP, thu xong ra quả mới — cây không bao giờ chết.",
    seedPrice: 50,
    stages: [
      { name: "Hạt dâu", desc: "Hạt li ti, mơ thành quả đỏ", durationMs: h(12) },
      { name: "Mầm dâu", desc: "Hai lá mầm tròn xoe", durationMs: h(16) },
      { name: "Bụi lá non", desc: "Lá dâu ba chét xòe dần", durationMs: h(20) },
      { name: "Bụi lá lớn", desc: "Bụi lá um tùm, bò lan ra chậu", durationMs: h(24) },
      { name: "Ra hoa trắng", desc: "Hoa trắng năm cánh điểm xuyết", durationMs: h(24) },
      { name: "Dâu sai quả", desc: "Quả đỏ mọng treo lúc lỉu — nhớ thu hoạch mỗi 12 giờ", durationMs: 0 },
    ],
    waterDecayMul: 1.2, sunDecayMul: 1,
    matureRewardCoins: 0, matureRewardXp: 40, stageXp: 18,
    fruitCycleMs: h(12), fruitCoins: 25, fruitXp: 15, lockMaturedCount: 0,
    stageLetterRare: 1, stageLetterLegendary: 0,
  },
  {
    id: "legendary-tree", name: "Cây Huyền Thoại",
    desc: "Hạt giống 30 ngày: tán tím ngân hà điểm sao, chỉ dành cho những người làm vườn kiên định.",
    trait: "Hạt đắt và cần đã có ít nhất 1 cây trưởng thành trong bộ sưu tập mới gieo được. Phần thưởng rất lớn.",
    seedPrice: 400,
    stages: [
      { name: "Hạt huyền thoại", desc: "Hạt tím phát sáng nhè nhẹ trong đất", durationMs: h(48) },
      { name: "Mầm pha lê", desc: "Mầm trong suốt như pha lê tím", durationMs: h(72) },
      { name: "Cây con ánh sao", desc: "Lá non lấp lánh điểm sao", durationMs: h(96) },
      { name: "Cây lớn", desc: "Thân vươn cao, tán bắt đầu ngả tím", durationMs: h(120) },
      { name: "Tán ngân hà", desc: "Tán lá như một dải ngân hà thu nhỏ", durationMs: h(120) },
      { name: "Nụ tinh tú", desc: "Nụ hoa như những vì sao chưa thức giấc", durationMs: h(132) },
      { name: "Nở hoa vũ trụ", desc: "Hoa nở như pháo hoa giữa trời đêm", durationMs: h(132) },
      { name: "Cây huyền thoại", desc: "Huyền thoại đã thành hình — chứng nhân 30 ngày yêu thương", durationMs: 0 },
    ],
    waterDecayMul: 0.9, sunDecayMul: 0.9,
    matureRewardCoins: 300, matureRewardXp: 200, stageXp: 30,
    fruitCycleMs: 0, fruitCoins: 0, fruitXp: 0, lockMaturedCount: 1,
    stageLetterRare: 0.6, stageLetterLegendary: 0.25,
  },
];

export const speciesById = (id: string): Species => SPECIES.find((s) => s.id === id) || SPECIES[0];
/** Tổng thời gian tăng trưởng cần để trưởng thành (không tính giai đoạn cuối duration 0) */
export const totalGrowthMs = (sp: Species): number => sp.stages.reduce((a, s) => a + s.durationMs, 0);
/** Mốc tăng trưởng tích lũy tại điểm BẮT ĐẦU mỗi giai đoạn */
export function stageStarts(sp: Species): number[] {
  const out: number[] = []; let acc = 0;
  for (const s of sp.stages) { out.push(acc); acc += s.durationMs; }
  return out;
}

const clampStat = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

/** Chỉ số của 1 cây sau hao theo thời gian (hệ số riêng theo loài), thuần hàm như decayedStats cũ. */
export function decayedPlantStats(plant: PlantState, nowMs: number = Date.now()): { water: number; sun: number; love: number } {
  const sp = speciesById(plant.speciesId);
  const base = { water: clampStat(plant.water || 0), sun: clampStat(plant.sun || 0), love: clampStat(plant.love || 0) };
  if (!plant.statsAt) return base;
  const hours = (nowMs - new Date(plant.statsAt).getTime()) / HOUR;
  if (!isFinite(hours) || hours <= 0) return base;
  return {
    water: clampStat(base.water - DECAY_PER_HOUR.water * sp.waterDecayMul * hours),
    sun: clampStat(base.sun - DECAY_PER_HOUR.sun * sp.sunDecayMul * hours),
    love: clampStat(base.love - DECAY_PER_HOUR.love * hours),
  };
}

/** Hệ số tốc độ lớn theo sức khỏe: khỏe x1 · yếu x0.5 · héo (thấp nhất < 20) x0 */
export function growthFactor(stats: { water: number; sun: number; love: number }): number {
  const min = Math.min(stats.water, stats.sun, stats.love);
  if (min < 20) return 0;
  if (min < 40) return 0.5;
  return 1;
}

const STEP_MS = 5 * 60 * 1000; // bước tích lũy tối đa 5 phút — 2 máy cùng tính sẽ khớp nhau

/**
 * Ghi sổ tăng trưởng + hao chỉ số từ plant.growthAt/statsAt tới nowMs.
 * Trả về plant MỚI đã materialize (không mutate bản gốc). Khi cây trưởng thành
 * trong lúc tích lũy: đóng dấu matureAt (và fruitReadyAt cho loài có quả).
 */
export function materializePlant(plant: PlantState, nowMs: number = Date.now()): PlantState {
  const sp = speciesById(plant.speciesId);
  const from = new Date(plant.growthAt || plant.plantedAt).getTime();
  let growth = plant.growthRecordedMs || 0;
  let stats = { water: clampStat(plant.water || 0), sun: clampStat(plant.sun || 0), love: clampStat(plant.love || 0) };
  let matureAt = plant.matureAt || "";
  let fruitReadyAt = plant.fruitReadyAt || "";
  const total = totalGrowthMs(sp);
  if (isFinite(from) && nowMs > from) {
    let t = from;
    while (t < nowMs) {
      const step = Math.min(STEP_MS, nowMs - t);
      const hours = step / HOUR;
      stats = {
        water: clampStat(stats.water - DECAY_PER_HOUR.water * sp.waterDecayMul * hours),
        sun: clampStat(stats.sun - DECAY_PER_HOUR.sun * sp.sunDecayMul * hours),
        love: clampStat(stats.love - DECAY_PER_HOUR.love * hours),
      };
      if (!matureAt) {
        growth += growthFactor(stats) * step;
        if (growth >= total) {
          growth = total;
          matureAt = new Date(t + step).toISOString();
          if (sp.fruitCycleMs > 0 && !fruitReadyAt) fruitReadyAt = new Date(t + step + sp.fruitCycleMs).toISOString();
        }
      }
      t += step;
    }
  } else if (!matureAt && growth >= total) {
    matureAt = plant.plantedAt;
    if (sp.fruitCycleMs > 0 && !fruitReadyAt) fruitReadyAt = new Date(new Date(matureAt).getTime() + sp.fruitCycleMs).toISOString();
  }
  const nowIso = new Date(nowMs).toISOString();
  return {
    ...plant,
    growthRecordedMs: growth,
    growthAt: nowIso,
    water: stats.water, sun: stats.sun, love: stats.love,
    statsAt: nowIso,
    matureAt, fruitReadyAt,
  };
}

/** Bản xem trước đã materialize (dùng cho hiển thị, không ghi vào state) */
export const projectPlant = materializePlant;

export interface StageInfo {
  index: number;
  stage: StageDef;
  next: StageDef | null;
  /** % tiến trình trong giai đoạn hiện tại */
  progressInStage: number;
  /** Tăng trưởng hiệu dụng (ms) */
  growthMs: number;
  /** Còn bao nhiêu ms tăng trưởng hiệu dụng nữa tới giai đoạn kế (0 nếu trưởng thành) */
  remainingToNextMs: number;
  mature: boolean;
}
/** Suy ra giai đoạn từ tăng trưởng tích lũy — thuần hàm, không lưu cứng. */
export function stageInfo(plant: PlantState, nowMs: number = Date.now()): StageInfo {
  const sp = speciesById(plant.speciesId);
  const p = projectPlant(plant, nowMs);
  const g = p.growthRecordedMs;
  const starts = stageStarts(sp);
  const idx = stageIndexForGrowth(sp, g);
  const st = sp.stages[idx];
  const progressInStage = st.durationMs > 0 ? Math.min(100, Math.round(((g - starts[idx]) / st.durationMs) * 100)) : 100;
  const remainingToNextMs = st.durationMs > 0 ? Math.max(0, starts[idx] + st.durationMs - g) : 0;
  return { index: idx, stage: st, next: sp.stages[idx + 1] || null, progressInStage, growthMs: g, remainingToNextMs, mature: Boolean(p.matureAt) || g >= totalGrowthMs(sp) };
}

/** Chỉ số giai đoạn tương ứng với một mức tăng trưởng tích lũy (thuần hàm) */
export function stageIndexForGrowth(sp: Species, growthMs: number): number {
  const starts = stageStarts(sp);
  let idx = sp.stages.length - 1;
  for (let i = 0; i < sp.stages.length; i++) {
    if (sp.stages[i].durationMs > 0 && growthMs < starts[i] + sp.stages[i].durationMs) { idx = i; break; }
  }
  return idx;
}

/** Dâu tây: quả đã chín chờ thu chưa (suy ra từ fruitReadyAt — không lưu cờ cứng) */
export function fruitPending(plant: PlantState, nowMs: number = Date.now()): boolean {
  const sp = speciesById(plant.speciesId);
  if (sp.fruitCycleMs <= 0) return false;
  const p = projectPlant(plant, nowMs);
  return Boolean(p.matureAt && p.fruitReadyAt && nowMs >= new Date(p.fruitReadyAt).getTime());
}

/** Tạo cây mới vừa gieo (chỉ số khởi đầu 60 cho có đà lớn những giờ đầu) */
export function createPlant(speciesId: string, nowMs: number = Date.now()): PlantState {
  const nowIso = new Date(nowMs).toISOString();
  return {
    id: uid(), speciesId, plantedAt: nowIso,
    growthRecordedMs: 0, growthAt: nowIso, totalBoostMs: 0,
    water: 60, sun: 60, love: 60, statsAt: nowIso,
    careCount: 0, lastCareAt: "", lastCareBy: "", lastCareAtBy: { A: "", B: "" }, announcedStage: 0,
    matureAt: "", fruitReadyAt: "", harvestCount: 0,
  };
}

/** Cooldown chăm cây: mỗi người phải chờ 60 giây giữa 2 lần chăm CÙNG một cây */
export const CARE_COOLDOWN_MS = 60000;
/** Chỉ số tương ứng đã từ ngưỡng này trở lên thì chăm thêm không còn tác dụng */
export const CARE_FULL_THRESHOLD = 95;
export interface CareStatus { ok: boolean; reason: string; cooldownLeftMs: number }
/**
 * Kiểm tra một lần chăm có HỢP LỆ + CÓ TÁC DỤNG không (dùng chung cho UI và reducer):
 * - Chặn spam: chưa hết cooldown của chính người đó trên cây này -> không ok.
 * - Chăm "vào chỗ đã đầy" (chỉ số tương ứng >= 95%) -> không ok: không boost/thư/Xu/XP.
 */
export function careStatus(plant: PlantState, kind: "water" | "sun" | "love" | "bug", slot: "A" | "B", nowMs: number = Date.now()): CareStatus {
  const last = plant.lastCareAtBy ? plant.lastCareAtBy[slot] : "";
  if (last) {
    const left = CARE_COOLDOWN_MS - (nowMs - new Date(last).getTime());
    if (left > 0) return { ok: false, reason: `Bạn vừa chăm cây này rồi — chờ ${Math.ceil(left / 1000)} giây nữa nhé`, cooldownLeftMs: left };
  }
  const p = materializePlant(plant, nowMs);
  const stat = kind === "water" ? p.water : kind === "sun" ? p.sun : kind === "love" ? p.love : Math.min(p.water, p.sun, p.love);
  if (stat >= CARE_FULL_THRESHOLD) {
    const reason = kind === "water" ? "Cây đã đủ nước rồi, tưới thêm không có tác dụng"
      : kind === "sun" ? "Cây đã đủ nắng rồi, tắm nắng thêm không có tác dụng"
      : kind === "love" ? "Cây đã tràn đầy yêu thương rồi"
      : "Cây đang rất khỏe, chưa cần bắt sâu";
    return { ok: false, reason, cooldownLeftMs: 0 };
  }
  return { ok: true, reason: "", cooldownLeftMs: 0 };
}

/* ---------- Chuẩn hoá + MIGRATION V4 -> V5 ---------- */
function normalizePlant(raw: Partial<PlantState>, index: number): PlantState {
  const base = createPlant(typeof raw.speciesId === "string" && SPECIES.some((s) => s.id === raw.speciesId) ? raw.speciesId : "love-tree");
  return {
    ...base, ...raw,
    id: raw.id || `plant-${index}-${uid()}`,
    speciesId: base.speciesId,
    plantedAt: raw.plantedAt || base.plantedAt,
    growthRecordedMs: typeof raw.growthRecordedMs === "number" ? raw.growthRecordedMs : 0,
    growthAt: raw.growthAt || raw.statsAt || raw.plantedAt || base.growthAt,
    totalBoostMs: typeof raw.totalBoostMs === "number" ? raw.totalBoostMs : 0,
    water: typeof raw.water === "number" ? raw.water : 60,
    sun: typeof raw.sun === "number" ? raw.sun : 60,
    love: typeof raw.love === "number" ? raw.love : 60,
    statsAt: raw.statsAt || raw.growthAt || raw.plantedAt || base.statsAt,
    careCount: typeof raw.careCount === "number" ? raw.careCount : 0,
    lastCareAtBy: { A: (raw.lastCareAtBy && raw.lastCareAtBy.A) || "", B: (raw.lastCareAtBy && raw.lastCareAtBy.B) || "" },
    announcedStage: typeof raw.announcedStage === "number" ? raw.announcedStage : 0,
    matureAt: raw.matureAt || "",
    fruitReadyAt: raw.fruitReadyAt || "",
    harvestCount: typeof raw.harvestCount === "number" ? raw.harvestCount : 0,
  };
}

/** Chuyển cây đơn của V4 (state.tree) thành plants[0] loài Cây Tình Yêu — giữ nguyên giai đoạn + tiến trình tương đối trong giai đoạn. */
export function plantFromLegacyTree(tree: TreeState): PlantState {
  const sp = speciesById("love-tree");
  const starts = stageStarts(sp);
  const st = getStage(tree.xp || 0);
  // Tăng trưởng tương ứng: mốc bắt đầu giai đoạn hiện tại + tỉ lệ tiến trình trong giai đoạn đó
  let growth = starts[st.index] || 0;
  const dur = sp.stages[st.index]?.durationMs || 0;
  if (dur > 0 && st.next) growth += Math.floor((st.progressToNext / 100) * dur);
  if (!st.next) growth = totalGrowthMs(sp);
  const plantedAt = tree.lastCareAt || new Date(Date.now() - growth).toISOString();
  const nowIso = new Date().toISOString();
  return {
    id: uid(), speciesId: "love-tree", plantedAt,
    growthRecordedMs: growth, growthAt: tree.statsAt || nowIso, totalBoostMs: 0,
    water: typeof tree.water === "number" ? tree.water : 40,
    sun: typeof tree.sun === "number" ? tree.sun : 40,
    love: typeof tree.love === "number" ? tree.love : 40,
    statsAt: tree.statsAt || nowIso,
    careCount: tree.careCount || 0, lastCareAt: tree.lastCareAt || "", lastCareBy: tree.lastCareBy || "",
    lastCareAtBy: { A: tree.lastCareBy === "A" ? (tree.lastCareAt || "") : "", B: tree.lastCareBy === "B" ? (tree.lastCareAt || "") : "" },
    announcedStage: st.index,
    matureAt: !st.next ? (tree.lastCareAt || nowIso) : "",
    fruitReadyAt: "", harvestCount: 0,
  };
}

/** normalizeState đầy đủ cho V5 (dùng thay normalizeState ở store — áp cả cho state từ Supabase room_state). */
export function normalizeStateV5(raw: Partial<AppState> & { createdAt?: string }): AppState {
  const s = normalizeState(raw);
  let plants: PlantState[];
  if (Array.isArray((raw as Partial<AppState>).plants) && (raw as Partial<AppState>).plants!.length > 0) {
    plants = (raw as Partial<AppState>).plants!.slice(0, MAX_PLOTS).map((p, i) => normalizePlant(p, i));
  } else if (s.tree && (s.tree.careCount > 0 || s.tree.xp > 0)) {
    plants = [plantFromLegacyTree(s.tree)];
  } else {
    const fresh = createPlant("love-tree");
    plants = [{ ...fresh, water: s.tree?.water ?? 60, sun: s.tree?.sun ?? 60, love: s.tree?.love ?? 60 }];
  }
  const selectedPlantId = plants.some((p) => p.id === raw.selectedPlantId) ? (raw.selectedPlantId as string) : plants[0].id;
  const treeCollection: CollectedTree[] = Array.isArray(raw.treeCollection) ? raw.treeCollection.filter((c) => c && c.speciesId) : [];
  return { ...s, plants, selectedPlantId, treeCollection };
}

/** Tổng lần chăm toàn vườn (gồm cả dữ liệu legacy đã gộp vào plants[0]) */
export const totalCareCount = (s: AppState): number => s.plants.reduce((a, p) => a + (p.careCount || 0), 0);
/** Tổng số cây từng trưởng thành (đang trồng + đã thu vào kỷ niệm) */
export const totalMaturedCount = (s: AppState): number => s.treeCollection.length + s.plants.filter((p) => p.matureAt).length;

/** Định dạng khoảng thời gian ms -> "3 ngày 5 giờ" / "5 giờ 20 phút" / "20 phút" */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "0 phút";
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440), hrs = Math.floor((totalMin % 1440) / 60), min = totalMin % 60;
  if (d > 0) return hrs > 0 ? `${d} ngày ${hrs} giờ` : `${d} ngày`;
  if (hrs > 0) return min > 0 ? `${hrs} giờ ${min} phút` : `${hrs} giờ`;
  return `${Math.max(1, min)} phút`;
}

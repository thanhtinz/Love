import {
  MEMORIES_CAP, MEMORY_CAPTION_MAX, MemoryPhoto, PersonId, isPlainObject, isValidDateKey, strOr,
} from "./types";
import { seeded01 } from "./content";

/**
 * DÂY KỶ NIỆM — logic THUẦN của kho ảnh treo trên dây (không React/Supabase):
 * chuẩn hoá một ảnh, hợp nhất bộ sưu tập giữa 2 máy, và góc nghiêng xác định
 * của từng khung. Mọi hàm ở đây đều xác định hoàn toàn theo đầu vào — cùng
 * một state thì CẢ 2 MÁY dựng ra đúng một sợi dây giống hệt (kể cả độ nghiêng
 * của từng khung), không máy nào phải gửi thêm dữ liệu trình bày cho máy kia.
 *
 * Mô hình đồng bộ (theo đúng các tiền lệ đã kiểm chứng của app):
 * - Bộ sưu tập: UNION theo id — ảnh người này treo, máy người kia chưa có vẫn
 *   được giữ; không máy nào làm mất ảnh của máy kia.
 * - Cùng một id ở 2 máy: LAST-WRITER-WINS theo `updatedAt` (như ảnh của hai
 *   đứa). Hoà mốc: thắng thua quyết bằng cách so chuỗi JSON đã sắp xếp —
 *   merge (a, b) và merge (b, a) cho cùng một kết quả, 2 máy hội tụ.
 * - Xoá: id vào DANH SÁCH MỘ (removedMemoryIds, union giữa 2 máy). Hiện thực
 *   hoá (materialize) lọc bỏ mọi id nằm trong mộ — bản sao cũ chưa biết tin
 *   xoá KHÔNG hồi sinh được ảnh, vì mộ đi cùng state trong mọi lần merge.
 */

/** Trần danh sách mộ giữ lại trong state (mộ cũ nhất rơi ra khi quá dài —
 *  tới lúc đó mọi bản sao của ảnh đó đã qua ít nhất một lần merge có mộ). */
export const REMOVED_MEMORY_IDS_CAP = 300;

/** Góc nghiêng tối đa của một khung trên dây (độ) — nghiêng nhẹ cho có hồn thủ công. */
export const MEMORY_TILT_MAX_DEG = 2.5;

/**
 * Góc nghiêng của khung ảnh `id` — SEED theo hash của id nên cả 2 máy (và mọi
 * lần mở app) đều treo khung nghiêng Y HỆT nhau, trong khoảng ±2.5°. Làm tròn
 * 2 chữ số thập phân để giá trị ổn định khi qua lại JSON.
 */
export function memoryTiltDeg(id: string): number {
  const v = (seeded01(`memory-tilt:${id}`) * 2 - 1) * MEMORY_TILT_MAX_DEG;
  return Math.round(v * 100) / 100;
}

/** Ghi chú chuẩn: trim hai đầu + cắt đúng trần ký tự (khóa cứng ở tầng lib). */
export function sanitizeMemoryCaption(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, MEMORY_CAPTION_MAX) : "";
}

const slotOr = (v: unknown): PersonId | "" => (v === "A" || v === "B" ? v : "");
const isoOr = (v: unknown): string => {
  const s = strOr(v, "");
  return s && isFinite(new Date(s).getTime()) ? s : "";
};

/**
 * Chuẩn hoá MỘT ảnh kỷ niệm từ dữ liệu bất kỳ (state từ server/cache có thể
 * sai kiểu): thiếu id/path, dateKey không tồn tại, bySlot lạ, mốc thời gian
 * không đọc được -> null (đánh rơi, không crash). Ghi chú được sanitize;
 * addedAt hỏng thì lùi về updatedAt (và ngược lại) trước khi bỏ cuộc.
 */
export function sanitizeMemory(raw: unknown): MemoryPhoto | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.path !== "string" || !raw.path.trim()) return null;
  if (!isValidDateKey(raw.dateKey)) return null;
  const bySlot = slotOr(raw.bySlot);
  if (!bySlot) return null;
  const updatedAt = isoOr(raw.updatedAt) || isoOr(raw.addedAt);
  const addedAt = isoOr(raw.addedAt) || updatedAt;
  if (!updatedAt || !addedAt) return null;
  return {
    id: raw.id,
    path: raw.path,
    caption: sanitizeMemoryCaption(raw.caption),
    dateKey: raw.dateKey as string,
    bySlot,
    addedAt,
    updatedAt,
  };
}

/** Thứ tự trên dây: theo NGÀY KỶ NIỆM tăng dần (dây kể chuyện theo thời
 *  gian), hoà ngày thì theo mốc treo lên, hoà nữa thì theo id — hoàn toàn xác
 *  định để 2 máy xếp giống hệt nhau. */
export function compareMemories(a: MemoryPhoto, b: MemoryPhoto): number {
  if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
  if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
export function sortMemories(list: MemoryPhoto[]): MemoryPhoto[] {
  return [...list].sort(compareMemories);
}

/**
 * HIỆN THỰC HOÁ bộ sưu tập: lọc bỏ id nằm trong mộ, khử trùng theo id (bản
 * LWW thắng nếu đầu vào còn lẫn trùng), sắp theo thứ tự dây, chặn trần
 * MEMORIES_CAP (giữ 30 kỷ niệm ĐẦU câu chuyện — phần tràn chỉ xảy ra khi 2
 * máy cùng treo lúc dây gần đầy; cả 2 máy cùng tính ra cùng một danh sách bị
 * chặn nên vẫn hội tụ). Đây là dạng duy nhất được LƯU vào state.memories.
 */
export function materializeMemories(memories: MemoryPhoto[], removedIds: string[]): MemoryPhoto[] {
  const tomb = new Set(removedIds);
  const byId = new Map<string, MemoryPhoto>();
  for (const m of memories) {
    if (!m || tomb.has(m.id)) continue;
    const prev = byId.get(m.id);
    if (!prev || memoryLwwWins(m, prev)) byId.set(m.id, m);
  }
  return sortMemories([...byId.values()]).slice(0, MEMORIES_CAP);
}

/** Bản nào thắng khi cùng id: updatedAt mới hơn; hoà mốc -> JSON lớn hơn
 *  thắng (đối xứng: không phụ thuộc bản nào là "local"). */
export function memoryLwwWins(candidate: MemoryPhoto, current: MemoryPhoto): boolean {
  if (candidate.updatedAt !== current.updatedAt) return candidate.updatedAt > current.updatedAt;
  return JSON.stringify(candidate) > JSON.stringify(current);
}

/** Hợp nhất danh sách mộ của 2 máy: union giữ thứ tự xuất hiện, chặn trần. */
export function unionRemovedMemoryIds(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...a, ...b]) {
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.slice(-REMOVED_MEMORY_IDS_CAP);
}

/**
 * Hợp nhất bộ sưu tập giữa 2 máy: mộ hợp nhất trước, union ảnh theo id với
 * LWW từng ảnh, rồi hiện thực hoá bằng mộ chung — một lần xoá ở bất kỳ máy
 * nào cũng thắng mọi bản sao cũ ở máy kia.
 */
export function mergeMemories(
  local: MemoryPhoto[], remote: MemoryPhoto[],
  localRemoved: string[], remoteRemoved: string[],
): { memories: MemoryPhoto[]; removedMemoryIds: string[] } {
  const removedMemoryIds = unionRemovedMemoryIds(localRemoved, remoteRemoved);
  const memories = materializeMemories([...local, ...remote], removedMemoryIds);
  return { memories, removedMemoryIds };
}

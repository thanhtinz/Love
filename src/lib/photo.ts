import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { File } from "expo-file-system";
import type { CouplePhoto, MemoryPhoto } from "./types";
import { getSupabase } from "./supabase";

/**
 * ẢNH CỦA HAI ĐỨA (đợt "chất app" 3) — mọi thao tác Supabase Storage cho tấm
 * ảnh chung duy nhất của cặp đôi đều đi qua file này.
 *
 * - Bucket RIÊNG TƯ "couple-photos" (tạo bằng migration
 *   supabase/migrations/20261025_couple_photos.sql — chủ dự án chạy tay trong
 *   SQL Editor; RLS chỉ cho thành viên của cặp đôi chạm vào object có tiền tố
 *   đường dẫn = id cặp đôi của mình).
 * - Đường dẫn CỐ ĐỊNH "{coupleId}/photo.jpg": đổi ảnh là ghi đè tại chỗ
 *   (upsert), không sinh rác; phá cache bằng couplePhoto.updatedAt trong state.
 * - Hiển thị: bucket riêng tư nên phải xin signed URL (hạn 7 ngày) mỗi phiên;
 *   xin lỗi/thiếu bucket -> trả null để UI lùi về tranh vẽ, không bao giờ crash.
 */

export const COUPLE_PHOTO_BUCKET = "couple-photos";
/** Signed URL sống 7 ngày — đủ dài cho một phiên dùng app, vẫn là liên kết tạm. */
export const COUPLE_PHOTO_URL_TTL_SEC = 60 * 60 * 24 * 7;

/** Đường dẫn object của ảnh hai đứa trong bucket. */
export function couplePhotoPath(coupleId: string): string {
  return `${coupleId}/photo.jpg`;
}

async function readPickedBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    // Web: uri của expo-image-picker là blob:/data: — fetch đọc thẳng thành blob.
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error("Không đọc được ảnh vừa chọn.");
    return await resp.arrayBuffer();
  }
  // Native: đọc file cục bộ qua expo-file-system (API File mới của SDK 58).
  return await new File(uri).arrayBuffer();
}

/** Đọc bytes của ảnh vừa chọn rồi tải lên một đường dẫn trong bucket —
 *  dùng chung cho ảnh của hai đứa và từng ảnh kỷ niệm. Lỗi đều THROW với
 *  thông điệp tiếng Việt ấm áp để nơi gọi hiển thị inline. */
async function uploadJpegTo(path: string, pickedUri: string): Promise<void> {
  let bytes: ArrayBuffer;
  try {
    bytes = await readPickedBytes(pickedUri);
  } catch {
    throw new Error("Không đọc được ảnh vừa chọn. Hãy thử chọn lại một tấm khác nhé.");
  }
  const sb = getSupabase();
  const { error } = await sb.storage.from(COUPLE_PHOTO_BUCKET).upload(path, bytes, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw new Error("Tải ảnh lên chưa thành công — kiểm tra mạng rồi thử lại giúp mình nhé.");
}

/**
 * Tải ảnh vừa chọn lên Storage tại đường dẫn cố định của cặp đôi.
 * Thành công -> trả về CouplePhoto để nơi gọi dispatch vào state (reducer chỉ
 * là bước ghi sổ SAU khi file đã thật sự lên bucket). Mọi lỗi đều THROW với
 * thông điệp tiếng Việt ấm áp — nơi gọi hiển thị inline, không crash.
 */
export async function uploadCouplePhoto(coupleId: string, pickedUri: string, bySlot: "A" | "B"): Promise<CouplePhoto> {
  if (!coupleId) throw new Error("Chưa có vườn chung để lưu ảnh — hãy ghép cặp trước nhé.");
  const path = couplePhotoPath(coupleId);
  await uploadJpegTo(path, pickedUri);
  return { path, updatedAt: new Date().toISOString(), bySlot };
}

/** Xin signed URL hiển thị cho ảnh hiện tại; null khi chưa có ảnh hoặc xin lỗi. */
export async function fetchCouplePhotoUrl(photo: CouplePhoto | null): Promise<string | null> {
  if (!photo) return null;
  try {
    const sb = getSupabase();
    const { data, error } = await sb.storage.from(COUPLE_PHOTO_BUCKET).createSignedUrl(photo.path, COUPLE_PHOTO_URL_TTL_SEC);
    if (error || !data?.signedUrl) return null;
    // Phá cache theo mốc sửa: ảnh ghi đè cùng đường dẫn nhưng URL phải khác nhau.
    const sep = data.signedUrl.includes("?") ? "&" : "?";
    return `${data.signedUrl}${sep}v=${encodeURIComponent(photo.updatedAt)}`;
  } catch {
    return null;
  }
}

/* ================= DÂY KỶ NIỆM — ẢNH TRONG STORAGE =================
 * TÁI DÙNG bucket "couple-photos": RLS khóa theo ĐOẠN ĐẦU đường dẫn =
 * couple_id (storage.foldername(name))[1], nên đường dẫn con
 * "{coupleId}/memories/{id}.jpg" được cả 4 policy (select/insert/update/
 * delete) bao phủ sẵn — KHÔNG cần migration mới. Mỗi kỷ niệm là MỘT object
 * riêng theo id (khác ảnh hai đứa: một đường dẫn cố định ghi đè). */

/** Đường dẫn object của một ảnh kỷ niệm trong bucket. */
export function memoryPhotoPath(coupleId: string, memoryId: string): string {
  return `${coupleId}/memories/${memoryId}.jpg`;
}

/**
 * Tải một ảnh kỷ niệm lên Storage. Thành công -> trả về ĐƯỜNG DẪN để nơi gọi
 * dựng MemoryPhoto và dispatch MEMORY_ADD (reducer chỉ ghi sổ sau khi file đã
 * thật sự lên bucket). Lỗi THROW thông điệp ấm áp như uploadCouplePhoto.
 */
export async function uploadMemoryPhoto(coupleId: string, memoryId: string, pickedUri: string): Promise<string> {
  if (!coupleId) throw new Error("Chưa có vườn chung để lưu ảnh — hãy ghép cặp trước nhé.");
  const path = memoryPhotoPath(coupleId, memoryId);
  await uploadJpegTo(path, pickedUri);
  return path;
}

/** Cache signed URL theo "{id}@{updatedAt}" ở tầng module: nhiều màn/nhiều lần
 *  render dùng chung, chỉ xin lại khi ảnh đó thật sự đổi. null = đã xin mà lỗi
 *  (UI hiện khung chờ lặng, không xin lại liên tục trong cùng phiên). */
const memoryUrlCache = new Map<string, string | null>();

/**
 * Xin signed URL cho CẢ DÂY trong MỘT lượt gọi (createSignedUrls theo lô —
 * 30 ảnh cũng chỉ 1 request). Trả map id -> url (đã gắn khóa phá cache
 * v=updatedAt); ảnh nào xin lỗi -> null để UI hiện khung lặng, không crash.
 */
export async function fetchMemoryPhotoUrls(memories: MemoryPhoto[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  const missing = memories.filter((m) => !memoryUrlCache.has(`${m.id}@${m.updatedAt}`));
  for (const m of memories) {
    const hit = memoryUrlCache.get(`${m.id}@${m.updatedAt}`);
    if (hit !== undefined) out[m.id] = hit;
  }
  if (missing.length === 0) return out;
  try {
    const sb = getSupabase();
    const { data, error } = await sb.storage
      .from(COUPLE_PHOTO_BUCKET)
      .createSignedUrls(missing.map((m) => m.path), COUPLE_PHOTO_URL_TTL_SEC);
    if (error || !data) throw new Error("signed urls failed");
    const byPath = new Map(data.map((d) => [d.path, d.error ? null : d.signedUrl]));
    for (const m of missing) {
      const raw = byPath.get(m.path) ?? null;
      const url = raw ? `${raw}${raw.includes("?") ? "&" : "?"}v=${encodeURIComponent(m.updatedAt)}` : null;
      memoryUrlCache.set(`${m.id}@${m.updatedAt}`, url);
      out[m.id] = url;
    }
  } catch {
    for (const m of missing) {
      memoryUrlCache.set(`${m.id}@${m.updatedAt}`, null);
      out[m.id] = null;
    }
  }
  return out;
}

/**
 * Hook cho màn Dây kỷ niệm: theo dõi danh sách ảnh (id + mốc sửa), xin URL cho
 * những ảnh chưa có trong cache. Trả map id -> url | null; ảnh chưa xin xong
 * thì CHƯA CÓ khóa trong map (UI phân biệt "đang tải" với "xin lỗi" bằng
 * undefined vs null).
 */
export function useMemoryPhotoUrls(memories: MemoryPhoto[]): Record<string, string | null> {
  const [fetched, setFetched] = useState<Record<string, string | null>>({});
  // Chữ ký của dây: chỉ id + mốc sửa mới ảnh hưởng URL — caption/ngày đổi thì
  // không cần xin lại, nên effect chỉ chạy lại khi chữ ký này đổi.
  const sig = memories.map((m) => `${m.id}@${m.updatedAt}`).join("|");
  useEffect(() => {
    if (memories.length === 0) return;
    let alive = true;
    fetchMemoryPhotoUrls(memories).then((map) => {
      if (alive) setFetched((prev) => ({ ...prev, ...map }));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memories được đại diện bằng chữ ký sig ở trên
  }, [sig]);
  // Chỉ trả URL của những ảnh ĐANG trên dây (ảnh bị gỡ thì URL của nó rơi ra
  // khỏi map dù cache phiên vẫn còn) — lọc ở tầng render, không setState vòng.
  const urls: Record<string, string | null> = {};
  for (const m of memories) if (fetched[m.id] !== undefined) urls[m.id] = fetched[m.id];
  return urls;
}

/**
 * Hook dùng chung cho các màn hiển thị ảnh hai đứa: theo dõi state.couplePhoto,
 * xin signed URL mới mỗi khi ảnh (path/mốc sửa) đổi. Trả null trong lúc đang
 * tải hoặc khi xin lỗi — UI lùi về tranh vẽ/trạng thái chưa có ảnh.
 */
export function useCouplePhotoUrl(photo: CouplePhoto | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const path = photo?.path ?? "";
  const updatedAt = photo?.updatedAt ?? "";
  useEffect(() => {
    let alive = true;
    if (!path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- xoá URL cũ ngay khi ảnh bị gỡ khỏi state
      setUrl(null);
      return;
    }
    fetchCouplePhotoUrl({ path, updatedAt, bySlot: photo?.bySlot ?? "A" }).then((u) => {
      if (alive) setUrl(u);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phụ thuộc path + mốc sửa của ảnh
  }, [path, updatedAt]);
  return url;
}

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { File } from "expo-file-system";
import type { CouplePhoto } from "./types";
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

/**
 * Tải ảnh vừa chọn lên Storage tại đường dẫn cố định của cặp đôi.
 * Thành công -> trả về CouplePhoto để nơi gọi dispatch vào state (reducer chỉ
 * là bước ghi sổ SAU khi file đã thật sự lên bucket). Mọi lỗi đều THROW với
 * thông điệp tiếng Việt ấm áp — nơi gọi hiển thị inline, không crash.
 */
export async function uploadCouplePhoto(coupleId: string, pickedUri: string, bySlot: "A" | "B"): Promise<CouplePhoto> {
  if (!coupleId) throw new Error("Chưa có vườn chung để lưu ảnh — hãy ghép cặp trước nhé.");
  const path = couplePhotoPath(coupleId);
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

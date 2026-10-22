/**
 * Hiệu chỉnh lệch đồng hồ giữa 2 máy bằng giờ SERVER (Supabase).
 *
 * Vấn đề: các mốc so sánh "mới/cũ" khi đồng bộ (updatedAt, secTs) lấy từ đồng hồ
 * thiết bị. Nếu đồng hồ máy A nhanh hơn máy B vài phút, mọi bản ghi của A luôn
 * "mới hơn" và đè ngược thao tác của B (hoặc ngược lại) dù B vừa thao tác xong.
 *
 * Giải pháp thực dụng: đo độ lệch (offset) giữa đồng hồ máy và giờ server qua
 * header `Date` của một request Supabase, rồi cộng offset vào MỌI mốc dùng để
 * so sánh thứ tự giữa 2 máy (updatedAt khi lưu, secTs khi sửa mục — xem store.tsx).
 * Logic nội bộ một máy (cooldown, ranh giới ngày) vẫn dùng giờ địa phương thuần:
 * "hôm nay" là khái niệm địa phương, không liên quan giờ server.
 *
 * Độ chính xác: header Date chỉ có độ phân giải 1 giây — đủ cho thứ tự thao tác
 * của người dùng (cách nhau hàng giây), không dùng cho việc cần ms chính xác.
 */
let offsetMs = 0;

export function setServerOffsetMs(ms: number): void {
  if (Number.isFinite(ms)) offsetMs = ms;
}
export function getServerOffsetMs(): number {
  return offsetMs;
}
/** "Bây giờ" đã hiệu chỉnh theo giờ server — CHỈ dùng cho mốc so sánh đồng bộ. */
export function nowMs(): number {
  return Date.now() + offsetMs;
}
export function nowIso(): string {
  return new Date(nowMs()).toISOString();
}

/**
 * Đo lại offset từ header Date của Supabase REST. Lỗi mạng -> giữ offset cũ (0 nếu chưa đo được).
 * Trả về offset hiện tại sau khi đo.
 */
export async function refreshServerOffset(supabaseUrl: string, apiKey: string): Promise<number> {
  if (!supabaseUrl) return offsetMs;
  try {
    const t0 = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: apiKey ? { apikey: apiKey } : {},
    });
    const t1 = Date.now();
    const hdr = res.headers.get("date");
    if (hdr) {
      const serverMs = Date.parse(hdr);
      if (Number.isFinite(serverMs)) setServerOffsetMs(serverMs - Math.round((t0 + t1) / 2));
    }
  } catch {
    /* bỏ qua — giữ offset cũ */
  }
  return offsetMs;
}

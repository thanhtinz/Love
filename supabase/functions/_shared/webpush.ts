// ============================================================================
// _shared/webpush.ts — đường WEB PUSH (chuẩn Push API của trình duyệt) dùng
// chung cho notify-note và notify-heartbeat.
//
// Song song với đường Expo Push (app điện thoại): sau khi gửi Expo, mỗi
// function gọi sendWebPushToUser() để gửi tiếp tới các đăng ký trình duyệt
// của NGƯỜI ẤY trong bảng web_push_subscriptions (migration
// 20261025_web_push_subscriptions.sql). Nội dung được mã hoá đầu-cuối theo
// RFC 8291 (aes128gcm) bằng khóa của chính đăng ký, ký VAPID (ES256) theo
// RFC 8292 — việc nặng do thư viện @negrel/webpush lo:
//
//   jsr:@negrel/webpush@0.5.0 — thư viện Web Push viết cho Deno/web runtime,
//   chỉ dùng WebCrypto (SubtleCrypto), không phụ thuộc Node — hợp với môi
//   trường Edge Functions. Chọn bản 0.5.0 (mới nhất trên JSR, ghim cứng để
//   bản deploy không tự trôi theo bản mới).
//
// Cấu hình qua Secrets của function (Dashboard -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY  — khóa công khai base64url (cùng khóa gắn vào app.json
//                       extra.webPushVapidPublicKey phía client)
//   VAPID_PRIVATE_KEY — khóa RIÊNG base64url (chỉ ở server, tuyệt đối không
//                       đưa vào app/repo)
//   VAPID_SUBJECT     — "mailto:..." hoặc URL trang web (mục `sub` của VAPID)
// Thiếu bất kỳ secret nào -> bỏ qua đường web ÂM THẦM (trả 0), đường Expo
// không hề bị ảnh hưởng. Endpoint trả 404/410 (đăng ký đã chết) -> xoá dòng
// đăng ký đó khỏi bảng.
// ============================================================================
import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
  Urgency,
} from "jsr:@negrel/webpush@0.5.0";

export interface WebPushPayload {
  title: string;
  body: string;
  type: string;
  url: string;
}

interface SubscriptionRow {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
}

/* ---------- base64url <-> byte (khóa VAPID dạng thô của web-push CLI) ---------- */

function base64UrlToBytes(b64: string): Uint8Array {
  const input = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * `npx web-push generate-vapid-keys` cho khóa dạng base64url THÔ (khóa công
 * khai = điểm EC chưa nén 65 byte 0x04||X||Y, khóa riêng = 32 byte), trong
 * khi @negrel/webpush nhập khóa dạng JWK (output của exportVapidKeys). Hàm
 * này chuyển đổi giữa hai dạng — JWK dựng từ đúng các byte đó nên cặp khóa
 * không đổi.
 */
function vapidJwkFromRawKeys(publicKeyB64: string, privateKeyB64: string) {
  const pub = base64UrlToBytes(publicKeyB64);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY không phải khóa P-256 dạng thô (65 byte)");
  }
  const priv = base64UrlToBytes(privateKeyB64);
  if (priv.length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY không phải khóa P-256 dạng thô (32 byte)");
  }
  const x = bytesToBase64Url(pub.slice(1, 33));
  const y = bytesToBase64Url(pub.slice(33, 65));
  return {
    publicKey: { kty: "EC", crv: "P-256", x, y, ext: true },
    privateKey: { kty: "EC", crv: "P-256", x, y, d: bytesToBase64Url(priv), ext: true },
  };
}

/* ---------- ApplicationServer (tạo một lần cho mỗi isolate) ---------- */

let cachedServer: ApplicationServer | null | undefined;

async function getApplicationServer(): Promise<ApplicationServer | null> {
  if (cachedServer !== undefined) return cachedServer;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "";
  if (!publicKey || !privateKey || !subject) {
    cachedServer = null;
    return null;
  }
  try {
    const vapidKeys = await importVapidKeys(vapidJwkFromRawKeys(publicKey, privateKey));
    cachedServer = await ApplicationServer.new({ contactInformation: subject, vapidKeys });
  } catch (e) {
    console.error("webpush: cấu hình VAPID không dùng được, bỏ qua đường web:", e);
    cachedServer = null;
  }
  return cachedServer;
}

/**
 * Gửi một thông báo Web Push tới MỌI đăng ký trình duyệt của một user.
 * Trả về số đăng ký gửi thành công (0 khi chưa cấu hình VAPID / user chưa
 * đăng ký trình duyệt nào / mọi lần gửi đều lỗi). Không bao giờ ném lỗi ra
 * ngoài — đường web là phụ trợ, không được phép làm hỏng function chính.
 */
// deno-lint-ignore no-explicit-any
export async function sendWebPushToUser(admin: any, userId: string, payload: WebPushPayload): Promise<number> {
  try {
    const server = await getApplicationServer();
    if (!server) return 0;
    const { data: rows } = await admin
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    const subs = ((rows ?? []) as SubscriptionRow[]).filter(
      (r) => typeof r.endpoint === "string" && r.endpoint &&
        typeof r.p256dh === "string" && r.p256dh &&
        typeof r.auth === "string" && r.auth,
    );
    if (subs.length === 0) return 0;

    const text = JSON.stringify(payload);
    let sent = 0;
    for (const row of subs) {
      const endpoint = row.endpoint as string;
      try {
        const subscriber = server.subscribe({
          endpoint,
          keys: { p256dh: row.p256dh as string, auth: row.auth as string },
        });
        await subscriber.pushTextMessage(text, { ttl: 3600, urgency: Urgency.High });
        sent++;
      } catch (e) {
        const gone = e instanceof PushMessageError &&
          (e.isGone() || e.response.status === 404 || e.response.status === 410);
        if (gone) {
          // Đăng ký đã chết (gỡ trình duyệt / thu hồi quyền) -> dọn khỏi bảng.
          await admin.from("web_push_subscriptions").delete().eq("endpoint", endpoint);
        }
        // Lỗi khác (mạng, máy chủ push bận...) -> bỏ qua êm, thử đăng ký tiếp theo.
      }
    }
    return sent;
  } catch {
    return 0;
  }
}

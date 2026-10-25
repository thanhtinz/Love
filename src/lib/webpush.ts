import { Platform } from "react-native";
import Constants from "expo-constants";
import { getSupabase } from "./supabase";

/**
 * ĐƯỜNG WEB PUSH CHO BẢN WEB — phía trình duyệt (phía server:
 * supabase/functions/_shared/webpush.ts, được notify-note / notify-heartbeat
 * gọi sau đường Expo Push).
 *
 * Khác hẳn đường Expo Push của app điện thoại (lib/push.ts): bản web dùng
 * chuẩn Push API của trình duyệt — service worker ở /sw.js (thư mục public/,
 * được expo export sao ra gốc bản web) nhận thông báo kể cả khi tab đã đóng:
 * - Người dùng bấm nút bật (trong Tài khoản) -> xin quyền Notification ->
 *   pushManager.subscribe bằng khóa VAPID công khai -> lưu đăng ký vào bảng
 *   web_push_subscriptions (mỗi trình duyệt/thiết bị một endpoint riêng).
 * - Edge function mã hoá nội dung theo RFC 8291 bằng khóa của chính đăng ký
 *   đó rồi gửi tới endpoint; trình duyệt đánh thức service worker để hiện.
 *
 * Khóa VAPID công khai đọc từ app.json extra.webPushVapidPublicKey — khóa
 * RIÊNG không bao giờ có mặt phía client (chỉ nằm trong Secrets của edge
 * function). Chưa cấu hình khóa -> luồng bật báo rõ "chưa cấu hình" thay vì
 * lỗi khó hiểu.
 *
 * iOS: Safari chỉ có PushManager khi trang đã được "Thêm vào màn hình chính"
 * (iOS 16.4+); ở tab Safari thường thì tính năng hiện "chưa hỗ trợ" kèm gợi ý.
 * Mọi hàm trong file này là no-op an toàn ngoài nền tảng web.
 */

export type WebPushStatus = "unsupported" | "default" | "granted" | "denied" | "subscribed";

export type WebPushEnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "no-key" | "denied" | "error"; message: string };

/* ---------- Kiểu tối thiểu cho API trình duyệt (tránh phụ thuộc DOM lib) ---------- */
interface PushSubscriptionJsonLike {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown } | null;
}
interface PushSubscriptionLike {
  options?: { applicationServerKey?: ArrayBuffer | null };
  toJSON: () => PushSubscriptionJsonLike;
  unsubscribe: () => Promise<boolean>;
}
interface PushManagerLike {
  getSubscription: () => Promise<PushSubscriptionLike | null>;
  subscribe: (options: { userVisibleOnly: boolean; applicationServerKey: Uint8Array }) => Promise<PushSubscriptionLike>;
}
interface ServiceWorkerRegistrationLike { pushManager: PushManagerLike }
interface WebGlobals {
  navigator?: {
    userAgent?: string;
    standalone?: boolean;
    serviceWorker?: {
      register: (url: string) => Promise<ServiceWorkerRegistrationLike>;
      getRegistration: () => Promise<ServiceWorkerRegistrationLike | undefined>;
    };
  };
  PushManager?: unknown;
  Notification?: {
    permission: string;
    requestPermission: () => Promise<string>;
  };
  matchMedia?: (query: string) => { matches: boolean };
}

function webGlobals(): WebGlobals | null {
  if (Platform.OS !== "web") return null;
  try {
    const g = globalThis as unknown as WebGlobals;
    return g && typeof g === "object" ? g : null;
  } catch { return null; }
}

function webPushSupported(g: WebGlobals): boolean {
  return Boolean(
    g.navigator &&
    g.navigator.serviceWorker &&
    typeof g.navigator.serviceWorker.register === "function" &&
    "PushManager" in g &&
    g.Notification &&
    typeof g.Notification.requestPermission === "function",
  );
}

/** Khóa VAPID công khai trong app.json extra ("" khi chủ dự án chưa cấu hình). */
export function vapidPublicKey(): string {
  const extra = (Constants.expoConfig?.extra || {}) as { webPushVapidPublicKey?: string };
  return typeof extra.webPushVapidPublicKey === "string" ? extra.webPushVapidPublicKey.trim() : "";
}

/* ---------- Hàm thuần (có kiểm chứng trong scripts/test-logic.mjs) ---------- */

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Giải mã base64url (định dạng khóa VAPID) thành byte — thuần, không cần atob. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const input = String(base64String || "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/g, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of input) {
    const value = B64_CHARS.indexOf(ch);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/** Mã hoá byte thành base64url không đệm (để so khớp khóa / dùng khi cần) — thuần, không cần btoa. */
export function bytesToUrlBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64_CHARS[b2 & 0x3f];
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_");
}

/** Khóa ứng dụng của một đăng ký sẵn có có khớp khóa VAPID hiện tại không. */
export function applicationServerKeyMatches(existing: ArrayBuffer | null | undefined, vapidKey: string): boolean {
  if (!existing || !vapidKey) return false;
  const expected = urlBase64ToUint8Array(vapidKey);
  const actual = new Uint8Array(existing);
  if (actual.length !== expected.length) return false;
  for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) return false;
  return true;
}

export interface WebPushSubscriptionRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
}

/** Chuẩn hoá PushSubscription.toJSON() thành dòng lưu vào web_push_subscriptions (null nếu thiếu dữ kiện). */
export function subscriptionToRow(json: PushSubscriptionJsonLike | null | undefined, userId: string, userAgent: string): WebPushSubscriptionRow | null {
  if (!json || typeof json.endpoint !== "string" || !json.endpoint) return null;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (typeof p256dh !== "string" || !p256dh || typeof auth !== "string" || !auth) return null;
  return { user_id: userId, endpoint: json.endpoint, p256dh, auth, user_agent: String(userAgent || "").slice(0, 300) };
}

/**
 * iPhone/iPad mở bằng Safari dạng tab thường: PushManager chưa tồn tại cho
 * tới khi trang được thêm vào màn hình chính. Thuần theo userAgent + cờ
 * standalone để UI gợi ý đúng việc cần làm.
 */
export function isIosNeedingHomeScreen(userAgent: string, standalone: boolean): boolean {
  if (standalone) return false;
  return /iphone|ipad|ipod/i.test(String(userAgent || ""));
}

function isStandaloneDisplay(g: WebGlobals): boolean {
  try {
    if (g.navigator?.standalone === true) return true;
    return Boolean(g.matchMedia && g.matchMedia("(display-mode: standalone)").matches);
  } catch { return false; }
}

/* ---------- Trạng thái + bật thông báo ---------- */

/**
 * Trạng thái Web Push của CHÍNH trình duyệt này:
 * unsupported (không phải web / thiếu API) · default (chưa được hỏi quyền) ·
 * denied (đã chặn) · granted (đã cho phép nhưng chưa có đăng ký khớp khóa) ·
 * subscribed (đã đăng ký xong — máy chủ gửi được).
 */
export async function getWebPushStatus(): Promise<WebPushStatus> {
  const g = webGlobals();
  if (!g || !webPushSupported(g)) return "unsupported";
  const perm = g.Notification?.permission ?? "default";
  if (perm === "denied") return "denied";
  if (perm !== "granted") return "default";
  try {
    const reg = await g.navigator?.serviceWorker?.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return "granted";
    const key = vapidPublicKey();
    if (!key) return "subscribed";
    return applicationServerKeyMatches(sub.options?.applicationServerKey ?? null, key) ? "subscribed" : "granted";
  } catch { return "granted"; }
}

/**
 * Bật Web Push cho trình duyệt này — CHỈ gọi từ thao tác bấm nút của người
 * dùng (trình duyệt đòi cử chỉ người dùng mới cho xin quyền):
 * đăng ký service worker -> xin quyền -> subscribe bằng khóa VAPID -> upsert
 * đăng ký vào web_push_subscriptions. Mọi kết quả đều nói thật qua message.
 */
export async function enableWebPush(userId: string): Promise<WebPushEnableResult> {
  const g = webGlobals();
  if (!g || !g.navigator?.serviceWorker) {
    return { ok: false, reason: "unsupported", message: "Trình duyệt này chưa hỗ trợ thông báo đẩy." };
  }
  if (!webPushSupported(g)) {
    if (isIosNeedingHomeScreen(g.navigator.userAgent ?? "", isStandaloneDisplay(g))) {
      return { ok: false, reason: "unsupported", message: "Trên iPhone/iPad, hãy thêm trang vào màn hình chính trước nhé (nút Chia sẻ -> Thêm vào màn hình chính), rồi mở app từ biểu tượng đó và bật thông báo tại đây." };
    }
    return { ok: false, reason: "unsupported", message: "Trình duyệt này chưa hỗ trợ thông báo đẩy." };
  }
  const key = vapidPublicKey();
  if (!key) {
    return { ok: false, reason: "no-key", message: "Chưa cấu hình khóa máy chủ cho thông báo web — người quản trị cần gắn khóa VAPID vào app trước đã nhé." };
  }
  try {
    const reg = await g.navigator.serviceWorker.register("/sw.js");
    const perm = await g.Notification?.requestPermission();
    if (perm === "denied") {
      return { ok: false, reason: "denied", message: "Trình duyệt đang chặn thông báo của trang này. Hãy mở cài đặt trang web (biểu tượng ổ khoá trên thanh địa chỉ) -> Thông báo -> Cho phép, rồi quay lại bấm bật nhé." };
    }
    if (perm !== "granted") {
      return { ok: false, reason: "denied", message: "Bạn chưa cho phép thông báo — bấm Bật lại và chọn Cho phép nhé." };
    }
    let sub = await reg.pushManager.getSubscription();
    if (sub && !applicationServerKeyMatches(sub.options?.applicationServerKey ?? null, key)) {
      // Đăng ký cũ gắn với khóa khác (đã đổi khóa máy chủ) -> hủy để đăng ký lại.
      try { await sub.unsubscribe(); } catch { /* bỏ qua */ }
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    }
    const row = subscriptionToRow(sub.toJSON(), userId, g.navigator.userAgent ?? "");
    if (!row) return { ok: false, reason: "error", message: "Trình duyệt chưa trả về đăng ký hợp lệ — thử lại sau nhé." };
    const { error } = await getSupabase()
      .from("web_push_subscriptions")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
    if (error) {
      return { ok: false, reason: "error", message: "Chưa lưu được đăng ký lên máy chủ — có thể bảng web_push_subscriptions chưa được tạo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error", message: "Có lỗi khi bật thông báo trên trình duyệt này, thử lại sau nhé." };
  }
}

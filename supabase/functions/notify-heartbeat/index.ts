// ============================================================================
// notify-heartbeat — Edge Function (Deno) cho đường push NHỊP NHỚ của Khu
// Vườn Tình Yêu.
//
// Luồng: app của NGƯỜI GỬI gọi hàm này NGAY sau mỗi lần gửi nhịp nhớ
// (supabase.functions.invoke("notify-heartbeat") — JWT phiên hiện tại đi kèm
// tự động). Nhịp nhớ không giới hạn và không có thời gian chờ, nên mỗi lần
// gọi = đúng một thông báo riêng cho nhịp đó. Hàm:
//   1. Xác định người gửi từ JWT (không tin bất kỳ id nào client gửi lên).
//   2. Tra couple + người ấy qua couple_members bằng service role.
//   3. Gửi tới mọi token trong push_tokens của người ấy qua Expo Push API:
//      thông báo NHÌN THẤY ĐƯỢC — tiêu đề "Nhịp nhớ", nội dung gọi tên người
//      gửi — kèm payload data tối thiểu cho app phía người nhận.
//   4. Gửi tiếp qua WEB PUSH (chuẩn trình duyệt, _shared/webpush.ts) tới các
//      đăng ký trong web_push_subscriptions của người ấy, cùng tiêu đề/nội
//      dung như đường Expo.
//
// Khác notify-note: nhịp nhớ KHÔNG mang nội dung riêng tư (chỉ là một nhịp
// "đang nhớ bạn") nên KHÔNG có cổng công tắc/widgetPrefs nào — tên người gửi
// luôn được phép hiện trong thông báo.
//
// Deploy (chủ dự án — xem cuối file): `supabase functions deploy notify-heartbeat`.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY được Supabase
// tự bơm vào môi trường function — không cần khai báo secret thủ công.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPushToUser } from "../_shared/webpush.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "missing env" }, 500);

  // 1) Người gửi = chủ nhân của JWT đi kèm request.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const author = userData?.user;
  if (userErr || !author) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  // 2) Couple của người gửi + người ấy.
  const { data: myMember } = await admin
    .from("couple_members")
    .select("couple_id, slot")
    .eq("user_id", author.id)
    .limit(1)
    .maybeSingle();
  if (!myMember) return json({ sent: 0, reason: "no couple" });

  const { data: members } = await admin
    .from("couple_members")
    .select("user_id, slot")
    .eq("couple_id", myMember.couple_id);
  const partner = (members ?? []).find((m) => m.user_id !== author.id);
  if (!partner) return json({ sent: 0, reason: "no partner" });

  // 3) Tên hiển thị của người gửi để gọi tên trong thông báo.
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", author.id)
    .maybeSingle();
  const authorName = profile?.display_name || "Người ấy";

  // 4) Token của người ấy -> Expo Push API (một thông báo cho chính nhịp này).
  const { data: tokenRows } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", partner.user_id);
  const tokens = (tokenRows ?? []).map((r) => r.token).filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

  const createdAt = new Date().toISOString();
  const title = "Nhịp nhớ";
  const body = `${authorName} vừa gửi bạn một nhịp nhớ`;

  let sent = 0;
  if (tokens.length > 0) {
    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: {
        type: "heartbeat",
        authorName,
        createdAt,
      },
      // iOS: cho phép hệ điều hành đánh thức app nền (best effort, như notify-note).
      contentAvailable: true,
      priority: "high",
      channelId: "default",
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (res.ok) sent = tokens.length;
    else console.error(`notify-heartbeat: expo push http ${res.status} — vẫn thử tiếp đường web`);
  }

  // 5) Web Push (bản web): cùng tiêu đề/nội dung như đường Expo cho nhịp này.
  // Chưa cấu hình VAPID -> trả 0 êm, không ảnh hưởng nhịp/realtime.
  const webSent = await sendWebPushToUser(admin, partner.user_id, {
    title,
    body,
    type: "heartbeat",
    url: "/",
  });

  if (sent === 0 && webSent === 0) return json({ sent: 0, webSent: 0, reason: "partner has no devices" });
  return json({ sent, webSent });
});

// ============================================================================
// BƯỚC CỦA CHỦ DỰ ÁN (giống notify-note, không làm được từ phía app):
// 1. Bảng push_tokens phải đã có (migration 20261024_push_tokens.sql — cùng
//    bước với notify-note, chỉ chạy một lần).
// 2. Deploy function: `supabase functions deploy notify-heartbeat` (từ thư
//    mục gốc repo, đã `supabase link` đúng project love-couple-app). JWT
//    verification giữ mặc định BẬT.
// 3. Thông tin xác thực gửi push (FCM cho Android, APNs cho iOS) và liên kết
//    EAS projectId: cùng các bước đã ghi ở cuối notify-note — làm một lần là
//    cả hai function đều dùng được.
// 4. Đường WEB PUSH: cùng cấu hình như notify-note (migration
//    20261025_web_push_subscriptions.sql + 3 Secrets VAPID_* — Secrets dùng
//    chung cho mọi function của dự án nên chỉ đặt một lần).
// ============================================================================

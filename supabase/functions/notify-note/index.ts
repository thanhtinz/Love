// ============================================================================
// notify-note — Edge Function (Deno) cho đường push note của Khu Vườn Tình Yêu.
//
// Luồng: app của NGƯỜI GỬI gọi hàm này ngay sau khi gửi note
// (supabase.functions.invoke("notify-note") — JWT phiên hiện tại đi kèm tự
// động). Hàm:
//   1. Xác định người gửi từ JWT (không tin bất kỳ id nào client gửi lên).
//   2. Tra couple + người ấy qua couple_members bằng service role.
//   3. Đọc note mới nhất CỦA NGƯỜI GỬI trong room_state.state.notes (note nằm
//      trong JSON state của vườn — không có bảng notes riêng).
//   4. Gửi tới mọi token trong push_tokens của người ấy qua Expo Push API:
//      một thông báo NHÌN THẤY ĐƯỢC ("Note mới từ {tên}" + xem trước ngắn)
//      kèm payload data để app nền làm mới widget khi hệ điều hành cho chạy.
//   5. Gửi tiếp qua WEB PUSH (chuẩn trình duyệt, _shared/webpush.ts) tới các
//      đăng ký trong web_push_subscriptions của người ấy — cùng cổng riêng
//      tư: nội dung note chỉ rời máy chủ khi công tắc Note của người ấy bật.
//
// Deploy (chủ dự án — xem cuối file): `supabase functions deploy notify-note`.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY được Supabase
// tự bơm vào môi trường function — không cần khai báo secret thủ công.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPushToUser } from "../_shared/webpush.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PREVIEW_MAX = 80;
const NOTE_TEXT_MAX = 300;

interface NoteRow {
  id?: string;
  authorSlot?: string;
  text?: string;
  createdAt?: string;
}

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

  // 3) Note mới nhất của người gửi + tên hiển thị.
  let noteText = "";
  let noteId = "";
  let noteCreatedAt = new Date().toISOString();
  const { data: room } = await admin
    .from("room_state")
    .select("state")
    .eq("couple_id", myMember.couple_id)
    .maybeSingle();
  const roomState = room?.state as {
    notes?: NoteRow[];
    widgetPrefs?: Record<string, { note?: boolean } | undefined>;
  } | null;
  const notes = (roomState?.notes ?? [])
    .filter((n) => n.authorSlot === myMember.slot && typeof n.text === "string");
  // Cổng riêng tư phía NGƯỜI NHẬN: công tắc Note trong widgetPrefs của người ấy
  // TẮT (hoặc state cũ chưa có) -> thông báo chỉ có tiêu đề, KHÔNG kèm nội dung
  // note trong phần xem trước lẫn payload (nội dung không rời app khi họ chưa
  // cho phép hiện note ra ngoài màn hình chính).
  const partnerAllowsNotePreview = roomState?.widgetPrefs?.[partner.slot]?.note === true;
  if (notes.length > 0) {
    noteText = String(notes[0].text).slice(0, NOTE_TEXT_MAX);
    noteId = String(notes[0].id ?? "");
    noteCreatedAt = String(notes[0].createdAt ?? noteCreatedAt);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", author.id)
    .maybeSingle();
  const authorName = profile?.display_name || "Người ấy";

  // 4) Token của người ấy -> Expo Push API (thông báo nhìn thấy + data payload).
  const { data: tokenRows } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", partner.user_id);
  const tokens = (tokenRows ?? []).map((r) => r.token).filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

  const flat = noteText.replace(/\s+/g, " ").trim();
  const preview = flat.length > PREVIEW_MAX ? flat.slice(0, PREVIEW_MAX - 1).trimEnd() + "…" : flat;
  const visibleBody = partnerAllowsNotePreview ? (preview || "Mở app để đọc note nhé") : "Mở app để đọc note nhé";

  let sent = 0;
  if (tokens.length > 0) {
    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: `Note mới từ ${authorName}`,
      body: visibleBody,
      data: {
        type: "note",
        noteId,
        text: partnerAllowsNotePreview ? noteText : "",
        authorName,
        createdAt: noteCreatedAt,
      },
      // iOS: cho phép hệ điều hành đánh thức app nền để làm mới widget (best effort).
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
    else console.error(`notify-note: expo push http ${res.status} — vẫn thử tiếp đường web`);
  }

  // 5) Web Push (bản web): cùng tiêu đề/nội dung hiện hữu như đường Expo —
  // cổng riêng tư giữ nguyên: nội dung note chỉ xuất hiện khi công tắc Note
  // trong widgetPrefs của NGƯỜI ẤY đang bật. Chưa cấu hình VAPID -> 0 êm.
  const webSent = await sendWebPushToUser(admin, partner.user_id, {
    title: `Note mới từ ${authorName}`,
    body: visibleBody,
    type: "note",
    url: "/notes",
  });

  if (sent === 0 && webSent === 0) return json({ sent: 0, webSent: 0, reason: "partner has no devices" });
  return json({ sent, webSent });
});

// ============================================================================
// BƯỚC CỦA CHỦ DỰ ÁN (không làm được từ phía app):
// 1. Chạy migration supabase/migrations/20261024_push_tokens.sql trong
//    Supabase Dashboard -> SQL Editor (tạo bảng push_tokens + RLS).
// 2. Deploy function: `supabase functions deploy notify-note` (từ thư mục gốc
//    repo, đã `supabase link` đúng project love-couple-app). JWT verification
//    giữ mặc định BẬT.
// 3. Thông tin xác thực gửi push:
//    - Android: cần FCM server key — cấu hình qua EAS (`eas credentials` /
//      google-services.json + FCM V1) rồi Expo Push dùng tự động.
//    - iOS: cần APNs key — tạo trong Apple Developer (cần tài khoản trả phí),
//      nạp qua `eas credentials` cho bundle com.thanhtinz.love.
// 4. Liên kết EAS project để app lấy được Expo Push Token: chạy `eas init`
//    (ghi projectId vào app.json extra.eas.projectId) rồi build lại app.
//    Thiếu bước này lib/push.ts báo "no-project" trong mục Widget.
// 5. Đường WEB PUSH (tùy chọn, chỉ cho bản web): chạy thêm migration
//    supabase/migrations/20261025_web_push_subscriptions.sql trong SQL
//    Editor, rồi đặt 3 Secrets cho function (Dashboard -> Edge Functions ->
//    Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//    ("mailto:..."). Cặp khóa sinh bằng `npx web-push generate-vapid-keys`;
//    khóa CÔNG khai còn phải gắn vào app.json extra.webPushVapidPublicKey.
//    Chưa làm bước này -> thông báo web chỉ im lặng bỏ qua, app vẫn chạy.
// ============================================================================

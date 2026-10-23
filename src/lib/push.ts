import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { getSupabase } from "./supabase";
import { refreshWidgetForIncomingNote } from "./widgetSync";
import type { WidgetNoteInput } from "./widget";

/**
 * ĐƯỜNG PUSH CHO NOTE — phía app (phía server: supabase/functions/notify-note).
 *
 * Mục tiêu THẬT, không hứa quá: thông báo hiển thị là thứ đến ngay và chắc
 * chắn; widget được làm mới theo kiểu "cơ hội tốt nhất" — iOS giới hạn số lần
 * app nền được đánh thức + số lần widget được vẽ lại, Android chỉ đổi widget
 * khi app đẩy snapshot mới. Vì vậy:
 * - Push mang CẢ thông báo nhìn thấy được LẪN payload data (note mới nhất).
 * - Handler nền (khi hệ điều hành cho chạy) dựng lại props widget từ cache +
 *   payload mà không cần mở app. App mở/foreground thì WidgetSync đồng bộ
 *   lại đầy đủ từ state thật — đó mới là đường chắc chắn nhất.
 *
 * Token Expo Push lưu ở bảng push_tokens (migration 20261024_push_tokens.sql,
 * RLS: mỗi người chỉ quản token của chính mình). Edge function notify-note tra
 * token của NGƯỜI ẤY bằng service role và gửi qua Expo Push API.
 */

export const NOTE_BACKGROUND_TASK = "love-note-background-task";

export type PushRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: "web" | "expo-go" | "permission" | "no-project" | "error"; message: string };

function isExpoGo(): boolean {
  try { return String(Constants.executionEnvironment) === "storeClient"; } catch { return false; }
}

function projectId(): string | null {
  const extra = (Constants.expoConfig?.extra || {}) as { eas?: { projectId?: string } };
  return typeof extra.eas?.projectId === "string" && extra.eas.projectId ? extra.eas.projectId : null;
}

/** Trạng thái quyền thông báo hiện tại (không xin quyền). */
export async function pushPermissionGranted(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const res = await Notifications.getPermissionsAsync();
    return res.granted;
  } catch { return false; }
}

/**
 * Xin quyền (chỉ gọi từ thao tác bấm nút trong Cài đặt widget — xin quyền đúng
 * ngữ cảnh), lấy Expo Push Token và lưu vào push_tokens cho user hiện tại.
 * Mọi lỗi đều trả về dạng kết quả để UI nói thật với người dùng, không nuốt.
 */
export async function registerNotePushToken(userId: string): Promise<PushRegisterResult> {
  if (Platform.OS === "web") return { ok: false, reason: "web", message: "Thông báo đẩy chỉ có trên app điện thoại." };
  if (isExpoGo()) return { ok: false, reason: "expo-go", message: "Cần bản app cài thật (không phải Expo Go) để nhận thông báo note." };
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: "permission", message: "Bạn chưa cho phép thông báo — bật trong Cài đặt của điện thoại nhé." };

    const pid = projectId();
    let token: string;
    try {
      const res = await Notifications.getExpoPushTokenAsync(pid ? { projectId: pid } : undefined);
      token = res.data;
    } catch {
      return { ok: false, reason: "no-project", message: "Chưa lấy được mã thông báo — app cần được liên kết dự án EAS (projectId) trước." };
    }
    if (!token) return { ok: false, reason: "error", message: "Chưa lấy được mã thông báo, thử lại sau nhé." };

    const sb = getSupabase();
    const { error } = await sb.from("push_tokens").upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" },
    );
    if (error) return { ok: false, reason: "error", message: "Chưa lưu được mã thông báo lên máy chủ — có thể bảng push_tokens chưa được tạo." };
    return { ok: true, token };
  } catch {
    return { ok: false, reason: "error", message: "Có lỗi khi bật thông báo, thử lại sau nhé." };
  }
}

/**
 * Sau khi GỬI note: gọi edge function notify-note (fire-and-forget). Hàm tự
 * suy ra người gửi từ JWT của phiên hiện tại và tra token của người ấy.
 * Function chưa được deploy -> lỗi bị nuốt êm, note vẫn đã gửi qua realtime.
 */
export function notifyPartnerOfNote(): void {
  if (Platform.OS === "web") return;
  try {
    void getSupabase().functions.invoke("notify-note", { body: {} }).catch(() => {});
  } catch { /* chưa đăng nhập / chưa có mạng — realtime vẫn chuyển note */ }
}

/* ---------- Nhận push: foreground + chạm vào thông báo ---------- */
interface NotePayload { type?: string; noteId?: string; text?: string; authorName?: string; createdAt?: string }

function noteInputFromPayload(data: unknown): WidgetNoteInput | null {
  if (!data || typeof data !== "object") return null;
  const d = data as NotePayload;
  if (d.type !== "note" || typeof d.text !== "string" || !d.text) return null;
  return {
    id: typeof d.noteId === "string" ? d.noteId : "",
    text: d.text,
    authorName: typeof d.authorName === "string" ? d.authorName : "",
    createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date().toISOString(),
    readAt: "",
  };
}

/**
 * Gắn handler hiển thị + listener: push đến lúc app đang mở -> làm mới widget
 * ngay từ payload; người dùng chạm vào thông báo -> mở tab Note. Trả hàm gỡ.
 */
export function setupNotificationHandlers(onOpenNotes: () => void): () => void {
  if (Platform.OS === "web") return () => {};
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch { /* Expo Go / thiếu native module */ }

  let received: { remove: () => void } | null = null;
  let responded: { remove: () => void } | null = null;
  try {
    received = Notifications.addNotificationReceivedListener((n) => {
      const note = noteInputFromPayload(n.request.content.data);
      if (note) void refreshWidgetForIncomingNote(note);
    });
    responded = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as NotePayload | undefined;
      if (data?.type === "note") onOpenNotes();
    });
  } catch { /* bỏ qua êm */ }
  return () => { received?.remove(); responded?.remove(); };
}

/* ---------- Handler nền: push tới lúc app đang tắt/bị hệ thống đánh thức ---------- */
// defineTask phải nằm ở scope module (chạy ngay khi bundle được nạp, kể cả khi
// hệ điều hành khởi động app chỉ để xử lý push nền). Payload có thể bị bọc thêm
// một lớp `data` tuỳ kênh -> chuẩn hoá cả hai dạng. Web/Expo Go: bọc try/catch
// + Platform để bản web không bao giờ vỡ vì task nền.
if (Platform.OS !== "web") {
  try {
    TaskManager.defineTask(NOTE_BACKGROUND_TASK, async ({ data, error }) => {
      if (error) return Notifications.BackgroundNotificationTaskResult.Failed;
      const outer = (data ?? {}) as Record<string, unknown>;
      const inner = (outer.data && typeof outer.data === "object" ? outer.data : outer) as unknown;
      const note = noteInputFromPayload(inner);
      if (note) await refreshWidgetForIncomingNote(note);
      return Notifications.BackgroundNotificationTaskResult.NewData;
    });
  } catch { /* môi trường không hỗ trợ task nền — bỏ qua êm */ }
}

/** Đăng ký task nền với hệ thống (idempotent, gọi khi app khởi động trên native). */
export async function registerNoteBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try { await Notifications.registerTaskAsync(NOTE_BACKGROUND_TASK); } catch { /* Expo Go — bỏ qua */ }
}

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * LỚP CẢM GIÁC (đợt "chất app" 1) — mọi rung trong app đi qua file này.
 * - Web: NO-OP hoàn toàn (không rung, không lỗi) — bản web chỉ có khoảnh khắc hình ảnh.
 * - Native: expo-haptics (iOS Taptic Engine / Android Vibrator). Mọi lỗi đều
 *   nuốt êm: rung là gia vị, không bao giờ được làm hỏng thao tác chính.
 * Nhịp API: tapLight (chạm nhẹ) · success (hoàn thành) · careTouch (chăm cây)
 * · softWarning (bị chặn) · heartbeatPulse (nhịp tim ĐÔI: đập — nghỉ 180ms — đập nhẹ).
 */
const ENABLED = Platform.OS !== "web";

function safe(run: () => Promise<unknown>): void {
  if (!ENABLED) return;
  run().catch(() => { /* rung hỏng thì thôi, thao tác chính vẫn tiếp tục */ });
}

/** Chạm nhẹ — phản hồi cho các lần bấm thường. */
export function tapLight(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Hoàn thành một việc có ý nghĩa (gửi note...). */
export function success(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Chăm cây — mềm và ấm như chạm vào lá. */
export function careTouch(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
}

/** Bị chặn (vd chăm cây khi chỉ số đã đầy) — cảnh báo mềm, không gắt. */
export function softWarning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Nhịp tim đôi của "nhịp nhớ": một đập vừa, nghỉ ~180ms, một đập nhẹ — gửi lẫn nhận đều dùng. */
export function heartbeatPulse(): void {
  if (!ENABLED) return;
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  setTimeout(() => {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }, 180);
}

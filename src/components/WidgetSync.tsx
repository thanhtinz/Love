import { useEffect, useRef } from "react";
import { AppState as RNAppState, Platform } from "react-native";
import { router } from "expo-router";
import { useLove } from "../lib/store";
import { syncWidgetFromState } from "../lib/widgetSync";
import { registerNoteBackgroundTask, setupNotificationHandlers } from "../lib/push";

/**
 * Đồng bộ WIDGET MÀN HÌNH CHÍNH — component không giao diện gắn ở _layout
 * (cùng kiểu LocationSync):
 * - Sau khi store hydrate + mỗi lần state đổi: đẩy props mới lên widget
 *   (widgetSync tự dedupe bằng chữ ký nội dung — state đổi mà nội dung widget
 *   không đổi thì không đẩy lại).
 * - App quay lại foreground: đẩy ÉP (force) — qua nửa đêm lúc app đang mở,
 *   đang ở nền lâu, hoặc dữ liệu đã bị iOS/Android làm cũ đều được làm tươi.
 * - Gắn handler thông báo note một lần khi mở app: push đến lúc app đang mở
 *   thì làm mới widget từ payload; chạm thông báo thì mở tab Note; đăng ký
 *   task xử lý push nền.
 * Trên web: mọi hàm đều tự no-op (guard Platform) — bản demo Vercel không đổi.
 */
export function WidgetSync() {
  const { state, hydrated } = useLove();
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Đẩy sau hydrate + mỗi thay đổi state (dedupe ở tầng widgetSync).
  useEffect(() => {
    if (!hydrated || Platform.OS === "web") return;
    void syncWidgetFromState(state, state.currentUser);
  }, [state, hydrated]);

  // Foreground: ép đẩy lại + gắn handler push một lần.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const openNotes = () => { try { router.push("/(tabs)/notes"); } catch { /* route chưa sẵn sàng */ } };
    const teardown = setupNotificationHandlers(openNotes);
    void registerNoteBackgroundTask();
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "active") void syncWidgetFromState(stateRef.current, stateRef.current.currentUser, true);
    });
    return () => { teardown(); sub.remove(); };
  }, []);

  return null;
}

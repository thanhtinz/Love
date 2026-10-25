import { useEffect, useRef } from "react";
import { AppState as RNAppState } from "react-native";
import * as Location from "expo-location";
import { useLove } from "../lib/store";
import { shouldPublishLive } from "../lib/features";
import { foregroundPermissionGranted, getBatteryPct } from "./presenceService";

/**
 * Publish VỊ TRÍ TRỰC TIẾP (core 5 — bản làm lại: KHÔNG phiên, KHÔNG công tắc).
 * Gắn ở layout gốc nên chạy TOÀN APP:
 * - App đang foreground + quyền vị trí foreground ĐÃ cấp -> watchPositionAsync
 *   (độ chính xác Balanced) và publish điểm mới nhất của CHÍNH NGƯỜI NÀY vào
 *   state dùng chung, qua cổng tiết lưu shouldPublishLive (>= 10 giây VÀ
 *   >= 20m từ điểm publish gần nhất). Ghim của người ấy trên bản đồ vì thế
 *   chạy theo thời gian thực qua kênh đồng bộ sẵn có.
 * - Chưa có quyền: KHÔNG tự xin (màn Bản đồ là nơi xin quyền, có nút "Cấp
 *   quyền vị trí") — chỉ kiểm tra lại mỗi ~15 giây khi app đang mở, để người
 *   dùng vừa cấp quyền xong là publish bắt đầu ngay, không cần mở lại app.
 * - App vào background -> huỷ watch ngay: KHÔNG theo dõi nền, KHÔNG lịch sử —
 *   state chỉ giữ điểm mới nhất của mỗi người.
 * - Web: watchPositionAsync chạy qua Geolocation của trình duyệt khi tab đang
 *   mở; AppState "change" trên web đi theo visibility của tab.
 */
export function LocationSync() {
  const { state, dispatch, hydrated } = useLove();
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    let permTimer: ReturnType<typeof setInterval> | null = null;
    // Điểm publish gần nhất của chính máy này — hạt giống từ state đã tải để
    // cổng tiết lưu vẫn đúng sau khi component gắn lại.
    const s0 = stateRef.current;
    const slot0 = s0.presence[s0.currentUser];
    const lastRef: { current: { lat: number; lng: number; atMs: number } | null } = {
      current: slot0.lat != null && slot0.lng != null && slot0.locAt
        ? { lat: slot0.lat, lng: slot0.lng, atMs: new Date(slot0.locAt).getTime() }
        : null,
    };

    async function onFix(pos: Location.LocationObject) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const nowMs = Date.now();
      if (!shouldPublishLive(lastRef.current, { lat, lng }, nowMs)) return;
      lastRef.current = { lat, lng, atMs: nowMs };
      const battery = await getBatteryPct();
      if (cancelled) return;
      const s = stateRef.current;
      dispatch({
        type: "PRESENCE_SNAPSHOT",
        user: s.currentUser,
        lat,
        lng,
        acc: pos.coords.accuracy ?? null,
        battery,
        at: new Date(nowMs).toISOString(),
      });
    }

    async function ensureWatching() {
      if (sub || cancelled) return;
      const granted = await foregroundPermissionGranted();
      if (!granted || cancelled || sub) return;
      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
          (pos) => { void onFix(pos); },
        );
      } catch {
        sub = null; // nền tảng không hỗ trợ watch (hiếm) — lần kiểm tra sau thử lại
      }
      if (sub && permTimer) { clearInterval(permTimer); permTimer = null; }
    }

    void ensureWatching();
    permTimer = setInterval(() => { void ensureWatching(); }, 15000);
    const appSub = RNAppState.addEventListener("change", (st) => {
      if (st === "active") {
        void ensureWatching();
      } else {
        // Rời foreground: dừng watch ngay — vị trí chỉ publish khi app đang mở.
        sub?.remove();
        sub = null;
      }
    });
    return () => {
      cancelled = true;
      if (permTimer) clearInterval(permTimer);
      appSub.remove();
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return null;
}

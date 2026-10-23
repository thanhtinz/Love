import { useEffect, useRef } from "react";
import { useLove } from "../lib/store";
import type { PresenceSlotState } from "../lib/types";
import { captureLocationFix, foregroundPermissionGranted, getBatteryPct } from "./presenceService";

/**
 * Tự chụp snapshot hiện diện MỘT LẦN khi app mở (sau khi dữ liệu vườn nạp xong),
 * đúng mô hình "snapshot khi mở app" của kế hoạch Hạng 2 — không theo dõi nền,
 * không chụp lại theo timer. Điều kiện chụp:
 * - Pin: chỉ khi chủ nhân đang bật chia sẻ pin.
 * - Vị trí: chỉ khi chủ nhân đang bật chia sẻ vị trí VÀ quyền foreground ĐÃ được
 *   cấp từ trước (mở app không bao giờ tự bật hộp thoại xin quyền — xin quyền chỉ
 *   xảy ra khi người dùng bật công tắc trong màn Hiện diện).
 * Reducer PRESENCE_SET tự no-op khi snapshot giống hệt bản cũ nên không phát
 * đồng bộ thừa.
 */
export function PresenceSync() {
  const { state, dispatch, hydrated } = useLove();
  const ranFor = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const scope = hydrated ? state.roomCode : null;
  useEffect(() => {
    if (!scope || ranFor.current === scope) return;
    ranFor.current = scope;
    let cancelled = false;
    (async () => {
      const s = stateRef.current;
      const me = s.currentUser;
      const slot = s.presence[me];
      const patch: Partial<PresenceSlotState> = {};
      if (slot.shareBattery) {
        const b = await getBatteryPct();
        if (b != null) patch.battery = b;
      }
      if (slot.shareLocation && (await foregroundPermissionGranted())) {
        const fix = await captureLocationFix();
        if (fix) { patch.lat = fix.lat; patch.lng = fix.lng; patch.acc = fix.acc; }
      }
      if (cancelled || Object.keys(patch).length === 0) return;
      patch.at = new Date().toISOString();
      dispatch({ type: "PRESENCE_SET", user: me, patch });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return null;
}

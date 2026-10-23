import { useEffect, useRef } from "react";
import { AppState as RNAppState } from "react-native";
import { myName, useLove } from "../lib/store";
import { shareStatus } from "../lib/features";
import { captureLocationFix, foregroundPermissionGranted, getBatteryPct } from "./presenceService";

/**
 * Đồng bộ ĐỊNH VỊ TẠM THỜI (core 5) — thay PresenceSync của bản cũ.
 * Chỉ chạy khi CHÍNH NGƯỜI DÙNG này đang bật chia sẻ:
 * - Chụp snapshot khi: phiên bắt đầu / app quay lại foreground / mỗi ~5 phút
 *   trong lúc app đang mở. Mỗi snapshot = vị trí mới nhất + % pin + mốc giờ.
 * - KHÔNG theo dõi nền, KHÔNG lưu lịch sử đường đi — snapshot mới ghi đè cũ.
 * - Chỉ chụp vị trí khi quyền foreground ĐÃ được cấp sẵn (màn /location là nơi
 *   xin quyền); quyền bị thu hồi giữa chừng -> snapshot chỉ còn pin + giờ, và
 *   phía người ấy thấy "chưa có vị trí" một cách trung thực.
 * - Phiên hết hạn trong lúc app mở: dispatch PRESENCE_STOP (expired) đúng 1 lần.
 */
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

export function LocationSync() {
  const { state, dispatch, hydrated } = useLove();
  const me = state.currentUser;
  const mySlot = state.presence[me];
  const sharing = mySlot.sharing;
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !sharing) return;
    let cancelled = false;

    async function capture() {
      if (busyRef.current) return;
      const s = stateRef.current;
      const slot = s.presence[s.currentUser];
      if (!slot.sharing) return;
      // Hết hạn ngay tại máy này: kết thúc phiên thay vì chụp thêm.
      if (shareStatus(slot).expired) {
        dispatch({ type: "PRESENCE_STOP", user: s.currentUser, actor: myName(s), reason: "expired" });
        return;
      }
      busyRef.current = true;
      try {
        const battery = await getBatteryPct();
        const granted = await foregroundPermissionGranted();
        const fix = granted ? await captureLocationFix() : null;
        if (cancelled) return;
        dispatch({
          type: "PRESENCE_SNAPSHOT",
          user: s.currentUser,
          lat: fix ? fix.lat : null,
          lng: fix ? fix.lng : null,
          acc: fix ? fix.acc : null,
          battery,
          at: new Date().toISOString(),
        });
      } finally {
        busyRef.current = false;
      }
    }

    capture();
    const iv = setInterval(() => { if (RNAppState.currentState === "active") capture(); }, SNAPSHOT_INTERVAL_MS);
    const sub = RNAppState.addEventListener("change", (st) => { if (st === "active") capture(); });
    // Kiểm tra hết hạn mỗi 30 giây ngay cả khi không chụp snapshot mới.
    const expIv = setInterval(() => {
      const s = stateRef.current;
      const slot = s.presence[s.currentUser];
      if (slot.sharing && shareStatus(slot).expired) {
        dispatch({ type: "PRESENCE_STOP", user: s.currentUser, actor: myName(s), reason: "expired" });
      }
    }, 30000);
    return () => { cancelled = true; clearInterval(iv); clearInterval(expIv); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, sharing, me]);

  return null;
}

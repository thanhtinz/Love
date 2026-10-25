import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Battery from "expo-battery";

/**
 * Chụp snapshot hiện diện NHẸ (kế hoạch Hạng 2): vị trí foreground 1 lần +
 * % pin. Mọi hàm đều nuốt lỗi và trả null — web không có geolocation/Battery
 * API thì tính năng tự suy giảm trạng thái, TUYỆT ĐỐI không crash.
 * Không có bất kỳ cơ chế theo dõi nền nào ở đây.
 */

export interface LocationFix { lat: number; lng: number; acc: number | null }

/** % pin 0..100; null khi máy/trình duyệt không đọc được (Battery API không có trên nhiều trình duyệt). */
export async function getBatteryPct(): Promise<number | null> {
  try {
    const lvl = await Battery.getBatteryLevelAsync();
    if (typeof lvl !== "number" || !Number.isFinite(lvl) || lvl < 0) return null;
    return Math.round(lvl * 100);
  } catch {
    return null;
  }
}

export async function foregroundPermissionGranted(): Promise<boolean> {
  try {
    const r = await Location.getForegroundPermissionsAsync();
    return r.status === "granted";
  } catch {
    return false;
  }
}

/** Xin quyền vị trí foreground — CHỈ gọi từ nút "Cấp quyền vị trí" ở màn Bản đồ (cổng duy nhất của tính năng). */
export async function requestForegroundPermission(): Promise<boolean> {
  try {
    const r = await Location.requestForegroundPermissionsAsync();
    return r.status === "granted";
  } catch {
    return false;
  }
}

function webGeolocationFix(): Promise<LocationFix | null> {
  return new Promise((resolve) => {
    try {
      const nav = (globalThis as { navigator?: { geolocation?: Geolocation } }).navigator;
      if (!nav?.geolocation) { resolve(null); return; }
      nav.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null }),
        () => resolve(null),
        { timeout: 10000, maximumAge: 60000 },
      );
    } catch {
      resolve(null);
    }
  });
}

/** Lấy 1 điểm vị trí foreground; null khi bị từ chối/không khả dụng. */
export async function captureLocationFix(): Promise<LocationFix | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (pos && Number.isFinite(pos.coords.latitude) && Number.isFinite(pos.coords.longitude)) {
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null };
    }
  } catch {
    /* rơi xuống fallback web bên dưới */
  }
  if (Platform.OS === "web") return webGeolocationFix();
  return null;
}

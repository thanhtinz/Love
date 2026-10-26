import React, { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
} from "@expo-google-fonts/be-vietnam-pro";
import { AuthProvider, useAuth, useRouteHint } from "../lib/auth";
import { GardenProvider } from "../lib/store";
import { C } from "../components/ui";
import { LocationSync } from "../components/LocationSync";
import { WidgetSync } from "../components/WidgetSync";
import { COLOR } from "../components/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Bản rebuild 5 lõi — bản đồ route TOÀN APP:
 * index (cổng) · auth · pair · (tabs)[Nhà index / Cây tree / Note notes /
 * Hai đứa couple — giữa thanh tab là NÚT TIM gửi nhịp nhớ, không phải route] ·
 * location (định vị tạm thời) · account (tài khoản) ·
 * letters (Hộp thư đã giữ — kỷ vật thư tình, đợt "chất app" 2) ·
 * memories (Dây kỷ niệm — kho ảnh treo trên dây thừng) ·
 * special-days (Ngày kỷ niệm — sinh nhật, ngày đặc biệt + sửa ngày yêu).
 */
/** Các route CHỈ dành cho người đã đăng nhập + đã có vườn. Trước đây cổng
 *  kiểm tra chỉ sống ở route "/" (màn Gate) — mở app bằng đường dẫn sâu
 *  (PWA ghim màn hình chính ghi nhớ URL lúc ghim, bookmark, link chia sẻ...)
 *  là vào thẳng (tabs) mà không qua cổng, giao diện vườn hiện ra dù chưa
 *  đăng nhập. Nay cổng nằm ngay tại Navigator gốc, áp cho MỌI route. */
const PROTECTED_SEGMENTS = ["(tabs)", "location", "account", "letters", "memories", "special-days"];

/** Màn chờ thương hiệu — hiện trong lúc cổng đang quyết (đọc phiên cục bộ /
 *  chờ kết luận vườn lần đầu trên máy mới). Giao diện vườn KHÔNG bao giờ
 *  được vẽ phía sau màn này khi chưa qua cổng. */
function GateSplash() {
  return (
    <View style={styles.gateWrap}>
      <Ionicons name="heart" size={54} color={C.pink} />
      <Text style={styles.gateTitle}>Khu Vườn Tình Yêu</Text>
      <ActivityIndicator color={C.pink} style={{ marginTop: 14 }} />
      <Text style={styles.gateSub}>Đang mở cổng vườn...</Text>
    </View>
  );
}

function Navigator() {
  const { user, couple, ready, coupleReady, sessionUid } = useAuth();
  const hint = useRouteHint(sessionUid);
  const segments = useSegments();
  const seg = (segments[0] as string | undefined) ?? "";
  const isProtected = PROTECTED_SEGMENTS.includes(seg);

  /* Quyết định của cổng — chỉ dựa trên sự thật CỤC BỘ + kết luận vườn:
   * - Chưa đọc xong phiên: chờ (màn chờ thương hiệu, không vẽ gì khác).
   * - Chắc chắn chưa đăng nhập (sessionUid null): route bảo vệ/Ghép cặp ->
   *   về Đăng nhập. Đây là quyết định cuối cùng, không chờ mạng.
   * - Có phiên nhưng hồ sơ không tải được (ready rồi mà user vẫn null):
   *   route bảo vệ -> về Đăng nhập (đăng nhập lại sẽ dựng lại hồ sơ).
   * - Có phiên + có gợi ý vườn của chính uid này: route bảo vệ được vào
   *   NGAY cả khi kết luận vườn còn đang tải (GardenProvider dựng giao
   *   diện từ cache của vườn gợi ý; nếu kết luận về sau khác đi, cổng sẽ
   *   điều hướng lại theo kết luận thật).
   * - Có phiên, chưa có kết luận vườn, không gợi ý: chờ kết luận (chỉ xảy
   *   ra ở lần đăng nhập đầu tiên trên máy/trình duyệt này).
   * - Kết luận "không có vườn": route bảo vệ -> về Ghép cặp.
   * - Đã có vườn mà đang ở màn Đăng nhập: vào thẳng (tabs). */
  let redirectTo: string | null = null;
  let blocked = false;
  if (sessionUid === undefined) {
    blocked = true;
  } else if (sessionUid === null) {
    if (isProtected || seg === "pair") { blocked = true; redirectTo = "/auth"; }
  } else if (!user) {
    if (isProtected) {
      blocked = true;
      if (ready) redirectTo = "/auth";
    }
  } else if (!couple) {
    if (!coupleReady) {
      const hinted = !!hint && hint.uid === sessionUid;
      if (isProtected && !hinted) blocked = true;
    } else if (isProtected) {
      blocked = true; redirectTo = "/pair";
    }
  } else if (seg === "auth") {
    blocked = true; redirectTo = "/(tabs)";
  }

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo as never);
  }, [redirectTo]);

  if (blocked) return <GateSplash />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLOR.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="pair" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="location" />
      <Stack.Screen name="account" />
      <Stack.Screen name="letters" />
      <Stack.Screen name="memories" />
      <Stack.Screen name="special-days" />
    </Stack>
  );
}

export default function RootLayout() {
  // Font Be Vietnam Pro (đủ dấu tiếng Việt) — giữ splash tới khi font sẵn sàng;
  // lỗi nạp font vẫn mở app bằng font hệ thống, không kẹt ở màn hình chờ.
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    BeVietnamPro_900Black,
  });
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);
  // Native: giữ splash cho tới khi font sẵn sàng (như cũ). WEB: KHÔNG chặn
  // khung hình đầu tiên theo font nữa — bản cũ bắt người dùng ngắm màn kem
  // trống trong lúc tải 6 file TTF; nay giao diện vẽ ngay bằng font hệ thống
  // rồi tự đổi sang Be Vietnam Pro khi font về (font vẫn nạp ở nền như cũ).
  if (Platform.OS !== "web" && !fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: COLOR.bg }} />;

  // Bản web (demo trên Vercel) hiển thị dạng mobile: cột hẹp bề ngang điện thoại,
  // cao hết màn hình — trên điện thoại chiếm trọn màn hình như app thật.
  if (Platform.OS === "web") {
    return (
      <SafeAreaProvider>
      <AuthProvider>
        <GardenProvider>
          <StatusBar style="dark" />
          <View style={styles.webOuter}>
            <View style={styles.webFrame}>
              <Navigator />
            </View>
          </View>
          <LocationSync />
          <WidgetSync />
        </GardenProvider>
      </AuthProvider>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
    <AuthProvider>
      <GardenProvider>
        <StatusBar style="dark" />
        <Navigator />
        <LocationSync />
        <WidgetSync />
      </GardenProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gateWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 },
  gateTitle: { fontSize: 24, fontFamily: "BeVietnamPro_900Black", color: C.text, marginTop: 10 },
  gateSub: { color: C.textSoft, marginTop: 6, fontSize: 13.5 },
  webOuter: { flex: 1, alignItems: "center", backgroundColor: "#FDECEF" },
  webFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    backgroundColor: COLOR.bg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#F3B8C6",
    shadowColor: "#d6336c",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});

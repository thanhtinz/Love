import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
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
import { AuthProvider } from "../lib/auth";
import { GardenProvider } from "../lib/store";
import { COLOR } from "../components/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLOR.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="pair" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="games/index" />
      <Stack.Screen name="utilities/index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="games/catch-hearts" />
      <Stack.Screen name="games/spin-wheel" />
      <Stack.Screen name="games/quiz" />
      <Stack.Screen name="games/memory-match" />
      <Stack.Screen name="games/love-dice" />
      <Stack.Screen name="utilities/mood" />
      <Stack.Screen name="utilities/daily-question" />
      <Stack.Screen name="utilities/love-notes" />
      <Stack.Screen name="utilities/bucket-list" />
      <Stack.Screen name="utilities/date-ideas" />
      <Stack.Screen name="utilities/memories" />
      <Stack.Screen name="utilities/love-actions" />
      <Stack.Screen name="utilities/shop" />
      <Stack.Screen name="utilities/quests" />
      <Stack.Screen name="frames/index" />
      <Stack.Screen name="frames/days" />
      <Stack.Screen name="frames/tree" />
      <Stack.Screen name="frames/mood" />
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
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: COLOR.bg }} />;

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
      </GardenProvider>
    </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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

import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth";
import { GardenProvider } from "../lib/store";

function Navigator() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff7f8" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="pair" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  // Bản web (demo trên Vercel) hiển thị dạng mobile: cột hẹp bề ngang điện thoại,
  // cao hết màn hình — trên điện thoại chiếm trọn màn hình như app thật.
  if (Platform.OS === "web") {
    return (
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
    );
  }
  return (
    <AuthProvider>
      <GardenProvider>
        <StatusBar style="dark" />
        <Navigator />
      </GardenProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: { flex: 1, alignItems: "center", backgroundColor: "#fde8ec" },
  webFrame: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#fff7f8",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#f3b8c6",
    shadowColor: "#d6336c",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});

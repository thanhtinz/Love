import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth";
import { GardenProvider } from "../lib/store";

export default function RootLayout() {
  return (
    <AuthProvider>
      <GardenProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff7f8" } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="pair" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GardenProvider>
    </AuthProvider>
  );
}

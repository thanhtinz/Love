import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { C } from "../components/ui";

export default function GateScreen() {
  const { user, couple, ready, coupleReady } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/auth");
    // Chờ tải xong thông tin vườn: trước đây cổng quyết ngay khi user có mặt nhưng
    // couple còn đang tải -> người đã có vườn bị chớp qua màn Ghép cặp.
    else if (!coupleReady) return;
    else if (!couple) router.replace("/pair");
    else router.replace("/(tabs)");
  }, [user, couple, ready, coupleReady]);

  return (
    <View style={styles.wrap}>
      <Ionicons name="heart" size={54} color={C.pink} />
      <Text style={styles.title}>Khu Vườn Tình Yêu</Text>
      <ActivityIndicator color={C.pink} style={{ marginTop: 14 }} />
      <Text style={styles.sub}>Đang mở cổng vườn...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 },
  title: { fontSize: 24, fontFamily: "BeVietnamPro_900Black", color: C.text, marginTop: 10 },
  sub: { color: C.textSoft, marginTop: 6, fontSize: 13.5 },
});

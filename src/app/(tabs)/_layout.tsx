import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, SHADOW } from "../../components/theme";
import { QuickActions } from "../../components/QuickActions";

/**
 * Tab bar theo nghiên cứu (quy tắc 1): TỐI ĐA 5 vị trí, luôn có icon + nhãn chữ.
 * Nhà · Vườn · (+) giữa mở sheet hành động nhanh · Thư · Hai đứa (hub chứa
 * Trò chơi / Tiện ích / Khung màn hình / Tài khoản — vẫn là route cũ, chỉ ẩn khỏi tab bar).
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <Ionicons name={name as never} size={23} color={focused ? COLOR.primary : COLOR.textFaint} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: focused ? COLOR.primary : "transparent" }} />
    </View>
  );
}

export default function TabsLayout() {
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLOR.primary,
          tabBarInactiveTintColor: COLOR.textFaint,
          tabBarStyle: { backgroundColor: "#fff", borderTopColor: COLOR.border, borderTopWidth: 1, height: 66, paddingBottom: 8, paddingTop: 6 },
          tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 11.5 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Nhà", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} /> }} />
        <Tabs.Screen name="garden" options={{ title: "Vườn", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "leaf" : "leaf-outline"} focused={focused} /> }} />
        <Tabs.Screen
          name="quick"
          options={{
            title: "",
            tabBarButton: () => (
              <TouchableOpacity
                onPress={() => setQuickOpen(true)}
                accessibilityLabel="Thêm nhanh"
                accessibilityRole="button"
                style={{ alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: 27, backgroundColor: COLOR.primary, marginTop: -16, borderWidth: 3.5, borderColor: "#fff", ...SHADOW }}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen name="letters" options={{ title: "Thư", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "mail" : "mail-outline"} focused={focused} /> }} />
        <Tabs.Screen name="couple" options={{ title: "Hai đứa", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "people" : "people-outline"} focused={focused} /> }} />
        {/* Các hub cũ giữ nguyên route, chỉ ẩn khỏi tab bar — vào qua tab Hai đứa / Trang chủ */}
        <Tabs.Screen name="games" options={{ href: null }} />
        <Tabs.Screen name="utilities" options={{ href: null }} />
        <Tabs.Screen name="account" options={{ href: null }} />
      </Tabs>
      <QuickActions visible={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}

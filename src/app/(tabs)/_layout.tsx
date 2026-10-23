import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, SHADOW } from "../../components/theme";
import { QuickActions } from "../../components/QuickActions";

/**
 * Tab bar theo nghiên cứu (quy tắc 1): TỐI ĐA 5 vị trí, luôn có icon + nhãn chữ.
 * Nhà · Vườn · (+) giữa mở sheet hành động nhanh · Thư · Hai đứa (hub dẫn tới
 * Trò chơi / Tiện ích / Khung màn hình / Tài khoản — các màn đó là route Stack gốc
 * ở cấp app: /games, /utilities, /frames, /account).
 * TUYỆT ĐỐI không khai báo màn trong nhóm (tabs) rồi ẩn bằng href: null:
 * expo-router 58 (TabsClient processScreens) đổi href:null thành options.hidden=true,
 * và useVisibleTabsWithRedirect sẽ router.replace về tab đầu tiên NGAY khi một route
 * đang ẩn được focus — người dùng bấm vào hub sẽ bị bật ngược về Trang chủ (bug 2026-10-23).
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  // Chỉ đổi màu icon khi active — KHÔNG chấm tròn bên dưới (user chê "chấm đỏ xấu", 2026-10-23).
  return <Ionicons name={name as never} size={23} color={focused ? COLOR.primary : COLOR.textFaint} />;
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
      </Tabs>
      <QuickActions visible={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}

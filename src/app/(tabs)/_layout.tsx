import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, ROLE, SHADOW_FLOAT } from "../../components/theme";
import { QuickActions } from "../../components/QuickActions";

/**
 * Tab bar — hệ "Vườn giấy ấm" (mockup vòng 2): tối đa 5 vị trí, luôn có icon + nhãn.
 * Nhà · Vườn · (+) giữa mở sheet hành động nhanh · Thư · Hai đứa (hub dẫn tới
 * Trò chơi / Tiện ích / Khung màn hình / Tài khoản — các màn đó là route Stack gốc
 * ở cấp app: /games, /utilities, /frames, /account).
 * Trình bày theo mockup: thanh trắng mờ, bóng mềm từ dưới lên, KHÔNG viền cứng phía
 * trên; tab đang chọn có pill hồng mềm nằm SAU icon + nhãn đậm màu primary; đĩa "+"
 * 56px màu primary nổi lên trên với viền màu canvas và bóng rose.
 * TUYỆT ĐỐI không khai báo màn trong nhóm (tabs) rồi ẩn bằng href: null:
 * expo-router 58 (TabsClient processScreens) đổi href:null thành options.hidden=true,
 * và useVisibleTabsWithRedirect sẽ router.replace về tab đầu tiên NGAY khi một route
 * đang ẩn được focus — người dùng bấm vào hub sẽ bị bật ngược về Trang chủ (bug 2026-10-23).
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ width: 48, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: focused ? ROLE.selfSoft : "transparent" }}>
      <Ionicons name={name as never} size={22} color={focused ? COLOR.primary : COLOR.textFaint} />
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
          tabBarInactiveTintColor: COLOR.textSoft,
          tabBarLabel: ({ focused, children }: { focused: boolean; children: React.ReactNode }) => (
            <Text style={{ fontSize: 11, lineHeight: 14, fontFamily: focused ? FONT.extrabold : FONT.semibold, color: focused ? COLOR.primary : COLOR.textSoft }}>{children}</Text>
          ),
          tabBarStyle: {
            backgroundColor: "rgba(255,255,255,0.96)",
            borderTopWidth: 0,
            height: 66,
            paddingBottom: 6,
            paddingTop: 4,
            shadowColor: "#331824",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          },
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
                style={{ alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR.primary, marginTop: -20, borderWidth: 5, borderColor: COLOR.bg, ...SHADOW_FLOAT, shadowColor: COLOR.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
              >
                <Ionicons name="add" size={28} color="#fff" />
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

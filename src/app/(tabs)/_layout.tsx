import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, ROLE, SHADOW_FLOAT } from "../../components/theme";
import { QuickActions } from "../../components/QuickActions";
import { StatusEditor } from "../../components/StatusEditor";
import { LetterAndPingPops, MilestonePop, QuestCompletePop } from "../../components/Popups";
import { useLove } from "../../lib/store";

/**
 * Tab bar của bản rebuild — Nhà · Cây · (+) · Note · Hai đứa.
 * - Note là TAB (note tình yêu là lõi 3) với badge số note CHƯA ĐỌC của người ấy gửi.
 * - Thư tình KHÔNG phải tab/tính năng riêng: thư chỉ là khoảnh khắc bật lên khi chăm cây.
 * - Nút "+" giữa mở sheet hành động nhanh (QuickActions), không điều hướng.
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
  const [statusOpen, setStatusOpen] = useState(false);
  const { state } = useLove();
  const me = state.currentUser;
  const unread = state.notes.filter((n) => n.authorSlot !== me && !n.readAt).length;

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
        <Tabs.Screen name="tree" options={{ title: "Cây", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "leaf" : "leaf-outline"} focused={focused} /> }} />
        <Tabs.Screen
          name="quick"
          options={{
            title: "",
            tabBarButton: () => (
              <TouchableOpacity
                onPress={() => setQuickOpen(true)}
                accessibilityLabel="Thêm nhanh"
                accessibilityRole="button"
                style={{ alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR.primary, marginTop: -20, borderWidth: 5, borderColor: COLOR.bg, ...SHADOW_FLOAT, shadowColor: COLOR.primary, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Note",
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? "document-text" : "document-text-outline"} focused={focused} />,
            tabBarBadge: unread > 0 ? unread : undefined,
            tabBarBadgeStyle: { backgroundColor: COLOR.primary, color: "#fff", fontFamily: FONT.bold, fontSize: 10 },
          }}
        />
        <Tabs.Screen name="couple" options={{ title: "Hai đứa", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "people" : "people-outline"} focused={focused} /> }} />
      </Tabs>
      <QuickActions visible={quickOpen} onClose={() => setQuickOpen(false)} onSetStatus={() => setStatusOpen(true)} />
      <StatusEditor visible={statusOpen} onClose={() => setStatusOpen(false)} />
      {/* Pop nhận (thư rơi / nhịp nhớ / mốc ngày) mount ĐÚNG MỘT NƠI ở layout
          tabs: các màn tab đã thăm vẫn mounted song song, nếu mỗi màn tự mount
          pop thì có 2 bản Modal chồng nhau — bấm tắt bản trên lại lộ bản dưới
          (lỗi "phải bấm 2 lần mới tắt"). Một bản duy nhất ở đây = bấm 1 lần tắt. */}
      <LetterAndPingPops />
      <MilestonePop />
      <QuestCompletePop />
    </>
  );
}

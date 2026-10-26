import React, { useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, ROLE, SHADOW_FLOAT } from "./theme";
import { HeartBurst } from "./HeartBurst";
import { myName, useLove } from "../lib/store";
import { pingsToday } from "../lib/features";
import { notifyPartnerOfHeartbeat } from "../lib/push";
import { heartbeatPulse } from "../lib/feedback";

/**
 * THANH TAB TỰ VẼ (đợt "nút tim giữa thanh tab" 2026-10-25) — truyền qua
 * prop `tabBar` của Tabs nên thanh này CHỈ gồm 4 route thật (Nhà · Cây ·
 * Note · Hai đứa) + NÚT TIM ở giữa KHÔNG PHẢI ROUTE: nó là hành động gửi
 * nhịp nhớ toàn cục, bấm được từ mọi tab. (Trước đây giữa thanh là nút "+"
 * mở sheet QuickActions + một route giữ chỗ quick.tsx — sheet bị gỡ vì
 * chồng việc với các tab; mọi hành động của sheet đã về đúng nhà của nó:
 * viết note ở tab Note, chăm cây ở tab Cây, bản đồ + trạng thái ở tab
 * Hai đứa, gửi nhịp nhớ = chính nút tim này.)
 *
 * Nút điều hướng tự vẽ bám đúng hợp đồng của thanh mặc định (vendored
 * BottomTabBar): phát sự kiện tabPress (canPreventDefault) rồi mới
 * navigateToTab; badge đọc từ options của từng màn (Note = số chưa đọc).
 */

const ROUTE_ICONS: Record<string, { on: string; off: string }> = {
  index: { on: "home", off: "home-outline" },
  tree: { on: "leaf", off: "leaf-outline" },
  notes: { on: "document-text", off: "document-text-outline" },
  couple: { on: "people", off: "people-outline" },
};

/**
 * NÚT TIM GIỮA THANH — hành động chính toàn app: một chạm = một nhịp nhớ
 * gửi ngay (KHÔNG giới hạn, KHÔNG chặn theo nhịp trước): dispatch PING_SEND
 * + đúng 1 push riêng cho người ấy qua notify-heartbeat + rung nhịp tim đôi
 * + tim NẢY (pulse) và MƯA TIM bay lên ngay tại nút. Chỉ phần HIỆU ỨNG mới
 * "chống chồng": chạm liên tiếp thì pulse chạy lại từ đầu và mưa tim xếp
 * thêm lớp — việc gửi không bao giờ bị khóa.
 */
function TabHeartButton() {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const [burst, setBurst] = useState(0);
  // Animated.Value giữ trong state (khuôn của Popups) — không đọc ref lúc render.
  const [scale] = useState(() => new Animated.Value(1));

  function sendPing() {
    dispatch({ type: "PING_SEND", user: me, actor: myName(state) });
    // Số nhịp hôm nay GỒM nhịp vừa gửi: `state` trong closure là state TRƯỚC
    // dispatch, mà reducer PING_SEND cộng đúng 1 vào bộ đếm ngày của slot
    // người gửi (bộ đếm thuộc ngày cũ thì lăn về 0 trước — khớp hệt luật
    // pingsToday trả 0 khi khác ngày), nên pingsToday(state trước) + 1 =
    // tổng phía người nhận sẽ đọc được từ state đã đồng bộ (như PingPop).
    notifyPartnerOfHeartbeat(pingsToday(state.pings, me) + 1);
    heartbeatPulse();
    setBurst((b) => b + 1);
    scale.stopAnimation();
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ position: "relative", marginTop: -20 }}>
        {/* KHÔNG khung vuông khi bấm (báo lỗi của chủ app 2026-10-25): Pressable
            thay TouchableOpacity + outlineWidth: 0 + outlineColor trong suốt (web: trình duyệt vẽ
            outline mặc định thành KHUNG VUÔNG quanh nút tròn khi nút được
            focus sau cú chạm) + android_ripple trong suốt, borderless (ripple
            mặc định vẽ trên hộp chữ nhật bao nút). Phản hồi bấm CHỈ còn pulse
            scale + mưa tim — không nền/viền nào khác được phép hiện. Đừng gỡ
            ba lớp này khi "dọn code": gỡ là khung vuông quay lại. */}
        <Pressable
          onPress={sendPing}
          accessibilityLabel="Gửi nhịp nhớ cho người ấy"
          accessibilityRole="button"
          android_ripple={{ color: "transparent", borderless: true }}
          style={({ pressed }) => ({ alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR.primary, borderWidth: 5, borderColor: COLOR.bg, opacity: pressed ? 0.2 : 1, outlineWidth: 0, outlineColor: "transparent", ...SHADOW_FLOAT, shadowColor: COLOR.primary, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } })}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="heart" size={28} color="#fff" />
          </Animated.View>
        </Pressable>
        <HeartBurst burstKey={burst} />
      </View>
    </View>
  );
}

function TabItem({
  label, iconOn, iconOff, focused, badge, onPress, onLongPress,
}: {
  label: string;
  iconOn: string;
  iconOff: string;
  focused: boolean;
  badge?: number | string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    // Cùng vệ sinh chống khung như nút tim: Pressable + outline tắt hẳn trên
    // web + ripple trong suốt — phản hồi bấm là mờ opacity (như TouchableOpacity
    // cũ), hình nền "pill" chỉ theo trạng thái focused, không theo cú bấm.
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      android_ripple={{ color: "transparent", borderless: true }}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 2, opacity: pressed ? 0.2 : 1, outlineWidth: 0, outlineColor: "transparent" })}
    >
      <View style={{ width: 48, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: focused ? ROLE.selfSoft : "transparent" }}>
        <Ionicons name={(focused ? iconOn : iconOff) as never} size={22} color={focused ? COLOR.primary : COLOR.textFaint} />
        {badge != null && badge !== "" ? (
          <View style={{ position: "absolute", top: -4, right: 2, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLOR.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 10, color: "#fff" }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontSize: 11, lineHeight: 14, fontFamily: focused ? FONT.extrabold : FONT.semibold, color: focused ? COLOR.primary : COLOR.textSoft, marginTop: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LoveTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const items: React.ReactNode[] = [];
  state.routes.forEach((route, index) => {
    const focused = index === state.index;
    const { options } = descriptors[route.key];
    const icons = ROUTE_ICONS[route.name] ?? { on: "ellipse", off: "ellipse-outline" };
    const label = typeof options.title === "string" ? options.title : route.name;
    items.push(
      <TabItem
        key={route.key}
        label={label}
        iconOn={icons.on}
        iconOff={icons.off}
        focused={focused}
        badge={options.tabBarBadge}
        onPress={() => {
          const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
        onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
      />,
    );
    // Nút tim ngồi GIỮA thanh: sau tab thứ hai (Cây), trước Note.
    if (index === 1) items.push(<TabHeartButton key="tab-heart" />);
  });

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.96)",
        minHeight: 66,
        paddingTop: 4,
        paddingBottom: Math.max(6, insets.bottom),
        shadowColor: "#331824",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      {items}
    </View>
  );
}

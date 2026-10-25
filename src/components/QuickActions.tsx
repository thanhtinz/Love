import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../lib/store";
import { notifyPartnerOfHeartbeat } from "../lib/push";
import { heartbeatPulse } from "../lib/feedback";
import { today } from "../lib/types";
import { shareStatus } from "../lib/features";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TILE } from "./theme";
import { HeartBurst } from "./HeartBurst";
import { Medallion } from "./ui";

/**
 * Sheet hành động nhanh mở từ nút "+" giữa tab bar — ĐÚNG 4 hành động của 5 lõi:
 * Viết note · Gửi nhịp nhớ · Chăm cây · Bản đồ hai đứa (vị trí tạm thời).
 * Mọi hàng dùng MỘT họ tile trung tính (TILE) — không nhuộm màu riêng từng hàng.
 */
export function QuickActions({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const myPingsToday = state.pings.day.date === today() ? state.pings.day[me] : 0;
  const myShare = shareStatus(state.presence[me]);
  const [pingBurst, setPingBurst] = useState(0);
  const [pingSent, setPingSent] = useState(false);

  // Sau khi gửi nhịp từ sheet: nán ~600ms để mưa tim kịp hiện rồi mới đóng.
  useEffect(() => {
    if (!pingSent) return;
    const t = setTimeout(() => {
      setPingSent(false);
      onClose();
    }, 600);
    return () => clearTimeout(t);
  }, [pingSent, onClose]);

  function go(route: string) {
    onClose();
    router.push(route as never);
  }

  function sendPing() {
    if (pingSent) return; // đang trong khoảnh khắc ăn mừng — chống gửi trùng
    // Nhịp nhớ không giới hạn, không chờ: gửi là đi ngay + 1 push riêng cho
    // người ấy (fire-and-forget, lỗi nuốt êm bên trong lib/push).
    dispatch({ type: "PING_SEND", user: me, actor: myName(state) });
    notifyPartnerOfHeartbeat();
    // Cảm giác: rung nhịp tim đôi + mưa tim — effect phía trên giữ sheet lại
    // ~600ms để khoảnh khắc kịp hiện rồi mới đóng (trước đây đóng ngay).
    heartbeatPulse();
    setPingBurst((b) => b + 1);
    setPingSent(true);
  }

  const rows: { icon: string; title: string; desc: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: "create-outline", title: "Viết note tình yêu", desc: "Gửi một note nhỏ cho người ấy", onPress: () => go("/(tabs)/notes") },
    {
      icon: "heart", title: "Gửi nhịp nhớ", desc: myPingsToday > 0 ? `Hôm nay bạn đã gửi ${myPingsToday} nhịp — gửi thêm bất cứ lúc nào` : "Chạm là gửi ngay cho người ấy, không giới hạn",
      onPress: sendPing,
    },
    { icon: "leaf-outline", title: "Chăm cây tình yêu", desc: "Tưới nước, phơi nắng, gửi lời yêu cho cây", onPress: () => go("/(tabs)/tree") },
    {
      icon: "location-outline", title: "Bản đồ hai đứa",
      desc: myShare.active ? "Đang chia sẻ vị trí — chạm để xem bản đồ" : "Xem vị trí của nhau trên bản đồ, chỉ khi đang chia sẻ",
      onPress: () => go("/location"),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.35)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: COLOR.bg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: SPACE.screenX, paddingTop: 14, paddingBottom: 30, position: "relative" }}
        >
          <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: COLOR.lineStrong, marginBottom: 14 }} />
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 19, color: COLOR.text, marginBottom: 4 }}>Làm gì cho nhau nè?</Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, marginBottom: 10 }}>Bốn việc nhỏ, ấm lòng cả ngày.</Text>
          {rows.map((r) => (
            <TouchableOpacity
              key={r.title}
              onPress={r.onPress}
              disabled={r.disabled}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: r.disabled ? 0.5 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={r.title}
              accessibilityState={{ disabled: !!r.disabled }}
            >
              <Medallion icon={r.icon} color={TILE.icon} bg={TILE.bg} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{r.title}</Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 1 }}>{r.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLOR.chevron} />
            </TouchableOpacity>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, backgroundColor: ROLE.sharedSoft, borderRadius: RADIUS.tile, paddingHorizontal: 12, paddingVertical: 9 }}>
            <Ionicons name="information-circle-outline" size={15} color={ROLE.shared} />
            <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: ROLE.sharedDark }}>
              Mọi thứ ở đây đều đồng bộ với người ấy ngay khi cả hai đang mở app.
            </Text>
          </View>
          <HeartBurst burstKey={pingBurst} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

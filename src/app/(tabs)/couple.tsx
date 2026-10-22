import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { daysTogether } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE } from "../../components/theme";
import { FeatureCard, s } from "../../components/ui";

/**
 * Tab "Hai đứa" — hub của hai người: tóm tắt cặp đôi (màu navy "Chúng mình")
 * + các nhóm tính năng còn lại dạng hàng menu sạch. Mọi tính năng đều tới được
 * trong tối đa 2 lần chạm từ tab bar.
 */
export default function CoupleHubScreen() {
  const { state } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const days = daysTogether(state.startDate);
  const unopened = state.letters.filter((l) => !l.opened).length;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 48 }]}>
      {/* Tóm tắt cặp đôi — nền navy "Chúng mình" */}
      <View style={{ backgroundColor: ROLE.shared, borderRadius: RADIUS.card, padding: SPACE.lg, ...SHADOW }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar id={me.avatar} size={46} />
            <View style={{ marginLeft: -12, borderWidth: 2.5, borderColor: ROLE.shared, borderRadius: 999 }}>
              <Avatar id={partner.avatar} size={46} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 16.5, color: "#fff" }} numberOfLines={1}>{me.name} và {partner.name}</Text>
            <Text style={{ fontFamily: FONT.medium, fontSize: 12.5, color: "#C9D6E4" }}>{state.gardenName} · {days} ngày bên nhau</Text>
          </View>
          <Ionicons name="heart" size={20} color={ROLE.self} />
        </View>
      </View>

      {/* Menu nhóm tính năng */}
      <View style={{ gap: SPACE.sm }}>
        <FeatureCard icon="game-controller" title="Trò chơi" desc="Bắt tim bay, Vòng quay yêu thương, Hiểu ý nhau" color="#8B5CF6" bg="#EFEAFE" route="/(tabs)/games" />
        <FeatureCard icon="heart-circle" title="Tiện ích đôi mình" desc="Mood, câu hỏi mỗi ngày, ghi chú, bucket list, kỷ niệm..." color={COLOR.primary} bg={ROLE.selfSoft} route="/(tabs)/utilities" />
        <FeatureCard icon="image" title="Khung màn hình" desc="3 khung kỷ niệm để xuất ảnh PNG ghim màn hình chính" color={ROLE.partnerDark} bg={ROLE.partnerSoft} route="/frames" badge={unopened > 0 ? `${unopened} thư mới ở tab Thư` : undefined} />
        <FeatureCard icon="person-circle" title="Tài khoản" desc="Hồ sơ của bạn, mã mời và thông tin khu vườn" color={ROLE.shared} bg={ROLE.sharedSoft} route="/(tabs)/account" />
      </View>

      <Text style={[s.small, { textAlign: "center", paddingHorizontal: 8 }]}>
        Quy ước màu toàn app: hồng đào là Bạn, xanh mint là người ấy, xanh navy là việc chung của hai đứa — luôn kèm avatar và tên.
      </Text>
      <View style={{ alignItems: "center" }}>
        <View style={[s.chip, { backgroundColor: COLOR.track }]}>
          <Ionicons name="leaf" size={13} color={COLOR.success} />
          <Text style={[s.chipText, { color: COLOR.textSoft }]}>{state.coins} Xu Tim · Streak {state.streak.count} ngày</Text>
        </View>
      </View>
    </ScrollView>
  );
}

import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MAX_DAILY_SPINS, quizOfDay } from "../../lib/data";
import { daysTogether, effectiveStreak, nextMilestone, today } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TYPE } from "../../components/theme";
import { Medallion, s } from "../../components/ui";

/**
 * Tab "Hai đứa" — hub của hai người, hệ "Vườn giấy ấm" (mockup vòng 2).
 * Ngân sách phần tử: 1 hồ sơ chung + 2 nhóm + 1 cụm chân trang.
 * - Hồ sơ navy "Chúng mình" bo 28: chồng avatar 56, tên hai người, chip mờ
 *   (tên vườn · Ngày N) và đường tiến tới cột mốc ngày tiếp theo.
 * - Nhóm "Chơi cùng nhau": MỘT bề mặt điều hướng duy nhất dẫn vào /games, kèm
 *   dòng trạng thái game hôm nay (không còn thẻ game riêng lẻ ở đây).
 * - Nhóm "Không gian của hai đứa": MỘT bề mặt trắng chứa 3 hàng (Tiện ích ·
 *   Khung màn hình · Tài khoản) ngăn bằng hairline — không phải 3 card rời.
 * - Cụm chân trang nền #FBEFE7: Xu Tim + chuỗi ngày + chú thích quy ước màu.
 * Mọi tính năng đều tới được trong tối đa 2 lần chạm từ tab bar.
 */

const firstName = (name: string) => name.trim().split(/\s+/).pop() || name;

function NavRow({ icon, color, bg, size = 48, title, desc, route, divider }: {
  icon: string; color: string; bg: string; size?: number; title: string; desc: string; route: string; divider?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => router.push(route as never)}
      accessibilityLabel={title}
      style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 15, borderTopWidth: divider ? 1 : 0, borderTopColor: COLOR.border }}
    >
      <Medallion icon={icon} color={color} bg={bg} size={size} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{title}</Text>
        <Text style={s.sub} numberOfLines={2}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLOR.chevron} style={{ flexShrink: 0 }} />
    </TouchableOpacity>
  );
}

export default function CoupleHubScreen() {
  const { state } = useLove();
  const insets = useSafeAreaInsets();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const days = daysTogether(state.startDate);
  const milestone = nextMilestone(days);
  const streak = effectiveStreak(state.streak);

  // Dòng trạng thái game hôm nay cho hàng Trò chơi (cùng dữ liệu với hub /games).
  const spinsLeft = Math.max(0, MAX_DAILY_SPINS - (state.games.spin.date === today() ? state.games.spin[me.slot] : 0));
  const qz = state.games.quiz.date === today() ? state.games.quiz : { A: [] as number[], B: [] as number[] };
  const quizBothDone = qz.A.length >= quizOfDay().length && qz.B.length >= quizOfDay().length;
  const gamesStatus = `Vòng quay còn ${spinsLeft} lượt · Hiểu ý nhau ${quizBothDone ? "đã mở kết quả" : "chưa xong hôm nay"}`;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: insets.top + 14, gap: SPACE.sectionGap }]}>
      {/* HỒ SƠ CHUNG — navy "Chúng mình" */}
      <View style={{ backgroundColor: ROLE.shared, borderRadius: RADIUS.scene, padding: 20, ...SHADOW }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar id={state.avatarA} size={56} />
            <View style={{ marginLeft: -14 }}>
              <Avatar id={state.avatarB} size={56} ring="#fff" />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 20, lineHeight: 25, color: "#fff" }} numberOfLines={1} ellipsizeMode="tail">
              {state.personA} & {state.personB}
            </Text>
            <Text style={{ fontFamily: FONT.medium, fontSize: 12.5, color: COLOR.onNavySoft, marginTop: 2 }} numberOfLines={1}>{state.gardenName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
          {[state.gardenName, `Ngày ${days}`].map((t) => (
            <View key={t} style={{ backgroundColor: "rgba(255,255,255,0.16)", borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 11.5, fontFamily: FONT.bold, color: "#fff" }}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: "#fff", marginTop: 13 }}>
          Còn {milestone.remaining} ngày tới Ngày {milestone.target}
        </Text>
        <View style={{ height: 6, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden", marginTop: 7 }}>
          <View style={{ height: "100%", width: `${Math.min(100, (days / milestone.target) * 100)}%`, backgroundColor: "#fff", borderRadius: 99 }} />
        </View>
      </View>

      {/* NHÓM: CHƠI CÙNG NHAU */}
      <View>
        <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text, marginBottom: 9 }}>Chơi cùng nhau</Text>
        <View style={{ backgroundColor: "#fff", borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden" }}>
          <NavRow icon="game-controller" color={ROLE.selfDark} bg={ROLE.selfSoft} size={52} title="Trò chơi" desc={gamesStatus} route="/games" />
        </View>
      </View>

      {/* NHÓM: KHÔNG GIAN CỦA HAI ĐỨA */}
      <View>
        <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text, marginBottom: 9 }}>Không gian của hai đứa</Text>
        <View style={{ backgroundColor: "#fff", borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden" }}>
          <NavRow icon="heart-circle" color={ROLE.partnerDark} bg={ROLE.partnerSoft} title="Tiện ích đôi mình" desc="Nhật ký, kỷ niệm và những việc nhỏ của hai đứa" route="/utilities" />
          <NavRow icon="image" color={ROLE.shared} bg={ROLE.sharedSoft} title="Khung màn hình" desc="Khung đếm ngày và cột mốc của hai đứa" route="/frames" divider />
          <NavRow icon="person" color={ROLE.selfDark} bg={ROLE.selfSoft} title="Tài khoản" desc={`Hồ sơ của ${firstName(me.name)}, mã mời và đăng xuất`} route="/account" divider />
        </View>
      </View>

      {/* CỤM CHÂN TRANG — Xu Tim, chuỗi ngày, quy ước màu */}
      <View style={{ backgroundColor: COLOR.footBg, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="heart" size={15} color={COLOR.primary} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>{state.coins.toLocaleString("vi-VN")} Xu Tim</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="flame" size={15} color={ROLE.selfDark} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>Chuỗi {streak} ngày liền</Text>
          </View>
        </View>
        <Text style={{ ...TYPE.caption, fontWeight: "400", fontFamily: FONT.regular, color: COLOR.textSoft, lineHeight: 19, marginTop: 9 }}>
          Quy ước màu trong app: <Text style={{ color: ROLE.self, fontFamily: FONT.bold }}>●</Text> <Text style={{ fontFamily: FONT.semibold, color: COLOR.text }}>Bạn</Text> là {me.name} · <Text style={{ color: ROLE.partner, fontFamily: FONT.bold }}>●</Text> <Text style={{ fontFamily: FONT.semibold, color: COLOR.text }}>Người ấy</Text> là {partner.name} · <Text style={{ color: ROLE.shared, fontFamily: FONT.bold }}>●</Text> <Text style={{ fontFamily: FONT.semibold, color: COLOR.text }}>Chúng mình</Text> là phần chung của hai đứa.
        </Text>
      </View>
    </ScrollView>
  );
}

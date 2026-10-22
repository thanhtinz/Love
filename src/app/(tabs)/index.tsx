import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { daysTogether } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, FeatureCard, SectionTitle, s } from "../../components/ui";

/**
 * Trang chủ = HUB điều hướng: chỉ có phần tóm tắt (hai người, số ngày, Xu/streak)
 * và lưới thẻ dẫn tới từng màn hình tính năng. Không nhúng chức năng đầy đủ tại đây.
 */
export default function HomeScreen() {
  const { state, connected, hydrated } = useLove();
  const days = daysTogether(state.startDate);
  const unopened = state.letters.filter((l) => !l.opened).length;
  const me = selfOf(state);
  const partner = partnerOf(state);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.bg }}>
        <Ionicons name="leaf" size={40} color={C.pink} />
        <Text style={s.sub}>Đang tải khu vườn...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      {/* Tóm tắt hai người */}
      <View style={[s.card, { backgroundColor: "#fff1f2" }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: "900", color: C.text }}>{state.gardenName}</Text>
            <Text style={s.small}>Mã vườn {state.roomCode} · {connected ? "Đang kết nối realtime" : "Chế độ ngoại tuyến"}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 5 }}>
            <View style={s.chip}><Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.chipText}>{state.coins} Xu Tim</Text></View>
            <View style={[s.chip, { backgroundColor: "#ffedd5" }]}><Ionicons name="flame" size={13} color="#ea580c" /><Text style={[s.chipText, { color: "#9a3412" }]}>Streak {state.streak.count} ngày</Text></View>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
          <Avatar id={me.avatar} size={44} />
          <Ionicons name="heart" size={18} color={C.pink} />
          <Avatar id={partner.avatar} size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <PersonChip state={state} slot={me.slot} />
            <PersonChip state={state} slot={partner.slot} />
          </View>
        </View>
        <View style={{ alignItems: "center", marginTop: 12, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: C.pinkDark, lineHeight: 34 }}>{days} ngày bên nhau</Text>
          <Text style={s.small}>từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")} · XP vườn {state.tree.xp}</Text>
        </View>
        {state.lastLoveAction && (
          <View style={{ marginTop: 10, backgroundColor: C.pinkSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Avatar id={state.lastLoveAction.memoAvatar || (state.lastLoveAction.by === "A" ? state.avatarA : state.avatarB)} size={26} />
            <Ionicons name={state.lastLoveAction.icon as never} size={16} color={C.pink} />
            <Text style={{ fontSize: 12.5, color: C.pinkDark, flex: 1 }}>
              <Text style={{ fontWeight: "800" }}>{state.lastLoveAction.by === state.currentUser ? `Bạn (${state.lastLoveAction.actor})` : state.lastLoveAction.actor}</Text> vừa {state.lastLoveAction.label} cho {state.lastLoveAction.by === state.currentUser ? partner.name : `Bạn (${me.name})`}
            </Text>
          </View>
        )}
      </View>

      <SectionTitle icon="grid">Tất cả tính năng</SectionTitle>
      <View style={{ gap: 9 }}>
        <FeatureCard icon="leaf" title="Vườn cây" desc="4 ô đất, 6 loài cây lớn theo thời gian thật — vào tab Vườn hoặc chạm thẻ này" color={C.green} bg="#dcfce7" route="/(tabs)/garden" />
        <FeatureCard icon="mail" title="Hộp thư tình yêu" desc="Thư rơi khi chăm cây và bộ sưu tập 36 lá thư" color={C.pink} bg={C.pinkSoft} route="/(tabs)/letters" badge={unopened > 0 ? `${unopened} thư mới` : undefined} />
        <FeatureCard icon="happy" title="Mood hôm nay" desc="Tâm trạng của bạn và của người ấy — mỗi người một thẻ riêng" color={C.amber} bg="#fef3c7" route="/utilities/mood" />
        <FeatureCard icon="chatbubbles" title="Câu hỏi mỗi ngày" desc="Mỗi người trả lời riêng, cả hai trả lời xong mới mở đáp án" color={C.sky} bg="#e0f2fe" route="/utilities/daily-question" />
        <FeatureCard icon="heart" title="Hành động yêu thương" desc="Ôm, hôn gió, tặng hoa, thả sao cho người ấy" color={C.pink} bg={C.pinkSoft} route="/utilities/love-actions" />
        <FeatureCard icon="document-text" title="Love Notes" desc="Lời nhắn yêu thương ghim lâu dài + ghi chú nhanh" color={C.violet} bg="#ede9fe" route="/utilities/love-notes" />
        <FeatureCard icon="list" title="Bucket List" desc="Những việc hai bạn muốn làm cùng nhau" color={C.green} bg="#dcfce7" route="/utilities/bucket-list" />
        <FeatureCard icon="camera" title="Dòng kỷ niệm" desc="Kỷ niệm của hai bạn và những cây đã trưởng thành" color={C.pink} bg={C.pinkSoft} route="/utilities/memories" />
        <FeatureCard icon="compass" title="Gợi ý hẹn hò" desc="Ý tưởng hẹn hò ngẫu nhiên cho hai bạn" color="#ea580c" bg="#ffedd5" route="/utilities/date-ideas" />
        <FeatureCard icon="trophy" title="Nhiệm vụ & huy hiệu" desc="Nhiệm vụ ngày tính riêng từng người, huy hiệu chung của vườn" color={C.amber} bg="#fef3c7" route="/utilities/quests" />
        <FeatureCard icon="bag-handle" title="Cửa hàng trang trí" desc="Chậu, khung cảnh và phụ kiện cho khu vườn" color={C.amber} bg="#fef3c7" route="/utilities/shop" />
        <FeatureCard icon="game-controller" title="Trò chơi" desc="Bắt tim bay, Vòng quay yêu thương, Hiểu ý nhau" color={C.violet} bg="#ede9fe" route="/(tabs)/games" />
        <FeatureCard icon="image" title="Khung màn hình" desc="3 khung kỷ niệm để xuất ảnh PNG ghim màn hình chính" color={C.sky} bg="#e0f2fe" route="/frames" />
      </View>
      <Text style={[s.small, { textAlign: "center" }]}>Mẹo: màu hồng + nhãn “Bạn” luôn là bạn; màu xanh dương là người ấy — nhất quán ở mọi màn hình.</Text>
    </ScrollView>
  );
}

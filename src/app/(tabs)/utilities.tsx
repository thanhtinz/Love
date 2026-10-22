import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLove } from "../../lib/store";
import { today } from "../../lib/types";
import { C, FeatureCard, SectionTitle, s } from "../../components/ui";

/**
 * Hub Tiện ích: CHỈ là lưới thẻ điều hướng — mỗi tiện ích có màn hình riêng.
 * Không nhúng bất kỳ chức năng đầy đủ nào tại đây.
 */
export default function UtilitiesHubScreen() {
  const { state } = useLove();
  const me = state.currentUser;
  const answersToday = state.answers.date === today() ? state.answers : { A: "", B: "" };
  const myAnswered = Boolean(answersToday[me]);
  const moodDone = state.moods.date === today() && Boolean(state.moods[me]);
  const unclaimedQuests = 3; // hiển thị trung tính, chi tiết ở màn Nhiệm vụ

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="heart-circle">Tiện ích đôi mình</SectionTitle>
      <Text style={s.sub}>Mỗi tiện ích một màn hình riêng — trạng thái của bạn và của người ấy luôn tách bạch.</Text>
      <View style={{ gap: 9 }}>
        <FeatureCard icon="happy" title="Mood hôm nay" desc="Thẻ mood của bạn (chỉnh được) và của người ấy (chỉ xem)" color={C.amber} bg="#fef3c7" route="/utilities/mood" badge={moodDone ? undefined : "Chưa chọn"} />
        <FeatureCard icon="chatbubbles" title="Câu hỏi mỗi ngày" desc="Mỗi người một ô trả lời riêng, mở đáp án khi cả hai cùng trả lời" color={C.sky} bg="#D9F4F0" route="/utilities/daily-question" badge={myAnswered ? "Đã trả lời" : "Chưa trả lời"} />
        <FeatureCard icon="heart" title="Hành động yêu thương" desc="Ôm, hôn gió, tặng hoa, thả sao — có giới hạn chống spam" color={C.pink} bg={C.pinkSoft} route="/utilities/love-actions" />
        <FeatureCard icon="document-text" title="Love Notes" desc="Lời nhắn yêu thương của từng người + ghi chú nhanh" color={C.violet} bg="#ede9fe" route="/utilities/love-notes" />
        <FeatureCard icon="list" title="Bucket List" desc="Việc muốn làm cùng nhau — mỗi mục ghi rõ người thêm" color={C.green} bg="#dcfce7" route="/utilities/bucket-list" />
        <FeatureCard icon="compass" title="Gợi ý hẹn hò" desc="Xáo trộn ý tưởng hẹn hò và lưu ý tưởng ưng ý vào Bucket List" color="#ea580c" bg="#ffedd5" route="/utilities/date-ideas" />
        <FeatureCard icon="camera" title="Dòng kỷ niệm" desc="Kỷ niệm hai bạn lưu giữ + cây trưởng thành đã thu" color={C.pink} bg={C.pinkSoft} route="/utilities/memories" />
        <FeatureCard icon="trophy" title="Nhiệm vụ & huy hiệu" desc={`Nhiệm vụ ngày tính riêng cho bạn (tối đa ${unclaimedQuests} nhiệm vụ), huy hiệu là thành tích chung`} color={C.amber} bg="#fef3c7" route="/utilities/quests" />
        <FeatureCard icon="bag-handle" title="Cửa hàng trang trí" desc="Chậu, khung cảnh, phụ kiện — Xu Tim là ví chung của vườn" color={C.amber} bg="#fef3c7" route="/utilities/shop" />
        <FeatureCard icon="image" title="Khung màn hình" desc="3 khung kỷ niệm xuất ảnh PNG: đếm ngày, cây hôm nay, mood" color={C.sky} bg="#D9F4F0" route="/frames" />
      </View>
    </ScrollView>
  );
}

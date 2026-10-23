import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MascotArt } from "../../components/Art";
import { COLOR, FONT } from "../../components/theme";
import { ClosingBand, FeatureCard, ScreenHeader, s } from "../../components/ui";

/** Hub Khung màn hình: chỉ liệt kê 3 khung — mỗi khung có màn hình riêng để xem trước + xuất PNG.
 *  Vòng polish 2026-10-23: tile trung tính thống nhất + dải kết màn để màn ngắn
 *  kết thúc có chủ đích thay vì hụt hơi ở nửa trên. */
export default function FramesHubScreen() {
  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/(tabs)/couple" title="Khung màn hình" subtitle="Mỗi khung một màn hình riêng: xem trước rồi xuất ảnh PNG" />
      <ScrollView contentContainerStyle={[s.scroll, { flexGrow: 1 }]}>
        <View style={{ gap: 9 }}>
          <FeatureCard icon="calendar" title="Khung Đếm ngày yêu" desc="Số ngày bên nhau + đếm ngược tới mốc kỷ niệm kế tiếp" route="/frames/days" />
          <FeatureCard icon="leaf" title="Khung Cây hôm nay" desc="Cây đang chọn: giai đoạn và chỉ số sức khỏe hiện tại" route="/frames/tree" />
          <FeatureCard icon="happy" title="Khung Mood hai người" desc="Tâm trạng hôm nay của bạn và của người ấy, ghi rõ tên từng người" route="/frames/mood" />
        </View>
        <View style={[s.card, { backgroundColor: COLOR.warningSoft, borderColor: "transparent" }]}>
          <View style={s.row}><Ionicons name="information-circle" size={18} color={COLOR.warningText} /><Text style={{ fontFamily: FONT.extrabold, color: COLOR.text }}>Về widget sống trên màn hình chính</Text></View>
          <Text style={[s.sub, { marginTop: 5 }]}>Khung được xuất thành ảnh PNG để ghim bằng tiện ích ảnh của máy.</Text>
        </View>
        <View style={{ flex: 1 }} />
        <ClosingBand art={<MascotArt size={72} />} line="Chọn một khung, xem trước rồi xuất ảnh PNG để ghim lên màn hình chính của máy — mỗi ngày mở máy là thấy nhau." />
      </ScrollView>
    </View>
  );
}

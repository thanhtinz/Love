import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, FeatureCard, ScreenHeader, s } from "../../components/ui";

/** Hub Khung màn hình: chỉ liệt kê 3 khung — mỗi khung có màn hình riêng để xem trước + xuất PNG. */
export default function FramesHubScreen() {
  return (
    <View style={s.screen}>
      <ScreenHeader title="Khung màn hình" subtitle="Mỗi khung một màn hình riêng: xem trước rồi xuất ảnh PNG" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={{ gap: 9 }}>
          <FeatureCard icon="calendar" title="Khung Đếm ngày yêu" desc="Số ngày bên nhau + đếm ngược tới mốc kỷ niệm kế tiếp" color={C.pink} bg={C.pinkSoft} route="/frames/days" />
          <FeatureCard icon="leaf" title="Khung Cây hôm nay" desc="Cây đang chọn: giai đoạn và chỉ số sức khỏe hiện tại" color={C.green} bg="#dcfce7" route="/frames/tree" />
          <FeatureCard icon="happy" title="Khung Mood hai người" desc="Tâm trạng hôm nay của bạn và của người ấy, ghi rõ tên từng người" color={C.amber} bg="#fef3c7" route="/frames/mood" />
        </View>
        <View style={[s.card, { backgroundColor: "#fff7ed" }]}>
          <View style={s.row}><Ionicons name="information-circle" size={18} color={C.amber} /><Text style={{ fontWeight: "800", color: C.text }}>Về widget sống trên màn hình chính</Text></View>
          <Text style={[s.sub, { marginTop: 5 }]}>Hiện tại app xuất khung thành ảnh PNG để bạn ghim bằng tiện ích ảnh có sẵn của máy. Widget sống tự cập nhật (Android App Widget / iOS WidgetKit) cần viết thêm mã native riêng cho từng nền tảng — đây là bước phát triển riêng ở giai đoạn sau, chưa có trong bản này.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MILESTONES, daysTogether, nextMilestone } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { PersonChip } from "../../components/PersonChip";
import { FrameExport } from "../../components/FrameExport";
import { C, ScreenHeader, s } from "../../components/ui";

export default function FrameDaysScreen() {
  const { state } = useLove();
  const days = daysTogether(state.startDate);
  const nm = nextMilestone(days);

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/frames" title="Khung Đếm ngày yêu" subtitle="Xem trước và xuất ảnh PNG của khung này" />
      <ScrollView contentContainerStyle={s.scroll}>
        <FrameExport kind="days">
          <Text style={{ fontSize: 16, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>{state.gardenName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar id={state.avatarA} size={52} />
            <Ionicons name="heart" size={26} color={C.pink} />
            <Avatar id={state.avatarB} size={52} />
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <PersonChip state={state} slot="A" />
            <PersonChip state={state} slot="B" />
          </View>
          <Text style={{ fontSize: 30, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark, lineHeight: 36 }}>{days}</Text>
          <Text style={{ fontSize: 13, fontFamily: "BeVietnamPro_700Bold", color: C.textSoft }}>ngày bên nhau</Text>
          <Text style={s.small}>Mốc {nm.target} ngày: còn {nm.remaining} ngày · từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
        </FrameExport>

        {/* MỐC TÌNH YÊU — suy ra thuần từ startDate + số ngày (không đổi state).
            Ngày đạt mốc N = ngày bắt đầu + (N-1) ngày, khớp daysTogether (ngày bắt đầu là ngày 1). */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Mốc tình yêu</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>
            Mốc tiếp theo: <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.pinkDark }}>{nm.target} ngày</Text> — còn {nm.remaining} ngày nữa thôi!
          </Text>
          <View style={{ gap: 8, marginTop: 11 }}>
            {MILESTONES.map((m) => {
              const reached = days >= m;
              const date = new Date(new Date(state.startDate + "T00:00:00").getTime() + (m - 1) * 86400000);
              return (
                <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: reached ? "#EFFAF7" : "#F8F5F6", borderRadius: 12, padding: 10 }}>
                  <Ionicons name={reached ? "checkmark-circle" : "time-outline"} size={19} color={reached ? C.green : C.textFaint} />
                  <Text style={{ flex: 1, fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>{m} ngày</Text>
                  <Text style={s.small}>{date.toLocaleDateString("vi-VN")}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "BeVietnamPro_700Bold", color: reached ? C.green : "#B45309" }}>{reached ? "Đã đạt" : `Còn ${m - days} ngày`}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Danh sách mốc dùng CHUNG MILESTONES từ lib/types (có cả mốc 3000 ngày như nhiệm vụ
// dùng) — bản sao cục bộ cũ dừng ở 2000 khiến hai nơi lệch nhau.

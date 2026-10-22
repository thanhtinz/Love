import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { daysTogether, nextMilestone } from "../../lib/types";
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
      <ScreenHeader title="Khung Đếm ngày yêu" subtitle="Xem trước và xuất ảnh PNG của khung này" />
      <ScrollView contentContainerStyle={s.scroll}>
        <FrameExport kind="days">
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.pinkDark }}>{state.gardenName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar id={state.avatarA} size={52} />
            <Ionicons name="heart" size={26} color={C.pink} />
            <Avatar id={state.avatarB} size={52} />
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <PersonChip state={state} slot="A" />
            <PersonChip state={state} slot="B" />
          </View>
          <Text style={{ fontSize: 58, fontWeight: "900", color: C.pinkDark, lineHeight: 62 }}>{days}</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.textSoft, marginTop: -6 }}>ngày bên nhau</Text>
          <View style={s.chip}><Ionicons name="flag" size={13} color={C.pinkDark} /><Text style={s.chipText}>Mốc {nm.target} ngày: còn {nm.remaining} ngày</Text></View>
          <Text style={s.small}>Bắt đầu từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
        </FrameExport>
      </ScrollView>
    </View>
  );
}

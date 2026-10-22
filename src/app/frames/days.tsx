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
      </ScrollView>
    </View>
  );
}

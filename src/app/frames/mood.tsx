import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLove } from "../../lib/store";
import { MOODS } from "../../lib/data";
import { today } from "../../lib/types";
import { MoodFace } from "../../components/FaceIcon";
import { PersonChip } from "../../components/PersonChip";
import { FrameExport } from "../../components/FrameExport";
import { C, ScreenHeader, s } from "../../components/ui";

export default function FrameMoodScreen() {
  const { state } = useLove();
  const moodsToday = state.moods.date === today() ? state.moods : { A: "", B: "" };

  return (
    <View style={s.screen}>
      <ScreenHeader title="Khung Mood hai người" subtitle="Mỗi người một cột riêng, ghi rõ tên — không lẫn lộn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <FrameExport kind="mood" hasContent={!!(moodsToday.A || moodsToday.B)}>
          <Text style={{ fontSize: 16, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Tâm trạng hôm nay</Text>
          <View style={{ flexDirection: "row", gap: 22 }}>
            {(["A", "B"] as const).map((slot) => (
              <View key={slot} style={{ alignItems: "center", gap: 5 }}>
                <MoodFace mood={moodsToday[slot]} size={84} />
                <PersonChip state={state} slot={slot} />
                <Text style={s.small}>{moodsToday[slot] ? MOODS.find((m) => m.id === moodsToday[slot])?.label : "Chưa chọn mood"}</Text>
              </View>
            ))}
          </View>
          <Text style={s.small}>{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</Text>
        </FrameExport>
      </ScrollView>
    </View>
  );
}

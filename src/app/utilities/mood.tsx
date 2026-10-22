import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MOODS } from "../../lib/data";
import { today } from "../../lib/types";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";

export default function MoodScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const moodsToday = state.moods.date === today() ? state.moods : { A: "", B: "" };
  const myMood = moodsToday[me.slot];
  const partnerMood = moodsToday[partner.slot];

  return (
    <View style={s.screen}>
      <ScreenHeader title="Mood hôm nay" subtitle="Mỗi người một thẻ riêng — bạn chỉ sửa được mood của mình" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Thẻ của BẠN — chỉnh sửa được */}
        <View style={[s.card, { borderColor: C.pink, borderWidth: 2 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me.slot} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Mood của bạn</Text>
            <FaceIcon mood={myMood || "joy"} size={40} />
          </View>
          <Text style={[s.sub, { marginTop: 6 }]}>{myMood ? `Bạn đang cảm thấy: ${MOODS.find((m) => m.id === myMood)?.label}` : "Hôm nay bạn chưa chọn mood. Chọn một cảm xúc bên dưới nhé:"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {MOODS.map((m) => {
              const on = myMood === m.id;
              return (
                <TouchableOpacity key={m.id} style={[styles.moodPick, on && styles.moodPickOn]} onPress={() => dispatch({ type: "SET_MOOD", user: me.slot, mood: m.id })}>
                  <FaceIcon mood={m.id} size={34} />
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: on ? C.pinkDark : C.textSoft }}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Thẻ của ĐỐI PHƯƠNG — chỉ xem */}
        <View style={[s.card, { borderColor: "#bae6fd", borderWidth: 2, backgroundColor: "#f8fcff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Mood của {partner.name}</Text>
            <View style={s.chip}><Ionicons name="eye" size={12} color="#0369a1" /><Text style={[s.chipText, { color: "#0369a1" }]}>Chỉ xem</Text></View>
          </View>
          <View style={{ alignItems: "center", gap: 5, marginTop: 8 }}>
            <Avatar id={partner.avatar} size={40} />
            <FaceIcon mood={partnerMood || "joy"} size={64} />
            <Text style={{ fontWeight: "800", color: C.text }}>{partnerMood ? MOODS.find((m) => m.id === partnerMood)?.label : `${partner.name} chưa chọn mood hôm nay`}</Text>
            <Text style={s.small}>Mood của {partner.name} do chính họ chọn trên máy của họ — bạn không sửa thay được.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  moodPick: { width: "18.5%", alignItems: "center", gap: 2, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "#fff7f8" },
  moodPickOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
});

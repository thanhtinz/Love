import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { LOVE_MESSAGES } from "../../lib/data";
import { RARITY_STYLE, type LoveLetter } from "../../lib/types";
import { PersonChip } from "../../components/PersonChip";
import { C, SectionTitle, s } from "../../components/ui";

export default function LettersScreen() {
  const { state, dispatch } = useLove();
  const [reading, setReading] = useState<LoveLetter | null>(null);
  const meName = myName(state);
  const ownedIds = new Set(state.letters.map((l) => l.messageId));
  const unopened = state.letters.filter((l) => !l.opened);
  const opened = state.letters.filter((l) => l.opened);

  function openLetter(l: LoveLetter) {
    if (!l.opened) dispatch({ type: "OPEN_LETTER", id: l.id, opener: meName });
    setReading({ ...l, opened: true });
  }

  const readingMsg = reading ? LOVE_MESSAGES.find((m) => m.id === reading.messageId) : null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="mail">Hộp thư tình yêu</SectionTitle>
      <Text style={s.sub}>Thư rơi khi chăm cây, lên giai đoạn và làm nhiệm vụ. Mở thư để nhận Xu Tim.</Text>

      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.cardTitle}>Bộ sưu tập thư</Text>
          <View style={s.chip}><Ionicons name="mail-open" size={13} color={C.pinkDark} /><Text style={s.chipText}>{ownedIds.size}/36 lá</Text></View>
        </View>
        <View style={{ height: 10, borderRadius: 99, backgroundColor: "#f1f5f9", marginTop: 9, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${(ownedIds.size / 36) * 100}%`, backgroundColor: C.pink, borderRadius: 99 }} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {LOVE_MESSAGES.map((m) => {
            const has = ownedIds.has(m.id);
            const rs = RARITY_STYLE[m.rarity];
            return (
              <View key={m.id} style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: has ? rs.bg : "#f1f5f9", borderWidth: 1.5, borderColor: has ? rs.border : "#e2e8f0" }}>
                <Ionicons name={has ? "mail-open" : "lock-closed"} size={15} color={has ? rs.text : C.textFaint} />
              </View>
            );
          })}
        </View>
        <Text style={s.small}>Ô sáng là thư đã sưu tập. Thư Huyền thoại hiếm nhất.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Thư chưa mở ({unopened.length})</Text>
        <View style={{ gap: 9, marginTop: 10 }}>
          {unopened.map((l) => {
            const rs = RARITY_STYLE[l.rarity];
            return (
              <TouchableOpacity key={l.id} style={[styles.letterRow, { borderColor: rs.border, backgroundColor: rs.bg }]} onPress={() => openLetter(l)}>
                <Ionicons name="mail" size={24} color={rs.text} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>Thư {rs.label} — {l.source}</Text>
                  <Text style={s.small}>Rơi lúc {new Date(l.droppedAt).toLocaleString("vi-VN")} · Chạm để mở và nhận Xu</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
              </TouchableOpacity>
            );
          })}
          {unopened.length === 0 && <Text style={s.sub}>Chưa có thư mới. Chăm cây tiếp để thư rơi nhé!</Text>}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Thư đã mở ({opened.length})</Text>
        <View style={{ gap: 9, marginTop: 10 }}>
          {opened.map((l) => {
            const msg = LOVE_MESSAGES.find((m) => m.id === l.messageId);
            const rs = RARITY_STYLE[l.rarity];
            return (
              <TouchableOpacity key={l.id} style={styles.letterRow} onPress={() => openLetter(l)}>
                <Ionicons name="mail-open" size={22} color={rs.text} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: C.text }} numberOfLines={2}>{msg?.text}</Text>
                  <Text style={s.small}>{rs.label} · {l.source}</Text>
                  <View style={{ marginTop: 4 }}>
                    {l.openedBy === state.personA ? <PersonChip state={state} slot="A" size={16} /> : l.openedBy === state.personB ? <PersonChip state={state} slot="B" size={16} /> : <Text style={s.small}>Người mở: {l.openedBy || "..."}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {opened.length === 0 && <Text style={s.sub}>Chưa mở lá thư nào.</Text>}
        </View>
      </View>

      <Modal visible={!!reading} transparent animationType="fade" onRequestClose={() => setReading(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Ionicons name="mail-open" size={36} color={C.pink} />
            {reading && <Text style={[s.chip, { color: RARITY_STYLE[reading.rarity].text, backgroundColor: RARITY_STYLE[reading.rarity].bg, paddingHorizontal: 10, paddingVertical: 4, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 12 }]}>Thư {RARITY_STYLE[reading.rarity].label}</Text>}
            <Text style={styles.letterText}>{readingMsg?.text}</Text>
            <Text style={s.small}>{reading?.source} · {reading ? new Date(reading.droppedAt).toLocaleString("vi-VN") : ""}</Text>
            <TouchableOpacity style={s.btn} onPress={() => setReading(null)}><Text style={s.btnText}>Đóng thư</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  letterRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff", borderRadius: 14, padding: 11 },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: "#fff7ed", borderRadius: 22, borderWidth: 1.5, borderColor: "#F0C6CE", padding: 22, alignItems: "center", gap: 10, width: "100%" },
  letterText: { fontSize: 16.5, lineHeight: 25, color: "#7f1d1d", textAlign: "center", fontFamily: "BeVietnamPro_600SemiBold" },
});

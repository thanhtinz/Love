import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { NOTE_COLORS } from "../../lib/data";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, today, uid } from "../../lib/types";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

export default function LoveNotesScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const meName = myName(state);
  const now = useNow(500);
  const [myNote, setMyNote] = useState(state.loveNotes[me.slot]);
  const [savedMsg, setSavedMsg] = useState("");
  const [noteText, setNoteText] = useState("");
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  function saveMyNote() {
    dispatch({ type: "SET_LOVE_NOTE", user: me.slot, text: myNote.trim() });
    setSavedMsg("Đã lưu lời nhắn của bạn.");
    setTimeout(() => setSavedMsg(""), 2500);
  }
  function addNote() {
    if (!noteText.trim() || addWaitMs > 0) return; // chống double-submit: đang trong 5 giây chờ thì không tạo thêm
    dispatch({ type: "ADD_NOTE", note: { id: uid(), author: meName, authorSlot: me.slot, text: noteText.trim().slice(0, CONTENT_LIMITS.note), color: NOTE_COLORS[state.notes.length % NOTE_COLORS.length], createdAt: new Date().toISOString() } });
    setNoteText("");
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Love Notes" subtitle="Lời nhắn ghim lâu dài của từng người + ghi chú nhanh chung" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Lời nhắn của BẠN */}
        <View style={[s.card, { borderColor: C.pink, borderWidth: 2 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me.slot} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Lời nhắn của bạn</Text>
          </View>
          <TextInput style={[s.input, { minHeight: 58, textAlignVertical: "top", marginTop: 10 }]} placeholder="Lời nhắn bạn muốn ghim cho người ấy đọc mỗi ngày..." placeholderTextColor={C.textFaint} value={myNote} onChangeText={setMyNote} multiline maxLength={200} />
          <TouchableOpacity style={[s.btn, { marginTop: 9 }]} onPress={saveMyNote}>
            <Ionicons name="save" size={15} color="#fff" /><Text style={s.btnText}>Lưu lời nhắn của bạn</Text>
          </TouchableOpacity>
          {savedMsg ? <Text style={{ color: C.pinkDark, fontWeight: "700", fontSize: 12.5, marginTop: 6 }}>{savedMsg}</Text> : null}
        </View>

        {/* Lời nhắn của ĐỐI PHƯƠNG — chỉ xem */}
        <View style={[s.card, { borderColor: "#bae6fd", borderWidth: 2, backgroundColor: "#f8fcff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Lời nhắn của {partner.name}</Text>
            <View style={s.chip}><Ionicons name="eye" size={12} color="#0369a1" /><Text style={[s.chipText, { color: "#0369a1" }]}>Chỉ xem</Text></View>
          </View>
          <Text style={{ color: C.text, fontSize: 14.5, lineHeight: 21, marginTop: 9, fontStyle: state.loveNotes[partner.slot] ? "normal" : "italic" }}>
            {state.loveNotes[partner.slot] || `${partner.name} chưa ghim lời nhắn nào.`}
          </Text>
          <Text style={[s.small, { marginTop: 5 }]}>Lời nhắn này do {partner.name} tự viết trên máy của họ — trước đây tính năng này không tồn tại nên lời nhắn của một người bị phía kia ghi đè mất.</Text>
        </View>

        {/* Ghi chú nhanh */}
        <View style={s.card}>
          <Text style={{ fontWeight: "900", color: C.text }}>Ghi chú nhanh</Text>
          <Text style={s.sub}>Mỗi ghi chú ghi rõ người dán. Tối đa {CONTENT_LIMITS.note} ký tự, nghỉ {CONTENT_ADD_MIN_INTERVAL_MS / 1000} giây giữa 2 lần dán.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {state.notes.map((n) => (
              <View key={n.id} style={{ width: "48%", borderRadius: 14, padding: 10, minHeight: 78, backgroundColor: n.color }}>
                <Text style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 18 }}>{n.text}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {n.authorSlot ? <PersonChip state={state} slot={n.authorSlot} size={16} /> : <Text style={{ fontSize: 10.5, color: "#9f1239", fontWeight: "700" }}>{n.author}</Text>}
                  <TouchableOpacity onPress={() => dispatch({ type: "DEL_NOTE", id: n.id })}><Ionicons name="trash-outline" size={14} color="#9f1239" /></TouchableOpacity>
                </View>
              </View>
            ))}
            {state.notes.length === 0 && <Text style={s.sub}>Chưa có ghi chú nào — viết lời nhắn đầu tiên cho người ấy nhé.</Text>}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Viết ghi chú..." placeholderTextColor={C.textFaint} value={noteText} onChangeText={setNoteText} maxLength={CONTENT_LIMITS.note} />
            <TouchableOpacity style={[s.btn, { paddingHorizontal: 14 }, (!noteText.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!noteText.trim() || addWaitMs > 0} onPress={addNote}>
              <Ionicons name={addWaitMs > 0 ? "time" : "add"} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {addWaitMs > 0 && <Text style={[s.small, { marginTop: 5 }]}>Chờ {Math.ceil(addWaitMs / 1000)} giây nữa để dán ghi chú tiếp (chống dán trùng).</Text>}
          <Text style={[s.small, { marginTop: 4 }]}>Hôm nay là {today()} — ghi chú không theo ngày, hai bạn cùng xem và xoá được.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

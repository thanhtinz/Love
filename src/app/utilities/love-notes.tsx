import React, { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { NOTE_COLORS } from "../../lib/data";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, today, uid } from "../../lib/types";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, LoadMoreRow, ScreenHeader, s, useNow } from "../../components/ui";

const PAGE = 10;

export default function LoveNotesScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const meName = myName(state);
  const now = useNow(500);
  const [myNote, setMyNote] = useState(state.loveNotes[me.slot]);
  // Ô nhập chỉ khởi tạo 1 lần từ state: nếu bản đồng bộ MỚI hơn về trong lúc đang mở
  // màn hình (mình sửa trên máy khác / bản sao mới hơn), ô vẫn giữ bản CŨ và bấm Lưu là
  // ghi đè mất bản mới. Theo dõi "đã sửa tay chưa": chưa sửa thì luôn đồng bộ theo state.
  const [noteDirty, setNoteDirty] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ ô nhập theo state khi người dùng chưa tự sửa
    if (!noteDirty) setMyNote(state.loveNotes[me.slot]);
  }, [state.loveNotes, me.slot, noteDirty]);
  const [savedMsg, setSavedMsg] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);
  const [noteText, setNoteText] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [notesLimit, setNotesLimit] = useState(PAGE);
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;
  const visibleNotes = state.notes.slice(0, notesLimit);

  function saveMyNote() {
    dispatch({ type: "SET_LOVE_NOTE", user: me.slot, text: myNote.trim() });
    setNoteDirty(false);
    setSavedMsg("Đã lưu lời nhắn của bạn.");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedMsg(""), 2500);
  }
  function addNote() {
    if (!noteText.trim() || addWaitMs > 0) return; // chống double-submit: đang trong 5 giây chờ thì không tạo thêm
    dispatch({ type: "ADD_NOTE", note: { id: uid(), author: meName, authorSlot: me.slot, text: noteText.trim().slice(0, CONTENT_LIMITS.note), color: NOTE_COLORS[state.notes.length % NOTE_COLORS.length], createdAt: new Date().toISOString() } });
    setNoteText(""); setNoteOpen(false);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Love Notes" subtitle="Lời nhắn ghim lâu dài của từng người + ghi chú nhanh chung" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Lời nhắn của BẠN */}
        <View style={[s.card, { borderColor: "#FFC4CF", borderWidth: 1.5 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me.slot} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.text, flex: 1 }}>Lời nhắn của bạn</Text>
          </View>
          <TextInput style={[s.input, { minHeight: 58, textAlignVertical: "top", marginTop: 10 }]} placeholder="Lời nhắn bạn muốn ghim cho người ấy đọc mỗi ngày..." placeholderTextColor={C.textFaint} value={myNote} onChangeText={(t) => { setMyNote(t); setNoteDirty(true); }} multiline maxLength={200} />
          <TouchableOpacity style={[s.btn, { marginTop: 9 }, myNote.trim() === (state.loveNotes[me.slot] || "").trim() && { opacity: 0.5 }]} disabled={myNote.trim() === (state.loveNotes[me.slot] || "").trim()} onPress={saveMyNote}>
            <Ionicons name="save" size={15} color="#fff" /><Text style={s.btnText}>Lưu lời nhắn của bạn</Text>
          </TouchableOpacity>
          {savedMsg ? <Text style={{ color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, marginTop: 6 }}>{savedMsg}</Text> : null}
        </View>

        {/* Lời nhắn của ĐỐI PHƯƠNG — chỉ xem */}
        <View style={[s.card, { borderColor: "#BDEAE4", borderWidth: 2, backgroundColor: "#F4FBF9" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.text, flex: 1 }}>Lời nhắn của {partner.name}</Text>
            <View style={[s.chip, { backgroundColor: "#D9F4F0" }]}><Ionicons name="eye" size={12} color="#0B7A6E" /><Text style={[s.chipText, { color: "#0B7A6E" }]}>Chỉ xem</Text></View>
          </View>
          <Text style={{ color: C.text, fontSize: 14.5, lineHeight: 21, marginTop: 9, fontStyle: state.loveNotes[partner.slot] ? "normal" : "italic" }}>
            {state.loveNotes[partner.slot] || `${partner.name} chưa ghim lời nhắn nào.`}
          </Text>
          <Text style={[s.small, { marginTop: 5 }]}>Do {partner.name} tự viết trên máy của họ — bạn chỉ xem, không sửa được.</Text>
        </View>

        {/* Ghi chú nhanh — lưới tối đa 10 mục + Tải thêm; ô dán mới mở sheet */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[s.cardTitle, { flex: 1 }]}>Ghi chú nhanh ({state.notes.length})</Text>
            <TouchableOpacity style={[s.btn, { paddingHorizontal: 12, minHeight: 44 }]} onPress={() => setNoteOpen(true)} accessibilityLabel="Dán ghi chú mới">
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.btnText}>Dán mới</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {visibleNotes.map((n) => (
              <View key={n.id} style={{ width: "48%", borderRadius: 14, padding: 10, minHeight: 78, backgroundColor: n.color }}>
                <Text style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 18 }}>{n.text}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {n.authorSlot ? <PersonChip state={state} slot={n.authorSlot} size={16} /> : <Text style={{ fontSize: 10.5, color: "#9f1239", fontFamily: "BeVietnamPro_700Bold" }}>{n.author}</Text>}
                  <TouchableOpacity onPress={() => dispatch({ type: "DEL_NOTE", id: n.id })} hitSlop={10} accessibilityLabel="Xoá ghi chú"><Ionicons name="trash-outline" size={14} color="#9f1239" /></TouchableOpacity>
                </View>
              </View>
            ))}
            {state.notes.length === 0 && <Text style={s.sub}>Chưa có ghi chú nào — viết lời nhắn đầu tiên cho người ấy nhé.</Text>}
          </View>
          {state.notes.length > notesLimit && <LoadMoreRow onPress={() => setNotesLimit((v) => v + PAGE)} label={`Tải thêm (${state.notes.length - notesLimit} ghi chú còn lại)`} />}
          <Text style={[s.small, { marginTop: 6 }]}>Hôm nay là {today()} — ghi chú không theo ngày, hai bạn cùng xem và xoá được.</Text>
        </View>
      </ScrollView>

      {/* Sheet dán ghi chú mới */}
      <Modal visible={noteOpen} transparent animationType="slide" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.cardTitle}>Dán ghi chú mới</Text>
              <TouchableOpacity onPress={() => setNoteOpen(false)} hitSlop={10} accessibilityLabel="Đóng"><Ionicons name="close-circle" size={26} color={C.textFaint} /></TouchableOpacity>
            </View>
            <Text style={s.sub}>Tối đa {CONTENT_LIMITS.note} ký tự · nghỉ {CONTENT_ADD_MIN_INTERVAL_MS / 1000} giây giữa 2 lần dán.</Text>
            <TextInput style={[s.input, { minHeight: 64, textAlignVertical: "top" }]} placeholder="Viết ghi chú..." placeholderTextColor={C.textFaint} value={noteText} onChangeText={setNoteText} maxLength={CONTENT_LIMITS.note} multiline />
            {addWaitMs > 0 && <Text style={s.small}>Chờ {Math.ceil(addWaitMs / 1000)} giây nữa để dán ghi chú tiếp (chống dán trùng).</Text>}
            <TouchableOpacity style={[s.btn, (!noteText.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!noteText.trim() || addWaitMs > 0} onPress={addNote}>
              <Ionicons name={addWaitMs > 0 ? "time" : "add"} size={17} color="#fff" /><Text style={s.btnText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s...` : "Dán ghi chú"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 9, maxHeight: "88%" },
});

import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, uid } from "../../lib/types";
import { BucketEmptyArt } from "../../components/Art";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, LoadMoreRow, ScreenHeader, StatusChip, s, useNow } from "../../components/ui";

const PAGE = 10;

export default function BucketListScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const now = useNow(500);
  const [formOpen, setFormOpen] = useState(false);
  const [bucketText, setBucketText] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;
  const doneCount = state.bucket.filter((b) => b.done).length;
  // Hiện MỚI NHẤT trước: bucket được thêm ở CUỐI mảng (merge cũng xếp createdAt tăng
  // dần) nên slice(0, limit) cũ chỉ hiện các mục CŨ NHẤT — từ mục thứ 11 trở đi, mục
  // vừa thêm "biến mất" khỏi màn hình khiến người dùng tưởng thêm thất bại.
  const visible = [...state.bucket].reverse().slice(0, limit);

  function addBucket() {
    if (!bucketText.trim() || addWaitMs > 0) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: bucketText.trim().slice(0, CONTENT_LIMITS.bucket), done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setBucketText(""); setFormOpen(false);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/utilities" title="Bucket List" subtitle="Những việc hai bạn muốn làm cùng nhau" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[s.cardTitle, { flex: 1 }]}>Danh sách chung ({state.bucket.length} mục)</Text>
            <StatusChip icon="checkmark-circle" label={`Đã xong ${doneCount}`} variant="done" />
            <TouchableOpacity style={[s.btn, { paddingHorizontal: 12, minHeight: 44 }]} onPress={() => setFormOpen(true)} accessibilityLabel="Thêm mục bucket list">
              <Ionicons name="add" size={18} color="#fff" /><Text style={s.btnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 9, marginTop: 10 }}>
            {visible.map((b) => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff7f8", borderRadius: 13, padding: 9, borderWidth: 1.5, borderColor: C.pinkBorder }}>
                <TouchableOpacity onPress={() => dispatch({ type: "TOGGLE_BUCKET", id: b.id })} hitSlop={8} accessibilityLabel={b.done ? "Bỏ đánh dấu đã xong" : "Đánh dấu đã xong"}>
                  <Ionicons name={b.done ? "checkbox" : "square-outline"} size={22} color={b.done ? C.green : C.textFaint} />
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 13.5, color: b.done ? C.textFaint : C.text, textDecorationLine: b.done ? "line-through" : "none" }}>{b.text}</Text>
                  {b.authorSlot ? <PersonChip state={state} slot={b.authorSlot} size={16} /> : <Text style={s.small}>Người thêm: chưa rõ (mục cũ)</Text>}
                </View>
                <TouchableOpacity onPress={() => dispatch({ type: "DEL_BUCKET", id: b.id })} hitSlop={10} accessibilityLabel="Xoá mục này"><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
              </View>
            ))}
            {state.bucket.length === 0 && (
              <View style={{ alignItems: "center", gap: 4, paddingVertical: 8 }}>
                <BucketEmptyArt size={150} />
                <Text style={s.sub}>Chiếc giỏ đang trống — thêm điều đầu tiên hai bạn muốn làm cùng nhau nhé.</Text>
              </View>
            )}
          </View>
          {state.bucket.length > limit && <LoadMoreRow onPress={() => setLimit((v) => v + PAGE)} label={`Tải thêm (${state.bucket.length - limit} mục còn lại)`} />}
        </View>
      </ScrollView>

      {/* Sheet thêm mục — ô nhập không còn chiếm chỗ cố định trên trang */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.cardTitle}>Thêm điều muốn làm</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)} hitSlop={10} accessibilityLabel="Đóng"><Ionicons name="close-circle" size={26} color={C.textFaint} /></TouchableOpacity>
            </View>
            <TextInput style={s.input} placeholder="VD: Cùng ngắm hoàng hôn ở biển" placeholderTextColor={C.textFaint} value={bucketText} onChangeText={setBucketText} maxLength={CONTENT_LIMITS.bucket} />
            {addWaitMs > 0 && <Text style={s.small}>Chờ {Math.ceil(addWaitMs / 1000)} giây nữa để thêm mục tiếp (chống thêm trùng).</Text>}
            <TouchableOpacity style={[s.btn, (!bucketText.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!bucketText.trim() || addWaitMs > 0} onPress={addBucket}>
              <Ionicons name={addWaitMs > 0 ? "time" : "add"} size={17} color="#fff" /><Text style={s.btnText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s...` : "Thêm vào danh sách"}</Text>
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

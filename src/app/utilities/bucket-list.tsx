import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, uid } from "../../lib/types";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

export default function BucketListScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const now = useNow(500);
  const [bucketText, setBucketText] = useState("");
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;
  const doneCount = state.bucket.filter((b) => b.done).length;

  function addBucket() {
    if (!bucketText.trim() || addWaitMs > 0) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: bucketText.trim().slice(0, CONTENT_LIMITS.bucket), done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setBucketText("");
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Bucket List" subtitle="Những việc hai bạn muốn làm cùng nhau" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "900", color: C.text }}>Danh sách chung ({state.bucket.length} mục)</Text>
            <View style={s.chip}><Ionicons name="checkmark-circle" size={13} color={C.pinkDark} /><Text style={s.chipText}>Đã xong {doneCount}</Text></View>
          </View>
          <View style={{ gap: 9, marginTop: 10 }}>
            {state.bucket.map((b) => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff7f8", borderRadius: 13, padding: 9, borderWidth: 1.5, borderColor: C.pinkBorder }}>
                <TouchableOpacity onPress={() => dispatch({ type: "TOGGLE_BUCKET", id: b.id })}>
                  <Ionicons name={b.done ? "checkbox" : "square-outline"} size={22} color={b.done ? C.green : C.textFaint} />
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 13.5, color: b.done ? C.textFaint : C.text, textDecorationLine: b.done ? "line-through" : "none" }}>{b.text}</Text>
                  {b.authorSlot ? <PersonChip state={state} slot={b.authorSlot} size={16} /> : <Text style={s.small}>Người thêm: chưa rõ (mục cũ)</Text>}
                </View>
                <TouchableOpacity onPress={() => dispatch({ type: "DEL_BUCKET", id: b.id })}><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
              </View>
            ))}
            {state.bucket.length === 0 && <Text style={s.sub}>Chưa có mục nào. Thêm điều đầu tiên hai bạn muốn làm cùng nhau nhé!</Text>}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 11 }}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="VD: Cùng ngắm hoàng hôn ở biển" placeholderTextColor={C.textFaint} value={bucketText} onChangeText={setBucketText} maxLength={CONTENT_LIMITS.bucket} />
            <TouchableOpacity style={[s.btn, { paddingHorizontal: 14 }, (!bucketText.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!bucketText.trim() || addWaitMs > 0} onPress={addBucket}>
              <Ionicons name={addWaitMs > 0 ? "time" : "add"} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {addWaitMs > 0 && <Text style={[s.small, { marginTop: 5 }]}>Chờ {Math.ceil(addWaitMs / 1000)} giây nữa để thêm mục tiếp (chống thêm trùng).</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

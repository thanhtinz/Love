import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { speciesById } from "../../lib/plants";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, today, uid } from "../../lib/types";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

export default function MemoriesScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const meName = myName(state);
  const now = useNow(500);
  const [memTitle, setMemTitle] = useState("");
  const [memDate, setMemDate] = useState(today());
  const [memDesc, setMemDesc] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  function addMemory() {
    if (!memTitle.trim() || addWaitMs > 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(memDate) || isNaN(new Date(memDate + "T00:00:00").getTime())) { setFormMsg("Ngày kỷ niệm chưa đúng định dạng (năm-tháng-ngày)."); return; }
    setFormMsg("");
    dispatch({ type: "ADD_MEMORY", memory: { id: uid(), title: memTitle.trim().slice(0, CONTENT_LIMITS.memoryTitle), date: memDate, desc: memDesc.trim().slice(0, CONTENT_LIMITS.memoryDesc), imageUrl: "", author: meName, authorSlot: me.slot, createdAt: new Date().toISOString() } });
    setMemTitle(""); setMemDesc("");
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Dòng kỷ niệm" subtitle="Kỷ niệm hai bạn lưu giữ và những cây đã trưởng thành" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <Text style={{ fontWeight: "900", color: C.text }}>Tất cả kỷ niệm ({state.memories.length + state.treeCollection.length})</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {state.memories.map((m) => (
              <View key={m.id} style={{ flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#fff7f8", borderRadius: 14, padding: 11, borderWidth: 1.5, borderColor: C.pinkBorder }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{m.title}</Text>
                  <Text style={s.small}>{new Date(m.date + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
                  {m.desc ? <Text style={{ fontSize: 13, color: C.textSoft }}>{m.desc}</Text> : null}
                  {m.authorSlot ? <PersonChip state={state} slot={m.authorSlot} size={16} /> : <Text style={s.small}>Người thêm: {m.author}</Text>}
                </View>
                <TouchableOpacity onPress={() => dispatch({ type: "DEL_MEMORY", id: m.id })}><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
              </View>
            ))}
            {state.treeCollection.map((c) => (
              <View key={c.id} style={{ flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#f0fdf4", borderRadius: 14, padding: 11, borderWidth: 1.5, borderColor: "#bbf7d0" }}>
                <Ionicons name="leaf" size={19} color={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{speciesById(c.speciesId).name} trưởng thành</Text>
                  <Text style={s.small}>Gieo {new Date(c.plantedAt).toLocaleDateString("vi-VN")} · Thu vào kỷ niệm {new Date(c.collectedAt).toLocaleDateString("vi-VN")} · Đã chăm {c.careCount} lần · Thành tích chung của vườn</Text>
                </View>
              </View>
            ))}
            {state.memories.length === 0 && state.treeCollection.length === 0 && <Text style={s.sub}>Chưa có kỷ niệm nào được lưu.</Text>}
          </View>
        </View>

        <View style={s.card}>
          <Text style={{ fontWeight: "900", color: C.text }}>Thêm kỷ niệm mới</Text>
          <Text style={s.sub}>Kỷ niệm sẽ gắn tên người thêm là bạn. Nghỉ {CONTENT_ADD_MIN_INTERVAL_MS / 1000} giây giữa 2 lần thêm để chống trùng.</Text>
          <View style={{ gap: 9, marginTop: 10 }}>
            <TextInput style={s.input} placeholder="Tên kỷ niệm (VD: Lần đầu nắm tay)" placeholderTextColor={C.textFaint} value={memTitle} onChangeText={setMemTitle} maxLength={CONTENT_LIMITS.memoryTitle} />
            <TextInput style={s.input} placeholder="Ngày (năm-tháng-ngày)" placeholderTextColor={C.textFaint} value={memDate} onChangeText={setMemDate} maxLength={10} />
            <TextInput style={[s.input, { minHeight: 54, textAlignVertical: "top" }]} placeholder="Kể lại một chút..." placeholderTextColor={C.textFaint} value={memDesc} onChangeText={setMemDesc} multiline maxLength={CONTENT_LIMITS.memoryDesc} />
            {formMsg ? <Text style={{ color: "#b91c1c", fontWeight: "700", fontSize: 12.5 }}>{formMsg}</Text> : null}
            <TouchableOpacity style={[s.btn, (!memTitle.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!memTitle.trim() || addWaitMs > 0} onPress={addMemory}>
              <Ionicons name="add-circle" size={16} color="#fff" /><Text style={s.btnText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s...` : "Lưu kỷ niệm"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

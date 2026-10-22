import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { speciesById } from "../../lib/plants";
import { CONTENT_ADD_MIN_INTERVAL_MS, CONTENT_LIMITS, today, uid, type AppState, type CollectedTree, type MemoryItem } from "../../lib/types";
import { EmptyMemoriesArt } from "../../components/illustrations";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, LoadMoreRow, ScreenHeader, s, useNow } from "../../components/ui";

const PAGE = 10;

type Row = { kind: "memory"; m: MemoryItem } | { kind: "tree"; c: CollectedTree };

const MemoryRow = memo(function MemoryRow({ m, state, onDelete }: { m: MemoryItem; state: AppState; onDelete: (id: string) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#fff7f8", borderRadius: 14, padding: 11, borderWidth: 1.5, borderColor: C.pinkBorder, marginBottom: 10 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, fontSize: 13.5 }}>{m.title}</Text>
        <Text style={s.small}>{new Date(m.date + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
        {m.desc ? <Text style={{ fontSize: 13, color: C.textSoft }}>{m.desc}</Text> : null}
        {m.authorSlot ? <PersonChip state={state} slot={m.authorSlot} size={16} /> : <Text style={s.small}>Người thêm: {m.author}</Text>}
      </View>
      <TouchableOpacity onPress={() => onDelete(m.id)}><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
    </View>
  );
});

const TreeRow = memo(function TreeRow({ c }: { c: CollectedTree }) {
  return (
    <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#f0fdf4", borderRadius: 14, padding: 11, borderWidth: 1.5, borderColor: "#bbf7d0", marginBottom: 10 }}>
      <Ionicons name="leaf" size={19} color={C.green} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, fontSize: 13.5 }}>{speciesById(c.speciesId).name} trưởng thành</Text>
        <Text style={s.small}>Gieo {new Date(c.plantedAt).toLocaleDateString("vi-VN")} · Thu vào kỷ niệm {new Date(c.collectedAt).toLocaleDateString("vi-VN")} · Đã chăm {c.careCount} lần · Thành tích chung của vườn</Text>
      </View>
    </View>
  );
});

export default function MemoriesScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const meName = myName(state);
  const now = useNow(500);
  const [formOpen, setFormOpen] = useState(false);
  const [memTitle, setMemTitle] = useState("");
  const [memDate, setMemDate] = useState(today());
  const [memDesc, setMemDesc] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  const all = useMemo<Row[]>(() => [
    ...state.memories.map((m) => ({ kind: "memory" as const, m })),
    ...state.treeCollection.map((c) => ({ kind: "tree" as const, c })),
  ], [state.memories, state.treeCollection]);
  const visible = useMemo(() => all.slice(0, limit), [all, limit]);

  const onDelete = useCallback((id: string) => dispatch({ type: "DEL_MEMORY", id }), [dispatch]);
  const renderItem = useCallback(({ item }: { item: Row }) => (
    item.kind === "memory" ? <MemoryRow m={item.m} state={state} onDelete={onDelete} /> : <TreeRow c={item.c} />
  ), [state, onDelete]);

  function addMemory() {
    if (!memTitle.trim() || addWaitMs > 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(memDate) || isNaN(new Date(memDate + "T00:00:00").getTime())) { setFormMsg("Ngày kỷ niệm chưa đúng định dạng (năm-tháng-ngày)."); return; }
    setFormMsg("");
    dispatch({ type: "ADD_MEMORY", memory: { id: uid(), title: memTitle.trim().slice(0, CONTENT_LIMITS.memoryTitle), date: memDate, desc: memDesc.trim().slice(0, CONTENT_LIMITS.memoryDesc), imageUrl: "", author: meName, authorSlot: me.slot, createdAt: new Date().toISOString() } });
    setMemTitle(""); setMemDesc(""); setFormOpen(false);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Dòng kỷ niệm" subtitle="Kỷ niệm hai bạn lưu giữ và những cây đã trưởng thành" />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        data={visible}
        keyExtractor={(r) => (r.kind === "memory" ? "m-" + r.m.id : "t-" + r.c.id)}
        renderItem={renderItem}
        initialNumToRender={10}
        windowSize={7}
        ListHeaderComponent={
          <View style={[s.card, { marginBottom: 11, flexDirection: "row", alignItems: "center", gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Tất cả kỷ niệm ({state.memories.length + state.treeCollection.length})</Text>
              <Text style={s.sub}>Hiện {Math.min(limit, all.length)} mục gần nhất — bấm Tải thêm để xem tiếp.</Text>
            </View>
            <TouchableOpacity style={[s.btn, { paddingHorizontal: 14, minHeight: 44 }]} onPress={() => setFormOpen(true)} accessibilityLabel="Thêm kỷ niệm mới">
              <Ionicons name="add" size={20} color="#fff" /><Text style={s.btnText}>Thêm</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", gap: 5, paddingVertical: 20 }}>
            <EmptyMemoriesArt size={128} />
            <Text style={s.cardTitle}>Chưa có kỷ niệm nào</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Lưu khoảnh khắc đầu tiên bằng nút Thêm ở trên nhé.</Text>
          </View>
        }
        ListFooterComponent={() => (
          all.length > limit ? <LoadMoreRow onPress={() => setLimit((v) => v + PAGE)} label={`Tải thêm (${all.length - limit} mục còn lại)`} /> : null
        )}
      />

      {/* Sheet thêm kỷ niệm — form không còn chiếm chỗ cố định trên trang */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.cardTitle}>Thêm kỷ niệm mới</Text>
              <TouchableOpacity onPress={() => setFormOpen(false)}><Ionicons name="close-circle" size={26} color={C.textFaint} /></TouchableOpacity>
            </View>
            <Text style={s.sub}>Kỷ niệm gắn tên người thêm là bạn · nghỉ {CONTENT_ADD_MIN_INTERVAL_MS / 1000} giây giữa 2 lần thêm.</Text>
            <TextInput style={s.input} placeholder="Tên kỷ niệm (VD: Lần đầu nắm tay)" placeholderTextColor={C.textFaint} value={memTitle} onChangeText={setMemTitle} maxLength={CONTENT_LIMITS.memoryTitle} />
            <TextInput style={s.input} placeholder="Ngày (năm-tháng-ngày)" placeholderTextColor={C.textFaint} value={memDate} onChangeText={setMemDate} maxLength={10} />
            <TextInput style={[s.input, { minHeight: 54, textAlignVertical: "top" }]} placeholder="Kể lại một chút..." placeholderTextColor={C.textFaint} value={memDesc} onChangeText={setMemDesc} multiline maxLength={CONTENT_LIMITS.memoryDesc} />
            {formMsg ? <Text style={{ color: "#b91c1c", fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5 }}>{formMsg}</Text> : null}
            <TouchableOpacity style={[s.btn, (!memTitle.trim() || addWaitMs > 0) && { opacity: 0.5 }]} disabled={!memTitle.trim() || addWaitMs > 0} onPress={addMemory}>
              <Ionicons name="add-circle" size={16} color="#fff" /><Text style={s.btnText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s...` : "Lưu kỷ niệm"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 9 },
});

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { MOODS, NOTE_COLORS, SHOP_ITEMS, questionOfDay } from "../../lib/data";
import { speciesById } from "../../lib/plants";
import { daysTogether, nextMilestone, today, uid, MILESTONES } from "../../lib/types";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import { C, SectionTitle, s } from "../../components/ui";

export default function UtilitiesScreen() {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const meName = myName(state);
  const days = daysTogether(state.startDate);
  const nm = nextMilestone(days);
  const q = questionOfDay();
  const answersToday = state.answers.date === today() ? state.answers : { A: "", B: "" };
  const myAnswer = answersToday[me];
  const theirAnswer = answersToday[me === "A" ? "B" : "A"];
  const bothAnswered = Boolean(myAnswer && theirAnswer);

  const [answerText, setAnswerText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [bucketText, setBucketText] = useState("");
  const [memTitle, setMemTitle] = useState("");
  const [memDate, setMemDate] = useState(today());
  const [memDesc, setMemDesc] = useState("");

  const shopCats: { id: "pot" | "scene" | "accessory"; label: string; icon: string }[] = [
    { id: "pot", label: "Chậu cây", icon: "flower" },
    { id: "scene", label: "Khung cảnh vườn", icon: "image" },
    { id: "accessory", label: "Phụ kiện", icon: "ribbon" },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="heart-circle">Tiện ích đôi mình</SectionTitle>

      {/* Đếm ngày yêu */}
      <View style={[s.card, { alignItems: "center", backgroundColor: "#fff1f2" }]}>
        <Text style={s.sub}>Hai bạn đã bên nhau</Text>
        <Text style={{ fontSize: 46, fontWeight: "900", color: C.pinkDark, lineHeight: 52 }}>{days} ngày</Text>
        <Text style={s.sub}>từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
        <View style={{ width: "100%", marginTop: 10, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text }}>Mốc tiếp theo: {nm.target} ngày</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.pinkDark }}>còn {nm.remaining} ngày</Text>
          </View>
          <View style={{ height: 9, borderRadius: 99, backgroundColor: "#fff", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, (days / nm.target) * 100)}%`, backgroundColor: C.pink, borderRadius: 99 }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>
          {MILESTONES.map((m) => (
            <View key={m} style={[s.chip, { backgroundColor: days >= m ? "#dcfce7" : "#fff" }]}>
              <Ionicons name={days >= m ? "checkmark-circle" : "ellipse-outline"} size={12} color={days >= m ? "#16a34a" : C.textFaint} />
              <Text style={[s.chipText, { color: days >= m ? "#15803d" : C.textFaint }]}>{m} ngày</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mood hai người */}
      <View style={s.card}>
        <SectionTitle icon="happy" color={C.amber}>Tâm trạng hôm nay</SectionTitle>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {(["A", "B"] as const).map((p) => (
            <View key={p} style={styles.moodCard}>
              <Avatar id={p === "A" ? state.avatarA : state.avatarB} size={30} />
              <FaceIcon mood={state.moods[p]} size={46} />
              <Text style={{ fontWeight: "800", color: C.text, fontSize: 12.5 }}>{p === "A" ? state.personA : state.personB}{p === me ? " (bạn)" : ""}</Text>
              <Text style={s.small}>{MOODS.find((m) => m.id === state.moods[p])?.label || "Chưa chọn"}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text, marginTop: 12, marginBottom: 7 }}>Bạn đang cảm thấy thế nào?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {MOODS.map((m) => {
            const on = state.moods[me] === m.id;
            return (
              <TouchableOpacity key={m.id} style={[styles.moodPick, on && styles.moodPickOn]} onPress={() => dispatch({ type: "SET_MOOD", user: me, mood: m.id })}>
                <FaceIcon mood={m.id} size={34} />
                <Text style={{ fontSize: 10.5, fontWeight: "700", color: on ? C.pinkDark : C.textSoft }}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Câu hỏi mỗi ngày */}
      <View style={s.card}>
        <SectionTitle icon="chatbubbles" color={C.sky}>Câu hỏi mỗi ngày</SectionTitle>
        <Text style={{ fontSize: 15, fontWeight: "800", color: C.text, marginTop: 8, lineHeight: 21 }}>{q}</Text>
        {!myAnswer ? (
          <View style={{ gap: 9, marginTop: 10 }}>
            <TextInput style={[s.input, { minHeight: 64, textAlignVertical: "top" }]} placeholder="Câu trả lời của bạn (chỉ hiện khi cả hai cùng trả lời)..." placeholderTextColor={C.textFaint} value={answerText} onChangeText={setAnswerText} multiline maxLength={300} />
            <TouchableOpacity style={[s.btn, !answerText.trim() && { opacity: 0.5 }]} disabled={!answerText.trim()} onPress={() => { dispatch({ type: "ANSWER", user: me, text: answerText.trim() }); setAnswerText(""); }}>
              <Ionicons name="lock-closed" size={15} color="#fff" /><Text style={s.btnText}>Niêm phong câu trả lời</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8, marginTop: 10 }}>
            <View style={styles.answerBox}><Text style={styles.answerName}>Bạn</Text><Text style={{ color: C.text, fontSize: 13.5 }}>{myAnswer}</Text></View>
            {bothAnswered ? (
              <View style={styles.answerBox}><Text style={styles.answerName}>Người ấy</Text><Text style={{ color: C.text, fontSize: 13.5 }}>{theirAnswer}</Text></View>
            ) : (
              <Text style={s.sub}>Đã niêm phong! Chờ người ấy trả lời thì đáp án của họ mới mở ra.</Text>
            )}
          </View>
        )}
      </View>

      {/* Love Notes */}
      <View style={s.card}>
        <SectionTitle icon="document-text" color={C.violet}>Ghi chú yêu thương</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {state.notes.map((n) => (
            <View key={n.id} style={[styles.note, { backgroundColor: n.color }]}>
              <Text style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 18 }}>{n.text}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <Text style={{ fontSize: 10.5, color: "#9f1239", fontWeight: "700" }}>{n.author}</Text>
                <TouchableOpacity onPress={() => dispatch({ type: "DEL_NOTE", id: n.id })}><Ionicons name="trash-outline" size={14} color="#9f1239" /></TouchableOpacity>
              </View>
            </View>
          ))}
          {state.notes.length === 0 && <Text style={s.sub}>Chưa có ghi chú nào — viết lời nhắn đầu tiên cho người ấy nhé.</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder="Viết ghi chú..." placeholderTextColor={C.textFaint} value={noteText} onChangeText={setNoteText} maxLength={200} />
          <TouchableOpacity style={[s.btn, { paddingHorizontal: 14 }, !noteText.trim() && { opacity: 0.5 }]} disabled={!noteText.trim()} onPress={() => { dispatch({ type: "ADD_NOTE", note: { id: uid(), author: meName, text: noteText.trim(), color: NOTE_COLORS[state.notes.length % NOTE_COLORS.length], createdAt: new Date().toISOString() } }); setNoteText(""); }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bucket List */}
      <View style={s.card}>
        <SectionTitle icon="list" color={C.green}>Bucket List — việc muốn làm cùng nhau</SectionTitle>
        <View style={{ gap: 8, marginTop: 10 }}>
          {state.bucket.map((b) => (
            <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <TouchableOpacity onPress={() => dispatch({ type: "TOGGLE_BUCKET", id: b.id })}>
                <Ionicons name={b.done ? "checkbox" : "square-outline"} size={22} color={b.done ? C.green : C.textFaint} />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 13.5, color: b.done ? C.textFaint : C.text, textDecorationLine: b.done ? "line-through" : "none" }}>{b.text}</Text>
              <TouchableOpacity onPress={() => dispatch({ type: "DEL_BUCKET", id: b.id })}><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
            </View>
          ))}
          {state.bucket.length === 0 && <Text style={s.sub}>Chưa có mục nào. Thêm điều đầu tiên hai bạn muốn làm cùng nhau nhé!</Text>}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput style={[s.input, { flex: 1 }]} placeholder="VD: Cùng ngắm hoàng hôn ở biển" placeholderTextColor={C.textFaint} value={bucketText} onChangeText={setBucketText} maxLength={120} />
          <TouchableOpacity style={[s.btn, { paddingHorizontal: 14 }, !bucketText.trim() && { opacity: 0.5 }]} disabled={!bucketText.trim()} onPress={() => { dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: bucketText.trim(), done: false, createdAt: new Date().toISOString() } }); setBucketText(""); }}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dòng kỷ niệm */}
      <View style={s.card}>
        <SectionTitle icon="camera" color={C.pink}>Dòng kỷ niệm</SectionTitle>
        <View style={{ gap: 10, marginTop: 10 }}>
          {state.memories.map((m) => (
            <View key={m.id} style={styles.memRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{m.title}</Text>
                <Text style={s.small}>{new Date(m.date + "T00:00:00").toLocaleDateString("vi-VN")} · {m.author}</Text>
                {m.desc ? <Text style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>{m.desc}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => dispatch({ type: "DEL_MEMORY", id: m.id })}><Ionicons name="trash-outline" size={17} color={C.textFaint} /></TouchableOpacity>
            </View>
          ))}
          {state.treeCollection.map((c) => (
            <View key={c.id} style={styles.memRow}>
              <Ionicons name="leaf" size={19} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{speciesById(c.speciesId).name} trưởng thành</Text>
                <Text style={s.small}>Gieo {new Date(c.plantedAt).toLocaleDateString("vi-VN")} · Thu vào kỷ niệm {new Date(c.collectedAt).toLocaleDateString("vi-VN")} · Đã chăm {c.careCount} lần</Text>
              </View>
            </View>
          ))}
          {state.memories.length === 0 && state.treeCollection.length === 0 && <Text style={s.sub}>Chưa có kỷ niệm nào được lưu.</Text>}
        </View>
        <View style={{ gap: 9, marginTop: 12 }}>
          <TextInput style={s.input} placeholder="Tên kỷ niệm (VD: Lần đầu nắm tay)" placeholderTextColor={C.textFaint} value={memTitle} onChangeText={setMemTitle} maxLength={60} />
          <TextInput style={s.input} placeholder="Ngày (năm-tháng-ngày)" placeholderTextColor={C.textFaint} value={memDate} onChangeText={setMemDate} maxLength={10} />
          <TextInput style={[s.input, { minHeight: 54, textAlignVertical: "top" }]} placeholder="Kể lại một chút..." placeholderTextColor={C.textFaint} value={memDesc} onChangeText={setMemDesc} multiline maxLength={300} />
          <TouchableOpacity style={[s.btn, !memTitle.trim() && { opacity: 0.5 }]} disabled={!memTitle.trim()} onPress={() => { dispatch({ type: "ADD_MEMORY", memory: { id: uid(), title: memTitle.trim(), date: /^\d{4}-\d{2}-\d{2}$/.test(memDate) ? memDate : today(), desc: memDesc.trim(), imageUrl: "", author: meName, createdAt: new Date().toISOString() } }); setMemTitle(""); setMemDesc(""); }}>
            <Ionicons name="add-circle" size={16} color="#fff" /><Text style={s.btnText}>Lưu kỷ niệm</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shop trang trí */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle icon="bag-handle" color={C.amber}>Cửa hàng trang trí</SectionTitle>
          <View style={s.chip}><Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.chipText}>{state.coins} Xu</Text></View>
        </View>
        {shopCats.map((cat) => (
          <View key={cat.id} style={{ marginTop: 12, gap: 8 }}>
            <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{cat.label}</Text>
            {SHOP_ITEMS.filter((i) => i.category === cat.id).map((item) => {
              const owned = state.inventory.includes(item.id);
              const equipped = state.equipped[cat.id] === item.id;
              return (
                <View key={item.id} style={styles.shopRow}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: item.category === "pot" && item.visual ? item.visual : C.pinkSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={item.icon as never} size={18} color={item.category === "pot" && item.visual ? "#fff" : C.pinkDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{item.name}</Text>
                    <Text style={s.small}>{item.desc}</Text>
                  </View>
                  {equipped ? (<View style={s.chip}><Text style={s.chipText}>Đang dùng</Text></View>) : owned ? (
                    <TouchableOpacity style={s.btnGhost} onPress={() => dispatch({ type: "EQUIP_ITEM", category: cat.id, itemId: item.id })}><Text style={s.btnGhostText}>Dùng</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[s.btnGhost, state.coins < item.price && { opacity: 0.5 }]} disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_ITEM", itemId: item.id, actor: meName })}>
                      <Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.btnGhostText}>{item.price} Xu</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={[s.small, { marginTop: 8 }]}>Đồ trang trí áp dụng ngay lên cây và nền vườn ở tab Vườn cây.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  moodCard: { flex: 1, alignItems: "center", gap: 4, backgroundColor: "#fff7ed", borderRadius: 16, paddingVertical: 10 },
  moodPick: { width: "18.5%", alignItems: "center", gap: 2, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "#fff7f8" },
  moodPickOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  answerBox: { backgroundColor: "#f0f9ff", borderRadius: 12, padding: 10, gap: 2 },
  answerName: { fontSize: 11, fontWeight: "800", color: C.sky, textTransform: "uppercase" },
  note: { width: "48%", borderRadius: 14, padding: 10, minHeight: 74 },
  memRow: { flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: "#fff7f8", borderRadius: 14, padding: 11, borderWidth: 1.5, borderColor: C.pinkBorder },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff", borderRadius: 13, borderWidth: 1.5, borderColor: "#f1f5f9", padding: 9 },
});

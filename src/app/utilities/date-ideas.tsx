import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { DATE_IDEAS } from "../../lib/data";
import { CONTENT_ADD_MIN_INTERVAL_MS, uid } from "../../lib/types";
import { selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

export default function DateIdeasScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const now = useNow(500);
  const [ideaIdx, setIdeaIdx] = useState(() => Math.floor(Date.now() / 86400000) % DATE_IDEAS.length);
  const [savedMsg, setSavedMsg] = useState("");
  const idea = DATE_IDEAS[ideaIdx % DATE_IDEAS.length];
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  function saveIdea() {
    if (addWaitMs > 0) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: idea.text, done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setSavedMsg("Đã lưu ý tưởng này vào Bucket List.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Gợi ý hẹn hò" subtitle="Ý tưởng ngẫu nhiên cho buổi hẹn tiếp theo của hai bạn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { alignItems: "center", backgroundColor: "#fff7ed", borderColor: "#fed7aa", gap: 9, paddingVertical: 22 }]}>
          <Ionicons name={idea.icon as never} size={46} color="#ea580c" />
          <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.text, textAlign: "center", lineHeight: 24 }}>{idea.text}</Text>
          <Text style={s.small}>Ý tưởng {((ideaIdx % DATE_IDEAS.length) + 1)}/{DATE_IDEAS.length} — đổi ý tưởng khác nếu chưa ưng</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => setIdeaIdx((v) => v + 1)}>
          <Ionicons name="shuffle" size={16} color="#fff" /><Text style={s.btnText}>Đổi ý tưởng khác</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnGhost, addWaitMs > 0 && { opacity: 0.5 }]} disabled={addWaitMs > 0} onPress={saveIdea}>
          <Ionicons name="bookmark" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s để lưu tiếp` : "Lưu ý tưởng này vào Bucket List"}</Text>
        </TouchableOpacity>
        {savedMsg ? <Text style={{ textAlign: "center", color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>{savedMsg}</Text> : null}
      </ScrollView>
    </View>
  );
}

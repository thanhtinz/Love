import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { questionOfDay } from "../../lib/data";
import { today } from "../../lib/types";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";

export default function DailyQuestionScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const q = questionOfDay();
  // Chỉ lấy đáp án ĐÚNG ngày hôm nay (theo giờ địa phương); đáp án hôm qua không hiện sang hôm nay
  const answersToday = state.answers.date === today() ? state.answers : { A: "", B: "" };
  const myAnswer = answersToday[me.slot];
  const theirAnswer = answersToday[partner.slot];
  const bothAnswered = Boolean(myAnswer && theirAnswer);
  const [answerText, setAnswerText] = useState("");

  return (
    <View style={s.screen}>
      <ScreenHeader title="Câu hỏi mỗi ngày" subtitle="Mỗi người trả lời riêng — cả hai trả lời xong mới mở đáp án của nhau" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, lineHeight: 23 }}>{q}</Text>
        </View>

        {/* Ô trả lời của BẠN */}
        <View style={[s.card, { borderColor: C.pink, borderWidth: 2 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me.slot} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Câu trả lời của bạn</Text>
          </View>
          {!myAnswer ? (
            <View style={{ gap: 9, marginTop: 10 }}>
              <TextInput style={[s.input, { minHeight: 70, textAlignVertical: "top" }]} placeholder="Viết câu trả lời của bạn (chỉ hiện khi cả hai cùng trả lời xong)..." placeholderTextColor={C.textFaint} value={answerText} onChangeText={setAnswerText} multiline maxLength={300} />
              <TouchableOpacity style={[s.btn, !answerText.trim() && { opacity: 0.5 }]} disabled={!answerText.trim()} onPress={() => { dispatch({ type: "ANSWER", user: me.slot, text: answerText.trim() }); setAnswerText(""); }}>
                <Ionicons name="lock-closed" size={15} color="#fff" /><Text style={s.btnText}>Niêm phong câu trả lời</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 9, backgroundColor: "#fdf2f8", borderRadius: 12, padding: 11 }}>
              <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{myAnswer}</Text>
              <Text style={[s.small, { marginTop: 5 }]}>Đã niêm phong — đáp án của bạn không sửa được nữa trong hôm nay.</Text>
            </View>
          )}
        </View>

        {/* Ô của ĐỐI PHƯƠNG */}
        <View style={[s.card, { borderColor: "#bae6fd", borderWidth: 2, backgroundColor: "#f8fcff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Câu trả lời của {partner.name}</Text>
          </View>
          {bothAnswered ? (
            <View style={{ marginTop: 9, backgroundColor: "#f0f9ff", borderRadius: 12, padding: 11 }}>
              <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{theirAnswer}</Text>
            </View>
          ) : theirAnswer ? (
            <Text style={[s.sub, { marginTop: 8 }]}>{partner.name} đã trả lời và niêm phong đáp án. Bạn trả lời xong thì đáp án của {partner.name} mới mở ra — không xem trước được.</Text>
          ) : (
            <Text style={[s.sub, { marginTop: 8 }]}>{partner.name} chưa trả lời hôm nay. Ô trả lời của họ luôn là form trống chờ chính họ — không bị ảnh hưởng bởi việc bạn đã trả lời hay chưa.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

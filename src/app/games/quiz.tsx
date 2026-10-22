import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { quizOfDay } from "../../lib/data";
import { today } from "../../lib/types";
import { PersonChip, partnerOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";

export default function QuizScreen() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const partner = partnerOf(state);
  // Bộ câu hỏi tính LẠI mỗi lần render theo ngày hiện tại: bản cũ chụp cứng bằng useState lúc
  // mở màn hình — app để qua nửa đêm là màn hình hiện câu hỏi hôm qua, trong khi store niêm
  // phong đáp án theo bộ câu hỏi của hôm nay. quizOfDay rất nhẹ nên không cần memo.
  const questions = quizOfDay();
  const qz = state.games.quiz.date === today() ? state.games.quiz : { A: [] as number[], B: [] as number[] };
  const mine = qz[me];
  const theirs = qz[partner.slot];
  const [picks, setPicks] = useState<number[]>([]);
  const myDone = mine.length === questions.length;
  const theirDone = theirs.length === questions.length;
  const bothDone = myDone && theirDone;
  const matchCount = bothDone ? questions.reduce((acc, _, i) => acc + (mine[i] === theirs[i] ? 1 : 0), 0) : 0;
  const pickedAll = picks.filter((p) => p !== undefined).length >= questions.length;

  return (
    <View style={s.screen}>
      <ScreenHeader title="Hiểu ý nhau" subtitle="Trắc nghiệm mỗi ngày — đáp án niêm phong riêng từng người" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Khu vực của BẠN */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.text, flex: 1 }}>Câu trả lời của bạn</Text>
            {myDone && <View style={s.chip}><Ionicons name="lock-closed" size={12} color={C.pinkDark} /><Text style={s.chipText}>Đã niêm phong</Text></View>}
          </View>
          <View style={{ gap: 13, marginTop: 11 }}>
            {questions.map((q, qi) => (
              <View key={qi} style={{ gap: 6 }}>
                <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, fontSize: 13.5 }}>{qi + 1}. {q.q}</Text>
                {q.options.map((opt, oi) => {
                  const myPick = myDone ? mine[qi] : picks[qi];
                  const picked = myPick === oi;
                  return (
                    <TouchableOpacity key={oi} disabled={myDone} style={{ flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1.5, borderColor: picked ? C.pink : "#e2e8f0", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: picked ? C.pinkSoft : "#fff", opacity: myDone && !picked ? 0.6 : 1 }} onPress={() => { const n = [...picks]; n[qi] = oi; setPicks(n); }}>
                      <Text style={{ flex: 1, fontSize: 13.5, color: picked ? C.pinkDark : C.text, fontFamily: picked ? "BeVietnamPro_800ExtraBold" : "BeVietnamPro_500Medium" }}>{opt}</Text>
                      {picked && <Ionicons name="checkmark-circle" size={17} color={C.pink} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          {!myDone ? (
            <TouchableOpacity style={[s.btn, { marginTop: 13 }, !pickedAll && { opacity: 0.5 }]} disabled={!pickedAll} onPress={() => dispatch({ type: "QUIZ_ANSWER", user: me, answers: picks, actor: meName })}>
              <Ionicons name="lock-closed" size={15} color="#fff" /><Text style={s.btnText}>Niêm phong đáp án của bạn</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.small, { marginTop: 10 }]}>Đáp án đã niêm phong — không sửa được nữa, và {partner.name} không nhìn thấy đáp án của bạn cho tới khi cả hai cùng nộp.</Text>
          )}
        </View>

        {/* Khu vực của ĐỐI PHƯƠNG */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.text, flex: 1 }}>Câu trả lời của {partner.name}</Text>
          </View>
          {theirDone ? (
            bothDone ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                {questions.map((q, qi) => (
                  <View key={qi} style={{ flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#EFFAF7", borderRadius: 12, padding: 10 }}>
                    <Ionicons name={mine[qi] === theirs[qi] ? "checkmark-circle" : "close-circle"} size={18} color={mine[qi] === theirs[qi] ? C.green : C.textFaint} />
                    <Text style={{ flex: 1, fontSize: 13, color: C.text }}>{q.options[theirs[qi]]}</Text>
                    <Text style={s.small}>{mine[qi] === theirs[qi] ? "Trùng ý với bạn" : "Khác lựa chọn của bạn"}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.sub, { marginTop: 8 }]}>{partner.name} đã nộp đáp án (đang niêm phong). Bạn nộp đáp án của mình thì kết quả của cả hai mới mở ra.</Text>
            )
          ) : (
            <Text style={[s.sub, { marginTop: 8 }]}>{partner.name} chưa trả lời hôm nay. Đáp án của họ luôn được giữ kín cho tới khi cả hai cùng nộp xong.</Text>
          )}
        </View>

        {bothDone && (
          <View style={[s.card, { alignItems: "center", backgroundColor: C.pinkSoft, borderColor: C.pink }]}>
            <Text style={{ fontSize: 22, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Hợp ý {Math.round((matchCount / questions.length) * 100)}%</Text>
            <Text style={s.sub}>Trùng {matchCount}/{questions.length} câu — {matchCount === questions.length ? "tâm đầu ý hợp tuyệt đối!" : matchCount >= 2 ? "khá hiểu nhau rồi đó!" : "càng khác nhau càng bù trừ cho nhau nhé!"}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

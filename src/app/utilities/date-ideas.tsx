import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { DATE_IDEAS, moodLabel } from "../../lib/data";
import { CONTENT_ADD_MIN_INTERVAL_MS, localDayNumber, today, uid } from "../../lib/types";
import { selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, Segmented, s, useNow } from "../../components/ui";

type Budget = "save" | "mid" | "comfy";
const BUDGET_TIP: Record<Budget, string> = {
  save: "Ngân sách tiết kiệm: ưu tiên không gian mở/ở nhà, chi phí gần như 0đ.",
  mid: "Ngân sách vừa phải: thêm một món ăn nhẹ hoặc ly nước yêu thích (~100–200k).",
  comfy: "Ngân sách thoải mái: kết hợp ăn tối ngoài + hoạt động chính (~300–500k).",
};
const BUDGET_LABEL: Record<Budget, string> = { save: "Tiết kiệm", mid: "Vừa phải", comfy: "Thoải mái" };

export default function DateIdeasScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const now = useNow(500);
  // Số ngày theo GIỜ ĐỊA PHƯƠNG: bản cũ Date.now()/86400000 là số ngày UTC — ý tưởng
  // "của hôm nay" đổi sớm từ 07:00 sáng giờ VN thay vì từ nửa đêm.
  const [ideaIdx, setIdeaIdx] = useState(() => localDayNumber() % DATE_IDEAS.length);
  const [savedMsg, setSavedMsg] = useState("");
  /** Các nội dung đã lưu trong phiên mở màn hình này — chống lưu trùng cùng một ý
   *  tưởng/kế hoạch nhiều lần vào Bucket List (cổng 5 giây chỉ chặn lưu NHANH). */
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const idea = DATE_IDEAS[ideaIdx % DATE_IDEAS.length];
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  function saveIdea() {
    if (addWaitMs > 0 || savedKeys.includes(idea.text)) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: idea.text, done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setSavedKeys((v) => [...v, idea.text]);
    setSavedMsg("Đã lưu ý tưởng này vào Bucket List.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  /* ----- KẾ HOẠCH HẸN TỐI NAY: ghép từ mood hôm nay của CẢ HAI + ngân sách + kho ý tưởng ----- */
  const [budget, setBudget] = useState<Budget>("mid");
  const [planIdx, setPlanIdx] = useState(() => Math.floor(Math.random() * DATE_IDEAS.length));
  const [savedPlanMsg, setSavedPlanMsg] = useState("");
  const moodsToday = state.moods.date === today() ? state.moods : { A: "", B: "" };
  const planIdea = DATE_IDEAS[planIdx % DATE_IDEAS.length];
  // LƯU Ý trung thực: kho ý tưởng chưa có thẻ mood/ngân sách nên hoạt động được chọn
  // NGẪU NHIÊN — mood chỉ hiện làm ngữ cảnh, câu chữ KHÔNG khẳng định "hợp với mood"
  // (bản cũ khẳng định như vậy trong khi mã chọn hoàn toàn ngẫu nhiên).
  const moodLine = moodsToday.A && moodsToday.B
    ? `Mood hôm nay: ${state.personA} đang "${moodLabel(moodsToday.A)}", ${state.personB} đang "${moodLabel(moodsToday.B)}". Gợi ý dưới đây là ngẫu nhiên — bấm đổi tới khi gặp ý tưởng hợp mood của hai đứa nhé.`
    : moodsToday.A || moodsToday.B
      ? `Mới có một người chọn mood hôm nay (${moodLabel(moodsToday.A || moodsToday.B)}). Gợi ý dưới đây là ngẫu nhiên — bấm đổi nếu chưa hợp mood.`
      : "Hai đứa chưa chọn mood hôm nay — gợi ý ngẫu nhiên nhẹ nhàng cho cả hai.";
  const planText = `Hẹn tối nay: ${planIdea.text} · ${BUDGET_LABEL[budget]}`;

  function reshufflePlan() {
    setPlanIdx((v) => {
      let n = Math.floor(Math.random() * DATE_IDEAS.length);
      if (DATE_IDEAS.length > 1 && n === v % DATE_IDEAS.length) n = (n + 1) % DATE_IDEAS.length;
      return n;
    });
  }
  function savePlan() {
    if (addWaitMs > 0 || savedKeys.includes(planText)) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: planText, done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setSavedKeys((v) => [...v, planText]);
    setSavedPlanMsg("Đã lưu kế hoạch tối nay vào Bucket List.");
    setTimeout(() => setSavedPlanMsg(""), 2500);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Gợi ý hẹn hò" subtitle="Kế hoạch tối nay theo mood của hai đứa + ý tưởng ngẫu nhiên" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* KẾ HOẠCH TỐI NAY */}
        <View style={[s.card, { gap: 9 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="moon" size={19} color={C.violet} />
            <Text style={s.cardTitle}>Kế hoạch hẹn tối nay</Text>
          </View>
          <Text style={s.sub}>{moodLine}</Text>
          <Segmented
            options={[{ id: "save" as const, label: "Tiết kiệm" }, { id: "mid" as const, label: "Vừa phải" }, { id: "comfy" as const, label: "Thoải mái" }]}
            value={budget}
            onChange={setBudget}
          />
          <View style={{ alignItems: "center", gap: 6, backgroundColor: "#F5F3FF", borderRadius: 14, padding: 14 }}>
            <Ionicons name={planIdea.icon as never} size={34} color={C.violet} />
            <Text style={{ fontSize: 16, fontFamily: "BeVietnamPro_900Black", color: C.text, textAlign: "center", lineHeight: 23 }}>{planIdea.text}</Text>
            <Text style={[s.small, { textAlign: "center" }]}>{BUDGET_TIP[budget]}</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={reshufflePlan}>
            <Ionicons name="shuffle" size={16} color="#fff" /><Text style={s.btnText}>Tạo kế hoạch khác</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnGhost, (addWaitMs > 0 || savedKeys.includes(planText)) && { opacity: 0.5 }]} disabled={addWaitMs > 0 || savedKeys.includes(planText)} onPress={savePlan}>
            <Ionicons name="bookmark" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>{savedKeys.includes(planText) ? "Đã lưu kế hoạch này" : addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s để lưu tiếp` : "Lưu kế hoạch vào Bucket List"}</Text>
          </TouchableOpacity>
          {savedPlanMsg ? <Text style={{ textAlign: "center", color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>{savedPlanMsg}</Text> : null}
        </View>

        {/* Ý TƯỞNG NGẪU NHIÊN (giữ nguyên như trước) */}
        <View style={[s.card, { alignItems: "center", backgroundColor: "#fff7ed", borderColor: "#fed7aa", gap: 9, paddingVertical: 22 }]}>
          <Ionicons name={idea.icon as never} size={46} color="#ea580c" />
          <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.text, textAlign: "center", lineHeight: 24 }}>{idea.text}</Text>
          <Text style={s.small}>Ý tưởng {((ideaIdx % DATE_IDEAS.length) + 1)}/{DATE_IDEAS.length} — đổi ý tưởng khác nếu chưa ưng</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => setIdeaIdx((v) => v + 1)}>
          <Ionicons name="shuffle" size={16} color="#fff" /><Text style={s.btnText}>Đổi ý tưởng khác</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnGhost, (addWaitMs > 0 || savedKeys.includes(idea.text)) && { opacity: 0.5 }]} disabled={addWaitMs > 0 || savedKeys.includes(idea.text)} onPress={saveIdea}>
          <Ionicons name="bookmark" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>{savedKeys.includes(idea.text) ? "Đã lưu ý tưởng này" : addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s để lưu tiếp` : "Lưu ý tưởng này vào Bucket List"}</Text>
        </TouchableOpacity>
        {savedMsg ? <Text style={{ textAlign: "center", color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>{savedMsg}</Text> : null}
      </ScrollView>
    </View>
  );
}

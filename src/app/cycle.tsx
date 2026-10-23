import React, { useState } from "react";
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { countdownLabel, cycleInfo } from "../lib/features";
import { parseDateKey, today } from "../lib/types";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { MascotArt } from "../components/Art";
import { COLOR, FONT, RADIUS, ROLE, SPACE } from "../components/theme";
import { ClosingBand, ScreenHeader, SkeletonCard, s } from "../components/ui";

/**
 * Màn Chu kỳ & quan tâm (hub Hai đứa) — nhận nuôi từ Meet You for Partners.
 * Nguyên tắc cứng của kế hoạch Hạng 3:
 * - OPT-IN, mặc định TẮT. Khi một người tắt chia sẻ, phía người ấy KHÔNG thấy
 *   bất cứ phần nào của người đó trên màn này (không hiện cả trạng thái "đã tắt").
 * - Chỉ lưu ngày bắt đầu kỳ gần nhất + độ dài chu kỳ/kỳ; giai đoạn tính ở client.
 * - KHÔNG log triệu chứng/y tế, KHÔNG chế độ thai kỳ. Có câu miễn trừ rõ ràng.
 */

const fmtDate = (key: string) => {
  const d = parseDateKey(key);
  return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : key;
};

function Stepper({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  const btn = (delta: number) => (
    <TouchableOpacity
      onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      disabled={(delta < 0 && value <= min) || (delta > 0 && value >= max)}
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLOR.bg, borderWidth: 1, borderColor: COLOR.lineStrong, alignItems: "center", justifyContent: "center", opacity: (delta < 0 && value <= min) || (delta > 0 && value >= max) ? 0.4 : 1 }}
      accessibilityLabel={`${delta < 0 ? "Giảm" : "Tăng"} ${label}`}
    >
      <Ionicons name={delta < 0 ? "remove" : "add"} size={18} color={COLOR.text} />
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
      <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 14.5, color: COLOR.text }}>{label}</Text>
      {btn(-1)}
      <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text, minWidth: 62, textAlign: "center" }}>{value} {unit}</Text>
      {btn(1)}
    </View>
  );
}

export default function CycleScreen() {
  const { state, dispatch, hydrated } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const myC = state.cycle[me.slot];
  const partnerC = state.cycle[partner.slot];
  const [dateText, setDateText] = useState(myC.lastStart);
  const [dateErr, setDateErr] = useState("");
  const myInfo = cycleInfo(myC);
  const partnerInfo = partnerC.share ? cycleInfo(partnerC) : null;
  const startLockedToday = myC.startEditDate === today() && Boolean(myC.lastStart);

  function saveStartDate() {
    const v = dateText.trim();
    if (!parseDateKey(v)) { setDateErr("Ngày chưa đúng định dạng yyyy-mm-dd hoặc không tồn tại — kiểm tra lại nhé."); return; }
    if (v > today()) { setDateErr("Ngày bắt đầu không thể ở tương lai."); return; }
    setDateErr("");
    dispatch({ type: "CYCLE_SET", user: me.slot, patch: { lastStart: v } });
  }

  if (!hydrated) {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Chu kỳ & quan tâm" subtitle="Hiểu giai đoạn của nhau để quan tâm đúng lúc" fallback="/(tabs)/couple" />
        <View style={{ paddingHorizontal: SPACE.screenX, gap: 12 }}>
          <SkeletonCard height={200} />
          <SkeletonCard height={140} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Chu kỳ & quan tâm" subtitle="Hiểu giai đoạn của nhau để quan tâm đúng lúc" fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* PHẦN CỦA NGƯỜI ẤY — chỉ tồn tại trên màn khi họ ĐÃ bật chia sẻ */}
        {partnerC.share && (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar id={partner.avatar} size={52} ring={partner.main} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, lineHeight: 22, color: COLOR.text }} numberOfLines={2}>Chu kỳ của {partner.name}</Text>
                <Text style={s.sub}>Bạn ấy đã chọn chia sẻ với bạn</Text>
              </View>
            </View>
            {partnerInfo ? (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 21, lineHeight: 27, color: ROLE.selfDark }}>{partnerInfo.phaseLabel}</Text>
                {partnerInfo.sensitive && (
                  <View style={{ alignSelf: "flex-start", backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, paddingVertical: 6, paddingHorizontal: 11 }}>
                    <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: ROLE.selfDark }}>Đang trong những ngày nhạy cảm</Text>
                  </View>
                )}
                <Text style={s.body}>
                  Kỳ tiếp theo dự kiến {fmtDate(partnerInfo.nextStart)} — {countdownLabel(partnerInfo.daysUntilNext)}.
                </Text>
                <View style={{ backgroundColor: COLOR.bg, borderRadius: RADIUS.tile, padding: 13, gap: 6 }}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>Gợi ý quan tâm giai đoạn này</Text>
                  {partnerInfo.tips.map((t) => (
                    <Text key={t} style={{ fontSize: 13.5, lineHeight: 20, color: COLOR.textSoft }}>· {t}</Text>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={[s.body, { marginTop: 12, color: COLOR.textSoft }]}>Bạn ấy đã bật chia sẻ nhưng chưa đặt ngày bắt đầu kỳ gần nhất.</Text>
            )}
          </View>
        )}

        {/* PHẦN CỦA BẠN */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Chia sẻ của bạn</Text>
          {/* Công tắc canh theo DÒNG ĐẦU của khối nhãn 3 dòng (không trôi giữa) */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text }}>Chia sẻ chu kỳ với {partner.name}</Text>
              <Text style={s.sub}>Khi tắt, người ấy không thấy bất kỳ thông tin chu kỳ nào của bạn</Text>
            </View>
            <View style={{ paddingTop: 2 }}>
              <Switch
                value={myC.share}
                onValueChange={(v) => dispatch({ type: "CYCLE_SET", user: me.slot, patch: { share: v } })}
                trackColor={{ true: ROLE.self, false: COLOR.track }}
                thumbColor="#fff"
                accessibilityLabel="Chia sẻ chu kỳ với người ấy"
              />
            </View>
          </View>

          {myC.share && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, color: COLOR.text, marginTop: 10 }}>Ngày bắt đầu kỳ gần nhất</Text>
              <View style={{ flexDirection: "row", gap: 9, marginTop: 8 }}>
                <TextInput
                  style={[s.input, { flex: 1 }, startLockedToday && { opacity: 0.55 }]}
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="yyyy-mm-dd (vd 2026-10-01)"
                  placeholderTextColor={COLOR.textFaint}
                  editable={!startLockedToday}
                  accessibilityLabel="Ngày bắt đầu kỳ gần nhất"
                />
                <TouchableOpacity style={[s.btnGhost, startLockedToday && { opacity: 0.5 }]} disabled={startLockedToday} onPress={saveStartDate}>
                  <Text style={s.btnGhostText}>Lưu ngày</Text>
                </TouchableOpacity>
              </View>
              {startLockedToday
                ? <Text style={[s.sub, { marginTop: 6 }]}>Bạn đã sửa ngày bắt đầu hôm nay rồi — mỗi ngày chỉ sửa được 1 lần để dự đoán không bị nhiễu.</Text>
                : <Text style={[s.sub, { marginTop: 6 }]}>Ngày bắt đầu chỉ sửa được 1 lần mỗi ngày.</Text>}
              {dateErr ? <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.danger, marginTop: 6 }}>{dateErr}</Text> : null}

              <Stepper label="Độ dài chu kỳ" value={myC.cycleLen} min={21} max={35} unit="ngày" onChange={(v) => dispatch({ type: "CYCLE_SET", user: me.slot, patch: { cycleLen: v } })} />
              <Stepper label="Số ngày có kinh" value={myC.periodLen} min={3} max={8} unit="ngày" onChange={(v) => dispatch({ type: "CYCLE_SET", user: me.slot, patch: { periodLen: v } })} />

              {myInfo ? (
                <View style={{ backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.tile, padding: 13, marginTop: 14 }}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: ROLE.selfDark }}>Giai đoạn của bạn hiện tại: {myInfo.phaseLabel}</Text>
                  <Text style={{ fontSize: 13.5, lineHeight: 20, color: COLOR.textSoft, marginTop: 3 }}>Kỳ tiếp theo dự kiến {fmtDate(myInfo.nextStart)} — {countdownLabel(myInfo.daysUntilNext)}. Đây cũng là những gì {partner.name} nhìn thấy.</Text>
                </View>
              ) : (
                <Text style={[s.sub, { marginTop: 12 }]}>Đặt ngày bắt đầu kỳ gần nhất để app tính giai đoạn cho cả hai cùng thấy.</Text>
              )}
            </View>
          )}
        </View>

        <Text style={[s.small, { lineHeight: 18, paddingHorizontal: 4 }]}>
          Miễn trừ: giai đoạn và ngày dự kiến ở đây chỉ là phép tính lịch đơn giản để hai đứa quan tâm và nhắc nhau những ngày quan trọng — không phải tư vấn y tế, không thay thế bác sĩ. Chu kỳ thật có thể lệch vài ngày; nếu có dấu hiệu bất thường về sức khoẻ, hãy đi khám nhé. App không lưu nhật ký triệu chứng hay bất kỳ dữ kiện y tế chi tiết nào khác.
        </Text>
        <ClosingBand art={<MascotArt size={72} />} line="Biết giai đoạn của nhau, để những ngày nhạy cảm cũng trở thành ngày được quan tâm nhiều hơn." />
      </ScrollView>
    </View>
  );
}

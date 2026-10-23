import React, { useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useLove, makeLetter, myName, ownedMessageIds } from "../../lib/store";
import { MAX_DAILY_SPINS, SPIN_MISSIONS, SPIN_SEGMENTS } from "../../lib/data";
import { today, uid } from "../../lib/types";
import { PersonChip, partnerOf } from "../../components/PersonChip";
import { COLOR, ROLE } from "../../components/theme";
import { C, ClosingBand, ScreenHeader, s } from "../../components/ui";
import { HeartGameImage, MascotArt } from "../../components/Art";

function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

export default function SpinWheelScreen() {
  const { state, dispatch } = useLove();
  // Kích thước bánh xe theo bề ngang THẬT của máy: bản cũ cố định vành 256 + Svg 240
  // khiến máy hẹp (<320px, Fold/màn nhỏ) tràn thẻ. Svg co theo viewBox nên chỉ cần
  // đổi width/height; tâm quay = svgSize/2.
  const { width: winW } = useWindowDimensions();
  const svgSize = Math.max(180, Math.min(240, winW - 116));
  const ringSize = svgSize + 16;
  const meName = myName(state);
  const me = state.currentUser;
  const partner = partnerOf(state);
  const spinToday = state.games.spin.date === today() ? state.games.spin : { A: 0, B: 0 };
  const usedToday = spinToday[me];
  const partnerUsed = spinToday[partner.slot];
  const left = MAX_DAILY_SPINS - usedToday;
  const [rot] = useState(() => new Animated.Value(0));
  const rotVal = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState("");

  function spin() {
    if (spinning || left <= 0) return;
    setResult("");
    const idx = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const seg = SPIN_SEGMENTS[idx];
    const segCenter = idx * 45 + 22.5;
    const target = rotVal.current + 5 * 360 + (360 - segCenter - (rotVal.current % 360) + 360) % 360;
    setSpinning(true);
    Animated.timing(rot, { toValue: target, duration: 3600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      rotVal.current = target; setSpinning(false);
      // Animation bị dừng giữa chừng (rời màn hình/tắt app): KHÔNG tính lượt, KHÔNG
      // thưởng — lượt quay đó coi như chưa xảy ra, không còn cảnh "mất lượt mà không
      // có thưởng" hay "có thưởng mà chưa trừ lượt".
      if (!finished) return;
      // Trừ lượt + trao thưởng trong MỘT dispatch SPIN_RESOLVE ở tầng store: không còn
      // hai dispatch rời nhau để một bản đồng bộ chen vào giữa làm lệch lượt/thưởng.
      if (seg.kind === "coins") {
        dispatch({ type: "SPIN_RESOLVE", user: me, actor: meName, kind: "coins", amount: seg.amount });
        setResult(`Chúc mừng! Bạn nhận +${seg.amount} Xu Tim.`);
      } else if (seg.kind === "xp") {
        dispatch({ type: "SPIN_RESOLVE", user: me, actor: meName, kind: "xp", amount: seg.amount });
        setResult(`Vườn nhận +${seg.amount} XP.`);
      } else if (seg.kind === "letter-common" || seg.kind === "letter-rare") {
        const letter = makeLetter(seg.kind === "letter-rare" ? "rare" : "common", "Vòng quay yêu thương", ownedMessageIds(state));
        dispatch({ type: "SPIN_RESOLVE", user: me, actor: meName, kind: seg.kind, amount: 0, letter });
        setResult("Một lá thư vừa bay vào Hộp thư — qua tab Thư mở đọc nhé!");
      } else if (seg.kind === "mission") {
        const m = SPIN_MISSIONS[Math.floor(Math.random() * SPIN_MISSIONS.length)];
        dispatch({ type: "SPIN_RESOLVE", user: me, actor: meName, kind: "mission", amount: 0, bucketItem: { id: uid(), text: m, done: false, createdAt: new Date().toISOString(), authorSlot: me } });
        setResult(`Nhiệm vụ đặc biệt: "${m}" — đã thêm vào Bucket List.`);
      } else {
        dispatch({ type: "SPIN_RESOLVE", user: me, actor: meName, kind: "again", amount: 1 });
        setResult("Lượt quay thêm! Quay tiếp nào, không mất lượt.");
      }
    });
  }

  const wheel = (
    <Svg width={svgSize} height={svgSize} viewBox="0 0 230 230">
      <G>
        {SPIN_SEGMENTS.map((seg, i) => {
          const a0 = ((i * 45 - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
          const mid = (a0 + a1) / 2;
          const tx = 115 + 74 * Math.cos(mid); const ty = 115 + 74 * Math.sin(mid);
          return (
            <G key={i}>
              <Path d={wedgePath(115, 115, 108, a0, a1)} fill={seg.color} stroke="#fff" strokeWidth={2.5} />
              <SvgText x={tx} y={ty} fontSize={10.5} fontFamily="BeVietnamPro_800ExtraBold" fill="#fff" textAnchor="middle" transform={`rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})`}>{seg.label}</SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/games" title="Vòng quay yêu thương" subtitle="Trúng Xu Tim, XP, thư tình hoặc nhiệm vụ hẹn hò" />
      <ScrollView contentContainerStyle={[s.scroll, { flexGrow: 1 }]}>
        <View style={s.card}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <PersonChip state={state} slot={me} />
              <Text style={{ flex: 1, fontSize: 13, color: C.text }}>Lượt của bạn hôm nay</Text>
              <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>{left}/{MAX_DAILY_SPINS} còn lại</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <PersonChip state={state} slot={partner.slot} />
              <Text style={{ flex: 1, fontSize: 13, color: C.text }}>Lượt của {partner.name} (chỉ xem)</Text>
              <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.textSoft }}>{MAX_DAILY_SPINS - partnerUsed}/{MAX_DAILY_SPINS} còn lại</Text>
            </View>
          </View>
          <Text style={[s.small, { marginTop: 7 }]}>Lượt quay là của riêng từng người: bạn quay hết lượt không ảnh hưởng tới lượt của {partner.name}.</Text>
        </View>

        <View style={[s.card, { alignItems: "center" }]}>
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <View style={styles.pointer}><Ionicons name="caret-down" size={30} color={C.pinkDark} /></View>
            {/* Vòng quay sạch theo spec mockup — không vành cánh hoa trang trí; chỉ thêm
                vòng đệm mềm + bóng đổ nhẹ quanh bánh xe cho có chiều sâu. */}
            <View style={[styles.wheelRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
              <View style={{ width: svgSize, height: svgSize }}>
                <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ rotate: rot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }] }}>{wheel}</Animated.View>
                <View style={[styles.wheelCenter, { top: svgSize / 2 - 21, left: svgSize / 2 - 21, alignSelf: "auto" }]}><HeartGameImage size={27} /></View>
              </View>
            </View>
          </View>
          {/* Vùng kết quả có chiều cao tối thiểu cố định — bố cục không nhảy khi có/chưa có kết quả */}
          <View style={{ minHeight: 42, justifyContent: "center", marginTop: 10, alignSelf: "stretch" }}>
            {result ? <Text style={{ textAlign: "center", color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold", lineHeight: 19 }}>{result}</Text> : null}
          </View>
          <TouchableOpacity style={[s.btn, { marginTop: 12, alignSelf: "stretch" }, (spinning || left <= 0) && { opacity: 0.5 }]} onPress={spin} disabled={spinning || left <= 0}>
            <Ionicons name="refresh" size={16} color="#fff" /><Text style={s.btnText}>{spinning ? "Đang quay..." : left <= 0 ? "Bạn đã hết lượt hôm nay" : "Quay ngay"}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }} />
        <ClosingBand art={<MascotArt size={72} />} line="Quay vui là chính — Xu, XP và thư trúng được đều bay về khu vườn chung của hai đứa." />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pointer: { marginBottom: -16, zIndex: 2 },
  wheelRing: {
    width: 256, height: 256, borderRadius: 128, backgroundColor: "#fff",
    borderWidth: 2, borderColor: ROLE.selfSoft,
    alignItems: "center", justifyContent: "center",
    shadowColor: COLOR.primary, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  wheelCenter: { position: "absolute", top: 113, alignSelf: "center", backgroundColor: COLOR.primary, width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", overflow: "hidden" },
});

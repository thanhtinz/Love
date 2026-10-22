import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useLove, makeLetter, myName } from "../../lib/store";
import { MAX_DAILY_SPINS, SPIN_MISSIONS, SPIN_SEGMENTS, quizOfDay } from "../../lib/data";
import { today, uid, weekKey } from "../../lib/types";
import { C, SectionTitle, s } from "../../components/ui";

/* ---------------- (a) Bắt tim bay ---------------- */
interface FlyHeart { id: string; left: number; dur: number; anim: Animated.Value }
const AREA_H = 320;

function HeartGame() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [hearts, setHearts] = useState<FlyHeart[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const scoreRef = useRef(0);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const wk = weekKey();
  const best = state.games.heartBest.week === wk ? state.games.heartBest : { A: 0, B: 0 };

  function cleanup() { timers.current.forEach(clearInterval); timers.current = []; }
  useEffect(() => cleanup, []);

  function start() {
    cleanup();
    scoreRef.current = 0; setScore(0); setHearts([]); setTimeLeft(30); setPhase("playing");
    const endAt = Date.now() + 30000;
    const spawn = setInterval(() => {
      const h: FlyHeart = { id: uid(), left: 4 + Math.random() * 84, dur: 2000 + Math.random() * 1300, anim: new Animated.Value(-50) };
      setHearts((prev) => [...prev.slice(-14), h]);
      Animated.timing(h.anim, { toValue: AREA_H + 30, duration: h.dur, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setHearts((prev) => prev.filter((x) => x.id !== h.id));
      });
    }, 480);
    const clock = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        cleanup(); setHearts([]); setPhase("done");
        dispatch({ type: "HEART_SCORE", user: state.currentUser, score: scoreRef.current, actor: meName });
      }
    }, 200);
    timers.current = [spawn, clock];
  }

  function catchHeart(h: FlyHeart) {
    h.anim.stopAnimation();
    setHearts((prev) => prev.filter((x) => x.id !== h.id));
    scoreRef.current += 1; setScore(scoreRef.current);
  }

  return (
    <View style={s.card}>
      <SectionTitle icon="heart" color={C.pink}>Bắt tim bay — 30 giây</SectionTitle>
      <Text style={s.sub}>Chạm vào các trái tim đang rơi để ghi điểm. Điểm cao nhất của mỗi người trong tuần được lưu lại.</Text>
      <View style={styles.area}>
        {hearts.map((h) => (
          <Animated.View key={h.id} style={{ position: "absolute", left: `${h.left}%`, transform: [{ translateY: h.anim }] }}>
            <TouchableOpacity onPress={() => catchHeart(h)} hitSlop={8}>
              <Ionicons name="heart" size={40} color={C.pink} />
            </TouchableOpacity>
          </Animated.View>
        ))}
        {phase !== "playing" && (
          <View style={styles.areaCenter}>
            {phase === "done" ? (
              <>
                <Ionicons name="trophy" size={38} color={C.amber} />
                <Text style={{ fontWeight: "900", fontSize: 17, color: C.text }}>Hết giờ! Bạn bắt được {score} tim</Text>
                <Text style={s.small}>Kỷ lục tuần này của bạn: {Math.max(best[state.currentUser], score)} tim</Text>
              </>
            ) : (
              <>
                <Ionicons name="heart-circle" size={40} color={C.pink} />
                <Text style={{ fontWeight: "800", color: C.text }}>Sẵn sàng bắt tim chưa?</Text>
              </>
            )}
            <TouchableOpacity style={[s.btn, { marginTop: 8 }]} onPress={start}>
              <Ionicons name="play" size={16} color="#fff" /><Text style={s.btnText}>{phase === "done" ? "Chơi lại" : "Bắt đầu"}</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === "playing" && (
          <View style={styles.hud}>
            <View style={s.chip}><Ionicons name="timer" size={13} color={C.pinkDark} /><Text style={s.chipText}>{timeLeft}s</Text></View>
            <View style={s.chip}><Ionicons name="heart" size={13} color={C.pinkDark} /><Text style={s.chipText}>{score} tim</Text></View>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <View style={styles.scoreBox}><Text style={styles.scoreName}>{state.personA}</Text><Text style={styles.scoreNum}>{best.A}</Text><Text style={s.small}>tim / tuần này</Text></View>
        <View style={styles.scoreBox}><Text style={styles.scoreName}>{state.personB}</Text><Text style={styles.scoreNum}>{best.B}</Text><Text style={s.small}>tim / tuần này</Text></View>
      </View>
    </View>
  );
}

/* ---------------- (b) Vòng quay yêu thương ---------------- */
function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

function SpinGame() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const usedToday = state.games.spin.date === today() ? state.games.spin[me] : 0;
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
    Animated.timing(rot, { toValue: target, duration: 3600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      rotVal.current = target; setSpinning(false);
      if (seg.kind !== "again") dispatch({ type: "SPIN_USE", user: me });
      if (seg.kind === "coins") { dispatch({ type: "ADD_COINS", coins: seg.amount, actor: meName, text: `quay Vòng quay yêu thương trúng +${seg.amount} Xu Tim` }); setResult(`Chúc mừng! Bạn nhận +${seg.amount} Xu Tim.`); }
      else if (seg.kind === "xp") { dispatch({ type: "ADD_XP", xp: seg.amount }); setResult(`Vườn nhận +${seg.amount} XP.`); }
      else if (seg.kind === "letter-common" || seg.kind === "letter-rare") {
        const letter = makeLetter(seg.kind === "letter-rare" ? "rare" : "common", "Vòng quay yêu thương", state.letters.map((l) => l.messageId));
        dispatch({ type: "ADD_LETTER", letter, actor: meName, text: "vừa quay Vòng quay yêu thương và nhận một lá thư" });
        setResult("Một lá thư vừa bay vào Hộp thư — qua tab Hộp thư mở đọc nhé!");
      } else if (seg.kind === "mission") {
        const m = SPIN_MISSIONS[Math.floor(Math.random() * SPIN_MISSIONS.length)];
        dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: m, done: false, createdAt: new Date().toISOString() } });
        setResult(`Nhiệm vụ đặc biệt: "${m}" — đã thêm vào Bucket List ở mục Tiện ích.`);
      } else setResult("Lượt quay thêm! Quay tiếp nào, không mất lượt.");
    });
  }

  const wheel = (
    <Svg width={230} height={230} viewBox="0 0 230 230">
      <G>
        {SPIN_SEGMENTS.map((seg, i) => {
          const a0 = ((i * 45 - 90) * Math.PI) / 180;
          const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
          const mid = (a0 + a1) / 2;
          const tx = 115 + 74 * Math.cos(mid); const ty = 115 + 74 * Math.sin(mid);
          return (
            <G key={i}>
              <Path d={wedgePath(115, 115, 108, a0, a1)} fill={seg.color} stroke="#fff" strokeWidth={2.5} />
              <SvgText x={tx} y={ty} fontSize={10.5} fontWeight="800" fill="#fff" textAnchor="middle" transform={`rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})`}>{seg.label}</SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );

  return (
    <View style={s.card}>
      <SectionTitle icon="refresh-circle" color={C.violet}>Vòng quay yêu thương</SectionTitle>
      <Text style={s.sub}>Mỗi người {MAX_DAILY_SPINS} lượt quay mỗi ngày — trúng Xu Tim, XP, thư tình hoặc nhiệm vụ hẹn hò đặc biệt.</Text>
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <View style={styles.pointer}><Ionicons name="caret-down" size={30} color={C.pinkDark} /></View>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }] }}>{wheel}</Animated.View>
        <View style={styles.wheelCenter}><Ionicons name="heart" size={22} color="#fff" /></View>
      </View>
      <Text style={{ textAlign: "center", fontWeight: "800", color: C.text, marginTop: 6 }}>Lượt quay còn hôm nay: {left}/{MAX_DAILY_SPINS}</Text>
      {result ? <Text style={{ textAlign: "center", color: C.pinkDark, fontWeight: "700", marginTop: 6, lineHeight: 19 }}>{result}</Text> : null}
      <TouchableOpacity style={[s.btn, { marginTop: 10 }, (spinning || left <= 0) && { opacity: 0.5 }]} onPress={spin} disabled={spinning || left <= 0}>
        <Ionicons name="refresh" size={16} color="#fff" /><Text style={s.btnText}>{spinning ? "Đang quay..." : left <= 0 ? "Hết lượt hôm nay" : "Quay ngay"}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------------- (c) Hiểu ý nhau ---------------- */
function QuizGame() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const other = me === "A" ? "B" : "A";
  const [questions] = useState(() => quizOfDay());
  const qz = state.games.quiz.date === today() ? state.games.quiz : { A: [] as number[], B: [] as number[] };
  const mine = qz[me]; const theirs = qz[other];
  const [picks, setPicks] = useState<number[]>([]);
  const bothDone = mine.length === questions.length && theirs.length === questions.length;
  const matchCount = bothDone ? questions.reduce((acc, _, i) => acc + (mine[i] === theirs[i] ? 1 : 0), 0) : 0;

  return (
    <View style={s.card}>
      <SectionTitle icon="help-circle" color={C.sky}>Hiểu ý nhau — trắc nghiệm mỗi ngày</SectionTitle>
      <Text style={s.sub}>Mỗi ngày 4 câu hỏi mới. Cả hai trả lời xong mới mở kết quả xem hai bạn “hợp ý” bao nhiêu phần trăm.</Text>
      <View style={{ gap: 13, marginTop: 10 }}>
        {questions.map((q, qi) => (
          <View key={qi} style={{ gap: 6 }}>
            <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{qi + 1}. {q.q}</Text>
            {q.options.map((opt, oi) => {
              const myPick = mine.length === questions.length ? mine[qi] : picks[qi];
              const picked = myPick === oi;
              const theirPick = bothDone ? theirs[qi] : -1;
              return (
                <TouchableOpacity key={oi} disabled={mine.length === questions.length} style={[styles.opt, picked && styles.optOn]} onPress={() => { const n = [...picks]; n[qi] = oi; setPicks(n); }}>
                  <Text style={{ flex: 1, fontSize: 13, color: picked ? C.pinkDark : C.text, fontWeight: picked ? "800" : "500" }}>{opt}</Text>
                  {bothDone && theirPick === oi && <View style={s.chip}><Text style={s.chipText}>Người ấy cũng chọn</Text></View>}
                  {bothDone && mine[qi] === theirs[qi] && oi === mine[qi] && <Ionicons name="checkmark-circle" size={17} color={C.green} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      {mine.length !== questions.length ? (
        <TouchableOpacity style={[s.btn, { marginTop: 12 }, picks.filter((p) => p !== undefined).length < questions.length && { opacity: 0.5 }]} disabled={picks.filter((p) => p !== undefined).length < questions.length} onPress={() => dispatch({ type: "QUIZ_ANSWER", user: me, answers: picks, actor: meName })}>
          <Ionicons name="send" size={15} color="#fff" /><Text style={s.btnText}>Gửi đáp án của bạn</Text>
        </TouchableOpacity>
      ) : bothDone ? (
        <View style={{ alignItems: "center", marginTop: 12, backgroundColor: C.pinkSoft, borderRadius: 14, padding: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.pinkDark }}>Hợp ý {Math.round((matchCount / questions.length) * 100)}%</Text>
          <Text style={s.sub}>Trùng {matchCount}/{questions.length} câu — {matchCount === questions.length ? "tâm đầu ý hợp tuyệt đối!" : matchCount >= 2 ? "khá hiểu nhau rồi đó!" : "càng khác nhau càng bù trừ cho nhau nhé!"}</Text>
        </View>
      ) : (
        <Text style={{ textAlign: "center", marginTop: 12, color: C.textSoft, fontWeight: "700" }}>Bạn đã trả lời xong — đang chờ người ấy trả lời để mở kết quả...</Text>
      )}
    </View>
  );
}

export default function GamesScreen() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="game-controller">Khu vui chơi</SectionTitle>
      <Text style={s.sub}>Chơi cùng nhau mỗi ngày: bắt tim, quay thưởng và trắc nghiệm hiểu ý — điểm số đồng bộ cho cả hai qua cùng một khu vườn.</Text>
      <HeartGame />
      <SpinGame />
      <QuizGame />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  area: { height: AREA_H, backgroundColor: "#fff1f2", borderRadius: 16, marginTop: 10, overflow: "hidden", borderWidth: 1.5, borderColor: C.pinkBorder },
  areaCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7, padding: 16 },
  hud: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" },
  scoreBox: { flex: 1, alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 14, paddingVertical: 9 },
  scoreName: { fontWeight: "800", color: C.text, fontSize: 13 },
  scoreNum: { fontSize: 21, fontWeight: "900", color: C.pinkDark },
  pointer: { marginBottom: -16, zIndex: 2 },
  wheelCenter: { position: "absolute", top: 108, alignSelf: "center", backgroundColor: C.pink, width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" },
  opt: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#fff" },
  optOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
});

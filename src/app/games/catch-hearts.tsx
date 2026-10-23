import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { today, uid, weekKey } from "../../lib/types";
import { PersonChip, personLabel } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";
import { HeartGameImage } from "../../components/Art";

interface FlyHeart { id: string; left: number; dur: number; anim: Animated.Value }
const AREA_H = 340;

export default function CatchHeartsScreen() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [hearts, setHearts] = useState<FlyHeart[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const scoreRef = useRef(0);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const wk = weekKey();
  const best = state.games.heartBest.week === wk ? state.games.heartBest : { A: 0, B: 0 };
  const plays = state.games.heartPlays.date === today() ? state.games.heartPlays : { A: 0, B: 0 };

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
        // Điểm + lượt chơi ghi cho slot của NGƯỜI CHƠI (state.currentUser), không ghi nhầm cho người kia
        dispatch({ type: "HEART_SCORE", user: me, score: scoreRef.current, actor: meName });
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
    <View style={s.screen}>
      <ScreenHeader title="Bắt tim bay" subtitle="30 giây — chạm vào tim đang rơi để ghi điểm" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={styles.area}>
          {hearts.map((h) => (
            <Animated.View key={h.id} style={{ position: "absolute", left: `${h.left}%`, transform: [{ translateY: h.anim }] }}>
              <TouchableOpacity onPress={() => catchHeart(h)} hitSlop={8}>
                <HeartGameImage size={44} />
              </TouchableOpacity>
            </Animated.View>
          ))}
          {phase !== "playing" && (
            <View style={styles.areaCenter}>
              {phase === "done" ? (
                <>
                  <Ionicons name="trophy" size={38} color={C.amber} />
                  <Text style={{ fontFamily: "BeVietnamPro_900Black", fontSize: 17, color: C.text, textAlign: "center" }}>Hết giờ! {personLabel(state, me)} bắt được {score} tim</Text>
                  <Text style={s.small}>Kỷ lục tuần này của bạn: {Math.max(best[me], score)} tim</Text>
                </>
              ) : (
                <>
                  <HeartGameImage size={56} />
                  <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>Sẵn sàng bắt tim chưa?</Text>
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

        <View style={s.card}>
          <Text style={s.cardTitle}>Bảng điểm tuần này</Text>
          <View style={{ gap: 8, marginTop: 9 }}>
            {(["A", "B"] as const).map((slot) => (
              <View key={slot} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <PersonChip state={state} slot={slot} />
                <View style={{ flex: 1 }} />
                <Text style={s.small}>hôm nay đã chơi {plays[slot]} lượt</Text>
                <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>{best[slot]} tim</Text>
              </View>
            ))}
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>Điểm và lượt chơi lưu riêng cho từng người; kỷ lục tuần tự đặt lại vào thứ Hai.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { height: AREA_H, backgroundColor: "#FFF5EF", borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: C.pinkBorder },
  areaCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7, padding: 16 },
  hud: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" },
});

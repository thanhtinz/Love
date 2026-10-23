import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { today, uid, weekKey } from "../../lib/types";
import { PersonChip, personLabel } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";
import { HeartGameImage } from "../../components/Art";

interface FlyHeart { id: string; left: number; dur: number; golden: boolean; anim: Animated.Value }
const AREA_H = 340;
const RUN_MS = 30000;

export default function CatchHeartsScreen() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [hearts, setHearts] = useState<FlyHeart[]>([]);
  const [score, setScore] = useState(0);
  const [goldenCount, setGoldenCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [firstBonus, setFirstBonus] = useState(0);
  const scoreRef = useRef(0);
  const goldenRef = useRef(0);
  /** Số lượt chơi hôm nay của người chơi TRƯỚC lượt này — chụp tại start() để biết có phải lượt đầu không. */
  const playsBeforeRef = useRef(0);
  const startAtRef = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Mọi animation tim đang bay — phải stop hết khi rời màn hình, nếu không callback
   *  hoàn tất của chúng vẫn gọi setHearts trên component đã unmount. */
  const animsRef = useRef<Set<Animated.Value>>(new Set());
  /** Id các tim đã bắt trong vòng này — chốt chống tính điểm 2 lần cho cùng một tim. */
  const caughtRef = useRef<Set<string>>(new Set());
  /** State mới nhất — lúc hết giờ phải đọc số lượt chơi từ ĐÂY thay vì bản chụp lúc
   *  start(): một lượt chơi khác (máy khác cùng tài khoản/đồng bộ) chen vào giữa ván
   *  sẽ làm bản chụp cũ khiến thưởng "lượt đầu" bị phát 2 lần. */
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const wk = weekKey();
  const best = state.games.heartBest.week === wk ? state.games.heartBest : { A: 0, B: 0 };
  const plays = state.games.heartPlays.date === today() ? state.games.heartPlays : { A: 0, B: 0 };

  function cleanup() {
    if (spawnTimer.current) { clearTimeout(spawnTimer.current); spawnTimer.current = null; }
    if (clockTimer.current) { clearInterval(clockTimer.current); clockTimer.current = null; }
    animsRef.current.forEach((a) => a.stopAnimation());
    animsRef.current.clear();
  }
  useEffect(() => cleanup, []);

  function start() {
    cleanup();
    playsBeforeRef.current = state.games.heartPlays.date === today() ? state.games.heartPlays[me] : 0;
    // Ghi lượt chơi NGAY khi bắt đầu: bỏ ngang giữa vòng vẫn tính 1 lượt (bản cũ chỉ ghi
    // khi kết thúc nên người chơi có thể thoát ra chơi lại tới khi được điểm ưng ý).
    dispatch({ type: "HEART_PLAY", user: me });
    caughtRef.current = new Set();
    scoreRef.current = 0; goldenRef.current = 0;
    setScore(0); setGoldenCount(0); setFirstBonus(0); setHearts([]); setTimeLeft(30); setPhase("playing");
    startAtRef.current = Date.now();
    const endAt = startAtRef.current + RUN_MS;

    // Độ khó tăng dần: nhịp sinh tim rút ngắn + tim rơi nhanh hơn theo thời gian đã chơi.
    const spawnNext = () => {
      const elapsed = Date.now() - startAtRef.current;
      if (elapsed >= RUN_MS) return;
      const progress = Math.min(1, elapsed / RUN_MS);
      const golden = Math.random() < 0.10;
      const h: FlyHeart = {
        id: uid(),
        left: 4 + Math.random() * 84,
        dur: (2300 - 900 * progress) + Math.random() * (1000 - 500 * progress),
        golden,
        anim: new Animated.Value(-56),
      };
      setHearts((prev) => [...prev.slice(-14), h]);
      animsRef.current.add(h.anim);
      Animated.timing(h.anim, { toValue: AREA_H + 30, duration: h.dur, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        animsRef.current.delete(h.anim);
        if (finished) setHearts((prev) => prev.filter((x) => x.id !== h.id));
      });
      const delay = Math.max(230, 500 - elapsed * 0.009);
      spawnTimer.current = setTimeout(spawnNext, delay);
    };
    spawnNext();

    clockTimer.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        cleanup(); setHearts([]); setPhase("done");
        const finalScore = scoreRef.current;
        // Điểm + lượt chơi ghi cho slot của NGƯỜI CHƠI (state.currentUser), không ghi nhầm cho người kia
        dispatch({ type: "HEART_SCORE", user: me, score: finalScore, actor: meName });
        // Thưởng lượt ĐẦU trong ngày: playsBefore chụp tại start() (chưa tính ván này);
        // lúc kết thúc, tổng lượt đã ghi chỉ được phép là đúng 1 (ván này) — nếu một
        // lượt khác chen vào từ máy khác của cùng tài khoản thì không thưởng nữa.
        const latestPlays = stateRef.current.games.heartPlays.date === today() ? stateRef.current.games.heartPlays[me] : 0;
        const isFirstPlayToday = playsBeforeRef.current === 0 && latestPlays <= 1;
        if (isFirstPlayToday && finalScore > 0) {
          const bonus = Math.min(finalScore, 30);
          dispatch({ type: "ADD_COINS", coins: bonus, actor: meName, text: `thưởng lượt đầu Bắt tim bay hôm nay (+${bonus} Xu Tim)` });
          setFirstBonus(bonus);
        }
      }
    }, 200);
  }

  function catchHeart(h: FlyHeart) {
    // Chốt theo id: chạm 2 lần thật nhanh vào cùng một tim (trước khi re-render gỡ nó
    // khỏi danh sách) không được tính điểm 2 lần — tim vàng x3 là đau nhất.
    if (caughtRef.current.has(h.id)) return;
    caughtRef.current.add(h.id);
    h.anim.stopAnimation();
    setHearts((prev) => prev.filter((x) => x.id !== h.id));
    if (h.golden) { goldenRef.current += 1; setGoldenCount(goldenRef.current); scoreRef.current += 3; }
    else scoreRef.current += 1;
    setScore(scoreRef.current);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Bắt tim bay" subtitle="30 giây — tim thường 1 điểm, tim vàng 3 điểm, càng về cuối rơi càng nhanh" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={styles.area}>
          {hearts.map((h) => (
            <Animated.View key={h.id} style={{ position: "absolute", left: `${h.left}%`, transform: [{ translateY: h.anim }] }}>
              <TouchableOpacity onPress={() => catchHeart(h)} hitSlop={8}>
                {h.golden ? (
                  <View style={styles.goldenWrap}>
                    <HeartGameImage size={50} />
                  </View>
                ) : (
                  <HeartGameImage size={44} />
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
          {phase !== "playing" && (
            <View style={styles.areaCenter}>
              {phase === "done" ? (
                <>
                  <Ionicons name="trophy" size={38} color={C.amber} />
                  <Text style={{ fontFamily: "BeVietnamPro_900Black", fontSize: 17, color: C.text, textAlign: "center" }}>Hết giờ! {personLabel(state, me)} ghi {score} điểm</Text>
                  <Text style={s.small}>Kỷ lục tuần này của bạn: {Math.max(best[me], score)} điểm</Text>
                  {firstBonus > 0 && <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.pinkDark }}>+{firstBonus} Xu thưởng lượt đầu hôm nay</Text>}
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
              <View style={{ flexDirection: "row", gap: 6 }}>
                <View style={s.chip}><Ionicons name="star" size={13} color="#B45309" /><Text style={s.chipText}>{goldenCount} tim vàng ×3</Text></View>
                <View style={s.chip}><Ionicons name="heart" size={13} color={C.pinkDark} /><Text style={s.chipText}>{score} điểm</Text></View>
              </View>
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
                <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>{best[slot]} điểm</Text>
              </View>
            ))}
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>Điểm và lượt chơi lưu riêng cho từng người; kỷ lục tuần tự đặt lại vào thứ Hai. Lượt chơi đầu tiên mỗi ngày được thưởng Xu bằng số điểm (tối đa 30).</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { height: AREA_H, backgroundColor: "#FFF5EF", borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: C.pinkBorder },
  areaCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7, padding: 16 },
  hud: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between" },
  goldenWrap: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#FEF3C7", borderWidth: 2, borderColor: "#F59E0B", alignItems: "center", justifyContent: "center" },
});

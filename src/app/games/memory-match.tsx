import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { today } from "../../lib/types";
import { PersonChip } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";
import FaceIcon from "../../components/FaceIcon";
import { HeartGameImage } from "../../components/Art";

/** 6 cặp mặt — dùng đúng tranh mood vẽ thật của app (qua FaceIcon/MOOD_ART). */
const FACES = ["joy", "love", "heartEyes", "celebrate", "calm", "excited"];

function shuffledDeck(): string[] {
  const deck = [...FACES, ...FACES];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatchScreen() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = state.currentUser;
  const [deck, setDeck] = useState<string[]>(() => shuffledDeck());
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Bản sao ĐỒNG BỘ của `open`: setOpen là bất đồng bộ — sau khi ghép đúng một cặp,
   *  `busy` vẫn false và một chạm thứ ba tới TRƯỚC lần render kế tiếp sẽ đọc `open`
   *  cũ (đang có 2 lá) rồi cộng thành 3 lá mở, kẹt trạng thái. Ref được cập nhật ngay
   *  trong flip() nên chạm nhanh đến đâu cũng bị chặn đúng. */
  const openRef = useRef<number[]>([]);

  const won = matched.length === deck.length && deck.length > 0;
  /** Ngày THẮNG ván đang hiển thị: thắng lúc 23:5x rồi để màn hình qua nửa đêm thì
   *  dailyWins đã reset — nút nhận thưởng của ván HÔM QUA không được ăn thưởng HÔM NAY. */
  const [wonDate, setWonDate] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ghi ngày thắng ngay khi ván thắng
    if (won && !wonDate) setWonDate(today());
  }, [won, wonDate]);
  const claimedToday = (state.games.dailyWins.date === today() ? state.games.dailyWins.memory[me] : 0) >= 1;

  useEffect(() => {
    if (!started || won) return;
    const iv = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(iv);
  }, [started, won]);
  useEffect(() => () => { if (flipTimer.current) clearTimeout(flipTimer.current); }, []);

  function restart() {
    if (flipTimer.current) clearTimeout(flipTimer.current);
    openRef.current = [];
    setDeck(shuffledDeck());
    setOpen([]); setMatched([]); setMoves(0); setElapsed(0); setStarted(false); setBusy(false); setWonDate("");
  }

  function flip(i: number) {
    if (busy || won || openRef.current.length >= 2 || openRef.current.includes(i) || matched.includes(i)) return;
    if (!started) setStarted(true);
    const next = [...openRef.current, i];
    openRef.current = next;
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a] === deck[b]) {
      setMatched((prev) => [...prev, a, b]);
      openRef.current = [];
      setOpen([]);
    } else {
      setBusy(true);
      flipTimer.current = setTimeout(() => { openRef.current = []; setOpen([]); setBusy(false); }, 750);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/games" title="Ghép cặp ký ức" subtitle="Lật 12 lá tìm 6 cặp mặt giống nhau — thắng là nhận thưởng ngày" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <PersonChip state={state} slot={me} />
            <View style={{ flex: 1 }} />
            <View style={s.chip}><Ionicons name="swap-horizontal" size={13} color={C.pinkDark} /><Text style={s.chipText}>{moves} lượt lật</Text></View>
            <View style={s.chip}><Ionicons name="timer" size={13} color={C.pinkDark} /><Text style={s.chipText}>{elapsed}s</Text></View>
          </View>
          <Text style={[s.small, { marginTop: 7 }]}>
            Thưởng hôm nay của bạn: {claimedToday ? "đã nhận rồi (+20 Xu, +10 XP)" : "chưa nhận — thắng một ván để nhận +20 Xu, +10 XP"}.
          </Text>
        </View>

        <View style={[s.card, { padding: 12 }]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {deck.map((mood, i) => {
              const isOpen = open.includes(i) || matched.includes(i);
              const isMatched = matched.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => flip(i)}
                  activeOpacity={0.85}
                  style={{
                    width: "31.8%", aspectRatio: 0.88, borderRadius: 14,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isMatched ? "#EFFAF7" : isOpen ? "#fff" : C.pinkSoft,
                    borderWidth: 1.5, borderColor: isMatched ? C.green : isOpen ? C.pinkBorder : C.pink,
                  }}
                >
                  {isOpen ? <FaceIcon mood={mood} size={52} /> : <HeartGameImage size={38} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {won && (
          <View style={[s.card, { alignItems: "center", backgroundColor: C.pinkSoft, borderColor: C.pink, gap: 6 }]}>
            <Ionicons name="trophy" size={34} color={C.amber} />
            <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Thắng rồi! {moves} lượt lật · {elapsed} giây</Text>
            {claimedToday ? (
              <Text style={s.sub}>Bạn đã nhận thưởng Ghép cặp ký ức hôm nay rồi — mai quay lại nhé.</Text>
            ) : wonDate !== today() ? (
              <Text style={s.sub}>Ván thắng này là của hôm qua — chơi một ván mới hôm nay để nhận thưởng nhé.</Text>
            ) : (
              <TouchableOpacity style={s.btn} onPress={() => dispatch({ type: "GAME_WIN", game: "memory", user: me, actor: meName })}>
                <Ionicons name="gift" size={16} color="#fff" /><Text style={s.btnText}>Nhận thưởng +20 Xu, +10 XP</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={s.btnGhost} onPress={restart}>
          <Ionicons name="refresh" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>Chơi lại — xáo bài mới</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

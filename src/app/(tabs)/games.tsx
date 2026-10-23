import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLove } from "../../lib/store";
import { MAX_DAILY_SPINS, quizOfDay } from "../../lib/data";
import { today, weekKey } from "../../lib/types";
import { PersonChip } from "../../components/PersonChip";
import { C, FeatureCard, SectionTitle, s } from "../../components/ui";

/**
 * Hub Trò chơi: CHỈ điều hướng tới 5 màn game riêng + tóm tắt điểm theo từng người.
 * Không nhúng game nào tại đây (mỗi game một màn hình riêng).
 */
export default function GamesHubScreen() {
  const { state } = useLove();
  const me = state.currentUser;
  const wk = weekKey();
  const best = state.games.heartBest.week === wk ? state.games.heartBest : { A: 0, B: 0 };
  const spinsLeft = MAX_DAILY_SPINS - (state.games.spin.date === today() ? state.games.spin[me] : 0);
  const qz = state.games.quiz.date === today() ? state.games.quiz : { A: [] as number[], B: [] as number[] };
  const quizDone = qz[me].length >= quizOfDay().length;
  const dw = state.games.dailyWins.date === today() ? state.games.dailyWins : { memory: { A: 0, B: 0 }, dice: { A: 0, B: 0 } };
  const memoryClaimed = dw.memory[me] >= 1;
  const diceClaimed = dw.dice[me] >= 1;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="game-controller">Khu vui chơi</SectionTitle>
      <Text style={s.sub}>Điểm và lượt chơi tính riêng cho từng người.</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Kỷ lục Bắt tim bay tuần này</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
          {(["A", "B"] as const).map((slot) => (
            <View key={slot} style={{ flex: 1, gap: 5, backgroundColor: "#fff7ed", borderRadius: 14, padding: 10 }}>
              <PersonChip state={state} slot={slot} />
              <Text style={{ fontSize: 20, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>{best[slot]} tim</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 9 }}>
        <FeatureCard icon="heart" title="Bắt tim bay" desc="30 giây bắt tim rơi — phá kỷ lục tuần của bạn" color={C.pink} bg={C.pinkSoft} route="/games/catch-hearts" />
        <FeatureCard icon="refresh-circle" title="Vòng quay yêu thương" desc={`Bạn còn ${spinsLeft}/${MAX_DAILY_SPINS} lượt quay hôm nay — trúng Xu, XP, thư tình`} color={C.violet} bg="#ede9fe" route="/games/spin-wheel" badge={spinsLeft > 0 ? `${spinsLeft} lượt` : "Hết lượt"} />
        <FeatureCard icon="help-circle" title="Hiểu ý nhau" desc={quizDone ? "Đã trả lời — chờ người ấy để mở kết quả" : "4 câu mỗi ngày, đáp án niêm phong riêng"} color={C.sky} bg="#D9F4F0" route="/games/quiz" badge={quizDone ? "Đã nộp" : undefined} />
        <FeatureCard icon="grid" title="Ghép cặp ký ức" desc="Lật 12 lá tìm 6 cặp mặt mood — thắng nhận thưởng ngày" color={C.green} bg="#dcfce7" route="/games/memory-match" badge={memoryClaimed ? "Đã nhận thưởng" : "Thưởng hôm nay"} />
        <FeatureCard icon="dice" title="Xúc xắc hẹn hò" desc="Gieo xúc xắc ra nhiệm vụ hẹn hò ngẫu nhiên cho hai đứa" color="#ea580c" bg="#ffedd5" route="/games/love-dice" badge={diceClaimed ? "Đã nhận thưởng" : "Thưởng hôm nay"} />
      </View>
    </ScrollView>
  );
}

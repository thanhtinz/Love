import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MAX_DAILY_SPINS, quizOfDay } from "../../lib/data";
import { today, type PersonId } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { partnerOf, selfOf, type PersonInfo } from "../../components/PersonChip";
import { HeartGameImage } from "../../components/Art";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { Medallion, ScreenHeader, s } from "../../components/ui";

/**
 * Hub Trò chơi — hệ "Vườn giấy ấm" (mockup vòng 2): 1 dải thành tích hai người +
 * 1 game NỔI BẬT hôm nay (dải tranh + CTA "Chơi ngay") + các game còn lại dạng tile
 * 2 cột (medallion + tên + trạng thái, không hàng menu, không chevron).
 * App còn 4 game: Vòng quay yêu thương · Hiểu ý nhau · Ghép cặp ký ức · Xúc xắc hẹn hò.
 * (Game "Bắt tim bay" đã bị gỡ theo yêu cầu của user 2026-10-23 — màn hình, route và
 * mọi tham chiếu UI đã xoá; state heartBest/heartPlays + action HEART_* ở tầng logic
 * giữ nguyên vô hại vì bộ test logic đang kiểm chúng, xem báo cáo vòng này.)
 * Dải thành tích: mockup dùng "điểm tuần này" từ kỷ lục Bắt tim bay — game đã gỡ nên
 * không còn nguồn điểm tuần trung thực; dải này hiển thị LƯỢT CHĂM CÂY HÔM NAY của
 * từng người (số liệu thật, riêng từng người, từ state.daily) và ghi nhãn đúng như vậy.
 * LƯU Ý ĐIỀU HƯỚNG: màn này là route Stack gốc (/games), KHÔNG được đưa vào nhóm
 * (tabs) dạng tab ẩn (href: null) — expo-router 58 biến tab ẩn thành `hidden: true`
 * và tự replace về tab đầu tiên mỗi khi tab ẩn được focus (xem ghi chú ở (tabs)/_layout).
 */

interface GameMeta {
  id: string;
  route: string;
  name: string;
  desc: string;
  status: string;
  icon: string;
  color: string;
  bg: string;
}

export default function GamesHubScreen() {
  const { state } = useLove();
  const me = state.currentUser;
  const other: PersonId = me === "A" ? "B" : "A";
  const meP = selfOf(state);
  const partnerP = partnerOf(state);

  const spinsLeft = Math.max(0, MAX_DAILY_SPINS - (state.games.spin.date === today() ? state.games.spin[me] : 0));
  const qz = state.games.quiz.date === today() ? state.games.quiz : { A: [] as number[], B: [] as number[] };
  const quizDone = qz[me].length >= quizOfDay().length;
  const quizBothDone = quizDone && qz[other].length >= quizOfDay().length;
  const dw = state.games.dailyWins.date === today() ? state.games.dailyWins : { memory: { A: 0, B: 0 }, dice: { A: 0, B: 0 } };
  const memoryClaimed = dw.memory[me] >= 1;
  const diceClaimed = dw.dice[me] >= 1;

  const games: GameMeta[] = [
    {
      id: "spin", route: "/games/spin-wheel", name: "Vòng quay yêu thương",
      desc: "Quay trúng Xu Tim, XP và thư tình cho khu vườn của hai đứa.",
      status: spinsLeft > 0 ? `Bạn còn ${spinsLeft}/${MAX_DAILY_SPINS} lượt quay hôm nay` : "Hôm nay bạn đã quay hết lượt",
      icon: "refresh-circle", color: ROLE.selfDark, bg: ROLE.selfSoft,
    },
    {
      id: "quiz", route: "/games/quiz", name: "Hiểu ý nhau",
      desc: "4 câu hỏi mỗi ngày, đáp án niêm phong tới khi cả hai cùng trả lời.",
      status: quizBothDone ? "Cả hai đã trả lời — vào xem độ hợp ý" : quizDone ? "Bạn đã trả lời — đang chờ người ấy" : "Hôm nay hai đứa chưa trả lời",
      icon: "chatbubbles", color: ROLE.partnerDark, bg: ROLE.partnerSoft,
    },
    {
      id: "memory", route: "/games/memory-match", name: "Ghép cặp ký ức",
      desc: "Lật 12 lá, tìm 6 cặp mặt mood giống nhau trước khi hết giờ.",
      status: memoryClaimed ? "Bạn đã nhận thưởng hôm nay rồi" : "Thưởng ngày vẫn đang chờ bạn",
      icon: "grid", color: ROLE.shared, bg: ROLE.sharedSoft,
    },
    {
      id: "dice", route: "/games/love-dice", name: "Xúc xắc hẹn hò",
      desc: "Gieo xúc xắc, nhận một nhiệm vụ hẹn hò ngẫu nhiên cho hai đứa.",
      status: diceClaimed ? "Bạn đã nhận thưởng hôm nay rồi" : "Thưởng ngày vẫn đang chờ bạn",
      icon: "dice", color: ROLE.selfDark, bg: ROLE.selfSoft,
    },
  ];

  // Game nổi bật hôm nay: ưu tiên việc còn dở theo thứ tự vòng quay -> quiz -> ký ức -> xúc xắc.
  const featured = spinsLeft > 0 ? games[0] : !quizBothDone ? games[1] : !memoryClaimed ? games[2] : !diceClaimed ? games[3] : games[0];
  const tiles = games.filter((g) => g.id !== featured.id);

  // Lượt chăm cây hôm nay của một người (water+sun+love+bug trong state.daily của chính họ).
  const careToday = (slot: PersonId) => {
    if (state.daily.date !== today()) return 0;
    const d = state.daily[slot];
    return d.water + d.sun + d.love + d.bug;
  };
  const recordCol = (p: PersonInfo) => (
    <View style={{ flex: 1, backgroundColor: p.bg, borderRadius: RADIUS.inner, paddingVertical: 13, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Avatar id={p.avatar} size={30} ring={p.main} />
        <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }} numberOfLines={1}>{p.name}</Text>
      </View>
      <Text style={{ fontFamily: FONT.black, fontSize: 23, lineHeight: 28, color: p.color, marginTop: 8 }}>{careToday(p.slot)}</Text>
      <Text style={{ ...TYPE.caption, color: COLOR.textSoft }}>lượt chăm cây hôm nay</Text>
    </View>
  );

  return (
    <View style={s.screen}>
      <ScreenHeader title="Chơi cùng nhau" subtitle="Điểm và lượt tính riêng cho từng người" fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={[s.scroll, { gap: SPACE.sectionGap }]}>
        {/* Dải thành tích hai người — nền soft theo vai */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {recordCol(meP)}
          {recordCol(partnerP)}
        </View>

        {/* GAME NỔI BẬT HÔM NAY */}
        <View style={s.card}>
          <View style={{ height: 138, borderRadius: RADIUS.inner, backgroundColor: featured.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {featured.id === "spin" ? (
              <HeartGameImage size={124} />
            ) : (
              <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={featured.icon as never} size={44} color={featured.color} />
              </View>
            )}
          </View>
          <Text style={{ ...TYPE.micro, color: ROLE.selfDark, marginTop: 14 }}>ĐIỂM HẸN HÔM NAY</Text>
          <Text style={{ ...TYPE.cardTitle, color: COLOR.text, marginTop: 5 }}>{featured.name}</Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 14.5, lineHeight: 21, color: COLOR.textSoft, marginTop: 5 }}>{featured.desc}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11 }}>
            <Ionicons name="time-outline" size={15} color={ROLE.partnerDark} />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.text }}>{featured.status}</Text>
          </View>
          <TouchableOpacity style={[s.btn, { marginTop: 14 }]} onPress={() => router.push(featured.route as never)} accessibilityLabel={`Chơi ngay: ${featured.name}`}>
            <Text style={s.btnText}>Chơi ngay</Text>
          </TouchableOpacity>
        </View>

        {/* Các game còn lại — tile 2 cột */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {tiles.map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => router.push(g.route as never)}
              accessibilityLabel={g.name}
              style={{ width: "48%", backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLOR.border, padding: 14 }}
            >
              <Medallion icon={g.icon} color={g.color} bg={g.bg} size={48} />
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text, marginTop: 10 }}>{g.name}</Text>
              <Text style={{ ...TYPE.caption, color: COLOR.textSoft, marginTop: 3 }}>{g.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

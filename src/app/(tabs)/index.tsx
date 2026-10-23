import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MOODS, QUESTS, questionOfDay } from "../../lib/data";
import { daysTogether, today } from "../../lib/types";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import { HeroArt } from "../../components/Art";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TYPE } from "../../components/theme";
import { ProgressBar, SkeletonCard, s } from "../../components/ui";

/**
 * Trang chủ — ĐÚNG spec mockup tham chiếu, chỉ 3 KHỐI dưới thanh ngữ cảnh mỏng:
 * (0) Thanh trên: trái tim + "Ngày {N}" (trái) · "{streak} ngày liền" (phải).
 * (1) HERO bo 22: minh hoạ phẳng cặp đôi bên chậu hồng; phủ lên: "Ngày {N}" 30px/900
 *     (chữ lớn nhất app) + hàng avatar chồng nhau "{A} & {B} · bên nhau từ {ngày}".
 * (2) Card "Hôm nay của hai đứa": câu hỏi ngày + trạng thái niêm phong của CẢ HAI
 *     + mood của CẢ HAI trong cùng card + ĐÚNG 1 CTA chính.
 * (3) Dải vườn: 1 thanh tiến trình "Năng lượng hôm nay {x}/{tổng} việc" + nút outline "Vào vườn".
 * Không còn lưới lối tắt ở Trang chủ — tính năng đi qua tab/hub như spec.
 */
export default function HomeScreen() {
  const { state, hydrated } = useLove();
  const days = daysTogether(state.startDate);
  const me = selfOf(state);
  const partner = partnerOf(state);

  const answersToday = state.answers.date === today() ? state.answers : { A: "", B: "" };
  const moodsToday = state.moods.date === today() ? state.moods : { A: "", B: "" };
  const myAnswered = Boolean(answersToday[me.slot]);
  const partnerAnswered = Boolean(answersToday[partner.slot]);
  const bothAnswered = myAnswered && partnerAnswered;
  const myMood = moodsToday[me.slot];

  // Năng lượng hôm nay: tổng tiến độ nhiệm vụ ngày của cả hai (từ state.daily + QUESTS có sẵn)
  const dailyToday = state.daily.date === today() ? state.daily : null;
  let energyDone = 0;
  let energyTotal = 0;
  for (const q of QUESTS) {
    if (q.key === "both") {
      energyTotal += q.target;
      if (dailyToday) energyDone += Math.min(q.target, (dailyToday.caredA ? 1 : 0) + (dailyToday.caredB ? 1 : 0));
    } else {
      energyTotal += q.target * 2;
      if (dailyToday) for (const slot of ["A", "B"] as const) energyDone += Math.min(q.target, dailyToday[slot][q.key]);
    }
  }

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: COLOR.bg, padding: SPACE.screenX, paddingTop: 48, gap: SPACE.cardGap }}>
        <SkeletonCard height={218} />
        <SkeletonCard height={190} />
        <SkeletonCard height={110} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải khu vườn...</Text>
      </View>
    );
  }

  // CTA chính duy nhất của thẻ Hôm nay — nhãn bám theo trạng thái còn thiếu
  const todayCta = !myAnswered
    ? { label: "Trả lời câu hỏi", icon: "chatbubbles", route: "/utilities/daily-question" }
    : !myMood
      ? { label: "Chọn mood hôm nay", icon: "happy", route: "/utilities/mood" }
      : { label: bothAnswered ? "Xem đáp án của hai đứa" : "Xem câu hỏi hôm nay", icon: "chatbubbles", route: "/utilities/daily-question" };

  const answerStatus = (answered: boolean) =>
    answered ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="lock-closed" size={13} color={COLOR.success} />
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: COLOR.success }}>Đã niêm phong</Text>
      </View>
    ) : (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="time" size={13} color={COLOR.textFaint} />
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: COLOR.textFaint }}>Đang chờ...</Text>
      </View>
    );

  const moodCell = (slot: "A" | "B", moodId: string) => (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 7 }}>
      <FaceIcon mood={moodId || "joy"} size={30} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.text }} numberOfLines={1}>{slot === "A" ? state.personA : state.personB}</Text>
        <Text style={{ fontFamily: FONT.medium, fontSize: 11.5, color: moodId ? COLOR.textSoft : COLOR.textFaint }} numberOfLines={1}>
          {moodId ? MOODS.find((m) => m.id === moodId)?.label : "Chưa chọn mood"}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 48 }]}>
      {/* (0) Thanh ngữ cảnh mỏng */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name="heart" size={15} color={COLOR.primary} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>Ngày {days}</Text>
        </View>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.textSoft }}>{state.streak.count} ngày liền</Text>
      </View>

      {/* (1) HERO — minh hoạ phẳng + phủ chữ */}
      <View style={{ borderRadius: RADIUS.hero, overflow: "hidden", height: 218, backgroundColor: "#FFEFF3", ...SHADOW }}>
        <HeroArt />
        <View style={{ position: "absolute", top: 14, left: 16 }}>
          <Text style={{ ...TYPE.display, color: ROLE.shared }}>Ngày {days}</Text>
        </View>
        {/* Pill đáy hero: neo CẢ left:12 và right:12 — trước đây chỉ neo trái + 1 dòng chữ
            không giới hạn nên tên dài bị tràn/cắt ở mép phải. Nay: avatar cố định bên trái,
            cột chữ flex:1 gồm 2 dòng (tên hai người / ngày bắt đầu), dòng tên tự "..." ở đuôi. */}
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: RADIUS.pill, paddingVertical: 5, paddingLeft: 5, paddingRight: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar id={state.avatarA} size={26} />
            <View style={{ marginLeft: -8, borderWidth: 2, borderColor: "#fff", borderRadius: 999 }}>
              <Avatar id={state.avatarB} size={26} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.text }} numberOfLines={1} ellipsizeMode="tail">
              {state.personA} & {state.personB}
            </Text>
            <Text style={{ fontFamily: FONT.medium, fontSize: 11, color: COLOR.textSoft }} numberOfLines={1}>
              Bên nhau từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}
            </Text>
          </View>
        </View>
      </View>

      {/* (2) HÔM NAY — câu hỏi khoá đáp án + mood của cả hai, 1 CTA */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="chatbubbles" size={19} color={COLOR.primary} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: COLOR.text, flex: 1 }}>Hôm nay của hai đứa</Text>
        </View>
        <Text style={{ ...TYPE.body, color: COLOR.text, marginTop: 8 }}>{questionOfDay()}</Text>
        <View style={{ gap: 7, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={me.slot} />
            <View style={{ flex: 1 }} />
            {answerStatus(myAnswered)}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
            <View style={{ flex: 1 }} />
            {answerStatus(partnerAnswered)}
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: COLOR.border, marginVertical: 12 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {moodCell(me.slot, moodsToday[me.slot])}
          {moodCell(partner.slot, moodsToday[partner.slot])}
        </View>
        <TouchableOpacity style={[s.btn, { marginTop: 14 }]} onPress={() => router.push(todayCta.route as never)}>
          <Ionicons name={todayCta.icon as never} size={17} color="#fff" />
          <Text style={s.btnText}>{todayCta.label}</Text>
        </TouchableOpacity>
      </View>

      {/* (3) DẢI VƯỜN — 1 thanh năng lượng hôm nay + nút outline Vào vườn */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="leaf" size={18} color={COLOR.tealDark} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: COLOR.text, flex: 1 }}>Vườn hôm nay</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.text }}>Năng lượng hôm nay</Text>
          <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: COLOR.tealDark }}>{energyDone}/{energyTotal} việc</Text>
        </View>
        <View style={{ marginTop: 6 }}>
          <ProgressBar value={energyTotal > 0 ? (energyDone / energyTotal) * 100 : 0} color={ROLE.partner} height={9} />
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/garden")}
          accessibilityLabel="Vào vườn"
          style={{ marginTop: 12, minHeight: 44, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLOR.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
        >
          <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: COLOR.primary }}>Vào vườn</Text>
          <Ionicons name="arrow-forward" size={15} color={COLOR.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

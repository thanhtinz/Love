import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MOODS, questionOfDay } from "../../lib/data";
import { decayedPlantStats, formatDuration, speciesById, stageInfo } from "../../lib/plants";
import { daysTogether, today, treeHealth } from "../../lib/types";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import PlantArt from "../../components/PlantArt";
import { HeroCouple } from "../../components/illustrations";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TYPE } from "../../components/theme";
import { FeatureTile, ProgressBar, SectionTitle, SkeletonCard, s } from "../../components/ui";

/**
 * Trang chủ theo wireframe nghiên cứu — TỐI ĐA 3 KHỐI TRÊN FOLD:
 * (1) HERO navy "Chúng mình": 2 avatar + số ngày yêu là chữ Display duy nhất của app;
 * (2) Thẻ "HÔM NAY": câu hỏi ngày (locked-answer) + mood 2 người, ĐÚNG 1 CTA chính;
 * (3) DẢI VƯỜN: cây đáng chú ý nhất + 1 thanh tiến trình duy nhất + vào vườn.
 * Dưới fold chỉ còn lưới lối tắt gọn (icon + nhãn chữ) — không nhúng tính năng tại đây.
 */
export default function HomeScreen() {
  const { state, hydrated } = useLove();
  const days = daysTogether(state.startDate);
  const unopened = state.letters.filter((l) => !l.opened).length;
  const me = selfOf(state);
  const partner = partnerOf(state);

  const answersToday = state.answers.date === today() ? state.answers : { A: "", B: "" };
  const moodsToday = state.moods.date === today() ? state.moods : { A: "", B: "" };
  const myAnswered = Boolean(answersToday[me.slot]);
  const partnerAnswered = Boolean(answersToday[partner.slot]);
  const bothAnswered = myAnswered && partnerAnswered;
  const myMood = moodsToday[me.slot];

  const plant = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const info = plant ? stageInfo(plant) : null;
  const stats = plant ? decayedPlantStats(plant) : null;
  const health = stats ? treeHealth(stats) : null;

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: COLOR.bg, padding: SPACE.screenX, paddingTop: 48, gap: SPACE.cardGap }}>
        <SkeletonCard height={210} />
        <SkeletonCard height={170} />
        <SkeletonCard height={110} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải khu vườn...</Text>
      </View>
    );
  }

  // CTA chính duy nhất của thẻ Hôm nay — theo thứ tự: trả lời câu hỏi -> chọn mood -> xem đáp án
  const todayCta = !myAnswered
    ? { label: "Trả lời câu hỏi hôm nay", icon: "chatbubbles", route: "/utilities/daily-question" }
    : !myMood
      ? { label: "Chọn mood hôm nay của bạn", icon: "happy", route: "/utilities/mood" }
      : { label: bothAnswered ? "Xem đáp án của hai đứa" : "Xem câu hỏi hôm nay", icon: "chatbubbles", route: "/utilities/daily-question" };

  const answerStatus = (answered: boolean) =>
    answered ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="lock-closed" size={13} color={COLOR.success} />
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: COLOR.success }}>Đã trả lời</Text>
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
      {/* (1) HERO — Chúng mình: tranh vẽ cặp đôi bên cây tình yêu ở dải trên, thông tin ở dải navy dưới */}
      <View style={{ backgroundColor: ROLE.shared, borderRadius: RADIUS.card, overflow: "hidden", ...SHADOW }}>
        <HeroCouple width="100%" height={118} />
        <View style={{ padding: SPACE.lg, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar id={me.avatar} size={48} />
            <View style={{ marginLeft: -12, borderWidth: 2.5, borderColor: ROLE.shared, borderRadius: 999 }}>
              <Avatar id={partner.avatar} size={48} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 16.5, color: "#fff" }} numberOfLines={1}>{me.name} và {partner.name}</Text>
            <Text style={{ fontFamily: FONT.medium, fontSize: 12.5, color: "#C9D6E4" }} numberOfLines={1}>{state.gardenName}</Text>
          </View>
          <Ionicons name="heart" size={20} color={ROLE.self} />
        </View>
        <View style={{ alignItems: "center", gap: 0 }}>
          <Text style={{ ...TYPE.display, color: "#fff" }}>{days}</Text>
          <Text style={{ fontFamily: FONT.medium, fontSize: 12.5, color: "#C9D6E4" }}>ngày bên nhau · từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
            <Ionicons name="flame" size={13} color="#FFC9A3" />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: "#fff" }}>Streak {state.streak.count} ngày</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
            <Ionicons name="diamond" size={13} color="#FFD9E2" />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: "#fff" }}>{state.coins} Xu Tim</Text>
          </View>
        </View>
        </View>
      </View>

      {/* (2) HÔM NAY — câu hỏi khoá đáp án + mood, 1 CTA */}
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="chatbubbles" size={19} color={COLOR.primary} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: COLOR.text, flex: 1 }}>Hôm nay của hai đứa</Text>
          <Text style={s.small}>khoảng 1 phút</Text>
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
        <Text style={[s.small, { marginTop: 8 }]}>
          {bothAnswered ? "Cả hai đã trả lời — đáp án đã mở, vào xem hai đứa có hợp ý nhau không nhé." : "Đáp án được niêm phong: chỉ mở khi cả hai cùng trả lời xong."}
        </Text>
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

      {/* (3) DẢI VƯỜN — 1 cây, 1 thanh tiến trình */}
      <TouchableOpacity style={s.card} onPress={() => router.push("/(tabs)/garden")} accessibilityLabel="Vào vườn cây">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="leaf" size={19} color={COLOR.success} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: COLOR.text, flex: 1 }}>Vườn của hai đứa</Text>
          <Ionicons name="chevron-forward" size={18} color={COLOR.textFaint} />
        </View>
        {plant && info ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
            <PlantArt speciesId={plant.speciesId} stageIndex={info.index} totalStages={speciesById(plant.speciesId).stages.length} wilted={health?.status === "wilted"} size={62} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, color: COLOR.text }}>{speciesById(plant.speciesId).name} · {info.stage.name}</Text>
              <ProgressBar value={info.progressInStage} color={COLOR.success} height={9} />
              <Text style={s.small}>
                {info.mature
                  ? "Đã trưởng thành — vào vườn để thu vào kỷ niệm."
                  : health?.status === "wilted"
                    ? "Cây đang héo nên tạm ngừng lớn — vào vườn chăm cây nhé."
                    : `Còn khoảng ${formatDuration(Math.max(0, info.remainingToNextMs))} nữa là lên giai đoạn mới.`}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[s.sub, { marginTop: 8 }]}>Vườn chưa có cây nào — chạm để gieo hạt đầu tiên.</Text>
        )}
      </TouchableOpacity>

      {/* Dưới fold: lưới lối tắt gọn, luôn có nhãn chữ */}
      <SectionTitle icon="grid">Khám phá thêm</SectionTitle>
      <View style={{ gap: SPACE.sm }}>
        <View style={{ flexDirection: "row", gap: SPACE.sm }}>
          <FeatureTile icon="mail" title="Hộp thư" color={COLOR.primary} bg={ROLE.selfSoft} route="/(tabs)/letters" badge={unopened > 0 ? `${unopened}` : undefined} />
          <FeatureTile icon="game-controller" title="Trò chơi" color="#8B5CF6" bg="#EFEAFE" route="/(tabs)/games" />
          <FeatureTile icon="heart-circle" title="Tiện ích" color={COLOR.primary} bg={ROLE.selfSoft} route="/(tabs)/utilities" />
        </View>
        <View style={{ flexDirection: "row", gap: SPACE.sm }}>
          <FeatureTile icon="image" title="Khung màn hình" color={ROLE.partnerDark} bg={ROLE.partnerSoft} route="/frames" />
          <FeatureTile icon="camera" title="Kỷ niệm" color={COLOR.warning} bg={COLOR.warningSoft} route="/utilities/memories" />
          <FeatureTile icon="list" title="Bucket List" color={COLOR.success} bg={COLOR.successSoft} route="/utilities/bucket-list" />
        </View>
      </View>
      <Text style={[s.small, { textAlign: "center", paddingHorizontal: 10 }]}>
        Quy ước màu toàn app: hồng đào là Bạn, xanh mint là người ấy, xanh navy là chúng mình.
      </Text>
    </ScrollView>
  );
}

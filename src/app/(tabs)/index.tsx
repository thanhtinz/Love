import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MOODS, QUESTS, questionOfDay } from "../../lib/data";
import { daysTogether, effectiveStreak, today, treeHealth } from "../../lib/types";
import { decayedPlantStats, stageInfo } from "../../lib/plants";
import Avatar from "../../components/Avatar";
import { MoodFace } from "../../components/FaceIcon";
import { EmptyPlotScene, HeroBand, PlantScene } from "../../components/Art";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TYPE } from "../../components/theme";
import { ProgressBar, SkeletonCard, s } from "../../components/ui";

/**
 * Trang chủ — hệ "Vườn giấy ấm" (mockup vòng 2, user duyệt 2026-10-23).
 * Ngân sách phần tử: 1 dòng chào + ĐÚNG 3 khối, 1 CTA chính:
 * (0) Dòng chào: chồng avatar hai người (ring theo vai) + "Chào buổi ..., {tên}"
 *     + chip streak hồng mềm. (Số ngày KHÔNG còn lặp ở thanh trên — chỉ ở hero.)
 * (1) HERO bo 28: DẢI TRANH cặp đôi ở trên + tấm giấy trắng ở dưới chứa
 *     "Ngày {N}" 42/900 (chữ lớn nhất app) — chữ KHÔNG đè lên mặt người trong tranh.
 * (2) Card "Hôm nay của hai đứa": câu hỏi ngày + hàng trạng thái của CẢ HAI
 *     (chip màu theo vai) + mood hai nửa theo vai + ĐÚNG 1 CTA chính bám trạng thái.
 * (3) Dải vườn nền gardenWash: bệ cây (đất + tranh), 1 thanh năng lượng mint,
 *     1 dòng "dấu vết" của lần chăm gần nhất (avatar + việc + giờ) — bắt buộc có
 *     dấu vết của người ấy, và hành động chữ "Vào vườn".
 * Không có lưới lối tắt ở Trang chủ — tính năng đi qua tab/hub.
 */

const firstName = (name: string) => name.trim().split(/\s+/).pop() || name;
const pad2 = (n: number) => String(n).padStart(2, "0");

export default function HomeScreen() {
  const { state, hydrated } = useLove();
  const insets = useSafeAreaInsets();
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
      <View style={{ flex: 1, backgroundColor: COLOR.bg, padding: SPACE.screenX, paddingTop: insets.top + 48, gap: SPACE.cardGap }}>
        <SkeletonCard height={218} />
        <SkeletonCard height={190} />
        <SkeletonCard height={110} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải khu vườn...</Text>
      </View>
    );
  }

  const hour = new Date().getHours();
  const daypart = hour < 12 ? "sáng" : hour < 18 ? "chiều" : "tối";
  const streak = effectiveStreak(state.streak);

  // CTA chính duy nhất của thẻ Hôm nay — nhãn bám theo trạng thái còn thiếu.
  // Khi mình đã trả lời mà người ấy chưa: nhãn "Nhắc {người ấy} trả lời" (đúng mockup);
  // bấm vào vẫn mở màn Câu hỏi hôm nay để xem trạng thái niêm phong.
  const todayCta = !myAnswered
    ? { label: "Trả lời câu hỏi", route: "/utilities/daily-question" }
    : !partnerAnswered
      ? { label: `Nhắc ${firstName(partner.name)} trả lời`, route: "/utilities/daily-question" }
      : !myMood
        ? { label: "Chọn mood hôm nay", route: "/utilities/mood" }
        : { label: "Xem đáp án của hai đứa", route: "/utilities/daily-question" };

  // Hàng trạng thái trả lời: chip nền MÀU CỦA NGƯỜI ĐÓ + chữ đậm của người đó (mockup).
  const answerRow = (p: typeof me, answered: boolean, isFirst: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderTopWidth: isFirst ? 0 : 1, borderTopColor: COLOR.border }}>
      <Avatar id={p.avatar} size={36} ring={p.main} />
      <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }} numberOfLines={1}>{p.name}</Text>
      <View style={{ backgroundColor: p.bg, borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: p.color }}>{answered ? "Đã trả lời" : "Đang chờ"}</Text>
      </View>
    </View>
  );

  // Nửa mood: nền soft của chính người đó, mặt mood 38px hoà nền (không hộp trắng).
  const moodHalf = (p: typeof me, moodId: string) => (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: p.bg, borderRadius: RADIUS.tile, paddingVertical: 9, paddingHorizontal: 12 }}>
      {moodId ? (
        <MoodFace mood={moodId} size={38} />
      ) : (
        <View style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: COLOR.lineStrong, backgroundColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="happy-outline" size={19} color={COLOR.textFaint} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={1}>{firstName(p.name)} hôm nay</Text>
        <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }} numberOfLines={1}>
          {moodId ? MOODS.find((m) => m.id === moodId)?.label : "Chưa chọn mood"}
        </Text>
      </View>
    </View>
  );

  // Dấu vết chăm vườn gần nhất (delta vòng 2 — bắt buộc có dấu vết của người ấy):
  // activity chăm cây có icon water/sunny/bug (+ heart khi là bón tim "vừa ... cho cây");
  // avatar theo slot nếu có, không thì khớp theo tên người thực hiện.
  const gardenActs = state.activities.filter((a) => ["water", "sunny", "bug", "leaf"].includes(a.icon) || (a.icon === "heart" && a.text.includes("cho ")));
  const lastAct = gardenActs[0];
  const actSlot = lastAct ? (lastAct.slot ?? (lastAct.actor === state.personB ? "B" : "A")) : null;
  const actPerson = actSlot ? (actSlot === me.slot ? me : partner) : null;
  const actTime = lastAct ? new Date(lastAct.time) : null;

  const firstPlant = state.plants[0];
  const firstInfo = firstPlant ? stageInfo(firstPlant) : null;
  const firstHealth = firstPlant ? treeHealth(decayedPlantStats(firstPlant)).status : null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: insets.top + 14, gap: SPACE.sectionGap }]}>
      {/* (0) DÒNG CHÀO */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar id={state.avatarA} size={28} ring={ROLE.self} />
          <View style={{ marginLeft: -10 }}>
            <Avatar id={state.avatarB} size={28} ring={ROLE.partner} />
          </View>
        </View>
        <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }} numberOfLines={1}>
          Chào buổi {daypart}, {firstName(me.name)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Ionicons name="flame" size={13} color={ROLE.selfDark} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: ROLE.selfDark }}>{streak} ngày liền</Text>
        </View>
      </View>

      {/* (1) HERO — dải tranh ở trên, tấm giấy "Ngày N" ở dưới */}
      <View style={{ borderRadius: RADIUS.scene, overflow: "hidden", backgroundColor: COLOR.heroBg, ...SHADOW }}>
        <HeroBand height={118} />
        <View style={{ backgroundColor: "#fff", paddingTop: 11, paddingHorizontal: 18, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...TYPE.micro, color: ROLE.selfDark }}>HAI ĐỨA MÌNH</Text>
            <Text style={{ ...TYPE.caption, color: COLOR.textSoft }}>
              Bên nhau từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
            </Text>
          </View>
          <Text style={{ ...TYPE.display, color: COLOR.text, marginTop: 3 }}>Ngày {days}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 7 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Avatar id={state.avatarA} size={32} ring={ROLE.self} />
              <View style={{ marginLeft: -11 }}>
                <Avatar id={state.avatarB} size={32} ring={ROLE.partner} />
              </View>
            </View>
            <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 15, color: COLOR.text }} numberOfLines={1} ellipsizeMode="tail">
              {state.personA} & {state.personB}
            </Text>
          </View>
        </View>
      </View>

      {/* (2) HÔM NAY — câu hỏi + trạng thái hai người + mood hai nửa + 1 CTA */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Hôm nay của hai đứa</Text>
        <Text style={{ ...TYPE.emphasis, color: COLOR.text, marginTop: 9 }}>{questionOfDay()}</Text>
        <View style={{ marginTop: 6 }}>
          {answerRow(me, myAnswered, true)}
          {answerRow(partner, partnerAnswered, false)}
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {moodHalf(me, moodsToday[me.slot])}
          {moodHalf(partner, moodsToday[partner.slot])}
        </View>
        <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => router.push(todayCta.route as never)} accessibilityLabel={todayCta.label}>
          <Text style={s.btnText}>{todayCta.label}</Text>
        </TouchableOpacity>
        {bothAnswered ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
            <Ionicons name="checkmark-circle" size={14} color={COLOR.success} />
            <Text style={{ ...TYPE.caption, color: COLOR.textSoft }}>Đã mở đáp án — đã lưu vào kỷ niệm của hai đứa.</Text>
          </View>
        ) : null}
      </View>

      {/* (3) DẢI VƯỜN — bệ cây + 1 thanh năng lượng + dấu vết gần nhất */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/garden")}
        accessibilityLabel="Vào vườn"
        style={{ backgroundColor: COLOR.gardenWash, borderRadius: RADIUS.card, padding: 16, flexDirection: "row", gap: 14, alignItems: "center" }}
      >
        <View style={{ width: 96 }}>
          {firstPlant && firstInfo ? (
            <PlantScene speciesId={firstPlant.speciesId} stageIndex={firstInfo.index} status={firstHealth ?? undefined} height={104} imgHeight={96} soilRatio={0.15} />
          ) : (
            <EmptyPlotScene height={104} imgHeight={92} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text }}>Vườn hôm nay</Text>
          <ProgressBar value={energyTotal > 0 ? (energyDone / energyTotal) * 100 : 0} color={ROLE.partner} height={8} />
          {lastAct && actPerson && actTime ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Avatar id={actPerson.avatar} size={20} ring={actPerson.main} />
              <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={1}>
                {lastAct.actor} {lastAct.text} · {pad2(actTime.getHours())}:{pad2(actTime.getMinutes())}
              </Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={1}>
              {firstPlant ? "Hôm nay chưa ai ghé vườn" : "Vườn đang trống — vào gieo hạt nhé"}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: ROLE.partnerDark }}>Vào vườn</Text>
            <Ionicons name="arrow-forward" size={14} color={ROLE.partnerDark} />
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

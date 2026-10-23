import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLove } from "../../lib/store";
import { DECOR_SEASON_TINT, MOODS, QUESTS, questionOfDay } from "../../lib/data";
import { countdownLabel, cycleInfo, distanceKmBetween, distanceLabel, nextEvent, petStageIndex, petStatusLine, relativeTimeVi } from "../../lib/features";
import { PING_DAILY_MAX, daysTogether, effectiveStreak, today, treeHealth } from "../../lib/types";
import { decayedPlantStats, stageInfo } from "../../lib/plants";
import Avatar from "../../components/Avatar";
import { MoodFace } from "../../components/FaceIcon";
import { EmptyPlotScene, HeartGameImage, HeroBand, PetImage, PlantScene } from "../../components/Art";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SHADOW_FLOAT, SPACE, TYPE } from "../../components/theme";
import { ProgressBar, SkeletonCard, StatusChip, s, tabBarPad } from "../../components/ui";

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
  const { state, dispatch, hydrated } = useLove();
  const insets = useSafeAreaInsets();
  const days = daysTogether(state.startDate);
  const me = selfOf(state);
  const partner = partnerOf(state);

  /* --- "Nhớ bạn" nhịp tim: nút ở hero + pop-up phía người nhận (kênh pop-up kiểu
   * thư rơi). Hiệu ứng phía người nhận có cooldown 30 giây: chuỗi nhịp tới trong
   * cửa sổ đó vẫn cộng dồn vào state nhưng không bật pop-up lại. Mốc chuỗi đã xử
   * lý lưu ở AsyncStorage theo vườn để mở app không bật lại chuỗi cũ. --- */
  const pingsToday = state.pings.day.date === today() ? state.pings.day : { A: 0, B: 0 };
  const myPingCount = pingsToday[me.slot];
  const partnerPing = state.pings[partner.slot];
  const pingCapReached = myPingCount >= PING_DAILY_MAX;
  const [pingPop, setPingPop] = useState<number | null>(null);
  const seenKey = `love-ping-seen-${state.roomCode}-${me.slot}`;
  const seenRef = useRef<string | null>(null);
  const lastShownRef = useRef(0);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(seenKey).then((v) => { if (live) seenRef.current = v ?? ""; }).catch(() => { if (live) seenRef.current = ""; });
    return () => { live = false; };
  }, [seenKey]);
  useEffect(() => {
    if (seenRef.current === null) return;
    const burstAt = partnerPing.lastBurstAt;
    if (!burstAt || burstAt === seenRef.current) return;
    seenRef.current = burstAt;
    AsyncStorage.setItem(seenKey, burstAt).catch(() => {});
    if (Date.now() - new Date(burstAt).getTime() > 120000) return; // chuỗi cũ — không bật lại
    if (Date.now() - lastShownRef.current < 30000) return; // cooldown hiệu ứng 30s phía người nhận
    lastShownRef.current = Date.now();
    setPingPop(partnerPing.burst);
    const t = setTimeout(() => setPingPop(null), 6000);
    return () => clearTimeout(t);
  }, [partnerPing.lastBurstAt, partnerPing.burst, seenKey]);

  /* --- Các dòng dấu vết yên tĩnh trong hero: mỗi dòng CHỈ hiện khi có dữ kiện
   * thật (người ấy đang chia sẻ / đang trong cửa sổ nhạy cảm / có ngày đặc biệt). --- */
  const myPresence = state.presence[me.slot];
  const partnerPresence = state.presence[partner.slot];
  const presenceKm = partnerPresence.shareLocation ? distanceKmBetween(myPresence, partnerPresence) : null;
  const presenceLine = presenceKm != null
    ? `${partner.name} ${distanceLabel(presenceKm)} · cập nhật ${relativeTimeVi(partnerPresence.at)}`
    : partnerPresence.shareBattery && partnerPresence.battery != null
      ? `Pin của ${partner.name}: ${partnerPresence.battery}% · cập nhật ${relativeTimeVi(partnerPresence.at)}`
      : null;
  const partnerCycleInfo = state.cycle[partner.slot].share ? cycleInfo(state.cycle[partner.slot]) : null;
  const cycleLine = partnerCycleInfo?.sensitive
    ? `${partner.name} đang trong những ngày nhạy cảm — quan tâm bạn ấy nhiều hơn nhé (kỳ tới ${countdownLabel(partnerCycleInfo.daysUntilNext)})`
    : null;
  const nextEv = nextEvent(state.events);
  const eventLine = nextEv ? `Ngày đặc biệt: ${nextEv.event.title} — ${countdownLabel(nextEv.daysUntil)}` : null;

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

  // Hàng trạng thái trả lời: danh tính người qua avatar + vòng màu vai; CHIP
  // trạng thái theo HỆ CHIP THỐNG NHẤT — cùng trạng thái ("Đang chờ"/"Đã trả
  // lời") luôn cùng một màu ở mọi nơi, không nhuộm theo người nữa.
  const answerRow = (p: typeof me, answered: boolean, isFirst: boolean) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderTopWidth: isFirst ? 0 : 1, borderTopColor: COLOR.border }}>
      <Avatar id={p.avatar} size={36} ring={p.main} />
      <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }} numberOfLines={2}>{p.name}</Text>
      <StatusChip label={answered ? "Đã trả lời" : "Đang chờ"} variant={answered ? "done" : "waiting"} />
    </View>
  );

  // Nửa mood: hai nửa nằm trong MỘT dải tint giấy PHẲNG duy nhất, ngăn nhau chỉ
  // bằng hairline dọc. Mỗi nửa KHÔNG có nền/viền/bo góc/bóng riêng (kể cả ô
  // trống lúc chưa chọn mood — chỉ còn icon trơn trên nền dải, không hộp nét
  // đứt nữa: bản live vẫn đọc hai ô đó thành hai mini-card kem). Cột chữ bám
  // mép trên (flex-start) để giãn chiều dọc tự do; MỌI chữ trong dải hiện TRỌN
  // — nhãn mood không giới hạn số dòng, dòng tên cho 2 dòng, cấm ellipsis 1 dòng.
  const moodHalf = (p: typeof me, moodId: string) => (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 10, paddingHorizontal: 12 }}>
      {moodId ? (
        <MoodFace mood={moodId} size={38} />
      ) : (
        <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="happy-outline" size={21} color={COLOR.textFaint} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...TYPE.caption, color: p.color }} numberOfLines={2}>{firstName(p.name)} hôm nay</Text>
        <Text style={{ fontFamily: FONT.bold, fontSize: 14, lineHeight: 19, color: COLOR.text }}>
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
    <View style={{ flex: 1, backgroundColor: COLOR.bg }}>
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: insets.top + 14, gap: SPACE.sectionGap, paddingBottom: tabBarPad(insets.bottom) }]}>
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
            <Text style={{ flex: 1, fontFamily: FONT.bold, fontSize: 15, lineHeight: 20, color: COLOR.text }} numberOfLines={2}>
              {state.personA} & {state.personB}
            </Text>
          </View>

          {/* DẤU VẾT: hiện diện / chu kỳ nhạy cảm / ngày đặc biệt — dòng nào có dữ kiện mới hiện */}
          {(presenceLine || cycleLine || eventLine) && (
            <View style={{ marginTop: 10, gap: 5 }}>
              {presenceLine && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="location" size={13} color={ROLE.partnerDark} />
                  <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>{presenceLine}</Text>
                </View>
              )}
              {cycleLine && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="flower" size={13} color={ROLE.selfDark} />
                  <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>{cycleLine}</Text>
                </View>
              )}
              {eventLine && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="calendar" size={13} color={ROLE.shared} />
                  <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>{eventLine}</Text>
                </View>
              )}
            </View>
          )}

          {/* NHỚ BẠN — nút tim gửi nhịp ngay (không phải CTA chính của màn; CTA chính
              vẫn là nút trong thẻ Hôm nay). Trần 50 nhịp/ngày/người khóa ở reducer. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLOR.border }}>
            <TouchableOpacity
              disabled={pingCapReached}
              onPress={() => dispatch({ type: "PING_SEND", user: me.slot, actor: me.name })}
              accessibilityLabel={`Gửi nhịp nhớ ${partner.name}`}
              style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ROLE.selfSoft, alignItems: "center", justifyContent: "center", opacity: pingCapReached ? 0.45 : 1 }}
            >
              <Ionicons name="heart" size={26} color={COLOR.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text }} numberOfLines={1}>Nhớ {firstName(partner.name)}? Chạm vào tim</Text>
              <Text style={{ ...TYPE.caption, color: COLOR.textSoft, marginTop: 2 }} numberOfLines={2}>
                {pingCapReached
                  ? `Đã đủ ${PING_DAILY_MAX} nhịp hôm nay — để dành tới mai nhé`
                  : partnerPing.lastAt
                    ? `${partner.name} vừa gửi nhịp nhớ ${relativeTimeVi(partnerPing.lastAt)} · Hôm nay hai đứa đã nhớ nhau ${pingsToday.A + pingsToday.B} nhịp`
                    : `Hôm nay hai đứa đã nhớ nhau ${pingsToday.A + pingsToday.B} nhịp`}
              </Text>
            </View>
            <Text style={{ ...TYPE.caption, color: COLOR.textFaint }}>{myPingCount}/{PING_DAILY_MAX}</Text>
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
        <View style={{ flexDirection: "row", backgroundColor: COLOR.bg, borderRadius: RADIUS.tile, marginTop: 10, overflow: "hidden" }}>
          {moodHalf(me, moodsToday[me.slot])}
          <View style={{ width: 1, backgroundColor: COLOR.border, marginVertical: 10 }} />
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
        style={{ backgroundColor: DECOR_SEASON_TINT[state.decor.sceneBg] ?? COLOR.gardenWash, borderRadius: RADIUS.card, padding: 16, flexDirection: "row", gap: 14, alignItems: "center" }}
      >
        <View style={{ width: 108 }}>
          {firstPlant && firstInfo ? (
            <PlantScene speciesId={firstPlant.speciesId} stageIndex={firstInfo.index} status={firstHealth ?? undefined} height={116} imgHeight={108} soilRatio={0.15} />
          ) : (
            <EmptyPlotScene height={116} imgHeight={104} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text }}>Vườn hôm nay</Text>
          <ProgressBar value={energyTotal > 0 ? (energyDone / energyTotal) * 100 : 0} color={ROLE.partner} height={8} />
          {lastAct && actPerson && actTime ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Avatar id={actPerson.avatar} size={20} ring={actPerson.main} />
              <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>
                {lastAct.actor} {lastAct.text} · {pad2(actTime.getHours())}:{pad2(actTime.getMinutes())}
              </Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>
              {firstPlant ? "Hôm nay chưa ai ghé vườn" : "Vườn đang trống — vào gieo hạt nhé"}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PetImage stage={petStageIndex(state.pet)} size={26} />
            <Text style={{ flex: 1, ...TYPE.caption, color: COLOR.textSoft }} numberOfLines={2}>{petStatusLine(state.pet)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: ROLE.partnerDark }}>Vào vườn</Text>
            <Ionicons name="arrow-forward" size={14} color={ROLE.partnerDark} />
          </View>
        </View>
      </TouchableOpacity>
    </ScrollView>

    {/* POP-UP NHỊP TIM — kênh pop-up kiểu thư rơi: hiện khi người ấy vừa gửi một
        chuỗi nhịp mới (cooldown hiệu ứng 30 giây xử lý ở effect phía trên). */}
    {pingPop !== null && (
      <View style={{ position: "absolute", top: insets.top + 10, left: 0, right: 0, alignItems: "center", zIndex: 10 }} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => setPingPop(null)}
          accessibilityLabel="Đóng thông báo nhớ bạn"
          style={{ backgroundColor: COLOR.letterPaper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.letterLine, paddingHorizontal: 22, paddingVertical: 13, alignItems: "center", gap: 2, ...SHADOW_FLOAT }}
        >
          <HeartGameImage size={46} />
          <Text style={{ fontFamily: FONT.black, fontSize: 15, color: COLOR.text }}>{partner.name} đang nhớ bạn</Text>
          <Text style={s.small}>{pingPop > 1 ? `Một chuỗi ${pingPop} nhịp tim vừa tới` : "Một nhịp tim vừa tới"} — chạm để đóng</Text>
        </TouchableOpacity>
      </View>
    )}
    </View>
  );
}

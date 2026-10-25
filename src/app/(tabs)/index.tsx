import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { useCouplePhotoUrl } from "../../lib/photo";
import { notifyPartnerOfHeartbeat } from "../../lib/push";
import { heartbeatPulse } from "../../lib/feedback";
import { dailyQuote, greetingLine, statusMoodById } from "../../lib/content";
import { dayKeyLocal, today } from "../../lib/types";
import { MILESTONES, dayCount, milestoneReached, nextMilestone, statusFreshnessLabel, statusStale, timeAgoText } from "../../lib/features";
import { currentDailyQuests } from "../../lib/quests";
import { HomeGardenScene } from "../../components/Art";
import { CouplePolaroid } from "../../components/CouplePhoto";
import Avatar from "../../components/Avatar";
import { HeartBurst } from "../../components/HeartBurst";
import { PersonChip, partnerOf, personOf, selfOf } from "../../components/PersonChip";
import { usePestWatch, useStageUp } from "../../components/Popups";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { Medallion, ProgressBar, SkeletonCard, StatusChip, s, tabBarPad, useNow } from "../../components/ui";

/**
 * Trang Nhà — bản GỌN (2026-10-23): nhà chỉ để NGẮM và CẢM, không phải sảnh
 * điều hướng (đã có tab bar lo việc đi lại). Nội dung CHỈ gồm 4 mục, tất cả
 * tĩnh — không hàng link, không chevron, không bấm-xem-thêm:
 * (1) HERO: tranh cảnh vườn mới phủ kín (hai cây hoa đan tán thành trái tim) +
 *     lớp scrim mềm ở đáy ôm "Ngày N" + dòng cột mốc + thanh tiến trình mốc.
 * (2) Lời chào theo buổi: dòng RIÊNG đứng ngay dưới hero (lời chào là cảm xúc,
 *     không phải dữ kiện — không nhốt trong card).
 * (3) Ba thẻ RIÊNG BIỆT, mỗi thẻ một dữ kiện + tile icon của nó: "Nhịp nhớ
 *     hôm nay" (ôm ĐÚNG 1 nút chính "Gửi nhịp nhớ"), "Chăm cây", "Nhiệm vụ
 *     hôm nay" — không còn nhồi tất cả vào một card "Hôm nay" (feedback chủ
 *     app 2026-10-25: "cái nào ra cái đó").
 * (4) Note mới nhất: xem trước TĨNH (không bấm sang tab Note).
 * (5) "Dấu vết gần nhất": tối đa 3 dòng hoạt động gần nhất, tĩnh.
 * Cả màn vừa khoảng một viewport + cuộn nhẹ là hết.
 *
 * Đợt "chất app" 1 (2026-10-25) — Nhà lấy HAI ĐỨA làm trung tâm:
 * - Hero có mặt cả hai: avatar chồng nhau + "{Bạn} & {Người ấy}" ngay trên
 *   "Ngày N" — bộ đếm không còn đứng một mình giữa phong cảnh.
 * - "Câu tình hôm nay" dưới dòng cột mốc: 1 câu/ngày, xác định theo ngày nên
 *   2 máy thấy cùng một câu (lib/content.dailyQuote).
 * - Lời chào theo buổi đứng RIÊNG dưới hero, gọi tên cả hai người.
 * - Gửi nhịp nhớ có CẢM GIÁC: rung nhịp tim đôi + mưa tim bay lên từ card
 *   (lib/feedback + components/HeartBurst).
 */
const ACT_ICON: Record<string, string> = {
  water: "water", sunny: "sunny", heart: "heart", bug: "bug", sparkles: "sparkles",
  mail: "mail", location: "location", "document-text": "document-text", people: "people", leaf: "leaf",
};

export default function HomeScreen() {
  const { state, dispatch, hydrated } = useLove();
  const insets = useSafeAreaInsets();
  const nowTick = useNow(60000);
  const [burst, setBurst] = useState(0);
  const photoUrl = useCouplePhotoUrl(state.couplePhoto);
  useStageUp(state, dispatch);
  usePestWatch(state, dispatch);

  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
  const hour = new Date(nowTick).getHours();
  const count = dayCount(state.couple.startDate);
  const next = nextMilestone(count);
  const reached = milestoneReached(count);
  const celebrated = state.couple.celebrated.includes(reached ?? -1);

  // Chạm mốc -> ghi nhận ăn mừng đúng 1 lần (cờ celebrated hợp nhất 2 máy).
  useEffect(() => {
    if (hydrated && reached && !celebrated) {
      dispatch({ type: "MARK_MILESTONE", days: reached, actor: myName(state) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, reached, celebrated]);

  if (!hydrated) {
    return (
      <View style={s.screen}>
        <View style={{ padding: SPACE.screenX, gap: 12 }}>
          <SkeletonCard height={330} />
          <SkeletonCard height={160} />
          <SkeletonCard height={104} />
          <SkeletonCard height={104} />
        </View>
      </View>
    );
  }

  const prevMilestone = [...MILESTONES].filter((m) => m <= count).pop() ?? 0;
  const milestonePct = next ? Math.min(100, Math.round(((count - prevMilestone) / (next.days - prevMilestone)) * 100)) : 100;

  const latestNote = state.notes[0];
  const latestNoteIsNew = Boolean(latestNote && latestNote.authorSlot !== me && !latestNote.readAt);
  // Nhịp nhớ là MỘT CHIỀU: người bấm là người đang nhớ. Đếm TÁCH theo hướng
  // gửi (người gửi = chủ slot của bộ đếm ngày), không cộng gộp hai chiều.
  const partnerSlot = me === "A" ? "B" : "A";
  const dayIsToday = state.pings.day.date === today();
  const myPingsToday = dayIsToday ? state.pings.day[me] : 0;
  const partnerPingsToday = dayIsToday ? state.pings.day[partnerSlot] : 0;
  const pingLine =
    myPingsToday > 0 && partnerPingsToday > 0
      ? `Hôm nay bạn đã gửi cho ${partner.name} ${myPingsToday} nhịp · ${partner.name} đã gửi bạn ${partnerPingsToday} nhịp.`
      : myPingsToday > 0
        ? `Hôm nay bạn đã gửi cho ${partner.name} ${myPingsToday} nhịp.`
        : partnerPingsToday > 0
          ? `Hôm nay ${partner.name} đã gửi bạn ${partnerPingsToday} nhịp — gửi lại một nhịp cho ${partner.name} nhé.`
          : `Hôm nay chưa có nhịp nhớ nào — gửi nhịp đầu tiên cho ${partner.name} nhé.`;

  /* Tóm tắt chăm cây hôm nay — chữ TĨNH (không phải lối tắt sang tab Cây) */
  const lastCareAt = state.tree.lastCareAt;
  const caredToday = Boolean(lastCareAt) && dayKeyLocal(new Date(lastCareAt)) === today();
  const lastCareName = state.tree.lastCareBySlot ? personOf(state, state.tree.lastCareBySlot).name : "";
  const careSummary = caredToday && lastCareName
    ? `Chăm cây gần nhất: ${lastCareName} · ${timeAgoText(lastCareAt)} — tổng ${state.tree.careCount} lần chăm.`
    : state.tree.careCount > 0
      ? `Hôm nay chưa ai chăm cây · tổng ${state.tree.careCount} lần chăm từ trước tới nay.`
      : "Chưa ai chăm cây lần nào — cây đang chờ hai đứa ghé thăm.";

  /* Nhiệm vụ ngày — thẻ RIÊNG dưới đây chỉ đọc số đã xong + cờ hoàn thành
   * (Home không chứa lối tắt sang tab Cây). */
  const dqHome = currentDailyQuests(state.dailyQuests);
  const questsDoneHome = dqHome.quests.filter((q) => q.count >= q.target).length;
  const questsAllDoneHome = Boolean(dqHome.allCompletedAt);

  /* Trạng thái của NGƯỜI ẤY (hiện diện sống): hiện ngay dưới hàng tên trong
   * hero — trạng thái là CỦA HỌ, nhãn luôn gắn tên họ để không mơ hồ là của
   * ai. Quá 24h thì mờ đi + kèm nhãn "từ hôm qua". Chưa đặt -> không hiện gì
   * (không ép dòng trống lên phía người ấy). */
  const partnerStatus = state.status[partner.slot];
  const partnerMood = partnerStatus ? statusMoodById(partnerStatus.mood) : undefined;
  const partnerStatusStale = partnerStatus ? statusStale(partnerStatus, nowTick) : false;

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {/* (1) HERO — cảnh vườn + Ngày N trên scrim mềm */}
        <View style={{ position: "relative" }}>
        <View style={{ borderRadius: RADIUS.scene, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden", backgroundColor: COLOR.gardenWash }}>
          <HomeGardenScene height={336} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <View style={{ height: 26, backgroundColor: "rgba(255,247,240,0.38)" }} />
            <View style={{ backgroundColor: "rgba(255,247,240,0.93)", paddingHorizontal: 20, paddingTop: 2, paddingBottom: 16, alignItems: "center" }}>
              {reached && celebrated && count - reached <= 6 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FDF3D8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={14} color={COLOR.legendary} />
                  <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: "#8A6108" }}>Chúc mừng mốc {reached} ngày yêu!</Text>
                </View>
              ) : null}
              {/* Hai đứa hiện diện ngay trên bộ đếm: avatar chồng + tên của cả hai */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
                <Avatar id={self.avatar} size={36} ring="#FFF7F0" />
                <View style={{ marginLeft: -12 }}>
                  <Avatar id={partner.avatar} size={36} ring="#FFF7F0" />
                </View>
                <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text, marginLeft: 10 }}>{self.name} & {partner.name}</Text>
              </View>
              {partnerStatus && partnerMood ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7, maxWidth: "94%", opacity: partnerStatusStale ? 0.55 : 1 }}>
                  <Ionicons name={partnerMood.icon as never} size={13} color={ROLE.partnerDark} />
                  <Text numberOfLines={1} style={{ fontFamily: FONT.medium, fontSize: 12.5, color: COLOR.textSoft }}>
                    {partner.name} · {partnerMood.label}{partnerStatus.text ? ` — “${partnerStatus.text}”` : ""}{partnerStatusStale ? ` · ${statusFreshnessLabel(partnerStatus, nowTick)}` : ""}
                  </Text>
                </View>
              ) : null}
              <Text style={{ ...TYPE.display, color: COLOR.text }}>Ngày {count}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, marginTop: 3, textAlign: "center" }}>
                {next ? `Còn ${next.remaining} ngày nữa tới mốc ${next.days} ngày` : "Hai đứa đã đi qua mọi cột mốc trong danh sách — cứ yêu tiếp thôi"}
              </Text>
              {/* Hàng dưới của hero: TRÁI = cột câu tình + thanh tiến trình mốc
                  (flex 1), PHẢI = ảnh hai đứa trong Ô RIÊNG in-flow 92px.
                  (Sửa 2026-10-25 theo ảnh chủ app gửi: polaroid absolute cũ đè
                  lên chữ câu tình + đầu phải thanh tiến trình và thò ra khỏi
                  đáy hero — nay ảnh có chỗ ngồi hẳn hoi bên trong padding,
                  không chữ nào chạy dưới ảnh nữa. Chưa đặt ảnh -> cột trái
                  phủ kín bề ngang như cũ, không ô trống, không nhảy layout.) */}
              <View style={{ flexDirection: "row", alignItems: "center", width: "100%", marginTop: 7, gap: state.couplePhoto && photoUrl ? 14 : 0 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONT.medium, fontStyle: "italic", fontSize: 13.5, color: ROLE.selfDark, textAlign: "center" }}>
                    {`“${dailyQuote()}”`}
                  </Text>
                  <View style={{ marginTop: 12 }}>
                    <ProgressBar value={milestonePct} color={COLOR.primary} height={8} />
                  </View>
                </View>
                {state.couplePhoto && photoUrl ? <CouplePolaroid url={photoUrl} width={92} /> : null}
              </View>
            </View>
          </View>
        </View>
        </View>

        {/* (2) Lời chào — dòng RIÊNG đứng dưới hero: lời chào là cảm xúc, không phải dữ kiện */}
        <Text style={{ ...TYPE.emphasis, color: COLOR.text, paddingHorizontal: 4 }}>
          {greetingLine(hour, self.name, partner.name)}
        </Text>

        {/* (3a) Nhịp nhớ hôm nay — thẻ riêng, ôm CTA chính DUY NHẤT của màn */}
        <View style={[s.card, { position: "relative" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Medallion icon="heart" size={40} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text, flex: 1 }}>Nhịp nhớ hôm nay</Text>
          </View>
          {myPingsToday > 0 && partnerPingsToday > 0 ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ ...TYPE.body, color: COLOR.textSoft, flex: 1 }}>Bạn → {partner.name}</Text>
                <Text style={{ ...TYPE.bodyStrong, color: ROLE.selfDark }}>{myPingsToday} nhịp</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ ...TYPE.body, color: COLOR.textSoft, flex: 1 }}>{partner.name} → Bạn</Text>
                <Text style={{ ...TYPE.bodyStrong, color: ROLE.partnerDark }}>{partnerPingsToday} nhịp</Text>
              </View>
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 10 }}>{pingLine}</Text>
          )}
          <TouchableOpacity
            onPress={() => {
              dispatch({ type: "PING_SEND", user: me, actor: myName(state) });
              notifyPartnerOfHeartbeat();
              heartbeatPulse();
              setBurst((b) => b + 1);
            }}
            style={[s.btn, { marginTop: 14 }]}
            accessibilityRole="button"
            accessibilityLabel="Gửi nhịp nhớ"
          >
            <Ionicons name="heart" size={19} color="#fff" />
            <Text style={s.btnText}>Gửi nhịp nhớ</Text>
          </TouchableOpacity>
          <HeartBurst burstKey={burst} />
        </View>

        {/* (3b) Chăm cây — thẻ riêng: lần chăm gần nhất + tổng số lần (tĩnh) */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Medallion icon="leaf" color={ROLE.partnerDark} bg={ROLE.partnerSoft} size={40} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text, flex: 1 }}>Chăm cây</Text>
          </View>
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 10 }}>{careSummary}</Text>
        </View>

        {/* (3c) Nhiệm vụ hôm nay — thẻ riêng: thanh 3 đoạn theo số việc đã xong,
            vẫn KHÔNG link (Home không điều hướng) */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Medallion icon="flag" color={ROLE.sharedDark} bg={ROLE.sharedSoft} size={40} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text, flex: 1 }}>Nhiệm vụ hôm nay</Text>
            <Text style={{ ...TYPE.bodyStrong, color: COLOR.text }}>{questsDoneHome}/3</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: i < questsDoneHome ? COLOR.primary : COLOR.track }} />
            ))}
          </View>
          {questsAllDoneHome ? (
            <Text style={{ ...TYPE.caption, color: COLOR.legendary, marginTop: 9 }}>Đã hoàn thành — cây đang tỏa hào quang vàng</Text>
          ) : null}
        </View>

        {/* (4) Note mới nhất — xem trước TĨNH, không điều hướng */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.micro, color: COLOR.textSoft, flex: 1 }}>Note mới nhất</Text>
            {latestNoteIsNew ? <StatusChip label="Mới" variant="accent" /> : null}
          </View>
          {latestNote ? (
            <View style={{ marginTop: 10, gap: 7 }}>
              <PersonChip state={state} slot={latestNote.authorSlot} size={20} />
              <Text style={{ ...TYPE.emphasis, color: COLOR.text }} numberOfLines={3}>{latestNote.text}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>{timeAgoText(latestNote.createdAt)}</Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>Chưa có note nào — note đầu tiên của hai đứa sẽ hiện ở đây.</Text>
          )}
        </View>

        {/* (5) Dấu vết gần nhất — tối đa 3 dòng, tĩnh */}
        {state.activities.length > 0 ? (
          <View style={s.card}>
            <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Dấu vết gần nhất</Text>
            <View style={{ marginTop: 10, gap: 11 }}>
              {state.activities.slice(0, 3).map((a) => (
                <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: ROLE.selfSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={(ACT_ICON[a.icon] || "heart") as never} size={14} color={ROLE.selfDark} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.text }}>
                    <Text style={{ fontFamily: FONT.bold }}>{a.actor}</Text> {a.text}
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint }}>{timeAgoText(a.time)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

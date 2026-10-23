import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { PING_DAILY_MAX, formatDateVN, today } from "../../lib/types";
import { MILESTONES, dayCount, distanceText, haversineKm, milestoneReached, nextMilestone, shareStatus, timeAgoText } from "../../lib/features";
import { stageInfo, treeHealth, decayedStats } from "../../lib/tree";
import Avatar from "../../components/Avatar";
import { PlantScene } from "../../components/Art";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { LetterAndPingPops, useStageUp } from "../../components/Popups";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TYPE } from "../../components/theme";
import { ChipButton, ProgressBar, SkeletonCard, StatusChip, s, tabBarPad } from "../../components/ui";

/**
 * Trang Nhà — trái tim của bản rebuild. Ngân sách phần tử:
 * (0) Dòng chào: chồng avatar hai người + "Chào buổi ..., {tên}".
 * (1) HERO: bệ cảnh Cây Tình Yêu (tranh giai đoạn hiện tại) + "Ngày N" 42/900 +
 *     dòng tiến tới cột mốc tiếp theo + 1 dòng trạng thái cây + dấu vết người ấy.
 * (2) Card "Hôm nay": ĐÚNG 1 CTA chính theo ưu tiên — note chưa đọc của người ấy >
 *     người ấy đang chia sẻ vị trí > cây cần chăm > mặc định gửi nhịp nhớ.
 * (3) Thẻ note mới nhất (badge chưa đọc) + thẻ vị trí đang chạy (khi có) +
 *     nhật ký mini 5 dòng gần nhất.
 */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 13) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

const ACT_ICON: Record<string, string> = {
  water: "water", sunny: "sunny", heart: "heart", bug: "bug", sparkles: "sparkles",
  mail: "mail", location: "location", "document-text": "document-text", people: "people", leaf: "leaf",
};

export default function HomeScreen() {
  const { state, dispatch, hydrated } = useLove();
  const insets = useSafeAreaInsets();
  useStageUp(state, dispatch);

  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
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
          <SkeletonCard height={300} />
          <SkeletonCard height={130} />
          <SkeletonCard height={110} />
        </View>
      </View>
    );
  }

  const info = stageInfo(state.tree);
  const stats = decayedStats(state.tree);
  const health = treeHealth(stats);
  const prevMilestone = [...MILESTONES].filter((m) => m <= count).pop() ?? 0;
  const milestonePct = next ? Math.min(100, Math.round(((count - prevMilestone) / (next.days - prevMilestone)) * 100)) : 100;

  const unreadPartnerNotes = state.notes.filter((n) => n.authorSlot !== me && !n.readAt);
  const latestNote = state.notes[0];
  const partnerShare = shareStatus(state.presence[partner.slot]);
  const myShare = shareStatus(state.presence[me]);
  const pingsToday = state.pings.day.date === today() ? state.pings.day.A + state.pings.day.B : 0;
  const myPingsToday = state.pings.day.date === today() ? state.pings.day[me] : 0;
  const lastPartnerAct = state.activities.find((a) => a.slot && a.slot !== me);
  const lastCareSlot = state.tree.lastCareBySlot;

  /* CTA "Hôm nay" theo thứ tự ưu tiên */
  let todayTitle = "Gửi một nhịp nhớ";
  let todayDesc = `Hôm nay hai đứa đã nhớ nhau ${pingsToday} nhịp. Chạm để người ấy biết bạn đang nghĩ tới họ.`;
  let todayIcon: string = "heart";
  let todayAction = () => dispatch({ type: "PING_SEND", user: me, actor: myName(state) });
  let todayDisabled = myPingsToday >= PING_DAILY_MAX;
  if (todayDisabled) todayDesc = `Hôm nay bạn đã gửi đủ ${PING_DAILY_MAX} nhịp rồi — để dành nhớ thương cho ngày mai nhé.`;
  if (health.status === "need" || health.status === "wilted") {
    todayTitle = "Cây đang cần chăm";
    todayDesc = health.message;
    todayIcon = "leaf";
    todayAction = () => router.push("/(tabs)/tree");
    todayDisabled = false;
  }
  if (partnerShare.active) {
    todayTitle = `Xem vị trí của ${partner.name}`;
    todayDesc = `${partner.name} đang chia sẻ vị trí tạm thời với bạn.`;
    todayIcon = "location";
    todayAction = () => router.push("/location");
    todayDisabled = false;
  }
  if (unreadPartnerNotes.length > 0) {
    todayTitle = `Đọc note của ${partner.name}`;
    todayDesc = `${partner.name} vừa gửi ${unreadPartnerNotes.length} note chưa đọc cho bạn.`;
    todayIcon = "document-text";
    todayAction = () => router.push("/(tabs)/notes");
    todayDisabled = false;
  }

  const partnerSlotPresence = state.presence[partner.slot];
  const myPresence = state.presence[me];
  const bothFix = partnerSlotPresence.lat != null && partnerSlotPresence.lng != null && myPresence.lat != null && myPresence.lng != null;
  const distKm = bothFix ? haversineKm({ lat: partnerSlotPresence.lat!, lng: partnerSlotPresence.lng! }, { lat: myPresence.lat!, lng: myPresence.lng! }) : null;

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {/* (0) Dòng chào */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <Avatar id={self.avatar} size={40} ring={self.main} />
            <View style={{ marginLeft: -12 }}>
              <Avatar id={partner.avatar} size={40} ring={partner.main} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text }}>{greeting()}, {self.name}</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft }}>{partner.name} đang ở đầu bên kia của khu vườn</Text>
          </View>
        </View>

        {/* (1) HERO — cây + Ngày N */}
        <View style={{ backgroundColor: "#fff", borderRadius: RADIUS.scene, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden", ...SHADOW }}>
          <View style={{ backgroundColor: COLOR.gardenWash }}>
            <PlantScene stageIndex={info.index} status={health.status} height={196} imgHeight={178} />
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, alignItems: "center" }}>
            {reached && celebrated && count - reached <= 6 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FDF3D8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 }}>
                <Ionicons name="sparkles" size={14} color={COLOR.legendary} />
                <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: "#8A6108" }}>Chúc mừng mốc {reached} ngày yêu!</Text>
              </View>
            ) : null}
            <Text style={{ ...TYPE.display, color: COLOR.text }}>Ngày {count}</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, marginTop: 4 }}>
              {`Yêu nhau từ ${formatDateVN(state.couple.startDate)} · Cây đang ở giai đoạn "${info.stage.name}"`}
            </Text>
            <View style={{ width: "100%", marginTop: 14 }}>
              <ProgressBar value={milestonePct} color={COLOR.primary} height={8} />
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, marginTop: 6, textAlign: "center" }}>
                {next ? `Còn ${next.remaining} ngày nữa tới mốc ${next.days} ngày` : "Hai đứa đã đi qua mọi cột mốc trong danh sách — cứ yêu tiếp thôi"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#FFF6EF", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}>
              <Ionicons name={health.status === "wilted" ? "alert-circle" : "leaf"} size={13} color={health.status === "wilted" ? COLOR.danger : COLOR.successText} />
              <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.textSoft }}>{health.message}</Text>
            </View>
            {lastCareSlot ? (
              <View style={{ marginTop: 10 }}>
                <PersonChip state={state} slot={lastCareSlot} size={20} />
              </View>
            ) : null}
            {lastPartnerAct ? (
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 8, textAlign: "center" }}>
                Gần nhất: {lastPartnerAct.actor} {lastPartnerAct.text} · {timeAgoText(lastPartnerAct.time)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* (2) Hôm nay — 1 CTA chính */}
        <View style={[s.card, { marginTop: 2 }]}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Hôm nay của hai đứa</Text>
          <Text style={{ ...TYPE.cardTitle, color: COLOR.text, marginTop: 6 }}>{todayTitle}</Text>
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 4 }}>{todayDesc}</Text>
          <TouchableOpacity
            onPress={todayAction}
            disabled={todayDisabled}
            style={[s.btn, { marginTop: 14, opacity: todayDisabled ? 0.55 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={todayTitle}
            accessibilityState={{ disabled: todayDisabled }}
          >
            <Ionicons name={todayIcon as never} size={19} color="#fff" />
            <Text style={s.btnText}>{todayTitle}</Text>
          </TouchableOpacity>
        </View>

        {/* (3a) Note mới nhất */}
        <Pressable onPress={() => router.push("/(tabs)/notes")} style={[s.card, { marginTop: 2 }]} accessibilityRole="button" accessibilityLabel="Mở tab Note">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.micro, color: COLOR.textSoft, flex: 1 }}>Note tình yêu</Text>
            {unreadPartnerNotes.length > 0 ? <StatusChip label={`${unreadPartnerNotes.length} chưa đọc`} variant="accent" /> : null}
          </View>
          {latestNote ? (
            <View style={{ marginTop: 10, gap: 7 }}>
              <PersonChip state={state} slot={latestNote.authorSlot} size={20} />
              <Text style={{ ...TYPE.emphasis, color: COLOR.text }} numberOfLines={2}>{latestNote.text}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>{timeAgoText(latestNote.createdAt)}</Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>Chưa có note nào — viết note đầu tiên cho người ấy nhé.</Text>
          )}
        </Pressable>

        {/* (3b) Vị trí đang chia sẻ (chỉ hiện khi có phiên chạy) */}
        {myShare.active || partnerShare.active ? (
          <Pressable onPress={() => router.push("/location")} style={[s.card, { marginTop: 2 }]} accessibilityRole="button" accessibilityLabel="Mở màn định vị tạm thời">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ ...TYPE.micro, color: COLOR.textSoft, flex: 1 }}>Định vị tạm thời</Text>
              <Ionicons name="chevron-forward" size={16} color={COLOR.chevron} />
            </View>
            {partnerShare.active ? (
              <Text style={{ ...TYPE.body, color: COLOR.text, marginTop: 8 }}>
                {partner.name} đang chia sẻ vị trí{distKm != null ? ` — ${distanceText(distKm)}` : ""} · cập nhật {timeAgoText(partnerSlotPresence.locAt || partnerSlotPresence.at)}
              </Text>
            ) : null}
            {myShare.active ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: partnerShare.active ? 8 : 8 }}>
                <Text style={{ ...TYPE.body, color: COLOR.text, flex: 1 }}>
                  Bạn đang chia sẻ vị trí{myShare.remainingMs != null ? ` — phiên còn đang chạy` : " — đến khi tự tắt"}
                </Text>
                <ChipButton label="Dừng" variant="price" onPress={() => dispatch({ type: "PRESENCE_STOP", user: me, actor: myName(state), reason: "manual" })} />
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {/* (3c) Nhật ký mini */}
        {state.activities.length > 0 ? (
          <View style={[s.card, { marginTop: 2 }]}>
            <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Dấu vết của hai đứa</Text>
            <View style={{ marginTop: 10, gap: 11 }}>
              {state.activities.slice(0, 5).map((a) => (
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
      <LetterAndPingPops />
    </View>
  );
}

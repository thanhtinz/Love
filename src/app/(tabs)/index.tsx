import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { PING_DAILY_MAX, dayKeyLocal, today } from "../../lib/types";
import { MILESTONES, dayCount, milestoneReached, nextMilestone, timeAgoText } from "../../lib/features";
import { HomeGardenScene } from "../../components/Art";
import { PersonChip, personOf } from "../../components/PersonChip";
import { LetterAndPingPops, useStageUp } from "../../components/Popups";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { ProgressBar, SkeletonCard, StatusChip, s, tabBarPad } from "../../components/ui";

/**
 * Trang Nhà — bản GỌN (2026-10-23): nhà chỉ để NGẮM và CẢM, không phải sảnh
 * điều hướng (đã có tab bar lo việc đi lại). Nội dung CHỈ gồm 4 mục, tất cả
 * tĩnh — không hàng link, không chevron, không bấm-xem-thêm:
 * (1) HERO: tranh cảnh vườn mới phủ kín (hai cây hoa đan tán thành trái tim) +
 *     lớp scrim mềm ở đáy ôm "Ngày N" + dòng cột mốc + thanh tiến trình mốc.
 * (2) Card "Hôm nay": số nhịp nhớ hôm nay + tóm tắt chăm cây (chữ tĩnh) +
 *     ĐÚNG 1 nút chính "Gửi nhịp nhớ".
 * (3) Note mới nhất: xem trước TĨNH (không bấm sang tab Note).
 * (4) "Dấu vết gần nhất": tối đa 3 dòng hoạt động gần nhất, tĩnh.
 * Cả màn vừa khoảng một viewport + cuộn nhẹ là hết.
 */
const ACT_ICON: Record<string, string> = {
  water: "water", sunny: "sunny", heart: "heart", bug: "bug", sparkles: "sparkles",
  mail: "mail", location: "location", "document-text": "document-text", people: "people", leaf: "leaf",
};

export default function HomeScreen() {
  const { state, dispatch, hydrated } = useLove();
  const insets = useSafeAreaInsets();
  useStageUp(state, dispatch);

  const me = state.currentUser;
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
          <SkeletonCard height={150} />
          <SkeletonCard height={110} />
        </View>
      </View>
    );
  }

  const prevMilestone = [...MILESTONES].filter((m) => m <= count).pop() ?? 0;
  const milestonePct = next ? Math.min(100, Math.round(((count - prevMilestone) / (next.days - prevMilestone)) * 100)) : 100;

  const latestNote = state.notes[0];
  const latestNoteIsNew = Boolean(latestNote && latestNote.authorSlot !== me && !latestNote.readAt);
  const pingsToday = state.pings.day.date === today() ? state.pings.day.A + state.pings.day.B : 0;
  const myPingsToday = state.pings.day.date === today() ? state.pings.day[me] : 0;
  const pingFull = myPingsToday >= PING_DAILY_MAX;

  /* Tóm tắt chăm cây hôm nay — chữ TĨNH (không phải lối tắt sang tab Cây) */
  const lastCareAt = state.tree.lastCareAt;
  const caredToday = Boolean(lastCareAt) && dayKeyLocal(new Date(lastCareAt)) === today();
  const lastCareName = state.tree.lastCareBySlot ? personOf(state, state.tree.lastCareBySlot).name : "";
  const careSummary = caredToday && lastCareName
    ? `Chăm cây gần nhất: ${lastCareName} · ${timeAgoText(lastCareAt)} — tổng ${state.tree.careCount} lần chăm.`
    : state.tree.careCount > 0
      ? `Hôm nay chưa ai chăm cây · tổng ${state.tree.careCount} lần chăm từ trước tới nay.`
      : "Chưa ai chăm cây lần nào — cây đang chờ hai đứa ghé thăm.";

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {/* (1) HERO — cảnh vườn + Ngày N trên scrim mềm */}
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
              <Text style={{ ...TYPE.display, color: COLOR.text }}>Ngày {count}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, marginTop: 3, textAlign: "center" }}>
                {next ? `Còn ${next.remaining} ngày nữa tới mốc ${next.days} ngày` : "Hai đứa đã đi qua mọi cột mốc trong danh sách — cứ yêu tiếp thôi"}
              </Text>
              <View style={{ width: "100%", marginTop: 12 }}>
                <ProgressBar value={milestonePct} color={COLOR.primary} height={8} />
              </View>
            </View>
          </View>
        </View>

        {/* (2) Hôm nay — nhịp nhớ + tóm tắt chăm cây (tĩnh) + 1 CTA */}
        <View style={[s.card, { marginTop: 2 }]}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Hôm nay</Text>
          <Text style={{ ...TYPE.emphasis, color: COLOR.text, marginTop: 8 }}>
            Hôm nay hai đứa đã nhớ nhau {pingsToday} nhịp.
          </Text>
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 4 }}>{careSummary}</Text>
          {pingFull ? (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 4 }}>
              Bạn đã gửi đủ {PING_DAILY_MAX} nhịp hôm nay rồi — để dành nhớ thương cho ngày mai nhé.
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => dispatch({ type: "PING_SEND", user: me, actor: myName(state) })}
            disabled={pingFull}
            style={[s.btn, { marginTop: 14, opacity: pingFull ? 0.55 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Gửi nhịp nhớ"
            accessibilityState={{ disabled: pingFull }}
          >
            <Ionicons name="heart" size={19} color="#fff" />
            <Text style={s.btnText}>Gửi nhịp nhớ</Text>
          </TouchableOpacity>
        </View>

        {/* (3) Note mới nhất — xem trước TĨNH, không điều hướng */}
        <View style={[s.card, { marginTop: 2 }]}>
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

        {/* (4) Dấu vết gần nhất — tối đa 3 dòng, tĩnh */}
        {state.activities.length > 0 ? (
          <View style={[s.card, { marginTop: 2 }]}>
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
      <LetterAndPingPops />
    </View>
  );
}

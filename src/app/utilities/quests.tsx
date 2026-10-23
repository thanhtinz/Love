import React, { useState } from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, makeLetter, myName } from "../../lib/store";
import { ACHIEVEMENTS, QUESTS } from "../../lib/data";
import { daysTogether, nextMilestone, today, MILESTONES } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, Segmented, s } from "../../components/ui";
import { MascotArt } from "../../components/Art";

export default function QuestsScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const meName = myName(state);
  const [falling, setFalling] = useState(false);
  const [fallAnim] = useState(() => new Animated.Value(0));
  const [tab, setTab] = useState<"quests" | "badges">("quests");
  const days = daysTogether(state.startDate);
  const nm = nextMilestone(days);

  // Tiến độ nhiệm vụ cá nhân = số lần chăm của CHÍNH người đó hôm nay; nhiệm vụ "both" là tiến độ chung duy nhất
  function progressFor(q: (typeof QUESTS)[0], slot: "A" | "B"): number {
    if (q.key === "water") return state.daily[slot].water;
    if (q.key === "love") return state.daily[slot].love;
    return (state.daily.caredA ? 1 : 0) + (state.daily.caredB ? 1 : 0);
  }
  function claimedFor(slot: "A" | "B", questId: string): boolean {
    return slot === "A" ? state.daily.claimedA.includes(questId) : state.daily.claimedB.includes(questId);
  }
  function claimQuest(q: (typeof QUESTS)[0]) {
    if (claimedFor(me.slot, q.id) || progressFor(q, me.slot) < q.target) return; // idempotent ở cả UI lẫn store
    // Id xác định theo (ngày, nhiệm vụ, người nhận): mỗi người nhận thưởng 1 lần/ngày —
    // id giống nhau giữa các lần dispatch/đồng bộ để store + merge chống cộng trùng thư.
    const drop = q.id === "both" ? { ...makeLetter("rare", "Thưởng nhiệm vụ Song chăm", state.letters.map((l) => l.messageId)), id: `quest-both-${today()}-${me.slot}` } : null;
    dispatch({ type: "CLAIM_QUEST", questId: q.id, actor: meName, user: me.slot, rewardXp: q.rewardXp, drop });
    if (drop) {
      setFalling(true);
      fallAnim.setValue(0);
      Animated.timing(fallAnim, { toValue: 1, duration: 1300, useNativeDriver: true }).start();
      setTimeout(() => setFalling(false), 8000);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Nhiệm vụ & huy hiệu" subtitle="Nhiệm vụ ngày tính riêng từng người — huy hiệu và streak là chung" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Dải đếm ngày GỌN (1 khối nhỏ) + segmented Nhiệm vụ/Huy hiệu để màn hình ngắn lại */}
        <View style={[s.card, { backgroundColor: "#FFE9EE", gap: 7 }]}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7 }}>
            <Text style={{ fontSize: 30, fontFamily: "BeVietnamPro_900Black", color: C.pinkDark, lineHeight: 36 }}>{days}</Text>
            <Text style={{ fontFamily: "BeVietnamPro_700Bold", color: C.text, fontSize: 13.5 }}>ngày bên nhau · streak {state.streak.count} ngày</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontFamily: "BeVietnamPro_700Bold", color: C.text }}>Mốc {nm.target} ngày</Text>
            <Text style={{ fontSize: 12, fontFamily: "BeVietnamPro_800ExtraBold", color: C.pinkDark }}>còn {nm.remaining} ngày</Text>
          </View>
          <View style={{ height: 8, borderRadius: 99, backgroundColor: "#fff", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${Math.min(100, (days / nm.target) * 100)}%`, backgroundColor: C.pink, borderRadius: 99 }} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
            {MILESTONES.map((m) => (
              <View key={m} style={[s.chip, { backgroundColor: days >= m ? "#dcfce7" : "#fff", minHeight: 24, paddingVertical: 2 }]}>
                <Ionicons name={days >= m ? "checkmark-circle" : "ellipse-outline"} size={11} color={days >= m ? "#16a34a" : C.textFaint} />
                <Text style={[s.chipText, { color: days >= m ? "#15803d" : C.textFaint, fontSize: 11 }]}>{m}</Text>
              </View>
            ))}
          </View>
        </View>

        <Segmented options={[{ id: "quests" as const, label: "Nhiệm vụ hôm nay" }, { id: "badges" as const, label: `Huy hiệu (${state.achievements.length}/${ACHIEVEMENTS.length})` }]} value={tab} onChange={setTab} />

        {/* Nhiệm vụ hôm nay — theo từng người */}
        {tab === "quests" && (
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <MascotArt size={52} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Nhiệm vụ của từng người</Text>
              <Text style={s.sub}>Mỗi người tự làm và tự nhận thưởng của mình.</Text>
            </View>
          </View>
          <View style={{ gap: 12, marginTop: 11 }}>
            {QUESTS.map((q) => {
              const myProg = Math.min(progressFor(q, me.slot), q.target);
              const theirProg = Math.min(progressFor(q, partner.slot), q.target);
              const myClaimed = claimedFor(me.slot, q.id);
              const myDone = myProg >= q.target;
              return (
                <View key={q.id} style={{ backgroundColor: "#fff7f8", borderRadius: 14, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 11, gap: 7 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={q.icon as never} size={19} color={myDone ? C.green : C.textFaint} />
                    <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>{q.label}</Text>
                    {myClaimed ? (<View style={s.chip}><Text style={s.chipText}>Bạn đã nhận</Text></View>) : myDone ? (
                      <TouchableOpacity style={[s.btnGhost, { paddingVertical: 7 }]} onPress={() => claimQuest(q)}><Text style={s.btnGhostText}>Nhận +{q.rewardXp} XP, +{q.rewardCoins} Xu</Text></TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <PersonChip state={state} slot={me.slot} size={18} />
                    <View style={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}><View style={{ height: "100%", width: `${(myProg / q.target) * 100}%`, backgroundColor: C.pink, borderRadius: 99 }} /></View>
                    <Text style={s.small}>{myProg}/{q.target}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <PersonChip state={state} slot={partner.slot} size={18} showYouTag={false} />
                    <View style={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}><View style={{ height: "100%", width: `${(theirProg / q.target) * 100}%`, backgroundColor: "#3EC6B8", borderRadius: 99 }} /></View>
                    <Text style={s.small}>{theirProg}/{q.target}{claimedFor(partner.slot, q.id) ? " · đã nhận" : ""}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        )}

        {/* Huy hiệu — thành tích CHUNG của vườn */}
        {tab === "badges" && (
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Avatar id={me.avatar} size={26} />
            <Ionicons name="heart" size={14} color={C.pink} />
            <Avatar id={partner.avatar} size={26} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.text, flex: 1 }}>Huy hiệu chung ({state.achievements.length}/{ACHIEVEMENTS.length})</Text>
          </View>
          <Text style={s.sub}>Thành tích của cả vườn — hai người cùng góp.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
            {ACHIEVEMENTS.map((a) => {
              const has = state.achievements.includes(a.id);
              return (<View key={a.id} style={[s.chip, { backgroundColor: has ? "#fef3c7" : "#f1f5f9", opacity: has ? 1 : 0.55 }]}><Ionicons name={a.icon as never} size={13} color={has ? "#b45309" : C.textFaint} /><Text style={[s.chipText, { color: has ? "#92400e" : C.textFaint }]}>{a.label}</Text></View>);
            })}
          </View>
        </View>
        )}
      </ScrollView>

      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }) }] }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.pink, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#E5EBF2", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="mail-outline" size={27} color="#2F4A67" />
            </View>
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Thưởng nhiệm vụ: một lá thư Hiếm!</Text>
            <Text style={s.small}>Vào tab Thư để mở đọc</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

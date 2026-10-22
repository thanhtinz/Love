import React, { useState } from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, makeLetter, myName } from "../../lib/store";
import { ACHIEVEMENTS, QUESTS } from "../../lib/data";
import { daysTogether, nextMilestone, MILESTONES } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";

export default function QuestsScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const meName = myName(state);
  const [falling, setFalling] = useState(false);
  const [fallAnim] = useState(() => new Animated.Value(0));
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
    const drop = q.id === "both" ? makeLetter("rare", "Thưởng nhiệm vụ Song chăm", state.letters.map((l) => l.messageId)) : null;
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
        {/* Đếm ngày yêu + mốc */}
        <View style={[s.card, { alignItems: "center", backgroundColor: "#fff1f2" }]}>
          <Text style={s.sub}>Hai bạn đã bên nhau</Text>
          <Text style={{ fontSize: 42, fontWeight: "900", color: C.pinkDark, lineHeight: 48 }}>{days} ngày</Text>
          <Text style={s.sub}>từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")} · Streak chăm cây {state.streak.count} ngày (chung của vườn)</Text>
          <View style={{ width: "100%", marginTop: 10, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text }}>Mốc tiếp theo: {nm.target} ngày</Text>
              <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.pinkDark }}>còn {nm.remaining} ngày</Text>
            </View>
            <View style={{ height: 9, borderRadius: 99, backgroundColor: "#fff", overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.min(100, (days / nm.target) * 100)}%`, backgroundColor: C.pink, borderRadius: 99 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>
            {MILESTONES.map((m) => (
              <View key={m} style={[s.chip, { backgroundColor: days >= m ? "#dcfce7" : "#fff" }]}>
                <Ionicons name={days >= m ? "checkmark-circle" : "ellipse-outline"} size={12} color={days >= m ? "#16a34a" : C.textFaint} />
                <Text style={[s.chipText, { color: days >= m ? "#15803d" : C.textFaint }]}>{m} ngày</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Nhiệm vụ hôm nay — theo từng người */}
        <View style={s.card}>
          <Text style={{ fontWeight: "900", color: C.text }}>Nhiệm vụ hôm nay</Text>
          <Text style={s.sub}>Hai nhiệm vụ đầu tính theo việc chăm cây của CHÍNH bạn; nhiệm vụ Song chăm mới tính chung. Mỗi người tự nhận thưởng của mình — bạn nhận không làm mất lượt nhận của {partner.name}.</Text>
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
                    <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "800", color: C.text }}>{q.label}</Text>
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
                    <View style={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}><View style={{ height: "100%", width: `${(theirProg / q.target) * 100}%`, backgroundColor: "#38bdf8", borderRadius: 99 }} /></View>
                    <Text style={s.small}>{theirProg}/{q.target}{claimedFor(partner.slot, q.id) ? " · đã nhận" : ""}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Huy hiệu — thành tích CHUNG của vườn */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Avatar id={me.avatar} size={26} />
            <Ionicons name="heart" size={14} color={C.pink} />
            <Avatar id={partner.avatar} size={26} />
            <Text style={{ fontWeight: "900", color: C.text, flex: 1 }}>Huy hiệu chung ({state.achievements.length}/{ACHIEVEMENTS.length})</Text>
          </View>
          <Text style={s.sub}>Huy hiệu là thành tích của CẢ VƯỜN (hai người cùng góp) — khác với nhiệm vụ ngày ở trên vốn tính riêng từng người.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
            {ACHIEVEMENTS.map((a) => {
              const has = state.achievements.includes(a.id);
              return (<View key={a.id} style={[s.chip, { backgroundColor: has ? "#fef3c7" : "#f1f5f9", opacity: has ? 1 : 0.55 }]}><Ionicons name={a.icon as never} size={13} color={has ? "#b45309" : C.textFaint} /><Text style={[s.chipText, { color: has ? "#92400e" : C.textFaint }]}>{a.label}</Text></View>);
            })}
          </View>
        </View>
      </ScrollView>

      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] }) }] }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.pink, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3 }}>
            <Ionicons name="mail" size={32} color={C.pink} />
            <Text style={{ fontWeight: "900", color: C.pinkDark }}>Thưởng nhiệm vụ: một lá thư Hiếm!</Text>
            <Text style={s.small}>Vào tab Thư để mở đọc</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

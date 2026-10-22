import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { LOVE_ACTIONS } from "../../lib/data";
import { LOVE_ACTION_COOLDOWN_MS, LOVE_ACTION_DAILY_MAX, today } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { PersonChip, partnerOf, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

export default function LoveActionsScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const partner = partnerOf(state);
  const meName = myName(state);
  const now = useNow(500);
  const lim = state.loveLimits.date === today() ? state.loveLimits : { date: today(), counts: { A: 0, B: 0 }, lastAt: { A: "", B: "" } };
  const myLastAt = lim.lastAt[me.slot];
  const cooldownLeft = myLastAt ? Math.max(0, LOVE_ACTION_COOLDOWN_MS - (now - new Date(myLastAt).getTime())) : 0;
  const myCount = lim.counts[me.slot];
  const reachedMax = myCount >= LOVE_ACTION_DAILY_MAX;
  const disabled = cooldownLeft > 0 || reachedMax;
  const feed = state.activities.filter((a) => LOVE_ACTIONS.some((x) => x.icon === a.icon)).slice(0, 10);
  const senderSlotOf = (actor: string) => (actor === state.personA ? "A" : actor === state.personB ? "B" : null);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Hành động yêu thương" subtitle={`Gửi yêu thương cho ${partner.name} — nghỉ ${LOVE_ACTION_COOLDOWN_MS / 1000} giây giữa 2 lần, tối đa ${LOVE_ACTION_DAILY_MAX} lần/ngày`} />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <PersonChip state={state} slot={me.slot} />
            <Ionicons name="arrow-forward" size={18} color={C.pink} />
            <PersonChip state={state} slot={partner.slot} showYouTag={false} />
          </View>
          <Text style={[s.sub, { marginTop: 7 }]}>Bạn đã gửi {myCount}/{LOVE_ACTION_DAILY_MAX} hành động hôm nay.{reachedMax ? " Đã đạt giới hạn hôm nay rồi." : cooldownLeft > 0 ? ` Chờ ${Math.ceil(cooldownLeft / 1000)} giây nữa để gửi tiếp.` : ""}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 11 }}>
            {LOVE_ACTIONS.map((a) => (
              <TouchableOpacity key={a.kind} disabled={disabled} onPress={() => dispatch({ type: "LOVE_ACTION", kind: a.kind, icon: a.icon, label: a.label, actor: meName, user: me.slot })} style={{ flex: 1, backgroundColor: C.pinkSoft, borderRadius: 16, paddingVertical: 12, alignItems: "center", gap: 3, opacity: disabled ? 0.45 : 1 }}>
                <Ionicons name={a.icon.replace("-outline", "") as never} size={24} color={C.pinkDark} />
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.pinkDark }}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {state.lastLoveAction && (
            <View style={{ marginTop: 11, backgroundColor: "#fdf2f8", borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Avatar id={state.lastLoveAction.memoAvatar || (state.lastLoveAction.by === "A" ? state.avatarA : state.avatarB)} size={28} />
              <Text style={{ flex: 1, fontSize: 12.5, color: C.pinkDark }}>
                Gần nhất: <Text style={{ fontWeight: "800" }}>{state.lastLoveAction.by === me.slot ? `Bạn (${state.lastLoveAction.actor})` : state.lastLoveAction.actor}</Text> vừa {state.lastLoveAction.label} cho {state.lastLoveAction.by === me.slot ? partner.name : `Bạn (${me.name})`} · {new Date(state.lastLoveAction.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={{ fontWeight: "900", color: C.text }}>Dòng yêu thương gần đây</Text>
          <View style={{ gap: 9, marginTop: 10 }}>
            {feed.map((a) => {
              const slot = senderSlotOf(a.actor);
              const receiver = slot ? (slot === "A" ? state.personB : state.personA) : "";
              return (
                <View key={a.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Ionicons name={a.icon as never} size={17} color={C.pink} />
                  <Text style={{ flex: 1, fontSize: 12.5, color: C.text }}>
                    <Text style={{ fontWeight: "800" }}>{slot === me.slot ? `Bạn (${a.actor})` : a.actor}</Text> {a.text.replace(/^vừa\s*/, "")}{receiver ? ` — gửi cho ${slot === me.slot ? receiver : `Bạn (${me.name})`}` : ""}
                  </Text>
                  <Text style={s.small}>{new Date(a.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
                </View>
              );
            })}
            {feed.length === 0 && <Text style={s.sub}>Chưa có hành động yêu thương nào. Gửi cái đầu tiên cho {partner.name} nhé!</Text>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

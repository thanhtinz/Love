import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { CONTENT_ADD_MIN_INTERVAL_MS, today, uid } from "../../lib/types";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s, useNow } from "../../components/ui";

/** Xúc xắc 1 — hành động yêu thương. */
const ACTIONS = [
  "Ôm nhau thật chặt trong 1 phút",
  "Hôn má người ấy một cái thật kêu",
  "Nắm tay nhau đi dạo một vòng",
  "Massage vai cho nhau 5 phút",
  "Nấu món người ấy thích",
  "Hát tặng nhau một bài hát",
];
/** Xúc xắc 2 — bối cảnh buổi hẹn. */
const SETTINGS = [
  "ở nhà ấm cúng",
  "ngoài công viên",
  "ở quán cà phê quen",
  "trong buổi xem phim",
  "giữa buổi picnic nhỏ",
  "dưới hoàng hôn",
];

export default function LoveDiceScreen() {
  const { state, dispatch } = useLove();
  const meName = myName(state);
  const me = selfOf(state);
  const now = useNow(500);
  const [actionIdx, setActionIdx] = useState(0);
  const [settingIdx, setSettingIdx] = useState(0);
  const [rolled, setRolled] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const shuffleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const claimedToday = (state.games.dailyWins.date === today() ? state.games.dailyWins.dice[me.slot] : 0) >= 1;
  const mission = `Hẹn hò: ${ACTIONS[actionIdx].charAt(0).toLowerCase() + ACTIONS[actionIdx].slice(1)} ${SETTINGS[settingIdx]}`;
  const lastAdd = state.contentLog[me.slot];
  const addWaitMs = lastAdd ? Math.max(0, CONTENT_ADD_MIN_INTERVAL_MS - (now - new Date(lastAdd).getTime())) : 0;

  useEffect(() => () => { if (shuffleRef.current) clearInterval(shuffleRef.current); }, []);

  function roll() {
    if (rolling) return;
    setRolling(true);
    setSavedMsg("");
    // Hiệu ứng gieo: xáo chỉ số liên tục ~600ms rồi chốt kết quả.
    shuffleRef.current = setInterval(() => {
      setActionIdx(Math.floor(Math.random() * ACTIONS.length));
      setSettingIdx(Math.floor(Math.random() * SETTINGS.length));
    }, 80);
    setTimeout(() => {
      if (shuffleRef.current) clearInterval(shuffleRef.current);
      setActionIdx(Math.floor(Math.random() * ACTIONS.length));
      setSettingIdx(Math.floor(Math.random() * SETTINGS.length));
      setRolling(false);
      setRolled(true);
    }, 620);
  }

  function saveToBucket() {
    if (!rolled || addWaitMs > 0) return;
    dispatch({ type: "ADD_BUCKET", item: { id: uid(), text: mission, done: false, createdAt: new Date().toISOString(), authorSlot: me.slot } });
    setSavedMsg("Đã lưu nhiệm vụ hẹn hò vào Bucket List.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Xúc xắc hẹn hò" subtitle="Gieo 2 xúc xắc: một hành động yêu thương + một bối cảnh hẹn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <PersonChip state={state} slot={me.slot} />
            <View style={{ flex: 1 }} />
            <Text style={s.small}>{claimedToday ? "Đã nhận thưởng hôm nay" : "Thưởng ngày: +15 Xu, +10 XP"}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={[s.card, { flex: 1, alignItems: "center", gap: 7, marginBottom: 0 }]}>
            <Ionicons name="heart-circle" size={26} color={C.pink} />
            <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, textAlign: "center", minHeight: 38 }}>{rolled || rolling ? ACTIONS[actionIdx] : "Hành động"}</Text>
            <Text style={s.small}>Xúc xắc yêu thương</Text>
          </View>
          <View style={[s.card, { flex: 1, alignItems: "center", gap: 7, marginBottom: 0 }]}>
            <Ionicons name="location" size={26} color={C.sky} />
            <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, textAlign: "center", minHeight: 38 }}>{rolled || rolling ? SETTINGS[settingIdx].replace(/^./, (c) => c.toUpperCase()) : "Bối cảnh"}</Text>
            <Text style={s.small}>Xúc xắc bối cảnh</Text>
          </View>
        </View>

        <View style={[s.card, { alignItems: "center", backgroundColor: "#fff7ed", borderColor: "#fed7aa", gap: 7 }]}>
          <Text style={s.small}>Nhiệm vụ hẹn hò của hai đứa</Text>
          <Text style={{ fontSize: 16.5, fontFamily: "BeVietnamPro_900Black", color: C.text, textAlign: "center", lineHeight: 24 }}>
            {rolled ? mission : "Bấm Gieo xúc xắc để nhận nhiệm vụ hẹn hò ngẫu nhiên nhé!"}
          </Text>
        </View>

        <TouchableOpacity style={[s.btn, rolling && { opacity: 0.5 }]} disabled={rolling} onPress={roll}>
          <Ionicons name="dice" size={16} color="#fff" /><Text style={s.btnText}>{rolling ? "Đang gieo..." : rolled ? "Gieo lại" : "Gieo xúc xắc"}</Text>
        </TouchableOpacity>

        {rolled && (
          <>
            <TouchableOpacity style={[s.btnGhost, addWaitMs > 0 && { opacity: 0.5 }]} disabled={addWaitMs > 0} onPress={saveToBucket}>
              <Ionicons name="bookmark" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>{addWaitMs > 0 ? `Chờ ${Math.ceil(addWaitMs / 1000)}s để lưu tiếp` : "Lưu vào Bucket List"}</Text>
            </TouchableOpacity>
            {claimedToday ? (
              <Text style={{ textAlign: "center", color: C.textSoft, fontFamily: "BeVietnamPro_700Bold" }}>Bạn đã nhận thưởng Xúc xắc hẹn hò hôm nay rồi.</Text>
            ) : (
              <TouchableOpacity style={s.btn} onPress={() => dispatch({ type: "GAME_WIN", game: "dice", user: me.slot, actor: meName })}>
                <Ionicons name="gift" size={16} color="#fff" /><Text style={s.btnText}>Đã hoàn thành — nhận thưởng +15 Xu, +10 XP</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {savedMsg ? <Text style={{ textAlign: "center", color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>{savedMsg}</Text> : null}
      </ScrollView>
    </View>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import type { AppState } from "../lib/types";
import { PING_POP_COOLDOWN_MS } from "../lib/types";
import { makeStageUpLetter, messageById } from "../lib/content";
import { stageInfo } from "../lib/tree";
import { useLove } from "../lib/store";
import type { Action } from "../lib/store";
import { personOf } from "./PersonChip";
import { LetterEnvelopeImage } from "./Art";
import { Stamp, useNow } from "./ui";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * Các khoảnh khắc "bật lên" của bản rebuild — tất cả đều là HIỆU ỨNG TRONG APP
 * khi app đang mở (đồng bộ qua room_state), KHÔNG phải push notification thật:
 * 1) LetterPop — lá thư rơi (chăm cây/song chăm/lên giai đoạn): hiện 1 lần cho
 *    mỗi lá (ghi nhớ đã xem theo roomCode trong AsyncStorage). Thư KHÔNG có hộp
 *    thư/bộ sưu tập — đóng là xong, chỉ còn dòng dấu vết trong nhật ký.
 * 2) PingPop — nhịp tim "Nhớ bạn" của người ấy: hiện khi chuỗi nhịp mới tới,
 *    tối đa 1 lần/30 giây phía người nhận, tự tắt sau 6 giây.
 * 3) useStageUp — khi cây lên giai đoạn mới mà announcedStage chưa theo kịp
 *    (kể cả do người ấy chăm), dispatch STAGE_UP để ghi nhận + rơi thư xác định.
 */

const letterSeenKey = (roomCode: string) => `love-letter-seen-${roomCode}`;
const pingSeenKey = (roomCode: string) => `love-ping-seen-${roomCode}`;

export function LetterPop() {
  const { state } = useLove();
  const letter = state.lastLetter;
  const [seenId, setSeenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const nowTick = useNow(60000);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(letterSeenKey(state.roomCode)).then((v) => { if (alive) { setSeenId(v); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [state.roomCode]);

  if (!loaded || !letter || letter.id === seenId) return null;
  // Lá thư quá cũ (vd cài lại app sau nhiều ngày) không bật lại làm phiền.
  if (nowTick - new Date(letter.at).getTime() > 48 * 3600 * 1000) return null;
  const msg = messageById(letter.messageId);
  const by = personOf(state, letter.bySlot);

  async function close() {
    setSeenId(letter!.id);
    try { await AsyncStorage.setItem(letterSeenKey(state.roomCode), letter!.id); } catch { /* bỏ qua */ }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
        <View style={{ width: "100%", backgroundColor: COLOR.letterPaper, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: COLOR.letterLine, padding: 22, alignItems: "center", ...SHADOW_FLOAT }}>
          <Stamp rarity={letter.rarity} />
          <LetterEnvelopeImage size={64} />
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text, marginTop: 10, textAlign: "center" }}>Một lá thư vừa rơi xuống</Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 3, textAlign: "center" }}>
            {letter.source} · {by.name} vừa chăm cây
          </Text>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 16.5, lineHeight: 25, color: COLOR.text, textAlign: "center", marginTop: 14 }}>{msg.text}</Text>
          <TouchableOpacity onPress={close} style={{ backgroundColor: COLOR.primary, borderRadius: RADIUS.control, minHeight: 48, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 18 }} accessibilityRole="button" accessibilityLabel="Giữ lấy yêu thương">
            <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 15 }}>Giữ lấy yêu thương</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function PingPop() {
  const { state } = useLove();
  const me = state.currentUser;
  const partnerSlot = me === "A" ? "B" : "A";
  const partnerPing = state.pings[partnerSlot];
  const burstAt = partnerPing.lastBurstAt;
  const [dismissedFor, setDismissedFor] = useState("");
  const [loaded, setLoaded] = useState(false);
  const lastShownRef = useRef(0);
  const nowTick = useNow(5000);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(pingSeenKey(state.roomCode)).then((v) => { if (alive) { setDismissedFor(v || ""); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [state.roomCode]);

  const ageMs = burstAt ? nowTick - new Date(burstAt).getTime() : Infinity;
  const show = loaded && Boolean(burstAt) && burstAt !== dismissedFor && ageMs < 120000 && partnerPing.burst > 0;

  useEffect(() => {
    if (!show) return;
    // Cooldown 30 giây phía người nhận: chuỗi mới tới dồn dập cũng chỉ bật 1 lần.
    if (Date.now() - lastShownRef.current < PING_POP_COOLDOWN_MS) {
      setDismissedFor(burstAt);
      AsyncStorage.setItem(pingSeenKey(state.roomCode), burstAt).catch(() => {});
      return;
    }
    lastShownRef.current = Date.now();
    const t = setTimeout(() => {
      setDismissedFor(burstAt);
      AsyncStorage.setItem(pingSeenKey(state.roomCode), burstAt).catch(() => {});
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, burstAt]);

  if (!show) return null;
  const partner = personOf(state, partnerSlot);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 54, left: 20, right: 20, alignItems: "center", zIndex: 50 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLOR.border, ...SHADOW_FLOAT }}>
        <Ionicons name="heart" size={20} color={COLOR.primary} />
        <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }}>
          {partner.name} đang nhớ bạn{partnerPing.burst > 1 ? ` — ${partnerPing.burst} nhịp liên tiếp` : ""}
        </Text>
      </View>
    </View>
  );
}

/** Theo dõi cây lên giai đoạn: ghi nhận announcedStage + cho rơi lá thư xác định của giai đoạn. */
export function useStageUp(state: AppState, dispatch: React.Dispatch<Action>) {
  const info = stageInfo(state.tree);
  const announced = state.tree.announcedStage;
  const letterAt = state.lastLetter?.at || "";
  useEffect(() => {
    if (info.index <= announced) return;
    // Vừa có thư rơi từ lần chăm trong 2 phút qua thì không rơi thêm lá thứ hai.
    const freshLetter = letterAt && Date.now() - new Date(letterAt).getTime() < 120000;
    const drop = freshLetter ? null : makeStageUpLetter(info.index, info.mature, state.currentUser, new Date().toISOString());
    dispatch({ type: "STAGE_UP", stageIndex: info.index, drop });
  }, [info.index, info.mature, announced, letterAt, state.currentUser, dispatch]);
}

export function LetterAndPingPops() {
  return (
    <>
      <LetterPop />
      <PingPop />
    </>
  );
}

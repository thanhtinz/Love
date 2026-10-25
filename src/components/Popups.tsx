import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import type { AppState } from "../lib/types";
import { formatDateVN } from "../lib/types";
import { makeStageUpLetter, messageById, milestoneLine } from "../lib/content";
import { heartbeatPulse, success } from "../lib/feedback";
import { dayCount, milestoneDateKey, milestoneReached } from "../lib/features";
import { TREE_STAGE_COUNT, treeStageForDay } from "../lib/tree";
import { useLove } from "../lib/store";
import type { Action } from "../lib/store";
import { personOf } from "./PersonChip";
import { LetterEnvelopeImage } from "./Art";
import { HeartBurst } from "./HeartBurst";
import { Stamp, useNow } from "./ui";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * Các khoảnh khắc "bật lên" của bản rebuild — tất cả đều là HIỆU ỨNG TRONG APP
 * khi app đang mở (đồng bộ qua room_state), KHÔNG phải push notification thật:
 * 1) LetterPop — lá thư rơi (chăm cây/song chăm/lên giai đoạn): hiện 1 lần cho
 *    mỗi lá (ghi nhớ đã xem theo roomCode trong AsyncStorage). Từ đợt "chất
 *    app" 2, mỗi lá thư rơi còn được giữ thành KỶ VẬT trong "Hộp thư đã giữ"
 *    (lib reducer ghi keptLetters) nên đóng pop không còn làm mất thư.
 * 2) PingPop — nhịp tim "Nhớ bạn" của người ấy: MỖI nhịp là một sự kiện riêng
 *    (không gộp chuỗi, không cooldown phía người nhận) nên pop hiện theo từng
 *    nhịp mới, tự tắt sau 6 giây. Đợt "chất app" 1: pop NẢY VÀO bằng spring và
 *    rung nhịp tim đôi (lib/feedback.heartbeatPulse) đúng 1 lần mỗi nhịp mới.
 *    Ngoài app, mỗi nhịp còn có push riêng qua notify-heartbeat (lib/push.ts).
 * 3) useStageUp — giai đoạn cây đi theo NGÀY YÊU: khi giai đoạn suy ra từ ngày
 *    yêu vượt mọi giai đoạn đã ăn mừng (couple.celebratedStages), dispatch
 *    CELEBRATE_TREE_STAGE đúng 1 lần để rơi lá thư xác định của giai đoạn đó.
 * 4) MilestonePop (đợt "chất app" 2) — ăn mừng MỐC NGÀY YÊU: lần mở app đầu
 *    tiên ở/ngay sau ngày mốc hiện pop đúng 1 lần cho mốc đó (đã-xem ghi theo
 *    roomCode trong AsyncStorage; điều kiện "tươi" chặn pop cho các mốc cũ
 *    được backfill từ bản lưu trước đợt này). Lịch sử mốc đầy đủ nằm ở tab
 *    Hai đứa ("Hành trình của hai đứa"), ghi bởi MARK_MILESTONE.
 */

const letterSeenKey = (roomCode: string) => `love-letter-seen-${roomCode}`;
const pingSeenKey = (roomCode: string) => `love-ping-seen-${roomCode}`;
const milestoneSeenKey = (roomCode: string) => `love-milestone-seen-${roomCode}`;

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
            {letter.source} · {by.name}
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
  const nowTick = useNow(5000);
  const [popScale] = useState(() => new Animated.Value(0.8));
  const [popOpacity] = useState(() => new Animated.Value(0));
  const pulsedForRef = useRef("");

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(pingSeenKey(state.roomCode)).then((v) => { if (alive) { setDismissedFor(v || ""); setLoaded(true); } }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [state.roomCode]);

  const ageMs = burstAt ? nowTick - new Date(burstAt).getTime() : Infinity;
  const show = loaded && Boolean(burstAt) && burstAt !== dismissedFor && ageMs < 120000 && partnerPing.burst > 0;

  useEffect(() => {
    if (!show) return;
    // Không cooldown: nhịp mới tới là hiện ngay (nhịp đến trong lúc pop đang mở
    // sẽ thay mốc burstAt -> effect chạy lại, đồng hồ tắt 6 giây tính từ nhịp mới).
    const t = setTimeout(() => {
      setDismissedFor(burstAt);
      AsyncStorage.setItem(pingSeenKey(state.roomCode), burstAt).catch(() => {});
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, burstAt]);

  // Khoảnh khắc NHẬN nhịp: pop nảy vào bằng spring + rung nhịp tim đôi đúng
  // 1 lần cho mỗi nhịp mới (giữ mốc đã rung để không rung lại khi re-render).
  useEffect(() => {
    if (!show || !burstAt) return;
    popScale.setValue(0.8);
    popOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(popScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(popOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    if (pulsedForRef.current !== burstAt) {
      pulsedForRef.current = burstAt;
      heartbeatPulse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, burstAt]);

  if (!show) return null;
  const partner = personOf(state, partnerSlot);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 54, left: 20, right: 20, alignItems: "center", zIndex: 50 }}>
      <Animated.View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLOR.border, opacity: popOpacity, transform: [{ scale: popScale }], ...SHADOW_FLOAT }}>
        <Ionicons name="heart" size={20} color={COLOR.primary} />
        <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }}>
          {partner.name} đang nhớ bạn
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Theo dõi cây lên giai đoạn THEO NGÀY YÊU: giai đoạn hiện tại (treeStageForDay
 * từ couple.startDate) vượt giai đoạn đã ăn mừng lớn nhất -> ăn mừng đúng 1 lần:
 * rơi lá thư xác định của giai đoạn + ghi celebratedStages (kèm nhật ký ở
 * reducer). Cặp đôi cũ (celebratedStages mặc định []) sẽ nhận đúng 1 lá thư cho
 * giai đoạn hiện tại ở lần mở app đầu tiên — như một lời chào mừng lên giai đoạn.
 */
export function useStageUp(state: AppState, dispatch: React.Dispatch<Action>) {
  const day = dayCount(state.couple.startDate);
  const { stage } = treeStageForDay(day);
  const celebratedMax = state.couple.celebratedStages.reduce((a, b) => Math.max(a, b), 0);
  useEffect(() => {
    if (stage <= celebratedMax) return;
    const drop = makeStageUpLetter(stage - 1, stage >= TREE_STAGE_COUNT, state.currentUser, new Date().toISOString());
    dispatch({ type: "CELEBRATE_TREE_STAGE", stage, drop });
  }, [stage, celebratedMax, state.currentUser, dispatch]);
}

/**
 * Pop ăn mừng MỐC NGÀY YÊU (đợt "chất app" 2) — nâng cấp từ chip nhỏ ở Home:
 * lần mở app đầu tiên chạm một mốc (MARK_MILESTONE đã ghi vào celebrated +
 * milestoneHistory ở Home) thì hiện pop đúng 1 lần: ngôn ngữ thị giác của
 * LetterPop (giấy thư) + mưa tim HeartBurst + rung success.
 * Chặn pop oan cho cặp đôi lâu năm: mốc được backfill từ bản lưu cũ có
 * reachedAt rỗng/xa — chỉ pop khi lịch sử ghi nhận mốc trong 48 giờ gần đây
 * HOẶC số ngày hiện tại chỉ vừa qua mốc tối đa 2 ngày.
 */
export function MilestonePop() {
  const { state } = useLove();
  const count = dayCount(state.couple.startDate);
  const reached = milestoneReached(count);
  const nowTick = useNow(60000);
  const [seenDays, setSeenDays] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const celebratedForRef = useRef(0);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(milestoneSeenKey(state.roomCode)).then((v) => {
      if (!alive) return;
      try { const parsed: unknown = v ? JSON.parse(v) : []; setSeenDays(Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : []); }
      catch { setSeenDays([]); }
      setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [state.roomCode]);

  const record = reached != null ? state.couple.milestoneHistory.find((h) => h.days === reached) : undefined;
  const fresh = reached != null && (
    record?.reachedAt
      ? nowTick - new Date(record.reachedAt).getTime() < 48 * 3600 * 1000
      : count - reached <= 2
  );
  const show = loaded && reached != null && state.couple.celebrated.includes(reached)
    && !seenDays.includes(reached) && !dismissed && fresh;

  // Rung + mưa tim đúng 1 lần cho mỗi mốc được ăn mừng.
  useEffect(() => {
    if (!show || reached == null || celebratedForRef.current === reached) return;
    celebratedForRef.current = reached;
    success();
    setBurstKey(reached);
  }, [show, reached]);

  if (!show || reached == null) return null;
  const self = personOf(state, "A");
  const partner = personOf(state, "B");
  const dateKey = milestoneDateKey(state.couple.startDate, reached);

  async function close() {
    setDismissed(true);
    const next = [...seenDays, reached!];
    setSeenDays(next);
    try { await AsyncStorage.setItem(milestoneSeenKey(state.roomCode), JSON.stringify(next)); } catch { /* bỏ qua */ }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
        <View style={{ width: "100%", position: "relative", backgroundColor: COLOR.letterPaper, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: COLOR.letterLine, padding: 22, alignItems: "center", ...SHADOW_FLOAT }}>
          <HeartBurst burstKey={burstKey} mode="hearts" />
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR.warningSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={27} color={COLOR.warning} />
          </View>
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 20, color: COLOR.text, marginTop: 12, textAlign: "center" }}>
            Mốc {reached} ngày yêu
          </Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 3, textAlign: "center" }}>
            {self.name} & {partner.name}{dateKey ? ` · ${formatDateVN(dateKey)}` : ""}
          </Text>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 16, lineHeight: 24.5, color: COLOR.text, textAlign: "center", marginTop: 14 }}>
            {milestoneLine(reached)}
          </Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, textAlign: "center", marginTop: 10 }}>
            Khoảnh khắc này đã được ghi vào “Hành trình của hai đứa” ở tab Hai đứa.
          </Text>
          <TouchableOpacity onPress={close} style={{ backgroundColor: COLOR.primary, borderRadius: RADIUS.control, minHeight: 48, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 18 }} accessibilityRole="button" accessibilityLabel="Giữ khoảnh khắc này">
            <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 15 }}>Giữ khoảnh khắc này</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function LetterAndPingPops() {
  return (
    <>
      <LetterPop />
      <PingPop />
    </>
  );
}

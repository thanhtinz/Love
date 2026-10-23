import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../lib/store";
import { SHARE_DURATIONS, distanceText, haversineKm, remainingText, shareStatus, timeAgoText } from "../lib/features";
import { captureLocationFix, foregroundPermissionGranted, getBatteryPct, requestForegroundPermission } from "../components/presenceService";
import { PersonChip, partnerOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../components/theme";
import { ChipButton, ScreenHeader, StatusChip, s, useNow } from "../components/ui";

/**
 * Định vị TẠM THỜI (lõi 5) — route Stack /location.
 * - Mỗi người tự bật/tắt phần của mình; mặc định TẮT. Các phiên có hạn (15 phút /
 *   1 giờ / 4 giờ / đến khi tự tắt) tự kết thúc đúng expiresAt — hết hạn là phía
 *   người ấy thấy "đã kết thúc" và toạ độ bị xoá khỏi state (reducer lo).
 * - Snapshot: lúc mở app, lúc bấm "Cập nhật ngay" và mỗi ~5 phút khi app đang mở
 *   (LocationSync lo phần tự động). KHÔNG theo dõi nền, KHÔNG lịch sử đường đi.
 * - Khoảng cách tính từ snapshot mới nhất của cả hai (haversine) — chỉ hiện khi
 *   cả hai đều có snapshot; thiếu thì nói rõ thay vì bịa số.
 */
export default function LocationScreen() {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [durationMs, setDurationMs] = useState<number | null>(60 * 60 * 1000);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const me = state.currentUser;
  const partner = partnerOf(state);
  const mySlot = state.presence[me];
  const partnerSlot = state.presence[partner.slot];
  const myStatus = shareStatus(mySlot, now);
  const partnerStatus = shareStatus(partnerSlot, now);

  const bothFix = partnerSlot.lat != null && partnerSlot.lng != null && mySlot.lat != null && mySlot.lng != null;
  const distKm = bothFix ? haversineKm({ lat: partnerSlot.lat!, lng: partnerSlot.lng! }, { lat: mySlot.lat!, lng: mySlot.lng! }) : null;

  async function startShare() {
    setErr(""); setBusy(true);
    try {
      const granted = await requestForegroundPermission();
      if (!granted) {
        setErr("Chưa có quyền vị trí nên chưa thể chia sẻ. Hãy cấp quyền vị trí cho ứng dụng (trên web: cho phép khi trình duyệt hỏi) rồi thử lại nhé.");
        return;
      }
      dispatch({ type: "PRESENCE_START", user: me, durationMs, actor: myName(state) });
    } finally { setBusy(false); }
  }

  async function refreshNow() {
    setBusy(true);
    try {
      const battery = await getBatteryPct();
      const granted = await foregroundPermissionGranted();
      const fix = granted ? await captureLocationFix() : null;
      dispatch({ type: "PRESENCE_SNAPSHOT", user: me, lat: fix ? fix.lat : null, lng: fix ? fix.lng : null, acc: fix ? fix.acc : null, battery, at: new Date().toISOString() });
      if (!granted) setErr("Quyền vị trí đang bị tắt — snapshot lần này chỉ cập nhật pin và thời gian.");
    } finally { setBusy(false); }
  }

  function stopShare() {
    dispatch({ type: "PRESENCE_STOP", user: me, actor: myName(state), reason: "manual" });
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Định vị tạm thời" subtitle="Chỉ khi đang mở app — không theo dõi nền" fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: 6, paddingBottom: insets.bottom + 32, gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {err ? (
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.tile, padding: 12 }}>
            <Ionicons name="alert-circle-outline" size={17} color={COLOR.danger} />
            <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.danger, lineHeight: 19 }}>{err}</Text>
          </View>
        ) : null}

        {/* Phiên của mình */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, flex: 1 }}>Vị trí của bạn</Text>
            <StatusChip label={myStatus.active ? "Đang chia sẻ" : "Đang tắt"} variant={myStatus.active ? "done" : "neutral"} />
          </View>
          {!myStatus.active ? (
            <>
              <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 6 }}>
                Chọn thời lượng rồi bắt đầu — {partner.name} sẽ thấy vị trí mới nhất của bạn trong lúc phiên còn chạy.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {SHARE_DURATIONS.map((d) => (
                  <ChipButton
                    key={d.label}
                    label={d.label}
                    variant={durationMs === d.ms ? "accent" : "neutral"}
                    onPress={() => setDurationMs(d.ms)}
                  />
                ))}
              </View>
              <TouchableOpacity style={[s.btn, { marginTop: 14, opacity: busy ? 0.6 : 1 }]} onPress={startShare} disabled={busy} accessibilityRole="button" accessibilityLabel="Bắt đầu chia sẻ vị trí">
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={s.btnText}>{busy ? "Đang xin quyền..." : "Bắt đầu chia sẻ"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ ...TYPE.body, color: COLOR.text, marginTop: 6 }}>
                {myStatus.remainingMs != null ? `Phiên sẽ tự kết thúc — ${remainingText(myStatus.remainingMs)}` : "Phiên chạy đến khi bạn tự tắt."}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 4 }}>
                {mySlot.locAt
                  ? `Snapshot gần nhất: ${timeAgoText(mySlot.locAt, now)}${mySlot.battery != null ? ` · pin ${mySlot.battery}%` : ""}`
                  : "Đang chờ snapshot đầu tiên..."}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={refreshNow} disabled={busy} accessibilityRole="button" accessibilityLabel="Cập nhật vị trí ngay">
                  <Ionicons name="refresh" size={17} color={COLOR.text} />
                  <Text style={s.btnGhostText}>Cập nhật ngay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.control, minHeight: 48, alignItems: "center", justifyContent: "center" }} onPress={stopShare} accessibilityRole="button" accessibilityLabel="Dừng chia sẻ vị trí">
                  <Text style={{ color: COLOR.danger, fontFamily: FONT.bold, fontSize: 14.5 }}>Dừng chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Phía người ấy */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, flex: 1 }}>Vị trí của người ấy</Text>
            <StatusChip label={partnerStatus.active ? "Đang chia sẻ" : "Đang tắt"} variant={partnerStatus.active ? "partner" : "neutral"} />
          </View>
          <View style={{ marginTop: 10 }}>
            <PersonChip state={state} slot={partner.slot} size={22} />
          </View>
          {partnerStatus.active ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              {distKm != null ? (
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 19, color: COLOR.text }}>{distanceText(distKm)}</Text>
              ) : (
                <Text style={{ ...TYPE.body, color: COLOR.textSoft }}>
                  {partnerSlot.lat == null
                    ? `${partner.name} đã bật chia sẻ nhưng chưa có snapshot vị trí nào.`
                    : "Bật chia sẻ ở phần của bạn để app tính khoảng cách giữa hai đứa."}
                </Text>
              )}
              <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft }}>
                {partnerSlot.locAt ? `Cập nhật ${timeAgoText(partnerSlot.locAt, now)}` : "Chưa có lần cập nhật nào"}
                {partnerSlot.battery != null ? ` · pin ${partnerSlot.battery}%` : ""}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft }}>
                {partnerStatus.remainingMs != null ? `Phiên của ${partner.name} ${remainingText(partnerStatus.remainingMs)}` : `${partner.name} chia sẻ đến khi tự tắt`}
              </Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>
              {partner.name} hiện không chia sẻ vị trí. Khi họ bật chia sẻ, khoảng cách và thời gian còn lại sẽ hiện ở đây.
            </Text>
          )}
        </View>

        {/* Nói rõ cách hoạt động */}
        <View style={{ flexDirection: "row", gap: 8, backgroundColor: ROLE.sharedSoft, borderRadius: RADIUS.tile, padding: 12 }}>
          <Ionicons name="shield-checkmark-outline" size={17} color={ROLE.shared} />
          <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13, color: ROLE.sharedDark, lineHeight: 19 }}>
            Vị trí chỉ được chụp khi app đang mở: lúc bắt đầu phiên, lúc quay lại app và khoảng mỗi 5 phút. Không theo dõi nền, không lưu lịch sử đường đi — hết phiên là toạ độ bị xoá. Trên web, vị trí cần bạn cho phép trong trình duyệt và % pin có thể không đọc được.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

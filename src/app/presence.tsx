import React, { useState } from "react";
import { Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { PRESENCE_REFRESH_COOLDOWN_MS, PRESENCE_STALE_MS, distanceKmBetween, distanceLabel, relativeTimeVi } from "../lib/features";
import type { PresenceSlotState } from "../lib/types";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { MascotArt } from "../components/Art";
import { COLOR, FONT, ROLE, SPACE, TYPE } from "../components/theme";
import { ClosingBand, ScreenHeader, SkeletonCard, StatusChip, s, useNow } from "../components/ui";
import { captureLocationFix, getBatteryPct, requestForegroundPermission } from "../components/presenceService";

/**
 * Màn Hiện diện (hub Hai đứa) — hiện diện NHẸ theo kế hoạch Hạng 2:
 * mỗi người tự kiểm soát phần chia sẻ của mình bằng 2 công tắc riêng (pin / vị trí);
 * dữ liệu là ẢNH CHỤP tại lúc mở app hoặc bấm cập nhật — không theo dõi nền,
 * không lưu lịch sử. Phía người ấy chỉ thấy những gì chủ nhân đang bật chia sẻ:
 * tắt công tắc là phía kia không còn thấy dữ kiện đó nữa.
 */

const pad2 = (n: number) => String(n).padStart(2, "0");
const clockOf = (iso: string) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function PresenceScreen() {
  const { state, dispatch, hydrated } = useLove();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const me = selfOf(state);
  const partner = partnerOf(state);
  const myP = state.presence[me.slot];
  const partnerP = state.presence[partner.slot];

  const refreshLeftMs = myP.at ? PRESENCE_REFRESH_COOLDOWN_MS - (now - new Date(myP.at).getTime()) : 0;
  const canRefresh = refreshLeftMs <= 0 && !busy;

  async function captureMine(opts: { withLocation: boolean }): Promise<boolean> {
    const patch: Partial<PresenceSlotState> = {};
    if (myP.shareBattery || opts.withLocation) {
      const b = await getBatteryPct();
      if (b != null) patch.battery = b;
    }
    if (opts.withLocation) {
      const fix = await captureLocationFix();
      if (!fix) return false;
      patch.lat = fix.lat; patch.lng = fix.lng; patch.acc = fix.acc;
    }
    patch.at = new Date().toISOString();
    dispatch({ type: "PRESENCE_SET", user: me.slot, patch });
    return true;
  }

  async function onToggleBattery(value: boolean) {
    if (!value) {
      // Tắt chia sẻ pin: xoá luôn % pin đã chụp để phía kia không còn dữ kiện nào.
      dispatch({ type: "PRESENCE_SET", user: me.slot, patch: { shareBattery: false, battery: null } });
      return;
    }
    dispatch({ type: "PRESENCE_SET", user: me.slot, patch: { shareBattery: true } });
    const b = await getBatteryPct();
    if (b != null) dispatch({ type: "PRESENCE_SET", user: me.slot, patch: { battery: b, at: new Date().toISOString() } });
  }

  async function onToggleLocation(value: boolean) {
    if (!value) {
      // Tắt chia sẻ vị trí: xoá luôn toạ độ đã chụp.
      dispatch({ type: "PRESENCE_SET", user: me.slot, patch: { shareLocation: false, lat: null, lng: null, acc: null } });
      setNote("");
      return;
    }
    setBusy(true);
    const granted = await requestForegroundPermission();
    if (!granted) {
      setBusy(false);
      setNote("Chưa được cấp quyền vị trí nên chưa bật được chia sẻ. Bạn có thể cấp quyền trong cài đặt của máy rồi quay lại bật sau nhé.");
      return;
    }
    dispatch({ type: "PRESENCE_SET", user: me.slot, patch: { shareLocation: true } });
    const ok = await captureMine({ withLocation: true });
    setBusy(false);
    setNote(ok ? "" : "Chưa lấy được vị trí lúc này (có thể đang ở trong nhà sóng yếu) — thử bấm Cập nhật lại sau nhé.");
  }

  async function onRefresh() {
    if (!canRefresh) return;
    setBusy(true);
    const ok = await captureMine({ withLocation: myP.shareLocation });
    setBusy(false);
    setNote(ok ? "" : "Chưa lấy được vị trí lúc này — thử lại sau ít phút nhé.");
  }

  if (!hydrated) {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Hiện diện" subtitle="Khoảng cách và pin của hai đứa" fallback="/(tabs)/couple" />
        <View style={{ paddingHorizontal: SPACE.screenX, gap: 12 }}>
          <SkeletonCard height={170} />
          <SkeletonCard height={210} />
        </View>
      </View>
    );
  }

  // Phía người ấy: CHỈ hiện dữ kiện họ đang bật chia sẻ.
  const distKm = partnerP.shareLocation ? distanceKmBetween(myP, partnerP) : null;
  const partnerStale = partnerP.at ? now - new Date(partnerP.at).getTime() > PRESENCE_STALE_MS : false;
  const partnerHasAny = (partnerP.shareLocation && partnerP.lat != null) || (partnerP.shareBattery && partnerP.battery != null);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Hiện diện" subtitle="Ảnh chụp khi mở app — không theo dõi nền" fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* NGƯỜI ẤY */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar id={partner.avatar} size={52} ring={partner.main} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, lineHeight: 22, color: COLOR.text }} numberOfLines={2}>{partner.name}</Text>
              <Text style={s.sub}>{partnerP.at ? `Cập nhật ${relativeTimeVi(partnerP.at, now)} · ${clockOf(partnerP.at)}` : "Chưa có ảnh chụp nào"}</Text>
            </View>
          </View>
          {partnerHasAny ? (
            <View style={{ marginTop: 14, gap: 9 }}>
              {partnerP.shareLocation && partnerP.lat != null ? (
                <Text style={{ ...TYPE.emphasis, color: COLOR.text }}>
                  {distKm != null ? `${partner.name} ${distanceLabel(distKm)}` : `${partner.name} đã chia sẻ vị trí — mở app trên máy bạn để app chụp vị trí của bạn rồi mới tính được khoảng cách`}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {partnerP.shareBattery && partnerP.battery != null ? (
                  <StatusChip icon="battery-half" label={`Pin ${partnerP.battery}%`} variant="partner" />
                ) : null}
                {partnerStale ? (
                  <StatusChip icon="time" label="Ảnh chụp đã cũ" variant="waiting" />
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={[s.body, { marginTop: 12, color: COLOR.textSoft }]}>
              {partner.name} chưa chia sẻ ảnh chụp nào — khi bạn ấy mở app và bật chia sẻ, khoảng cách và pin sẽ hiện ở đây.
            </Text>
          )}
        </View>

        {/* CỦA BẠN */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Ảnh chụp của bạn</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>
            {myP.at ? `Lần chụp gần nhất: ${relativeTimeVi(myP.at, now)} · ${clockOf(myP.at)}${myP.battery != null ? ` · Pin ${myP.battery}%` : ""}${myP.lat != null ? " · Đã có vị trí" : ""}` : "Chưa chụp lần nào — bấm Cập nhật để chụp ngay."}
          </Text>

          {/* Công tắc canh theo DÒNG ĐẦU của khối nhãn (nhãn + mô tả 2-3 dòng) */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text }}>Chia sẻ pin</Text>
              <Text style={s.sub}>Cho người ấy thấy % pin của máy bạn trong ảnh chụp</Text>
            </View>
            <View style={{ paddingTop: 2 }}>
              <Switch value={myP.shareBattery} onValueChange={onToggleBattery} trackColor={{ true: ROLE.partner, false: COLOR.track }} thumbColor="#fff" accessibilityLabel="Chia sẻ pin" />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text }}>Chia sẻ vị trí khi mở app</Text>
              <Text style={s.sub}>Chỉ chụp 1 điểm khi mở app hoặc bấm Cập nhật — app không theo dõi khi bạn di chuyển</Text>
            </View>
            <View style={{ paddingTop: 2 }}>
              <Switch value={myP.shareLocation} onValueChange={onToggleLocation} disabled={busy} trackColor={{ true: ROLE.partner, false: COLOR.track }} thumbColor="#fff" accessibilityLabel="Chia sẻ vị trí khi mở app" />
            </View>
          </View>

          {note ? <Text style={{ fontFamily: FONT.semibold, fontSize: 13, lineHeight: 19, color: COLOR.warningText, marginTop: 12 }}>{note}</Text> : null}

          <TouchableOpacity style={[s.btn, { marginTop: 16 }, !canRefresh && { opacity: 0.5 }]} disabled={!canRefresh} onPress={onRefresh} accessibilityLabel="Cập nhật ảnh chụp của tôi">
            <Ionicons name="locate" size={18} color="#fff" />
            <Text style={s.btnText}>{busy ? "Đang chụp..." : refreshLeftMs > 0 ? `Chờ ${Math.ceil(refreshLeftMs / 1000)} giây để cập nhật lại` : "Cập nhật ảnh chụp của tôi"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.small, { lineHeight: 18, paddingHorizontal: 4 }]}>
          Cách tính năng này hoạt động: vị trí chỉ được chụp khi bạn mở app hoặc tự bấm Cập nhật, và chỉ khi bạn đã bật chia sẻ + cấp quyền cho hệ điều hành. App không chạy nền, không lưu lịch sử di chuyển — ảnh chụp mới ghi đè ảnh chụp cũ. Tắt chia sẻ là người ấy không còn thấy dữ kiện đó nữa.
          {Platform.OS === "web" ? " Trên bản web, vị trí lấy từ trình duyệt (trình duyệt sẽ hỏi quyền riêng) và % pin có thể không đọc được tuỳ trình duyệt." : ""}
        </Text>
        <ClosingBand art={<MascotArt size={72} />} line="Chỉ cần mở app là hai đứa lại thấy nhau gần hơn một chút — xa nhau vẫn biết nhau đang ổn." />
      </ScrollView>
    </View>
  );
}

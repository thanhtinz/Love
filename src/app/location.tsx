import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { distanceText, freshnessText, haversineKm } from "../lib/features";
import { captureLocationFix, foregroundPermissionGranted, getBatteryPct, requestForegroundPermission } from "../components/presenceService";
import CoupleMap, { type CoupleMapPoint } from "../components/CoupleMap";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../components/theme";
import { ScreenHeader, StatusChip, s, useNow } from "../components/ui";

/**
 * BẢN ĐỒ HAI ĐỨA (lõi 5 — VỊ TRÍ TRỰC TIẾP, route Stack /location).
 * Không phiên, không công tắc: mở màn này là THẤY LUÔN vị trí của hai đứa.
 * - Publish chạy TOÀN APP khi app đang mở (LocationSync ở layout gốc): máy
 *   nào đã cấp quyền vị trí thì tự gửi điểm mới nhất của mình (tiết lưu
 *   >= 10 giây và >= 20m), ghim của người ấy vì thế chạy theo thời gian
 *   thực qua kênh đồng bộ sẵn có.
 * - Cổng DUY NHẤT là quyền vị trí của hệ điều hành: chưa cấp thì hiện lời
 *   giải thích ấm + nút "Cấp quyền vị trí"; cấp xong là publish tự chạy.
 * - Người ấy đóng app thì điểm của họ đứng yên — nhãn độ tươi nói thật điều
 *   đó ("Vị trí gần nhất · ..."), không chữ nào gây hoang mang.
 * - Chỉ giữ điểm mới nhất của mỗi người — không lịch sử, không theo dõi nền.
 *   Gạch bản đồ chỉ tải khi màn này đang mở và có ít nhất một ghim.
 */
export default function LocationScreen() {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [perm, setPerm] = useState<boolean | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
  const mySlot = state.presence[me];
  const partnerSlot = state.presence[partner.slot];

  useEffect(() => {
    let alive = true;
    foregroundPermissionGranted().then((g) => { if (alive) setPerm(g); }).catch(() => { if (alive) setPerm(false); });
    return () => { alive = false; };
  }, []);

  const partnerHasPos = partnerSlot.lat != null && partnerSlot.lng != null;
  const myHasPos = mySlot.lat != null && mySlot.lng != null;
  const bothFix = partnerHasPos && myHasPos;
  const distKm = bothFix ? haversineKm({ lat: partnerSlot.lat!, lng: partnerSlot.lng! }, { lat: mySlot.lat!, lng: mySlot.lng! }) : null;
  const partnerAgeMs = partnerSlot.locAt ? now - new Date(partnerSlot.locAt).getTime() : Number.POSITIVE_INFINITY;
  const partnerChip = !partnerHasPos
    ? { label: "Chưa có vị trí", variant: "neutral" as const }
    : partnerAgeMs < 5 * 60000
      ? { label: "Trực tiếp", variant: "partner" as const }
      : { label: "Gần nhất", variant: "waiting" as const };

  /* Ghim bản đồ: phía nào đã có điểm mới nhất thì có ghim. Mảng rỗng ->
   * không gắn CoupleMap -> không tải bất kỳ gạch nào. */
  const points: CoupleMapPoint[] = [];
  if (myHasPos) points.push({ key: "me", lat: mySlot.lat!, lon: mySlot.lng!, name: self.name, avatarId: self.avatar });
  if (partnerHasPos) points.push({ key: "partner", lat: partnerSlot.lat!, lon: partnerSlot.lng!, name: partner.name, avatarId: partner.avatar });

  async function grantPermission() {
    setErr(""); setBusy(true);
    try {
      const granted = await requestForegroundPermission();
      setPerm(granted);
      if (!granted) {
        setErr("Chưa có quyền vị trí nên bản đồ chưa thấy được vị trí của bạn. Hãy cấp quyền vị trí cho ứng dụng (trên web: cho phép khi trình duyệt hỏi) rồi thử lại nhé.");
        return;
      }
      // Publish ngay một điểm đầu tiên cho khỏi phải chờ nhịp watch đầu tiên.
      const battery = await getBatteryPct();
      const fix = await captureLocationFix();
      if (fix) {
        dispatch({ type: "PRESENCE_SNAPSHOT", user: me, lat: fix.lat, lng: fix.lng, acc: fix.acc, battery, at: new Date().toISOString() });
      }
    } finally { setBusy(false); }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Bản đồ hai đứa" subtitle="Vị trí trực tiếp của hai đứa — cập nhật khi app đang mở" fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: 6, paddingBottom: insets.bottom + 32, gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {err ? (
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.tile, padding: 12 }}>
            <Ionicons name="alert-circle-outline" size={17} color={COLOR.danger} />
            <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.danger, lineHeight: 19 }}>{err}</Text>
          </View>
        ) : null}

        {/* Bản đồ thật — chỉ khi có ít nhất một ghim */}
        {points.length > 0 ? (
          <CoupleMap points={points} distanceKm={distKm} height={340} />
        ) : (
          <View style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: COLOR.border, borderRadius: RADIUS.scene, padding: 22, alignItems: "center", backgroundColor: COLOR.gardenWash }}>
            <Ionicons name="map-outline" size={30} color={COLOR.textFaint} />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, color: COLOR.text, marginTop: 10, textAlign: "center" }}>
              Chưa có điểm vị trí nào trên bản đồ
            </Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 4, textAlign: "center", lineHeight: 19 }}>
              Khi cả hai cùng mở app và cấp quyền vị trí, ghim của hai đứa sẽ hiện ở đây và chạy theo từng bước di chuyển.
            </Text>
          </View>
        )}

        {/* Thẻ người ấy kiểu Jagat */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar id={partner.avatar} size={48} ring={partner.main} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...TYPE.cardTitle, color: COLOR.text }} numberOfLines={1}>{partner.name}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 1 }}>
                {partnerHasPos ? freshnessText(partnerSlot.locAt, now) : "Chưa có vị trí"}
              </Text>
            </View>
            <StatusChip label={partnerChip.label} variant={partnerChip.variant} />
          </View>
          {partnerHasPos ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              {distKm != null ? (
                <Text style={{ fontFamily: FONT.extrabold, fontSize: 19, color: COLOR.text }}>{distanceText(distKm)}</Text>
              ) : (
                <Text style={{ ...TYPE.body, color: COLOR.textSoft }}>
                  Cấp quyền vị trí ở phần của bạn để app tính khoảng cách giữa hai đứa.
                </Text>
              )}
              {partnerSlot.battery != null ? (
                <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft }}>Pin {partnerSlot.battery}%</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 10 }}>
              {partner.name} chưa có điểm vị trí nào — khi {partner.name} mở app và cấp quyền vị trí, ghim của họ sẽ hiện ở đây và di chuyển theo thời gian thực.
            </Text>
          )}
        </View>

        {/* Phần của mình: chỉ còn cổng quyền vị trí */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, flex: 1 }}>Vị trí của bạn</Text>
            <StatusChip
              label={perm === false ? "Chưa cấp quyền" : myHasPos ? "Trực tiếp" : "Đang chờ điểm đầu tiên"}
              variant={perm === false ? "neutral" : myHasPos ? "done" : "waiting"}
            />
          </View>
          {perm === false ? (
            <>
              <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 6 }}>
                Bản đồ hai đứa là bản đồ trực tiếp của riêng hai đứa: bạn cấp quyền vị trí một lần, từ đó mỗi khi mở app, {partner.name} sẽ thấy vị trí của bạn chạy theo thời gian thực — và bạn cũng thấy {partner.name} như vậy.
              </Text>
              <TouchableOpacity style={[s.btn, { marginTop: 14, opacity: busy ? 0.6 : 1 }]} onPress={grantPermission} disabled={busy} accessibilityRole="button" accessibilityLabel="Cấp quyền vị trí">
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={s.btnText}>{busy ? "Đang xin quyền..." : "Cấp quyền vị trí"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ ...TYPE.body, color: COLOR.text, marginTop: 6 }}>
                {myHasPos
                  ? `Đã publish điểm mới nhất · ${freshnessText(mySlot.locAt, now)}`
                  : "Đang chờ điểm vị trí đầu tiên — giữ app đang mở một chút nhé."}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 4 }}>
                Vị trí tự cập nhật trong lúc app đang mở: bạn di chuyển, ghim của bạn trên máy {partner.name} chạy theo. Không cần bật tắt gì thêm.
              </Text>
            </>
          )}
        </View>

        {/* Nói rõ cách hoạt động */}
        <View style={{ flexDirection: "row", gap: 8, backgroundColor: ROLE.sharedSoft, borderRadius: RADIUS.tile, padding: 12 }}>
          <Ionicons name="shield-checkmark-outline" size={17} color={ROLE.shared} />
          <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13, color: ROLE.sharedDark, lineHeight: 19 }}>
            Vị trí chỉ publish khi app của mỗi người đang mở và đã cấp quyền vị trí — không theo dõi nền, không lưu lịch sử đường đi, chỉ giữ điểm mới nhất của mỗi người. Người ấy đóng app thì ghim đứng yên ở điểm cuối cùng và nhãn thời gian sẽ nói rõ. Bản đồ dùng gạch ảnh OpenStreetMap, chỉ tải khi màn này đang mở. Trên web, vị trí chạy khi tab đang mở và cần bạn cho phép trong trình duyệt.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

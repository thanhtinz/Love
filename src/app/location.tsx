import React, { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { distanceText, freshnessText, haversineKm, visibleStatus } from "../lib/features";
import { statusMoodById } from "../lib/content";
import { captureLocationFix, foregroundPermissionGranted, getBatteryPct, requestForegroundPermission } from "../components/presenceService";
import CoupleMap, { type CoupleMapPoint } from "../components/CoupleMap";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT, SPACE, TYPE } from "../components/theme";
import { s, useNow } from "../components/ui";

/**
 * BẢN ĐỒ HAI ĐỨA (lõi 5 — VỊ TRÍ TRỰC TIẾP, route Stack /location).
 * Dáng TOÀN MÀN HÌNH kiểu Jagat (mẫu A đã duyệt): bản đồ gạch OpenStreetMap
 * tràn cạnh-tới-cạnh, ghim avatar của hai đứa + đường đứt nét nối hai điểm,
 * chrome nổi toàn pill trắng — nút back tròn, pill khoảng cách ở trên, nút
 * định vị góc dưới-phải, thanh người ấy mỏng ở đáy.
 * - Không phiên, không công tắc: mở màn này là THẤY LUÔN vị trí của hai đứa.
 *   Publish chạy TOÀN APP khi app đang mở (LocationSync ở layout gốc): máy
 *   nào đã cấp quyền vị trí thì tự gửi điểm mới nhất của mình (tiết lưu
 *   >= 10 giây và >= 20m), ghim của người ấy chạy theo qua kênh đồng bộ.
 * - Camera lúc mở fit CẢ HAI điểm; sau đó KHÔNG tự giật theo — chỉ nút định
 *   vị mới fit lại (qua fitSignal của CoupleMap).
 * - Cổng DUY NHẤT là quyền vị trí của hệ điều hành: chưa cấp thì hiện thẻ
 *   giải thích ấm ở giữa màn + nút "Cấp quyền vị trí"; cấp xong publish tự chạy.
 * - Người ấy CHƯA TỪNG có điểm nào (chưa mở bản mới / chưa cấp quyền): thanh
 *   đáy thành thẻ CHỜ nói thật điều kiện đó — không màn trống khó hiểu.
 * - Chỉ giữ điểm mới nhất của mỗi người — không lịch sử, không theo dõi nền.
 *   Gạch bản đồ chỉ tải khi có ít nhất một ghim.
 */
export default function LocationScreen() {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [perm, setPerm] = useState<boolean | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const triedFixRef = useRef(false);

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
  const distLabel = distKm == null ? "" : distKm < 0.3 ? distanceText(distKm) : `Cách nhau ${distanceText(distKm)}`;
  const partnerStatus = visibleStatus(state.status[partner.slot], now);
  const partnerMood = partnerStatus ? statusMoodById(partnerStatus.mood) : undefined;
  const partnerFresh = partnerHasPos ? freshnessText(partnerSlot.locAt, now) : "";

  /* Đã có quyền mà máy này chưa từng có điểm (mới cấp quyền ở nơi khác /
   * watch chưa kịp nhịp đầu): chụp một điểm ngay khi vào màn cho ghim của
   * mình hiện luôn, khỏi chờ. Vẫn là PRESENCE_SNAPSHOT như mọi publish khác. */
  useEffect(() => {
    if (perm !== true || myHasPos || triedFixRef.current) return;
    triedFixRef.current = true;
    void (async () => {
      const battery = await getBatteryPct();
      const fix = await captureLocationFix();
      if (fix) {
        dispatch({ type: "PRESENCE_SNAPSHOT", user: me, lat: fix.lat, lng: fix.lng, acc: fix.acc, battery, at: new Date().toISOString() });
      }
    })();
  }, [perm, myHasPos, me, dispatch]);

  /* Ghim bản đồ: phía nào đã có điểm mới nhất thì có ghim. Mảng rỗng ->
   * không gắn CoupleMap -> không tải bất kỳ gạch nào. */
  const points: CoupleMapPoint[] = [];
  if (myHasPos) points.push({ key: "me", lat: mySlot.lat!, lon: mySlot.lng!, name: "Bạn", avatarId: self.avatar });
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

  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/couple" as never); };

  return (
    <View style={{ flex: 1, backgroundColor: COLOR.gardenWash }}>
      {/* Bản đồ tràn toàn màn hình — chỉ khi có ít nhất một ghim */}
      {points.length > 0 ? (
        <CoupleMap points={points} distanceKm={distKm} variant="full" fitSignal={fitSignal} />
      ) : null}

      {/* Nút back nổi */}
      <TouchableOpacity
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        style={{ position: "absolute", top: insets.top + 10, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOW_FLOAT }}
      >
        <Ionicons name="chevron-back" size={21} color={COLOR.text} />
      </TouchableOpacity>

      {/* Pill khoảng cách + độ tươi ở trên */}
      {bothFix ? (
        <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 10, left: 64, right: 16, alignItems: "center" }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, maxWidth: "100%", ...SHADOW_FLOAT }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 13, color: COLOR.text }}>
              {distLabel}{partnerFresh ? ` · ${partnerFresh}` : ""}
            </Text>
          </View>
        </View>
      ) : null}

      {perm === false ? (
        /* Cổng quyền vị trí: thẻ giải thích ở giữa màn (hành vi như cũ —
           đây là nơi DUY NHẤT xin quyền). */
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACE.screenX }}>
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: RADIUS.card, padding: 22, alignItems: "center", ...SHADOW_FLOAT }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="map-outline" size={28} color={COLOR.primary} />
            </View>
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, marginTop: 14, textAlign: "center" }}>Bản đồ hai đứa cần quyền vị trí</Text>
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8, textAlign: "center" }}>
              Bạn cấp quyền vị trí một lần, từ đó mỗi khi mở app, {partner.name} sẽ thấy vị trí của bạn trên bản đồ này — và bạn cũng thấy {partner.name} như vậy. Vị trí chỉ publish khi app đang mở, không theo dõi nền, không lưu lịch sử đường đi.
            </Text>
            {err ? (
              <View style={{ flexDirection: "row", gap: 8, backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.tile, padding: 12, marginTop: 14, alignSelf: "stretch" }}>
                <Ionicons name="alert-circle-outline" size={17} color={COLOR.danger} />
                <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.danger, lineHeight: 19 }}>{err}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={[s.btn, { marginTop: 16, alignSelf: "stretch", opacity: busy ? 0.6 : 1 }]} onPress={grantPermission} disabled={busy} accessibilityRole="button" accessibilityLabel="Cấp quyền vị trí">
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={s.btnText}>{busy ? "Đang xin quyền..." : "Cấp quyền vị trí"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Chưa có điểm nào của mình (đã cấp quyền, đang chờ điểm đầu) */}
          {points.length === 0 ? (
            <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 64, left: 0, right: 0, alignItems: "center" }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, ...SHADOW_FLOAT }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: COLOR.textSoft }}>Đang xác định vị trí của bạn…</Text>
              </View>
            </View>
          ) : null}

          {/* Cụm dưới: nút định vị (phải) + thanh người ấy / thẻ chờ */}
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: insets.bottom + 12 }}>
            {points.length > 0 ? (
              <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => setFitSignal((v) => v + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Về giữa hai đứa"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...SHADOW_FLOAT }}
                >
                  <Ionicons name="locate" size={22} color={COLOR.text} />
                </TouchableOpacity>
              </View>
            ) : null}

            {partnerHasPos ? (
              <View pointerEvents="none" style={{ backgroundColor: "#fff", borderRadius: RADIUS.card, paddingHorizontal: 14, paddingVertical: 12, ...SHADOW_FLOAT }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <Avatar id={partner.avatar} size={42} ring={partner.main} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text }} numberOfLines={1}>{partner.name}</Text>
                    {partnerStatus && partnerMood ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                        <Ionicons name={partnerMood.icon as never} size={13} color={partner.main} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.medium, fontSize: 12.5, color: COLOR.textSoft }}>
                          {partnerMood.label}{partnerStatus.text ? ` — “${partnerStatus.text}”` : ""}
                        </Text>
                      </View>
                    ) : distLabel ? (
                      <Text numberOfLines={1} style={{ fontFamily: FONT.medium, fontSize: 12.5, color: COLOR.textSoft, marginTop: 1 }}>{distLabel}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.text }}>{partnerFresh}</Text>
                    {partnerSlot.battery != null ? (
                      <Text style={{ fontFamily: FONT.regular, fontSize: 11.5, color: COLOR.textFaint, marginTop: 1 }}>Pin {partnerSlot.battery}%</Text>
                    ) : null}
                  </View>
                </View>
                {points.length > 0 ? (
                  <Text style={{ fontFamily: FONT.regular, fontSize: 9.5, color: COLOR.textFaint, textAlign: "right", marginTop: 6 }}>© OpenStreetMap contributors</Text>
                ) : null}
              </View>
            ) : (
              /* Người ấy chưa từng có điểm: thẻ CHỜ nói thật điều kiện —
                 không để màn hình trống khó hiểu. */
              <View pointerEvents="none" style={{ backgroundColor: "#fff", borderRadius: RADIUS.card, paddingHorizontal: 14, paddingVertical: 12, ...SHADOW_FLOAT }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: partner.bg, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="time-outline" size={21} color={partner.main} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text }} numberOfLines={1}>Đang chờ vị trí của {partner.name}</Text>
                    <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, marginTop: 1, lineHeight: 17 }}>
                      Người ấy cần mở app (bản mới) và cho phép vị trí một lần — sau đó mở bản đồ là thấy nhau ngay.
                    </Text>
                  </View>
                </View>
                {points.length > 0 ? (
                  <Text style={{ fontFamily: FONT.regular, fontSize: 9.5, color: COLOR.textFaint, textAlign: "right", marginTop: 6 }}>© OpenStreetMap contributors</Text>
                ) : null}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

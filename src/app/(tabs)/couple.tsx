import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { myName, useLove } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { uploadCouplePhoto, useCouplePhotoUrl } from "../../lib/photo";
import { success } from "../../lib/feedback";
import { formatDateVN, isValidDateKey } from "../../lib/types";
import { dayCount, freshnessText, milestoneDateKey, nextMilestone, timeAgoText, visibleStatus } from "../../lib/features";
import { statusMoodById } from "../../lib/content";
import { StatusEditor } from "../../components/StatusEditor";
import Avatar from "../../components/Avatar";
import { HeroBand, MascotArt } from "../../components/Art";
import { CouplePhotoLarge } from "../../components/CouplePhoto";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { ClosingBand, FeatureCard, ProgressBar, s, tabBarPad } from "../../components/ui";

/**
 * Tab "Hai đứa" — hub của cặp đôi trong bản rebuild:
 * - Thẻ hồ sơ navy "Chúng mình": avatar hai người, Ngày N, ngày bắt đầu, mốc tiếp theo.
 * - Ảnh của hai đứa (đợt 3) ngay trong thẻ navy: ảnh thật khổ lớn 4:3 phủ kín
 *   bề ngang thẻ (Storage, bucket riêng tư), chưa đặt thì tranh couple-hero
 *   cùng khổ + nút thêm ảnh dạng pill nhỏ đè ở góc ảnh.
 * - Sửa ngày bắt đầu yêu ngay tại đây (cả hai đều sửa được, máy kia thấy qua nhật ký).
 * - Hàng Bản đồ hai đứa (kèm trạng thái phiên đang chạy) -> /location.
 * - Hàng Tài khoản & ghép cặp -> /account.
 * - Nhật ký hoạt động của 5 lõi (chăm cây, note, nhịp nhớ, cột mốc, vị trí).
 */
function displayToKey(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const key = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

export default function CoupleScreen() {
  const { state, dispatch, hydrated } = useLove();
  const { couple } = useAuth();
  const insets = useSafeAreaInsets();
  const [dateText, setDateText] = useState("");
  const [dateDirty, setDateDirty] = useState(false);
  const [dateMsg, setDateMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [photoOk, setPhotoOk] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const photoUrl = useCouplePhotoUrl(state.couplePhoto);
  // Khổ ảnh 4:3 phủ kín bề ngang thẻ navy: bề ngang khả dụng = màn hình trừ
  // lề ScrollView (SPACE.screenX x2) và padding thẻ (20 x2).
  const { width: windowWidth } = useWindowDimensions();
  const photoH = Math.round((windowWidth - SPACE.screenX * 2 - 40) * 0.75);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ ô ngày từ state, trừ khi đang sửa
  useEffect(() => { if (!dateDirty && hydrated) setDateText(formatDateVN(state.couple.startDate)); }, [state.couple.startDate, dateDirty, hydrated]);

  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
  const count = dayCount(state.couple.startDate);
  const next = nextMilestone(count);
  const partnerSlotState = state.presence[partner.slot];
  const partnerHasPos = partnerSlotState.lat != null && partnerSlotState.lng != null;
  const shareBadge = partnerHasPos ? `${partner.name} · ${freshnessText(partnerSlotState.locAt)}` : undefined;

  /* Ảnh của hai đứa: chọn từ thư viện (cắt 4:3) -> tải lên Storage -> ghi sổ
   * vào state. Lỗi nào cũng thành một dòng chữ ấm áp ngay dưới khung ảnh. */
  async function pickCouplePhoto() {
    if (photoBusy) return;
    setPhotoMsg("");
    setPhotoOk(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPhotoMsg("App cần quyền mở thư viện ảnh để hai bạn chọn ảnh chung. Cho phép rồi thử lại nhé.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return; // người dùng đổi ý — lặng lẽ thôi
      if (!couple?.id) {
        setPhotoMsg("Chưa có vườn chung để lưu ảnh — hãy ghép cặp trước nhé.");
        return;
      }
      setPhotoBusy(true);
      const photo = await uploadCouplePhoto(couple.id, result.assets[0].uri, me);
      dispatch({ type: "COUPLE_PHOTO_SET", photo, user: me, actor: myName(state) });
      success();
      setPhotoOk(true);
      setPhotoMsg("Đã đặt ảnh của hai đứa — người ấy sẽ thấy ngay trong vườn chung.");
    } catch (e) {
      setPhotoMsg(e instanceof Error ? e.message : "Có chút trục trặc khi đặt ảnh. Thử lại giúp mình nhé.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function saveStartDate() {
    const key = displayToKey(dateText);
    if (!key) { setDateMsg("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    if (new Date(`${key}T00:00:00`).getTime() > Date.now()) { setDateMsg("Ngày bắt đầu không thể ở tương lai nhé."); return; }
    dispatch({ type: "SET_START_DATE", date: key, user: me, actor: myName(state) });
    setDateDirty(false);
    setDateMsg("Đã lưu — người ấy sẽ thấy thay đổi này trong nhật ký.");
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={s.title}>Hai đứa</Text>
          <Text style={[s.sub, { marginTop: 2, fontSize: 13.5 }]}>Không gian chung của {self.name} và {partner.name}</Text>
        </View>

        {/* Hồ sơ chung navy */}
        <View style={{ backgroundColor: ROLE.shared, borderRadius: RADIUS.scene, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ flexDirection: "row" }}>
              <Avatar id={self.avatar} size={56} ring="#fff" />
              <View style={{ marginLeft: -16 }}>
                <Avatar id={partner.avatar} size={56} ring="#fff" />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.extrabold, fontSize: 17.5, color: "#fff" }}>{self.name} & {partner.name}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.onNavySoft, marginTop: 2 }}>
                Yêu nhau từ {formatDateVN(state.couple.startDate)}
              </Text>
            </View>
          </View>
          {/* Trạng thái của nhau (hiện diện sống): dưới tên mỗi người là trạng
              thái CỦA CHÍNH người đó — của mình thì có nút đặt/sửa ngay tại
              đây. Trạng thái chỉ hiện 24 giờ; hết hạn hiện đúng như chưa đặt
              (kèm nút "Đặt trạng thái" để đặt lại cái mới). */}
          <View style={{ marginTop: 14, gap: 8 }}>
            {[self, partner].map((person) => {
              const st = visibleStatus(state.status[person.slot]);
              const mood = st ? statusMoodById(st.mood) : undefined;
              const mine = person.slot === me;
              return (
                <View key={person.slot} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <Avatar id={person.avatar} size={24} ring="#fff" />
                  <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: "#fff" }}>{person.name}</Text>
                  {st && mood ? (
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name={mood.icon as never} size={13} color="#FFE3EC" />
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.medium, fontSize: 12.5, color: COLOR.onNavySoft }}>
                        {mood.label}{st.text ? ` — “${st.text}”` : ""}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.onNavySoft }}>Chưa đặt trạng thái</Text>
                  )}
                  {mine ? (
                    <TouchableOpacity
                      onPress={() => setStatusOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={st ? "Sửa trạng thái của bạn" : "Đặt trạng thái của bạn"}
                      style={{ backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}
                    >
                      <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: "#fff" }}>{st ? "Sửa" : "Đặt trạng thái"}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
          {/* Ảnh của hai đứa: ảnh thật hiện LỚN phủ kín bề ngang thẻ (4:3,
              không khung, không ghi chú); chưa đặt thì tranh couple-hero cùng
              khổ. Nút đổi/thêm ảnh là pill nhỏ đè ở góc dưới-phải của ảnh. */}
          <View style={{ marginTop: 18 }}>
            <View style={{ position: "relative" }}>
              {state.couplePhoto && photoUrl ? (
                <CouplePhotoLarge url={photoUrl} />
              ) : (
                <View style={{ borderRadius: RADIUS.inner, overflow: "hidden" }}>
                  <HeroBand height={photoH} />
                </View>
              )}
              {state.couplePhoto && !photoUrl ? (
                <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(38,22,30,0.62)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontFamily: FONT.medium, fontSize: 11.5, color: "#fff" }}>Đang tải ảnh...</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={pickCouplePhoto}
                disabled={photoBusy}
                style={{ position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(38,22,30,0.62)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, opacity: photoBusy ? 0.6 : 1 }}
                accessibilityRole="button"
                accessibilityLabel={state.couplePhoto ? "Đổi ảnh hai đứa" : "Thêm ảnh của hai đứa"}
              >
                {photoBusy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={14} color="#fff" />}
                <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: "#fff" }}>
                  {photoBusy ? "Đang tải lên..." : state.couplePhoto ? "Đổi ảnh" : "Thêm ảnh"}
                </Text>
              </TouchableOpacity>
            </View>
            {photoMsg ? (
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: photoOk ? COLOR.onNavySoft : "#FFC4CE", marginTop: 9, textAlign: "center" }}>
                {photoMsg}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 16 }}>
            <Text style={{ ...TYPE.displaySm, color: "#fff" }}>Ngày {count}</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.onNavySoft, paddingBottom: 6 }}>
              {next ? `· còn ${next.remaining} ngày tới mốc ${next.days}` : "· đã qua mọi cột mốc"}
            </Text>
          </View>
          {next ? (
            <View style={{ marginTop: 8 }}>
              <ProgressBar value={Math.min(100, Math.round((count / next.days) * 100))} color="#F2789A" height={7} />
            </View>
          ) : null}
        </View>

        {/* Hành trình của hai đứa — lịch sử mốc ngày yêu (kỷ vật đợt 2) */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Hành trình của hai đứa</Text>
          {state.couple.milestoneHistory.length === 0 ? (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>
              {next
                ? `Hành trình còn ở phía trước — mốc ${next.days} ngày đang chờ hai đứa vào ${formatDateVN(milestoneDateKey(state.couple.startDate, next.days))}.`
                : "Hành trình của hai đứa vẫn đang được viết tiếp mỗi ngày."}
            </Text>
          ) : (
            <View style={{ marginTop: 11, gap: 10 }}>
              {state.couple.milestoneHistory.map((h) => (
                <View key={h.days} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: COLOR.successSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark" size={15} color={COLOR.successText} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.text }}>
                    Mốc {h.days} ngày yêu
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>
                    {formatDateVN(milestoneDateKey(state.couple.startDate, h.days))}
                  </Text>
                </View>
              ))}
              {next ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: COLOR.warningSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="flag" size={14} color={COLOR.warning} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 13.5, color: ROLE.shared }}>
                    Mốc {next.days} ngày — còn {next.remaining} ngày
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>
                    {formatDateVN(milestoneDateKey(state.couple.startDate, next.days))}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Sửa ngày bắt đầu */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Ngày bắt đầu yêu</Text>
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 6 }}>
            {"Bộ đếm \"Ngày N\" tính từ ngày này. Ai trong hai đứa cũng sửa được — lần sửa gần nhất là lần được tính."}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLOR.textFaint}
              keyboardType="numbers-and-punctuation"
              value={dateText}
              onChangeText={(t) => { setDateText(t); setDateDirty(true); setDateMsg(""); }}
            />
            <TouchableOpacity onPress={saveStartDate} style={{ backgroundColor: COLOR.primary, borderRadius: RADIUS.control, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", minHeight: 48 }} accessibilityRole="button" accessibilityLabel="Lưu ngày bắt đầu yêu">
              <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 14.5 }}>Lưu</Text>
            </TouchableOpacity>
          </View>
          {dateMsg ? <Text style={{ marginTop: 8, fontFamily: FONT.regular, fontSize: 13, color: dateMsg.startsWith("Đã lưu") ? COLOR.successText : COLOR.danger }}>{dateMsg}</Text> : null}
        </View>

        {/* Điều hướng lõi 5 + tài khoản */}
        <View style={{ gap: SPACE.cardGap }}>
          <FeatureCard
            icon="location"
            title="Bản đồ hai đứa"
            desc={partnerHasPos
              ? `Đang thấy ${partner.name} trên bản đồ trực tiếp (${freshnessText(partnerSlotState.locAt).toLowerCase()}) — chạm để xem ghim chạy theo thời gian thực.`
              : "Mở là thấy vị trí trực tiếp của hai đứa trên bản đồ — chỉ cần app đang mở và đã cấp quyền vị trí, không cần bật tắt gì thêm."}
            route="/location"
            badge={shareBadge}
            badgeVariant="partner"
          />
          <FeatureCard
            icon="person-circle"
            title="Tài khoản & ghép cặp"
            desc="Hồ sơ của bạn, mã mời, danh sách thành viên, rời vườn hoặc đăng xuất."
            route="/account"
          />
          <FeatureCard
            icon="mail"
            title="Hộp thư đã giữ"
            desc={state.keptLetters.length > 0
              ? "Đọc lại những lá thư tình đã rơi khi hai đứa chăm cây và khi cây lên giai đoạn mới."
              : "Nơi giữ những lá thư tình rơi khi chăm cây và lên giai đoạn. Chưa có lá nào — lá đầu tiên đang chờ hai đứa."}
            route="/letters"
            badge={state.keptLetters.length > 0 ? `${state.keptLetters.length} lá` : undefined}
            badgeVariant="accent"
          />
          <FeatureCard
            icon="images"
            title="Dây kỷ niệm"
            desc={state.memories.length > 0
              ? "Những khoảnh khắc của hai đứa đang treo trên dây — chạm để xem lại và treo thêm."
              : "Treo ảnh của hai đứa lên sợi dây kỷ niệm — mỗi tấm một khung, một ngày, một câu chuyện."}
            route="/memories"
            badge={state.memories.length > 0 ? `${state.memories.length} kỷ niệm đã treo` : undefined}
            badgeVariant="accent"
          />
        </View>

        {/* Nhật ký hoạt động */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Nhật ký của hai đứa</Text>
          {state.activities.length === 0 ? (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>
              Chưa có dấu vết nào — chăm cây, gửi note hay một nhịp nhớ sẽ hiện ở đây.
            </Text>
          ) : (
            <View style={{ marginTop: 11, gap: 11 }}>
              {state.activities.slice(0, 10).map((a) => (
                <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: ROLE.sharedSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={(a.icon || "heart") as never} size={14} color={ROLE.shared} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.text }}>
                    <Text style={{ fontFamily: FONT.bold }}>{a.actor}</Text> {a.text}
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint }}>{timeAgoText(a.time)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <ClosingBand art={<MascotArt size={56} />} line="Khu vườn này chỉ có hai người thôi — mỗi ngày bên nhau, cây lại lớn thêm một chút." />
      </ScrollView>
      <StatusEditor visible={statusOpen} onClose={() => setStatusOpen(false)} />
    </View>
  );
}

import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { formatDateVN, isValidDateKey } from "../../lib/types";
import { dayCount, nextMilestone, shareStatus, timeAgoText } from "../../lib/features";
import Avatar from "../../components/Avatar";
import { MascotArt } from "../../components/Art";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { ClosingBand, FeatureCard, ProgressBar, s, tabBarPad } from "../../components/ui";

/**
 * Tab "Hai đứa" — hub của cặp đôi trong bản rebuild:
 * - Thẻ hồ sơ navy "Chúng mình": avatar hai người, Ngày N, ngày bắt đầu, mốc tiếp theo.
 * - Sửa ngày bắt đầu yêu ngay tại đây (cả hai đều sửa được, máy kia thấy qua nhật ký).
 * - Hàng Định vị tạm thời (kèm trạng thái phiên đang chạy) -> /location.
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
  const insets = useSafeAreaInsets();
  const [dateText, setDateText] = useState("");
  const [dateDirty, setDateDirty] = useState(false);
  const [dateMsg, setDateMsg] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ ô ngày từ state, trừ khi đang sửa
  useEffect(() => { if (!dateDirty && hydrated) setDateText(formatDateVN(state.couple.startDate)); }, [state.couple.startDate, dateDirty, hydrated]);

  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
  const count = dayCount(state.couple.startDate);
  const next = nextMilestone(count);
  const myShare = shareStatus(state.presence[me]);
  const partnerShare = shareStatus(state.presence[partner.slot]);
  const shareBadge = partnerShare.active ? `${partner.name} đang chia sẻ vị trí` : myShare.active ? "Bạn đang chia sẻ vị trí" : undefined;

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
            title="Định vị tạm thời"
            desc={partnerShare.active
              ? `${partner.name} đang chia sẻ vị trí — chạm để xem khoảng cách và thời gian còn lại.`
              : myShare.active
                ? "Bạn đang chia sẻ vị trí — chạm để xem hoặc dừng phiên."
                : "Chia sẻ vị trí trong 15 phút, 1 giờ, 4 giờ hoặc đến khi tự tắt. Không theo dõi nền."}
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
    </View>
  );
}

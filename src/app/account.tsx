import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useLove } from "../lib/store";
import { AVATARS } from "../lib/types";
import Avatar from "../components/Avatar";
import { WidgetSettingsCard } from "../components/WidgetSettings";
import { WebPushCard } from "../components/WebPushCard";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../components/theme";
import { ScreenHeader, StatusChip, s } from "../components/ui";

/**
 * Tài khoản (route Stack /account) — hồ sơ của CHÍNH người dùng + ghép cặp:
 * đổi tên hiển thị/avatar (qua profiles Supabase), mã mời + thành viên,
 * trạng thái kết nối realtime, rời vườn (xác nhận 2 bước) và đăng xuất.
 * Các cài đặt "của vườn" (ngày bắt đầu yêu) nằm ở tab Hai đứa, không ở đây.
 */
export default function AccountScreen() {
  const { user, couple, signOut, leaveCouple, updateMyProfile } = useAuth();
  const { connected } = useLove();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("svg-a");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp form từ hồ sơ tài khoản hiện tại
  useEffect(() => { if (user) { setName(user.displayName); setAvatarId(user.avatar); } }, [user]);

  if (!user) return null;
  const members = couple?.members ?? [];

  async function saveProfile() {
    setMsg(""); setBusy(true);
    try {
      const res = await updateMyProfile(name, avatarId);
      setMsg(res.error || "Đã lưu hồ sơ — tên và avatar mới sẽ hiện cho cả hai sau khi đồng bộ.");
    } catch { setMsg("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }
  async function shareCode() {
    if (!couple) return;
    try { await Share.share({ message: `Vào Khu Vườn Tình Yêu với mình nhé! Mã mời: ${couple.code}` }); } catch { /* bỏ qua */ }
  }
  async function doLeave() {
    setBusy(true);
    try {
      const res = await leaveCouple();
      if (res.error) { setMsg(res.error); setConfirmLeave(false); }
      else router.replace("/pair");
    } catch { setMsg("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Tài khoản" subtitle={user.email} fallback="/(tabs)/couple" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: 6, paddingBottom: insets.bottom + 32, gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        {/* Hồ sơ của bạn */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Hồ sơ của bạn</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {AVATARS.map((a) => {
              const on = avatarId === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAvatarId(a.id)}
                  style={{ alignItems: "center", width: 62, opacity: on ? 1 : 0.65 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar ${a.label}`}
                  accessibilityState={{ selected: on }}
                >
                  <View style={{ borderRadius: 999, borderWidth: 2.5, borderColor: on ? COLOR.primary : "transparent", padding: 2 }}>
                    <Avatar id={a.id} size={46} />
                  </View>
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: on ? COLOR.primary : COLOR.textSoft, marginTop: 3 }}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.textSoft, marginTop: 14, marginBottom: 6 }}>Tên hiển thị</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Tên của bạn" placeholderTextColor={COLOR.textFaint} maxLength={30} />
          {msg ? <Text style={{ marginTop: 10, fontFamily: FONT.regular, fontSize: 13.5, color: msg.startsWith("Đã lưu") ? COLOR.successText : COLOR.danger }}>{msg}</Text> : null}
          <TouchableOpacity style={[s.btn, { marginTop: 12, opacity: busy ? 0.6 : 1 }]} onPress={saveProfile} disabled={busy} accessibilityRole="button" accessibilityLabel="Lưu hồ sơ">
            <Text style={s.btnText}>{busy ? "Đang lưu..." : "Lưu hồ sơ"}</Text>
          </TouchableOpacity>
        </View>

        {/* Ghép cặp */}
        {couple ? (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ ...TYPE.micro, color: COLOR.textSoft, flex: 1 }}>Ghép cặp</Text>
              <StatusChip label={connected ? "Đang đồng bộ trực tiếp" : "Đang kết nối lại"} variant={connected ? "done" : "waiting"} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
              <Text style={{ fontFamily: FONT.black, fontSize: 26, letterSpacing: 3, color: COLOR.text, flex: 1 }}>{couple.code}</Text>
              <TouchableOpacity onPress={shareCode} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.control, paddingHorizontal: 14, paddingVertical: 10 }} accessibilityRole="button" accessibilityLabel="Chia sẻ mã mời">
                <Ionicons name="share-social-outline" size={17} color={ROLE.selfDark} />
                <Text style={{ color: ROLE.selfDark, fontFamily: FONT.bold, fontSize: 14 }}>Chia sẻ</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 14, gap: 10 }}>
              {members.map((m) => (
                <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar id={m.avatar} size={38} />
                  <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: COLOR.text, flex: 1 }}>{m.displayName}</Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft }}>{m.slot === couple.mySlot ? "Bạn" : "Người ấy"}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={{ ...TYPE.body, color: COLOR.textSoft }}>Bạn chưa ghép cặp với ai — vào màn Ghép cặp để tạo vườn hoặc nhập mã mời.</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 12 }]} onPress={() => router.replace("/pair")} accessibilityRole="button" accessibilityLabel="Đi tới màn ghép cặp">
              <Text style={s.btnText}>Đi ghép cặp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Widget màn hình chính — công tắc riêng của chính người dùng + xem trước */}
        <WidgetSettingsCard />

        {/* Web Push — chỉ hiện trên bản web (component tự trả null ở native) */}
        <WebPushCard />

        {/* Rời vườn + đăng xuất */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Phiên đăng nhập</Text>
          <TouchableOpacity style={[s.btnGhost, { marginTop: 12 }]} onPress={() => signOut()} accessibilityRole="button" accessibilityLabel="Đăng xuất">
            <Text style={s.btnGhostText}>Đăng xuất</Text>
          </TouchableOpacity>
          {couple ? (
            !confirmLeave ? (
              <TouchableOpacity style={{ alignItems: "center", paddingVertical: 13, marginTop: 6 }} onPress={() => setConfirmLeave(true)} accessibilityRole="button" accessibilityLabel="Rời khỏi vườn">
                <Text style={{ color: COLOR.danger, fontFamily: FONT.bold, fontSize: 14.5 }}>Rời khỏi vườn này</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: 10, backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.tile, padding: 12 }}>
                <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.danger, lineHeight: 19 }}>
                  Rời vườn sẽ tách tài khoản của bạn khỏi vườn này. Người ấy vẫn giữ vườn và dữ liệu phía họ. Bạn chắc chắn chứ?
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.control, minHeight: 44, alignItems: "center", justifyContent: "center" }} onPress={() => setConfirmLeave(false)} accessibilityRole="button" accessibilityLabel="Huỷ rời vườn">
                    <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }}>Ở lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: COLOR.danger, borderRadius: RADIUS.control, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }} onPress={doLeave} disabled={busy} accessibilityRole="button" accessibilityLabel="Xác nhận rời vườn">
                    <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#fff" }}>{busy ? "Đang rời..." : "Xác nhận rời"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

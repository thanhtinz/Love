import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { useLove } from "../../lib/store";
import { AVATARS, parseDateKey, today } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { C, SectionTitle, s } from "../../components/ui";

export default function AccountScreen() {
  const { user, couple, signOut, leaveCouple, updateMyProfile, refreshCouple } = useAuth();
  const { state, dispatch, connected, hydrated } = useLove();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("svg-a");
  const [gardenName, setGardenName] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ form hồ sơ từ tài khoản hiện tại
  useEffect(() => { if (user) { setName(user.displayName); setAvatarId(user.avatar); } }, [user]);
  // Cờ dirty cho 2 ô của form vườn: đồng bộ từ xa về giữa lúc đang gõ không được
  // ghi đè nội dung đang nhập dở (chỉ nạp từ state khi người dùng chưa tự sửa ô đó).
  const [gardenDirty, setGardenDirty] = useState(false);
  const [dateDirty, setDateDirty] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ form vườn từ state đã tải, trừ ô người dùng đang sửa
  useEffect(() => { if (!gardenDirty) setGardenName(state.gardenName); if (!dateDirty) setStartDate(state.startDate); }, [state.gardenName, state.startDate, gardenDirty, dateDirty]);

  if (!user) return null;

  async function saveProfile() {
    setMsg(""); setBusy(true);
    try {
      const res = await updateMyProfile(name, avatarId);
      setMsg(res.error || "Đã lưu hồ sơ. Tên và avatar mới sẽ hiện cho cả hai sau khi đồng bộ.");
    } catch { setMsg("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }
  function saveGarden() {
    if (!hydrated) { setMsg("Đang tải dữ liệu khu vườn — chờ một chút rồi lưu lại nhé."); return; }
    // Kiểm tra ngày CHẶT như màn Ghép cặp: ngày không tồn tại (31/02) bị loại và ngày
    // tương lai cũng bị chặn — bản cũ ở màn này thiếu cả hai (chỉ regex + isNaN).
    const d = parseDateKey(startDate);
    if (!d) { setMsg("Ngày bắt đầu yêu chưa đúng (năm-tháng-ngày, ngày phải tồn tại thật)."); return; }
    if (d.getTime() > Date.now()) { setMsg("Ngày bắt đầu yêu không thể ở tương lai."); return; }
    dispatch({ type: "SETUP_GARDEN", gardenName: gardenName.trim(), startDate });
    setMsg("Đã lưu thông tin khu vườn.");
  }
  function confirmLeave() {
    Alert.alert("Rời khu vườn?", "Bạn sẽ rời vườn hiện tại. Toàn bộ cây và dữ liệu chung vẫn ở lại với người kia; tài khoản của bạn sẽ không còn thuộc vườn nào.", [
      { text: "Ở lại", style: "cancel" },
      { text: "Rời vườn", style: "destructive", onPress: async () => { const res = await leaveCouple(); if (res.error) { Alert.alert("Chưa rời được vườn", res.error); return; } router.replace("/pair"); } },
    ]);
  }
  function confirmSignOut() {
    Alert.alert("Đăng xuất?", "Bạn sẽ cần đăng nhập lại để vào vườn.", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: async () => { await signOut(); router.replace("/auth"); } },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="person-circle">Tài khoản của bạn</SectionTitle>

      <View style={[s.card, { alignItems: "center", gap: 6 }]}>
        <Avatar id={user.avatar} size={76} />
        <Text style={{ fontSize: 18, fontFamily: "BeVietnamPro_900Black", color: C.text }}>{user.displayName}</Text>
        <Text style={s.sub}>{user.email}</Text>
        <View style={s.chip}><Ionicons name={connected ? "wifi" : "cloud-offline"} size={13} color={C.pinkDark} /><Text style={s.chipText}>{connected ? "Realtime đang bật" : "Đang ngoại tuyến — sẽ đồng bộ khi có mạng"}</Text></View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Hồ sơ hiển thị</Text>
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} maxLength={24} placeholder="Tên của bạn" placeholderTextColor={C.textFaint} />
        <Text style={styles.label}>Avatar</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {AVATARS.map((a) => (
            <TouchableOpacity key={a.id} onPress={() => setAvatarId(a.id)} style={[styles.avatarBtn, avatarId === a.id && styles.avatarOn]}>
              <Avatar id={a.id} size={40} />
              <Text style={{ fontSize: 9.5, color: C.textSoft }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={saveProfile} disabled={busy}>
          <Ionicons name="save" size={16} color="#fff" /><Text style={s.btnText}>Lưu hồ sơ</Text>
        </TouchableOpacity>
      </View>

      {couple && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Khu vườn của hai bạn</Text>
          <View style={{ gap: 7, marginTop: 8 }}>
            <View style={s.row}><Ionicons name="key" size={16} color={C.amber} /><Text style={{ color: C.text }}>Mã mời: <Text style={{ fontFamily: "BeVietnamPro_900Black", letterSpacing: 2 }}>{couple.code}</Text></Text></View>
            <View style={s.row}><Ionicons name="person" size={16} color={C.pink} /><Text style={{ color: C.text }}>Bạn là: <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.pink }}>{user.displayName} (Bạn)</Text> · vị trí {couple.mySlot} trong vườn</Text></View>
            {couple.members.map((m) => {
              const isMe = m.userId === user.id;
              return (
                <View key={m.userId} style={[s.row, { backgroundColor: isMe ? C.pinkSoft : "#D9F4F0", borderRadius: 999, paddingLeft: 2, paddingRight: 10, paddingVertical: 2, alignSelf: "flex-start" }]}>
                  <Avatar id={m.avatar} size={26} />
                  <Text style={{ color: isMe ? C.pinkDark : "#0B7A6E", fontFamily: "BeVietnamPro_800ExtraBold" }}>{m.displayName}</Text>
                  {isMe ? (<View style={{ backgroundColor: C.pink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ fontSize: 9.5, fontFamily: "BeVietnamPro_900Black", color: "#fff" }}>Bạn</Text></View>) : (<Text style={{ fontSize: 11, color: "#0B7A6E", fontFamily: "BeVietnamPro_700Bold" }}>Người ấy</Text>)}
                  <Text style={s.small}>· vị trí {m.slot}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.label}>Tên khu vườn</Text>
          <TextInput style={s.input} value={gardenName} onChangeText={(t) => { setGardenName(t); setGardenDirty(true); }} maxLength={40} placeholder="Tên khu vườn" placeholderTextColor={C.textFaint} />
          <Text style={styles.label}>Ngày bắt đầu yêu (năm-tháng-ngày)</Text>
          <TextInput style={s.input} value={startDate} onChangeText={(t) => { setStartDate(t); setDateDirty(true); }} maxLength={10} placeholder="VD: 2024-02-14" placeholderTextColor={C.textFaint} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={saveGarden}><Ionicons name="save" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>Lưu vườn</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={refreshCouple}><Ionicons name="refresh" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>Tải lại thông tin</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.dangerBtn]} onPress={confirmLeave}>
            <Ionicons name="exit-outline" size={16} color="#b91c1c" /><Text style={styles.dangerText}>Rời khu vườn này</Text>
          </TouchableOpacity>
        </View>
      )}

      {msg ? <Text style={{ color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold", fontSize: 13 }}>{msg}</Text> : null}

      <TouchableOpacity style={styles.dangerBtn} onPress={confirmSignOut}>
        <Ionicons name="log-out-outline" size={17} color="#b91c1c" /><Text style={styles.dangerText}>Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={[s.small, { textAlign: "center" }]}>Khu Vườn Tình Yêu · phiên bản 1.0.0 · Dữ liệu vườn lưu trên Supabase và đồng bộ realtime giữa hai máy.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12.5, fontFamily: "BeVietnamPro_700Bold", color: C.textSoft, marginTop: 10, marginBottom: 5 },
  avatarBtn: { width: "22%", alignItems: "center", paddingVertical: 7, borderRadius: 13, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "#fff7f8" },
  avatarOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#fee2e2", borderRadius: 999, paddingVertical: 13, minHeight: 44 },
  dangerText: { color: "#b91c1c", fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 14 },
});

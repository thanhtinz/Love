import React, { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { myName, useLove } from "../lib/store";
import { formatDateVN, isValidDateKey } from "../lib/types";
import Avatar from "../components/Avatar";
import { LetterArtImage } from "../components/Art";
import { COLOR, FONT, RADIUS, ROLE, TYPE } from "../components/theme";
import { s } from "../components/ui";

/** Chuỗi DD/MM/YYYY -> khóa ngày YYYY-MM-DD (null nếu không hợp lệ). */
function displayToKey(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const key = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

const local = StyleSheet.create({
  label: { ...TYPE.micro, color: COLOR.textSoft, marginBottom: 8 },
  bodyText: { ...TYPE.body, color: COLOR.textSoft },
  error: { ...TYPE.body, color: COLOR.danger, marginTop: 12 },
  link: { fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.primary, textAlign: "center", marginTop: 18 },
});

export default function PairScreen() {
  const { user, couple, signOut, createCouple, joinCouple } = useAuth();
  const { state, dispatch, hydrated } = useLove();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dateText, setDateText] = useState("");
  const [dateDirty, setDateDirty] = useState(false);
  const [dateMsg, setDateMsg] = useState("");

  useEffect(() => { if (!user) router.replace("/auth"); }, [user]);
  // Nạp ngày bắt đầu từ state khi người dùng chưa tự sửa ô này (tránh đồng bộ ghi đè giữa lúc gõ).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ ô ngày từ state, trừ khi đang sửa
  useEffect(() => { if (!dateDirty && hydrated) setDateText(formatDateVN(state.couple.startDate)); }, [state.couple.startDate, dateDirty, hydrated]);

  if (!user) return null;
  const members = couple?.members ?? [];

  async function doCreate() {
    setErr(""); setBusy(true);
    try {
      const res = await createCouple();
      if (res.error) setErr(res.error);
    } catch { setErr("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }
  async function doJoin() {
    setErr(""); setBusy(true);
    try {
      const res = await joinCouple(code);
      if (res.error) setErr(res.error);
    } catch { setErr("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }
  function saveStartDate() {
    const key = displayToKey(dateText);
    if (!key) { setDateMsg("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    if (new Date(`${key}T00:00:00`).getTime() > Date.now()) { setDateMsg("Ngày bắt đầu không thể ở tương lai nhé."); return; }
    dispatch({ type: "SET_START_DATE", date: key, user: state.currentUser, actor: myName(state) });
    setDateDirty(false);
    setDateMsg("Đã chốt ngày bắt đầu yêu — cả hai máy đều thấy ngày này.");
  }
  async function shareCode() {
    if (!couple) return;
    try { await Share.share({ message: `Vào Khu Vườn Tình Yêu với mình nhé! Mã mời: ${couple.code}` }); } catch { /* bỏ qua */ }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <LetterArtImage height={150} />
      <Text style={[s.title, { marginTop: 16 }]}>{couple ? "Hai đứa đã gặp nhau" : "Ghép cặp với người ấy"}</Text>
      <Text style={[s.sub, { marginTop: 6, fontSize: 14, lineHeight: 20 }]}>
        {couple
          ? "Chia sẻ mã mời cho người ấy nếu họ chưa vào, chốt ngày bắt đầu yêu, rồi vào vườn thôi."
          : "Một người tạo vườn để lấy mã mời, người còn lại nhập mã đó — hai tài khoản sẽ gắn với nhau."}
      </Text>

      {err ? <Text style={local.error}>{err}</Text> : null}

      {!couple ? (
        <>
          <View style={[s.card, { marginTop: 16 }]}>
            <Text style={local.label}>Tạo vườn mới</Text>
            <Text style={local.bodyText}>Tạo vườn và nhận mã mời để gửi cho người ấy.</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 12 }]} onPress={doCreate} disabled={busy} accessibilityRole="button" accessibilityLabel="Tạo vườn mới">
              <Text style={s.btnText}>{busy ? "Đang tạo..." : "Tạo vườn, lấy mã mời"}</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={local.label}>Nhập mã mời</Text>
            <TextInput
              style={s.input}
              placeholder="VD: A1B2C3"
              placeholderTextColor={COLOR.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity style={[s.btn, { marginTop: 12, opacity: busy || code.trim().length < 4 ? 0.55 : 1 }]} onPress={doJoin} disabled={busy || code.trim().length < 4} accessibilityRole="button" accessibilityLabel="Vào vườn bằng mã mời">
              <Text style={s.btnText}>{busy ? "Đang vào..." : "Vào vườn bằng mã này"}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={[s.card, { marginTop: 16 }]}>
            <Text style={local.label}>Mã mời của hai đứa</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontFamily: FONT.black, fontSize: 30, letterSpacing: 3, color: COLOR.text, flex: 1 }}>{couple.code}</Text>
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
              {members.length < 2 ? <Text style={local.bodyText}>Đang chờ người ấy nhập mã mời để vào vườn...</Text> : null}
            </View>
          </View>

          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={local.label}>Ngày bắt đầu yêu</Text>
            <Text style={[local.bodyText, { marginBottom: 10 }]}>
              {"Ngày hai đứa chính thức yêu nhau — bộ đếm \"Ngày N\" ở trang Nhà tính từ ngày này."}
            </Text>
            <TextInput
              style={s.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLOR.textFaint}
              keyboardType="numbers-and-punctuation"
              value={dateText}
              onChangeText={(t) => { setDateText(t); setDateDirty(true); setDateMsg(""); }}
            />
            {dateMsg ? <Text style={{ marginTop: 8, fontFamily: FONT.regular, fontSize: 13.5, color: dateMsg.startsWith("Đã chốt") ? COLOR.successText : COLOR.danger }}>{dateMsg}</Text> : null}
            <TouchableOpacity style={[s.btnGhost, { marginTop: 12 }]} onPress={saveStartDate} accessibilityRole="button" accessibilityLabel="Lưu ngày bắt đầu yêu">
              <Text style={s.btnGhostText}>Lưu ngày bắt đầu</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => router.replace("/(tabs)")} accessibilityRole="button" accessibilityLabel="Vào khu vườn">
            <Text style={s.btnText}>Vào khu vườn</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => signOut()} accessibilityRole="button" accessibilityLabel="Đăng xuất">
        <Text style={local.link}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

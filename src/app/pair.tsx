import React, { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useLove } from "../lib/store";
import { parseDateKey, today } from "../lib/types";
import Avatar from "../components/Avatar";
import { LetterArtImage } from "../components/Art";
import { C, s } from "../components/ui";

export default function PairScreen() {
  const { user, couple, signOut, createCouple, joinCouple } = useAuth();
  const { state, dispatch, hydrated } = useLove();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [gardenName, setGardenName] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [dateErr, setDateErr] = useState("");

  useEffect(() => { if (!user) router.replace("/auth"); }, [user]);
  // Chỉ nạp từ state khi người dùng CHƯA tự sửa: bản đồng bộ từ máy người thương về
  // giữa lúc đang gõ sẽ ghi đè mất nội dung đang nhập dở (cờ dirty tách riêng từng ô).
  const [nameDirty, setNameDirty] = useState(false);
  const [dateDirty, setDateDirty] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ form đặt tên vườn từ state đã tải, trừ ô người dùng đang sửa
  useEffect(() => { if (!nameDirty && state.gardenName) setGardenName(state.gardenName); if (!dateDirty && state.startDate) setStartDate(state.startDate); }, [state.gardenName, state.startDate, nameDirty, dateDirty]);

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
    setErr("");
    if (code.trim().length !== 6) { setErr("Mã mời gồm đúng 6 ký tự."); return; }
    setBusy(true);
    try {
      const res = await joinCouple(code);
      if (res.error) setErr(res.error);
    } catch { setErr("Có lỗi mạng bất ngờ — thử lại nhé."); } finally { setBusy(false); }
  }
  function saveSetup(go: boolean) {
    setDateErr("");
    // Chưa tải xong dữ liệu vườn THẬT thì không cho lưu: dispatch lúc này ghi lên state
    // mặc định (và bật cờ cho phép ghi server), khi tải xong bản thật sẽ ĐÈ mất phần
    // vừa nhập — tên vườn/ngày bắt đầu "lưu rồi mà mất" chính là lỗi này.
    if (!hydrated) { setDateErr("Đang tải dữ liệu khu vườn — chờ một chút rồi lưu lại nhé."); return; }
    // parseDateKey chặt: "2025-02-31" không còn lăn sang tháng 3 mà qua mặt kiểm tra nữa.
    const d = parseDateKey(startDate);
    if (!d) { setDateErr("Ngày bắt đầu yêu chưa đúng (năm-tháng-ngày, ngày phải tồn tại thật)."); return; }
    if (d.getTime() > Date.now()) { setDateErr("Ngày bắt đầu yêu không thể ở tương lai."); return; }
    dispatch({ type: "SETUP_GARDEN", gardenName: gardenName.trim(), startDate });
    if (go) router.replace("/(tabs)");
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Avatar id={user.avatar} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hi}>Xin chào, {user.displayName}</Text>
          <Text style={s.sub}>{couple ? "Vườn của hai bạn đã sẵn sàng." : "Tạo một khu vườn mới hoặc nhập mã mời của người ấy để ghép cặp."}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logout}><Ionicons name="log-out-outline" size={20} color={C.pinkDark} /></TouchableOpacity>
      </View>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {!couple ? (
        <>
          <LetterArtImage height={150} />
          <View style={s.card}>
            <View style={s.row}><Ionicons name="leaf" size={19} color={C.green} /><Text style={s.title}>Tạo khu vườn mới</Text></View>
            <Text style={s.sub}>Bạn sẽ nhận một mã mời 6 ký tự. Gửi mã đó cho người ấy để họ vào cùng vườn — tối đa 2 người một vườn.</Text>
            <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={doCreate} disabled={busy}>
              <Ionicons name="add-circle" size={18} color="#fff" /><Text style={s.btnText}>{busy ? "Đang tạo..." : "Tạo vườn và lấy mã mời"}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.row}><Ionicons name="key" size={19} color={C.amber} /><Text style={s.title}>Nhập mã mời</Text></View>
            <Text style={s.sub}>Người ấy đã tạo vườn và gửi mã cho bạn? Nhập mã tại đây.</Text>
            <TextInput style={[s.input, styles.codeInput]} placeholder="VD: AB12CD" placeholderTextColor={C.textFaint} value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} autoCapitalize="characters" maxLength={6} />
            <TouchableOpacity style={[s.btnGhost, busy && { opacity: 0.6 }]} onPress={doJoin} disabled={busy}>
              <Ionicons name="heart" size={17} color={C.pinkDark} /><Text style={s.btnGhostText}>{busy ? "Đang kiểm tra..." : "Vào vườn của người ấy"}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={[s.card, { alignItems: "center", gap: 8 }]}>
            <Ionicons name="checkmark-circle" size={34} color={C.green} />
            <Text style={s.title}>Đã ghép cặp thành công</Text>
            <Text style={s.sub}>Mã mời của vườn (gửi cho người ấy nếu họ chưa vào):</Text>
            <Text style={styles.bigCode}>{couple.code}</Text>
            <TouchableOpacity style={s.btnGhost} onPress={() => Share.share({ message: `Vào Khu Vườn Tình Yêu với mình nhé! Mã mời vườn: ${couple.code}` })}>
              <Ionicons name="share-social" size={16} color={C.pinkDark} /><Text style={s.btnGhostText}>Chia sẻ mã mời</Text>
            </TouchableOpacity>
            <View style={{ gap: 6, width: "100%" }}>
              {members.map((m) => (
                <View key={m.userId} style={s.row}>
                  <Avatar id={m.avatar} size={30} />
                  <Text style={{ fontFamily: "BeVietnamPro_700Bold", color: C.text }}>{m.displayName}</Text>
                  <Text style={s.small}>{m.slot === "A" ? "Người giữ vườn A" : "Người giữ vườn B"}{m.userId === user.id ? " (bạn)" : ""}</Text>
                </View>
              ))}
              {members.length < 2 && <Text style={s.small}>Đang chờ người ấy nhập mã để vào vườn...</Text>}
            </View>
          </View>

          <View style={s.card}>
            <View style={s.row}><Ionicons name="flower" size={19} color={C.pink} /><Text style={s.title}>{state.everOnboarded ? "Thông tin khu vườn" : "Đặt tên vườn & ngày bắt đầu yêu"}</Text></View>
            <Text style={s.sub}>Tên vườn và ngày bắt đầu yêu dùng cho khung đếm ngày và các mốc kỷ niệm.</Text>
            <TextInput style={s.input} placeholder="Tên khu vườn" placeholderTextColor={C.textFaint} value={gardenName} onChangeText={(t) => { setGardenName(t); setNameDirty(true); }} maxLength={40} />
            <Text style={styles.label}>Ngày bắt đầu yêu (năm-tháng-ngày)</Text>
            <TextInput style={s.input} placeholder="VD: 2024-02-14" placeholderTextColor={C.textFaint} value={startDate} onChangeText={(t) => { setStartDate(t); setDateDirty(true); }} keyboardType="numbers-and-punctuation" maxLength={10} />
            {dateErr ? <Text style={styles.err}>{dateErr}</Text> : null}
            {!hydrated && <Text style={s.small}>Đang tải dữ liệu khu vườn — nút lưu sẽ dùng được ngay khi tải xong.</Text>}
            <TouchableOpacity style={[s.btnGhost, !hydrated && { opacity: 0.5 }]} onPress={() => saveSetup(false)} disabled={!hydrated}>
              <Ionicons name="save" size={16} color={C.pinkDark} /><Text style={s.btnGhostText}>Lưu thông tin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={() => (!state.everOnboarded ? saveSetup(true) : router.replace("/(tabs)"))}>
            <Ionicons name="leaf" size={18} color="#fff" /><Text style={s.btnText}>Vào khu vườn</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 18, paddingTop: 48, gap: 14, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  hi: { fontSize: 19, fontFamily: "BeVietnamPro_900Black", color: C.text },
  logout: { backgroundColor: C.pinkSoft, borderRadius: 999, padding: 12 },
  err: { color: "#dc2626", fontSize: 13, fontFamily: "BeVietnamPro_600SemiBold" },
  codeInput: { textAlign: "center", fontSize: 20, fontFamily: "BeVietnamPro_800ExtraBold", letterSpacing: 4 },
  bigCode: { fontSize: 30, fontFamily: "BeVietnamPro_900Black", letterSpacing: 6, color: C.pinkDark, backgroundColor: C.pinkSoft, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14, overflow: "hidden" },
  label: { fontSize: 12.5, fontFamily: "BeVietnamPro_700Bold", color: C.textSoft },
});

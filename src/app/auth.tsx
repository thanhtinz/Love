import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { AVATARS } from "../lib/types";
import Avatar from "../components/Avatar";
import { LetterArtImage } from "../components/Art";
import { C, s } from "../components/ui";

export default function AuthScreen() {
  const { user, couple, coupleReady, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("svg-a");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    // Chờ coupleReady: vừa đăng nhập xong mà couple còn đang tải thì chưa quyết
    // đi Ghép cặp hay vào vườn (tránh chớp màn Ghép cặp với người đã có vườn).
    if (user && coupleReady) router.replace(couple ? "/(tabs)" : "/pair");
  }, [user, couple, coupleReady]);

  async function submit() {
    setErr(""); setOk("");
    if (!email.includes("@")) { setErr("Email chưa đúng định dạng."); return; }
    if (password.length < 6) { setErr("Mật khẩu cần ít nhất 6 ký tự."); return; }
    if (mode === "up" && !name.trim()) { setErr("Hãy nhập tên hiển thị của bạn."); return; }
    setBusy(true);
    try {
      const res = mode === "in" ? await signIn(email.trim(), password) : await signUp(email.trim(), password, name.trim(), avatarId);
      if (res.error) { setErr(res.error); return; }
      setOk(mode === "up" ? "Tạo tài khoản thành công! Đang vào vườn..." : "Đăng nhập thành công!");
    } catch {
      // Lỗi bất ngờ (mạng chập chờn khiến Supabase ném exception): không để nút kẹt ở
      // trạng thái "Đang xử lý..." mãi — bản cũ không có try/finally quanh await này.
      setErr("Có lỗi mạng bất ngờ — bạn kiểm tra kết nối rồi thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <LetterArtImage height={168} />
          <Text style={styles.h1}>Khu Vườn Tình Yêu</Text>
          <Text style={styles.heroSub}>Nơi hai trái tim cùng trồng cây, gửi thư và đếm từng ngày bên nhau.</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, mode === "in" && styles.tabOn]} onPress={() => setMode("in")}>
            <Text style={[styles.tabText, mode === "in" && styles.tabTextOn]}>Đăng nhập</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === "up" && styles.tabOn]} onPress={() => setMode("up")}>
            <Text style={[styles.tabText, mode === "up" && styles.tabTextOn]}>Đăng ký</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 12 }}>
          {mode === "up" && (
            <>
              <TextInput style={s.input} placeholder="Tên hiển thị (vd: Bé Na)" placeholderTextColor={C.textFaint} value={name} onChangeText={setName} maxLength={24} />
              <Text style={styles.label}>Chọn avatar của bạn</Text>
              <View style={styles.avatars}>
                {AVATARS.map((a) => (
                  <TouchableOpacity key={a.id} onPress={() => setAvatarId(a.id)} style={[styles.avatarBtn, avatarId === a.id && styles.avatarOn]}>
                    <Avatar id={a.id} size={44} />
                    <Text style={styles.avatarName}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <TextInput style={s.input} placeholder="Email" placeholderTextColor={C.textFaint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Mật khẩu (ít nhất 6 ký tự)" placeholderTextColor={C.textFaint} value={password} onChangeText={setPassword} secureTextEntry />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          {ok ? <Text style={styles.ok}>{ok}</Text> : null}
          <TouchableOpacity style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            <Ionicons name={mode === "in" ? "log-in" : "person-add"} size={18} color="#fff" />
            <Text style={s.btnText}>{busy ? "Đang xử lý..." : mode === "in" ? "Vào vườn" : "Tạo tài khoản"}</Text>
          </TouchableOpacity>
          <Text style={styles.note}>Mỗi người một tài khoản riêng — ghép cặp bằng mã mời 6 ký tự để dùng chung một vườn.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 22, paddingTop: 54, gap: 18, backgroundColor: C.bg },
  hero: { alignItems: "center", gap: 6 },
  h1: { fontSize: 26, fontFamily: "BeVietnamPro_900Black", color: C.text },
  heroSub: { textAlign: "center", color: C.textSoft, fontSize: 13.5, lineHeight: 19, paddingHorizontal: 8 },
  tabs: { flexDirection: "row", backgroundColor: C.pinkSoft, borderRadius: 999, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, minHeight: 44, justifyContent: "center", borderRadius: 999, alignItems: "center" },
  tabOn: { backgroundColor: "#fff" },
  tabText: { fontFamily: "BeVietnamPro_700Bold", color: C.textSoft },
  tabTextOn: { color: C.pinkDark },
  label: { fontSize: 13, fontFamily: "BeVietnamPro_700Bold", color: C.text },
  avatars: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  avatarBtn: { width: "22%", alignItems: "center", paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "#fff" },
  avatarOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  avatarName: { fontSize: 10, color: C.textSoft, marginTop: 2 },
  err: { color: "#dc2626", fontSize: 13, fontFamily: "BeVietnamPro_600SemiBold" },
  ok: { color: "#16a34a", fontSize: 13, fontFamily: "BeVietnamPro_600SemiBold" },
  note: { color: C.textFaint, fontSize: 12, lineHeight: 17, textAlign: "center" },
});

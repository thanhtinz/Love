import React, { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import ViewShot from "react-native-view-shot";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { FRAME_XP_REWARD, today, type FrameKind } from "../lib/types";
import { FrameGarland } from "./illustrations";
import { C, s } from "./ui";

/**
 * Khung bọc cho từng màn Khung màn hình: xem trước + nút Lưu/Chia sẻ PNG.
 * Lần đầu lưu/chia sẻ mỗi khung trong ngày được +XP (CLAIM_FRAME_REWARD idempotent
 * theo ngày + loại khung ở tầng store) — mở màn hình xem không không cộng XP,
 * xuất đi xuất lại cùng một khung trong ngày cũng không cộng thêm.
 */
export function FrameExport({ kind, children }: { kind: FrameKind; children: React.ReactNode }) {
  const { state, dispatch } = useLove();
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<any>(null);
  const claimedToday = state.frameRewards.date === today() && state.frameRewards.claimed.includes(kind);

  async function capture(): Promise<string | null> {
    try {
      const uri = await shotRef.current?.capture?.();
      return uri || null;
    } catch { return null; }
  }
  function rewardOnce() { dispatch({ type: "CLAIM_FRAME_REWARD", frame: kind }); }
  async function saveToLibrary() {
    if (busy) return; // chống double-submit khi đang xử lý
    setBusy(true);
    const uri = await capture();
    if (!uri) { setBusy(false); Alert.alert("Chưa chụp được khung", "Bạn thử lại nhé."); return; }
    const perm = await requestPermissionsAsync(true);
    if (!perm.granted) { setBusy(false); Alert.alert("Chưa có quyền thư viện ảnh", "Hãy cấp quyền lưu ảnh để dùng tính năng này, hoặc dùng nút Chia sẻ."); return; }
    await Asset.create(uri);
    rewardOnce();
    setBusy(false);
    Alert.alert("Đã lưu ảnh khung", "Mở thư viện ảnh của máy, chọn ảnh này và dùng tính năng ghim ảnh/widget ảnh của máy để đưa ra màn hình chính nhé.");
  }
  async function shareImage() {
    if (busy) return;
    setBusy(true);
    const uri = await capture();
    setBusy(false);
    if (!uri) { Alert.alert("Chưa chụp được khung", "Bạn thử lại nhé."); return; }
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri); rewardOnce(); }
    else Alert.alert("Thiết bị chưa hỗ trợ chia sẻ", "Hãy dùng nút Lưu vào thư viện ảnh.");
  }

  return (
    <View style={{ gap: 12 }}>
      <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
        <View style={{ backgroundColor: "#FFF6F1", borderRadius: 20, borderWidth: 1, borderColor: C.pinkBorder, padding: 20, alignItems: "center", gap: 8, minHeight: 330, justifyContent: "center" }}>
          <View style={{ position: "absolute", left: 6, top: 6 }} pointerEvents="none"><FrameGarland size={64} /></View>
          <View style={{ position: "absolute", right: 6, bottom: 6, transform: [{ rotate: "180deg" }] }} pointerEvents="none"><FrameGarland size={64} /></View>
          {children}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
            <Ionicons name="heart" size={12} color={C.pink} />
            <Text style={{ fontSize: 10.5, color: C.textFaint, fontFamily: "BeVietnamPro_700Bold" }}>Khu Vườn Tình Yêu</Text>
          </View>
        </View>
      </ViewShot>
      <View style={{ flexDirection: "row", gap: 9 }}>
        <TouchableOpacity style={[s.btn, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={saveToLibrary} disabled={busy}>
          <Ionicons name="download" size={16} color="#fff" /><Text style={s.btnText}>Lưu vào thư viện ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnGhost, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={shareImage} disabled={busy}>
          <Ionicons name="share-social" size={16} color={C.pinkDark} /><Text style={s.btnGhostText}>Chia sẻ ảnh</Text>
        </TouchableOpacity>
      </View>
      <Text style={[s.small, { textAlign: "center" }]}>{claimedToday ? `Khung này đã nhận +${FRAME_XP_REWARD} XP hôm nay rồi — xuất lại không cộng thêm.` : `Lần đầu lưu/chia sẻ khung này trong ngày: +${FRAME_XP_REWARD} XP vườn.`}</Text>
    </View>
  );
}

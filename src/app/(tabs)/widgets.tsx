import React, { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ViewShot from "react-native-view-shot";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { MOODS } from "../../lib/data";
import { decayedPlantStats, speciesById, stageInfo } from "../../lib/plants";
import { daysTogether, nextMilestone } from "../../lib/types";
import PlantArt from "../../components/PlantArt";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import { C, SectionTitle, StatBar, s } from "../../components/ui";

type FrameKind = "days" | "tree" | "mood";
const FRAMES: { id: FrameKind; label: string; icon: string; desc: string }[] = [
  { id: "days", label: "Đếm ngày yêu", icon: "calendar", desc: "Số ngày bên nhau + đếm ngược tới mốc kỷ niệm kế tiếp" },
  { id: "tree", label: "Cây hôm nay", icon: "leaf", desc: "Cây đang trồng: giai đoạn, chỉ số sức khỏe hiện tại" },
  { id: "mood", label: "Mood hai người", icon: "happy", desc: "Tâm trạng hôm nay của cả hai" },
];

export default function WidgetsScreen() {
  const { state } = useLove();
  const [kind, setKind] = useState<FrameKind>("days");
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<any>(null);
  const days = daysTogether(state.startDate);
  const nm = nextMilestone(days);
  const plant = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const info = useMemo(() => (plant ? stageInfo(plant) : null), [plant]);
  const stats = useMemo(() => (plant ? decayedPlantStats(plant) : null), [plant]);

  async function capture(): Promise<string | null> {
    try {
      const uri = await shotRef.current?.capture?.();
      return uri || null;
    } catch { return null; }
  }
  async function saveToLibrary() {
    setBusy(true);
    const uri = await capture();
    if (!uri) { setBusy(false); Alert.alert("Chưa chụp được khung", "Bạn thử lại nhé."); return; }
    const perm = await requestPermissionsAsync(true);
    if (!perm.granted) { setBusy(false); Alert.alert("Chưa có quyền thư viện ảnh", "Hãy cấp quyền lưu ảnh để dùng tính năng này, hoặc dùng nút Chia sẻ."); return; }
    await Asset.create(uri);
    setBusy(false);
    Alert.alert("Đã lưu ảnh khung", "Mở thư viện ảnh của máy, chọn ảnh này và dùng tính năng ghim ảnh/widget ảnh của máy để đưa ra màn hình chính nhé.");
  }
  async function shareImage() {
    setBusy(true);
    const uri = await capture();
    setBusy(false);
    if (!uri) { Alert.alert("Chưa chụp được khung", "Bạn thử lại nhé."); return; }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    else Alert.alert("Thiết bị chưa hỗ trợ chia sẻ", "Hãy dùng nút Lưu vào thư viện ảnh.");
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.scroll, { paddingTop: 44 }]}>
      <SectionTitle icon="image">Khung kỷ niệm & Widget</SectionTitle>
      <Text style={s.sub}>Chọn một khung, xem trước rồi xuất ảnh PNG để ghim ra màn hình chính bằng tiện ích ảnh của máy (widget ảnh / ảnh ghim).</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {FRAMES.map((f) => (
          <TouchableOpacity key={f.id} style={[styles.framePick, kind === f.id && styles.framePickOn]} onPress={() => setKind(f.id)}>
            <Ionicons name={f.icon as never} size={20} color={kind === f.id ? C.pinkDark : C.textFaint} />
            <Text style={{ fontSize: 11.5, fontWeight: "800", color: kind === f.id ? C.pinkDark : C.textSoft, textAlign: "center" }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.small}>{FRAMES.find((f) => f.id === kind)?.desc}</Text>

      <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.frame}>
          {kind === "days" && (
            <>
              <Text style={styles.frameTitle}>{state.gardenName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Avatar id={state.avatarA} size={52} />
                <Ionicons name="heart" size={26} color={C.pink} />
                <Avatar id={state.avatarB} size={52} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.textSoft }}>{state.personA} + {state.personB}</Text>
              <Text style={styles.bigNum}>{days}</Text>
              <Text style={styles.frameSub}>ngày bên nhau</Text>
              <View style={s.chip}><Ionicons name="flag" size={13} color={C.pinkDark} /><Text style={s.chipText}>Mốc {nm.target} ngày: còn {nm.remaining} ngày</Text></View>
              <Text style={s.small}>Bắt đầu từ {new Date(state.startDate + "T00:00:00").toLocaleDateString("vi-VN")}</Text>
            </>
          )}
          {kind === "tree" && (
            <>
              <Text style={styles.frameTitle}>Cây hôm nay</Text>
              {plant && info && stats ? (
                <>
                  <PlantArt speciesId={plant.speciesId} stageIndex={info.index} totalStages={speciesById(plant.speciesId).stages.length} size={170} />
                  <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>{speciesById(plant.speciesId).name}</Text>
                  <Text style={{ fontSize: 13, color: C.pinkDark, fontWeight: "700" }}>Giai đoạn: {info.stage.name} ({info.progressInStage}%)</Text>
                  <View style={{ width: "100%", gap: 7, marginTop: 6 }}>
                    <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
                    <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
                    <StatBar label="Tình yêu" icon="heart" value={stats.love} color="#f43f5e" />
                  </View>
                </>
              ) : (<Text style={s.sub}>Chưa có cây nào trong vườn để đưa vào khung.</Text>)}
            </>
          )}
          {kind === "mood" && (
            <>
              <Text style={styles.frameTitle}>Tâm trạng hôm nay</Text>
              <View style={{ flexDirection: "row", gap: 22 }}>
                {(["A", "B"] as const).map((p) => (
                  <View key={p} style={{ alignItems: "center", gap: 5 }}>
                    <FaceIcon mood={state.moods[p]} size={86} />
                    <Text style={{ fontWeight: "800", color: C.text }}>{p === "A" ? state.personA : state.personB}</Text>
                    <Text style={s.small}>{MOODS.find((m) => m.id === state.moods[p])?.label || "Chưa chọn"}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.small}>{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</Text>
            </>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
            <Ionicons name="heart" size={12} color={C.pink} />
            <Text style={{ fontSize: 10.5, color: C.textFaint, fontWeight: "700" }}>Khu Vườn Tình Yêu</Text>
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

      <View style={[s.card, { backgroundColor: "#fff7ed" }]}>
        <View style={s.row}><Ionicons name="information-circle" size={18} color={C.amber} /><Text style={{ fontWeight: "800", color: C.text }}>Về widget sống trên màn hình chính</Text></View>
        <Text style={[s.sub, { marginTop: 5 }]}>Hiện tại app xuất khung thành ảnh PNG để bạn ghim bằng tiện ích ảnh có sẵn của máy. Widget sống tự cập nhật (Android App Widget / iOS WidgetKit) cần viết thêm mã native riêng cho từng nền tảng — đây là bước phát triển riêng ở giai đoạn sau, chưa có trong bản này.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  framePick: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  framePickOn: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  frame: { backgroundColor: "#fff1f2", borderRadius: 24, borderWidth: 2, borderColor: C.pinkBorder, padding: 20, alignItems: "center", gap: 8, minHeight: 320, justifyContent: "center" },
  frameTitle: { fontSize: 16, fontWeight: "900", color: C.pinkDark },
  bigNum: { fontSize: 58, fontWeight: "900", color: C.pinkDark, lineHeight: 62 },
  frameSub: { fontSize: 14, fontWeight: "700", color: C.textSoft, marginTop: -6 },
});

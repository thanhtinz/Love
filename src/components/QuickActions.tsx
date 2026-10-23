import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { decideCareDrop, myName, useLove } from "../lib/store";
import { careStatus, speciesById } from "../lib/plants";
import { COLOR, FONT, RADIUS, ROLE, SPACE } from "./theme";

/**
 * Sheet hành động nhanh mở từ nút "+" ở giữa tab bar (mẫu Paired/Between:
 * nút giữa nổi bật cho việc hay làm nhất). Mỗi hàng là 1 hành động rõ ràng:
 * "Chăm cây" tưới ngay cây đang chọn (đúng luật cooldown/chỉ số đầy của store,
 * hệt nút Tưới ở tab Vườn); các hàng còn lại dẫn thẳng tới màn hình tính năng.
 */
export function QuickActions({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  // Chỉ tưới cây ĐANG CHỌN thật: bản cũ fallback sang plants[0] khi selectedPlantId
  // lỗi thời nhưng vẫn ghi nhãn "đang chọn" — người dùng tưới nhầm cây khác hẳn ý định.
  const selectedPlant = state.plants.find((p) => p.id === state.selectedPlantId);
  const plant = selectedPlant || state.plants[0];

  function go(route: string) {
    onClose();
    router.push(route as never);
  }

  function waterNow() {
    onClose();
    if (!plant) { router.push("/(tabs)/garden"); return; }
    // Cùng luật với tab Vườn: đang cooldown hoặc nước đã đầy thì không dispatch —
    // chuyển qua tab Vườn để người dùng thấy lý do cụ thể.
    const cs = careStatus(plant, "water", me, Date.now());
    if (cs.ok) {
      const { drop, combo } = decideCareDrop(state, plant.id, "water");
      dispatch({ type: "TREE_ACTION", kind: "water", actor: myName(state), user: me, plantId: plant.id, drop, combo });
    }
    router.push("/(tabs)/garden");
  }

  const rows: { icon: string; label: string; desc: string; color: string; bg: string; onPress: () => void }[] = [
    {
      icon: "water",
      label: "Tưới nước cho cây",
      desc: plant ? (selectedPlant ? `${speciesById(plant.speciesId).name} đang chọn trong vườn` : `Cây đầu tiên trong vườn: ${speciesById(plant.speciesId).name}`) : "Vườn chưa có cây — qua tab Vườn gieo hạt nhé",
      color: COLOR.water,
      bg: "#E3F2FB",
      onPress: waterNow,
    },
    {
      icon: "heart",
      label: "Gửi yêu thương",
      desc: "Ôm, hôn gió, tặng hoa, thả sao cho người ấy",
      color: COLOR.primary,
      bg: ROLE.selfSoft,
      onPress: () => go("/utilities/love-actions"),
    },
    {
      icon: "document-text",
      label: "Thêm ghi chú",
      desc: "Dán một lời nhắn nhanh lên Love Notes",
      color: "#8B5CF6",
      bg: "#EFEAFE",
      onPress: () => go("/utilities/love-notes"),
    },
    {
      icon: "camera",
      label: "Thêm kỷ niệm",
      desc: "Lưu một khoảnh khắc vào Dòng kỷ niệm",
      color: COLOR.warning,
      bg: COLOR.warningSoft,
      onPress: () => go("/utilities/memories"),
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(34,40,54,0.45)" }} activeOpacity={1} onPress={onClose} accessibilityLabel="Đóng thực đơn nhanh" />
      <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACE.lg, paddingBottom: 26, gap: SPACE.sm }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: COLOR.text }}>Làm gì nhanh nào?</Text>
        {rows.map((r) => (
          <TouchableOpacity key={r.label} onPress={r.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, borderRadius: RADIUS.inner, backgroundColor: COLOR.bg, borderWidth: 1, borderColor: COLOR.border, paddingHorizontal: 12, paddingVertical: 8 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: r.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={r.icon as never} size={21} color={r.color} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, color: COLOR.text }}>{r.label}</Text>
              <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: COLOR.textSoft }} numberOfLines={1}>{r.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={COLOR.textFaint} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={{ alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: RADIUS.pill, backgroundColor: ROLE.selfSoft, marginTop: 2 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: ROLE.selfDark }}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

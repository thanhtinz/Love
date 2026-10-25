import React, { useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { myName, useLove } from "../lib/store";
import { useAuth } from "../lib/auth";
import { uploadMemoryPhoto, useMemoryPhotoUrls } from "../lib/photo";
import { success } from "../lib/feedback";
import {
  MEMORIES_CAP, MEMORY_CAPTION_MAX, formatDateVN, isValidDateKey, today, uid,
  type MemoryPhoto,
} from "../lib/types";
import { memoryTiltDeg } from "../lib/memories";
import { personOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW_FLOAT, SPACE, TYPE } from "../components/theme";
import { ScreenHeader, s } from "../components/ui";

/**
 * DÂY KỶ NIỆM (route Stack /memories) — kho ảnh của hai đứa trình bày như
 * những khung polaroid treo trên sợi dây thừng bằng kẹp gỗ (mockup mẫu 1 chủ
 * app đã duyệt): mỗi dây 2 khung, khung nghiêng nhẹ theo seed của id ảnh nên
 * CẢ 2 MÁY thấy đúng một sợi dây giống hệt nhau (memoryTiltDeg ở lib/memories).
 * Cuối dây luôn là khung trống viền đứt "Thêm kỷ niệm". Ảnh lưu ở bucket
 * riêng tư couple-photos (đường dẫn {coupleId}/memories/{id}.jpg — RLS theo
 * đoạn đầu đường dẫn bao phủ sẵn thư mục con), state chỉ giữ đường dẫn +
 * metadata; hiển thị qua signed URL xin theo lô (lib/photo.ts).
 * Cả hai người đều thêm/sửa/xoá được — đây là kho chung của "chúng mình".
 */

/** "2026-02-14" -> "14.02.2026" (chấm kiểu viết tay dưới khung polaroid). */
function dotsDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}
/** Ô nhập DD/MM/YYYY -> khóa ngày (đúng pattern tab Hai đứa); sai -> null. */
function displayToKey(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const key = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

const TWINE = "#B0864F";
const TWINE_LIGHT = "#CDA872";
const WOOD = "#D9A05B";
const WOOD_DARK = "#A9713A";

/** Kẹp gỗ thuần View: thân gỗ + dải kim loại + chấm lò xo — gác qua mép trên
 *  của khung và sợi dây, là chi tiết "treo" của toàn màn. */
function Clothespin() {
  return (
    <View pointerEvents="none" style={{ width: 18, height: 34, borderRadius: 4, backgroundColor: WOOD, borderWidth: 1, borderColor: "rgba(124,74,33,0.35)", alignItems: "center", ...SHADOW_FLOAT, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
      <View style={{ width: "100%", height: 5, backgroundColor: WOOD_DARK, marginTop: 8 }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#7C4A21", marginTop: 5 }} />
    </View>
  );
}

/** Một khung polaroid trên dây: ảnh cover tỉ lệ ~4:3.2 trong viền trắng, dải
 *  dưới dày hơn ghi "{dd.mm.yyyy} • {ghi chú}" chữ nghiêng; cả khung nghiêng
 *  theo seed. URL chưa xin được -> nền lặng + icon; xin lỗi -> khung lặng kèm
 *  dòng chữ nhỏ, không bao giờ crash. */
function MemoryFrame({ memory, url, onPress }: { memory: MemoryPhoto; url: string | null | undefined; onPress: () => void }) {
  const tilt = memoryTiltDeg(memory.id);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Xem ảnh kỷ niệm ngày ${formatDateVN(memory.dateKey)}`}
          style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 7, paddingBottom: 0, ...SHADOW_FLOAT }}
        >
          <View style={{ aspectRatio: 4 / 3.2, borderRadius: 4, backgroundColor: "#F6E8EC", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
            {url ? (
              <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel="Ảnh kỷ niệm" />
            ) : (
              <>
                <Ionicons name="image-outline" size={30} color={COLOR.textFaint} />
                {url === null ? (
                  <Text style={{ fontFamily: FONT.regular, fontSize: 10.5, color: COLOR.textFaint, marginTop: 4 }}>Chưa tải được ảnh</Text>
                ) : null}
              </>
            )}
          </View>
          <View style={{ height: 32, justifyContent: "center" }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.medium, fontStyle: "italic", fontSize: 11.5, color: "#7A5A66", textAlign: "center" }}>
              {dotsDate(memory.dateKey)}{memory.caption ? ` • ${memory.caption}` : ""}
            </Text>
          </View>
        </Pressable>
        <View style={{ position: "absolute", top: -12, left: 0, right: 0, alignItems: "center", zIndex: 3 }}>
          <Clothespin />
        </View>
      </View>
    </View>
  );
}

/** Khung trống cuối dây: viền đứt xanh mint + dấu cộng — chạm để treo kỷ niệm mới. */
function AddFrame({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ transform: [{ rotate: "-1deg" }] }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Thêm kỷ niệm mới"
          style={{ borderWidth: 1.8, borderStyle: "dashed", borderColor: ROLE.partner, borderRadius: 8, backgroundColor: "rgba(47,191,174,0.06)", padding: 7, paddingBottom: 0 }}
        >
          <View style={{ aspectRatio: 4 / 3.2, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={40} color={ROLE.partnerDark} />
          </View>
          <View style={{ height: 32, justifyContent: "center" }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 11.5, color: ROLE.partnerDark, textAlign: "center" }}>
              Thêm kỷ niệm
            </Text>
          </View>
        </Pressable>
        <View style={{ position: "absolute", top: -12, left: 0, right: 0, alignItems: "center", zIndex: 3 }}>
          <Clothespin />
        </View>
      </View>
    </View>
  );
}

type Cell = { kind: "photo"; memory: MemoryPhoto } | { kind: "add" };

/** Một sợi dây: đường cong SVG võng xuống (hai sợi thừng mảnh) + hàng khung
 *  treo bên dưới, kẹp gỗ gác qua cả dây lẫn mép khung. */
function Rope({ cells, width, urls, onPhoto, onAdd }: {
  cells: Cell[];
  width: number;
  urls: Record<string, string | null>;
  onPhoto: (m: MemoryPhoto) => void;
  onAdd: () => void;
}) {
  return (
    <View style={{ position: "relative" }}>
      {width > 0 ? (
        <Svg width={width} height={38} style={{ position: "absolute", top: 0, left: 0 }}>
          <Path d={`M -6 5 Q ${width / 2} 44 ${width + 6} 5`} stroke={TWINE_LIGHT} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Path d={`M -6 8 Q ${width / 2} 47 ${width + 6} 8`} stroke={TWINE} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </Svg>
      ) : null}
      <View style={{ flexDirection: "row", gap: 18, paddingTop: 15 }}>
        {cells.map((c, i) => (c.kind === "photo"
          ? <MemoryFrame key={c.memory.id} memory={c.memory} url={urls[c.memory.id]} onPress={() => onPhoto(c.memory)} />
          : <AddFrame key={`add-${i}`} onPress={onAdd} />))}
        {cells.length === 1 ? <View style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}

/** Trình xem ảnh lớn + sửa ghi chú/ngày + xoá (xác nhận ngay trong trình xem,
 *  không dùng Alert để bản web cũng chạy). Remount theo id ảnh (key ở nơi gọi)
 *  nên form luôn khởi tạo từ đúng ảnh đang xem. */
function MemoryViewer({ memory, url, onClose }: { memory: MemoryPhoto; url: string | null | undefined; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [caption, setCaption] = useState(memory.caption);
  const [dateText, setDateText] = useState(formatDateVN(memory.dateKey));
  const [error, setError] = useState("");
  const by = personOf(state, memory.bySlot);
  const me = state.currentUser;

  function saveEdit() {
    const key = displayToKey(dateText);
    if (!key) { setError("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    dispatch({ type: "MEMORY_UPDATE", id: memory.id, caption, dateKey: key, user: me });
    success();
    setMode("view");
    setError("");
  }
  function remove() {
    dispatch({ type: "MEMORY_REMOVE", id: memory.id, user: me, actor: myName(state) });
    success();
    onClose();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#2A1B22", paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: FONT.extrabold, fontSize: 17, color: "#FFF7F0" }}>Kỷ niệm của hai đứa</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={21} color="#FFF7F0" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, marginTop: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
        {url ? (
          <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Ảnh kỷ niệm khổ lớn" />
        ) : (
          <>
            <Ionicons name="image-outline" size={44} color="rgba(255,247,240,0.5)" />
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: "rgba(255,247,240,0.65)", marginTop: 8 }}>
              {url === null ? "Chưa tải được ảnh này — kiểm tra mạng rồi mở lại nhé." : "Đang tải ảnh..."}
            </Text>
          </>
        )}
      </View>

      {mode === "view" ? (
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          {memory.caption ? (
            <Text style={{ fontFamily: FONT.semibold, fontStyle: "italic", fontSize: 16.5, lineHeight: 24, color: "#FFF7F0", textAlign: "center" }}>
              “{memory.caption}”
            </Text>
          ) : null}
          <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: "rgba(255,247,240,0.75)", textAlign: "center", marginTop: memory.caption ? 6 : 0 }}>
            {formatDateVN(memory.dateKey)} · Ảnh do {by.name} thêm
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => { setMode("edit"); setError(""); }} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }} accessibilityRole="button" accessibilityLabel="Sửa ghi chú">
              <Ionicons name="create-outline" size={17} color="#FFF7F0" />
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#FFF7F0" }}>Sửa ghi chú</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode("confirmDelete")} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: "rgba(255,150,150,0.55)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }} accessibilityRole="button" accessibilityLabel="Xoá kỷ niệm này">
              <Ionicons name="trash-outline" size={17} color="#FFB3B3" />
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#FFB3B3" }}>Xoá</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {mode === "edit" ? (
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: "rgba(255,247,240,0.75)", marginBottom: 6 }}>Ghi chú (tối đa {MEMORY_CAPTION_MAX} ký tự)</Text>
          <TextInput
            style={[s.input, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.3)", color: "#FFF7F0" }]}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, MEMORY_CAPTION_MAX))}
            placeholder="Ví dụ: Cà phê sáng cùng nhau"
            placeholderTextColor="rgba(255,247,240,0.4)"
            maxLength={MEMORY_CAPTION_MAX}
          />
          <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: "rgba(255,247,240,0.75)", marginTop: 12, marginBottom: 6 }}>Ngày của kỷ niệm</Text>
          <TextInput
            style={[s.input, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.3)", color: "#FFF7F0" }]}
            value={dateText}
            onChangeText={(t) => { setDateText(t); setError(""); }}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="rgba(255,247,240,0.4)"
            keyboardType="numbers-and-punctuation"
          />
          {error ? <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: "#FFB3B3", marginTop: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => { setMode("view"); setCaption(memory.caption); setDateText(formatDateVN(memory.dateKey)); setError(""); }} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Huỷ sửa">
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#FFF7F0" }}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveEdit} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, backgroundColor: COLOR.primary, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Lưu ghi chú">
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#fff" }}>Lưu</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {mode === "confirmDelete" ? (
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 15, lineHeight: 22, color: "#FFF7F0", textAlign: "center" }}>
            Gỡ kỷ niệm này khỏi dây? Ảnh sẽ biến mất trên máy của cả hai đứa.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => setMode("view")} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Giữ lại kỷ niệm">
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#FFF7F0" }}>Giữ lại</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={remove} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, backgroundColor: COLOR.danger, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Xoá hẳn kỷ niệm">
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#fff" }}>Xoá hẳn</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function MemoriesScreen() {
  const { state, dispatch } = useLove();
  const { couple } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const contentW = Math.min(windowWidth, 430) - SPACE.screenX * 2;
  const me = state.currentUser;
  const memories = state.memories;
  const urls = useMemoryPhotoUrls(memories);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? memories.find((m) => m.id === selectedId) ?? null : null;

  /* Luồng thêm: chọn ảnh trước -> mở phiếu ghi chú/ngày -> tải lên -> ghi sổ.
   * Lỗi tải lên GIỮ NGUYÊN phiếu kèm dòng lỗi (tiền lệ ảnh hai đứa). */
  const [notice, setNotice] = useState("");
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [dateText, setDateText] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const ropes = useMemo(() => {
    const cells: Cell[] = [...memories.map((m) => ({ kind: "photo" as const, memory: m })), { kind: "add" as const }];
    const out: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 2) out.push(cells.slice(i, i + 2));
    return out;
  }, [memories]);

  async function pickMemory() {
    if (busy) return;
    if (memories.length >= MEMORIES_CAP) {
      setNotice(`Dây đã treo đủ ${MEMORIES_CAP} kỷ niệm rồi — gỡ bớt một tấm để treo thêm nhé.`);
      return;
    }
    setNotice("");
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setNotice("App cần quyền mở thư viện ảnh để hai bạn chọn kỷ niệm. Cho phép rồi thử lại nhé.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return; // đổi ý — lặng lẽ thôi
      if (!couple?.id) {
        setNotice("Chưa có vườn chung để lưu ảnh — hãy ghép cặp trước nhé.");
        return;
      }
      setPendingUri(result.assets[0].uri);
      setCaption("");
      setDateText(formatDateVN(today()));
      setFormError("");
      setSheetOpen(true);
    } catch {
      setNotice("Có chút trục trặc khi mở thư viện ảnh. Thử lại giúp mình nhé.");
    }
  }

  async function confirmAdd() {
    if (busy || !pendingUri || !couple?.id) return;
    const key = displayToKey(dateText);
    if (!key) { setFormError("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    setBusy(true);
    setFormError("");
    try {
      const id = uid();
      const path = await uploadMemoryPhoto(couple.id, id, pendingUri);
      const now = new Date().toISOString();
      dispatch({
        type: "MEMORY_ADD",
        memory: { id, path, caption: caption.trim(), dateKey: key, bySlot: me, addedAt: now, updatedAt: now },
        user: me,
        actor: myName(state),
      });
      success();
      setSheetOpen(false);
      setPendingUri(null);
    } catch (e) {
      // Giữ nguyên phiếu + ảnh đã chọn để thử lại, không bắt chọn lại từ đầu.
      setFormError(e instanceof Error ? e.message : "Tải ảnh lên chưa thành công — thử lại giúp mình nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Kỷ niệm của hai đứa"
        subtitle={memories.length > 0 ? `${memories.length} kỷ niệm đang treo trên dây` : "Dây kỷ niệm của hai đứa"}
        fallback="/(tabs)/couple"
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingBottom: insets.bottom + 30, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
      >
        {notice ? (
          <View style={{ backgroundColor: COLOR.warningSoft, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 }}>
            <Text style={{ fontFamily: FONT.medium, fontSize: 13, lineHeight: 19, color: COLOR.warningText }}>{notice}</Text>
          </View>
        ) : null}

        <View style={{ gap: 34 }}>
          {ropes.map((cells, i) => (
            <Rope
              key={i}
              cells={cells}
              width={contentW}
              urls={urls}
              onPhoto={(m) => setSelectedId(m.id)}
              onAdd={pickMemory}
            />
          ))}
        </View>

        {memories.length === 0 ? (
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, textAlign: "center", lineHeight: 22, marginTop: 30, paddingHorizontal: 12 }}>
            Treo lên đây những khoảnh khắc của hai đứa — chạm vào khung trống để thêm tấm đầu tiên.
          </Text>
        ) : (
          <Text style={{ ...TYPE.caption, color: COLOR.textFaint, textAlign: "center", marginTop: 30 }}>
            Dây giữ tối đa {MEMORIES_CAP} kỷ niệm — ảnh xếp theo ngày của kỷ niệm, cũ nhất treo trước.
          </Text>
        )}
      </ScrollView>

      {/* Trình xem ảnh lớn */}
      <Modal visible={!!selected} animationType="fade" onRequestClose={() => setSelectedId(null)}>
        {selected ? (
          <MemoryViewer key={selected.id} memory={selected} url={urls[selected.id]} onClose={() => setSelectedId(null)} />
        ) : null}
      </Modal>

      {/* Phiếu thêm kỷ niệm: ghi chú + ngày, sau khi đã chọn ảnh */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => { if (!busy) { setSheetOpen(false); setPendingUri(null); } }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", justifyContent: "flex-end" }} onPress={() => { if (!busy) { setSheetOpen(false); setPendingUri(null); } }}>
          <Pressable
            style={{ backgroundColor: COLOR.card, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, ...SHADOW_FLOAT }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: 14 }} />
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text }}>Treo kỷ niệm lên dây</Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
              {pendingUri ? (
                <Image source={{ uri: pendingUri }} style={{ width: 86, height: 69, borderRadius: 8, backgroundColor: "#F6E8EC" }} contentFit="cover" accessibilityLabel="Ảnh kỷ niệm vừa chọn" />
              ) : null}
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={{ ...TYPE.body, color: COLOR.textSoft, lineHeight: 21 }}>
                  Viết một dòng ghi chú và chọn ngày của kỷ niệm — khung ảnh sẽ treo đúng vị trí theo ngày trên dây.
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginTop: 16, marginBottom: 6 }}>
              Ghi chú (không bắt buộc, tối đa {MEMORY_CAPTION_MAX} ký tự)
            </Text>
            <TextInput
              style={s.input}
              value={caption}
              onChangeText={(t) => setCaption(t.slice(0, MEMORY_CAPTION_MAX))}
              placeholder="Ví dụ: Biển Vũng Tàu"
              placeholderTextColor={COLOR.textFaint}
              maxLength={MEMORY_CAPTION_MAX}
            />
            <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginTop: 12, marginBottom: 6 }}>Ngày của kỷ niệm</Text>
            <TextInput
              style={s.input}
              value={dateText}
              onChangeText={(t) => { setDateText(t); setFormError(""); }}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLOR.textFaint}
              keyboardType="numbers-and-punctuation"
            />
            {formError ? <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.danger, marginTop: 8 }}>{formError}</Text> : null}
            <TouchableOpacity
              onPress={confirmAdd}
              disabled={busy}
              style={[s.btn, { marginTop: 18, opacity: busy ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Treo kỷ niệm lên dây"
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="images" size={18} color="#fff" />}
              <Text style={s.btnText}>{busy ? "Đang tải lên..." : "Treo lên dây"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

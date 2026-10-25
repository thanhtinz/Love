import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../lib/store";
import { STATUS_MOODS, STATUS_TEXT_MAX } from "../lib/content";
import { statusExpired, visibleStatus } from "../lib/features";
import { success } from "../lib/feedback";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * Trình đặt TRẠNG THÁI CỦA MÌNH (đợt "hiện diện sống") — sheet dưới mở từ
 * thẻ Hai đứa: chọn 1 mood trong bộ preset + một dòng
 * ngắn tùy chọn (<= 40 ký tự) + Lưu / Xoá. Chỉ ghi vào ĐÚNG slot của người
 * đang đặt (reducer STATUS_SET khóa cứng) — người ấy sẽ thấy trạng thái này
 * ở hero Trang Nhà và thẻ Hai đứa gần như ngay khi đồng bộ tới. Trạng thái
 * chỉ hiện 24 giờ: bản cũ đã hết hạn thì form mở trống như chưa đặt.
 */
export function StatusEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const current = state.status[me];
  // Trạng thái chỉ hiện 24 giờ: bản đã hết hạn được coi như CHƯA ĐẶT — form
  // mở trống để đặt cái mới (lưu mới = updatedAt mới = đồng hồ 24h chạy lại).
  const expiredCurrent = current ? statusExpired(current) : false;
  const shownCurrent = visibleStatus(current);
  const [mood, setMood] = useState("");
  const [text, setText] = useState("");

  // Mở sheet là nạp lại bản trạng thái CÒN HẠN của mình vào form.
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp form từ state khi sheet mở, không phải vòng lặp render
    setMood(shownCurrent?.mood ?? "");
    setText(shownCurrent?.text ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp khi mở sheet
  }, [visible]);

  function save() {
    if (!mood) return;
    dispatch({
      type: "STATUS_SET",
      user: me,
      status: { mood, text: text.trim(), updatedAt: new Date().toISOString() },
    });
    success();
    onClose();
  }

  function clear() {
    dispatch({ type: "STATUS_SET", user: me, status: null });
    success();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: COLOR.card, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, ...SHADOW_FLOAT }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: 14 }} />
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text }}>Trạng thái của bạn</Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft, marginTop: 3 }}>
            Người ấy sẽ thấy trạng thái này ngay trên Trang Nhà — và nó chỉ hiện trong 24 giờ thôi nhé.
          </Text>
          {expiredCurrent ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 5 }}>
              Trạng thái cũ đã hết hạn (chỉ hiện 24 giờ) — đặt một cái mới nhé.
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {STATUS_MOODS.map((m) => {
              const active = mood === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMood(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn trạng thái ${m.label}`}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9,
                    backgroundColor: active ? COLOR.primary : COLOR.gardenWash,
                    borderWidth: 1, borderColor: active ? COLOR.primary : COLOR.border,
                  }}
                >
                  <Ionicons name={m.icon as never} size={14} color={active ? "#fff" : COLOR.textSoft} />
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: active ? "#fff" : COLOR.text }}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ marginTop: 16 }}>
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, STATUS_TEXT_MAX))}
              placeholder="Thêm một dòng ngắn... (không bắt buộc)"
              placeholderTextColor={COLOR.textFaint}
              maxLength={STATUS_TEXT_MAX}
              style={{
                borderWidth: 1, borderColor: COLOR.border, borderRadius: RADIUS.control,
                backgroundColor: COLOR.bg, paddingHorizontal: 14, minHeight: 48,
                fontFamily: FONT.regular, fontSize: 14.5, color: COLOR.text,
              }}
            />
            <Text style={{ fontFamily: FONT.regular, fontSize: 11.5, color: COLOR.textFaint, marginTop: 5, textAlign: "right" }}>
              {text.length}/{STATUS_TEXT_MAX}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            {shownCurrent ? (
              <TouchableOpacity
                onPress={clear}
                accessibilityRole="button"
                accessibilityLabel="Xoá trạng thái"
                style={{ backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS.control, minHeight: 48, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: COLOR.danger, fontFamily: FONT.bold, fontSize: 14.5 }}>Xoá</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={save}
              disabled={!mood}
              accessibilityRole="button"
              accessibilityLabel="Lưu trạng thái"
              style={{ flex: 1, backgroundColor: COLOR.primary, borderRadius: RADIUS.control, minHeight: 48, alignItems: "center", justifyContent: "center", opacity: mood ? 1 : 0.5 }}
            >
              <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 15 }}>Lưu trạng thái</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import React from "react";
import { Text, View } from "react-native";
import type { AppState, PersonId } from "../lib/types";
import Avatar from "./Avatar";
import { FONT, ROLE } from "./theme";

/**
 * Định danh 2 người NHẤT QUÁN toàn app (chống lẫn lộn "mình" vs "người ấy") — hệ màu 3 vai
 * theo nghiên cứu (Cupla: "Pink for me. Teal for them. Navy for us"):
 * - Người đang đăng nhập: HỒNG ĐÀO #FF8FA3 + nhãn "Bạn" + avatar + tên.
 * - Người còn lại: XANH MINT #3EC6B8 + tên riêng của họ.
 * Không bao giờ phân biệt chỉ bằng màu — chip luôn kèm avatar và tên.
 * Mọi màn hình hiển thị người đều PHẢI đi qua các helper ở đây, ánh xạ slot -> người
 * từ state (personA/personB + avatarA/avatarB), tuyệt đối không tự đoán "người đầu tiên = mình".
 */
export const SELF_COLOR = ROLE.selfDark; // sắc đậm của hồng đào để chữ đọc rõ trên nền sáng
export const SELF_MAIN = ROLE.self;
export const SELF_BG = ROLE.selfSoft;
export const PARTNER_COLOR = ROLE.partnerDark; // sắc đậm của mint để chữ đọc rõ
export const PARTNER_MAIN = ROLE.partner;
export const PARTNER_BG = ROLE.partnerSoft;

export interface PersonInfo { slot: PersonId; name: string; avatar: string; isSelf: boolean; color: string; bg: string }

export function personOf(state: AppState, slot: PersonId): PersonInfo {
  const isSelf = slot === state.currentUser;
  return {
    slot,
    name: slot === "A" ? state.personA : state.personB,
    avatar: slot === "A" ? state.avatarA : state.avatarB,
    isSelf,
    color: isSelf ? SELF_COLOR : PARTNER_COLOR,
    bg: isSelf ? SELF_BG : PARTNER_BG,
  };
}
export const selfOf = (state: AppState): PersonInfo => personOf(state, state.currentUser);
export const partnerOf = (state: AppState): PersonInfo => personOf(state, state.currentUser === "A" ? "B" : "A");

/** Chip nhỏ: avatar + tên (+ nhãn "Bạn" nếu là chính mình). */
export function PersonChip({ state, slot, size = 22, showYouTag = true }: { state: AppState; slot: PersonId; size?: number; showYouTag?: boolean }) {
  const p = personOf(state, slot);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: p.bg, borderRadius: 999, paddingLeft: 2, paddingRight: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Avatar id={p.avatar} size={size} />
      <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: p.color }}>{p.name}</Text>
      {p.isSelf && showYouTag && (
        <View style={{ backgroundColor: ROLE.self, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontSize: 9.5, fontFamily: FONT.black, color: "#fff" }}>Bạn</Text>
        </View>
      )}
    </View>
  );
}

/** Nhãn chữ ngắn gọn: "Bạn (Tên)" cho mình, tên riêng cho đối phương. */
export function personLabel(state: AppState, slot: PersonId): string {
  const p = personOf(state, slot);
  return p.isSelf ? `Bạn (${p.name})` : p.name;
}

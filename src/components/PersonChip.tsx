import React from "react";
import { Text, View } from "react-native";
import type { AppState, PersonId } from "../lib/types";
import Avatar from "./Avatar";
import { C } from "./ui";

/**
 * Định danh 2 người NHẤT QUÁN toàn app (chống lẫn lộn "mình" vs "người ấy"):
 * - Người đang đăng nhập: màu hồng rose + nhãn "Bạn".
 * - Người còn lại: màu sky + tên riêng của họ.
 * Mọi màn hình hiển thị người đều PHẢI đi qua các helper ở đây, ánh xạ slot -> người
 * từ state (personA/personB + avatarA/avatarB), tuyệt đối không tự đoán "người đầu tiên = mình".
 */
export const SELF_COLOR = C.pink; // #f43f5e
export const SELF_BG = C.pinkSoft;
export const PARTNER_COLOR = "#0284c7";
export const PARTNER_BG = "#e0f2fe";

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
      <Text style={{ fontSize: 12, fontWeight: "800", color: p.color }}>{p.name}</Text>
      {p.isSelf && showYouTag && (
        <View style={{ backgroundColor: SELF_COLOR, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontSize: 9.5, fontWeight: "900", color: "#fff" }}>Bạn</Text>
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

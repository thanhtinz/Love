import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { avatarById } from "../lib/types";
import { AVATAR_ART } from "./Art";

/**
 * Avatar tranh vẽ thật (assets/art/avatars/<id>.webp) — bo tròn, cover.
 * API giữ nguyên ({ id, size }) để mọi nơi gọi (PersonChip, ghép cặp, chọn avatar...) không phải sửa.
 * Nền phía sau dùng màu bg của avatar phòng khi tranh đang tải.
 */
const Avatar = memo(function Avatar({ id, size = 44, ring }: { id?: string; size?: number; ring?: string }) {
  const a = avatarById(id);
  const src = AVATAR_ART[a.id] ?? AVATAR_ART["svg-a"];
  const inner = (
    <View style={{ width: ring ? size - 4 : size, height: ring ? size - 4 : size, borderRadius: size / 2, overflow: "hidden", backgroundColor: a.bg }}>
      <Image source={src} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={a.label} />
    </View>
  );
  if (!ring) return inner;
  // Ring vai 2px (hệ Vườn giấy ấm): màu vai ôm quanh avatar, tổng kích thước giữ nguyên `size`.
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: ring, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {inner}
    </View>
  );
});

export default Avatar;

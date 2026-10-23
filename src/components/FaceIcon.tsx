import React, { memo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { MOOD_ART } from "./Art";

/**
 * Mặt mood tranh vẽ thật (assets/art/moods/<moodKey>.webp) — bo tròn nhẹ, cover.
 * API giữ nguyên ({ mood, size }): dùng cho thẻ "Hôm nay", màn chọn mood và khung mood.
 */
const FaceIcon = memo(function FaceIcon({ mood, size = 44 }: { mood: string; size?: number }) {
  const src = MOOD_ART[mood] ?? MOOD_ART["joy"];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: "hidden" }}>
      <Image source={src} style={{ width: "100%", height: "100%", mixBlendMode: "multiply" } as never} contentFit="cover" accessibilityLabel={mood} />
    </View>
  );
});

export default FaceIcon;

/**
 * Mặt mood CÓ trạng thái trống: mood rỗng (chưa chọn) phải hiện ô trung tính, KHÔNG
 * được rơi về mặt "joy" như FaceIcon thuần — bản cũ khiến người chưa chọn mood trông
 * như đang "Vui vẻ" ở Trang chủ, màn Mood và Khung mood, mâu thuẫn với dòng chữ
 * "Chưa chọn mood" ngay bên cạnh.
 */
export const MoodFace = memo(function MoodFace({ mood, size = 44 }: { mood: string; size?: number }) {
  if (!mood) {
    return (
      <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: "#F1F5F9", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="help" size={Math.round(size * 0.5)} color="#94A3B8" />
      </View>
    );
  }
  return <FaceIcon mood={mood} size={size} />;
});

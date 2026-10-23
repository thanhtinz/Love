import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { MOOD_ART } from "./Art";

/**
 * Mặt mood tranh vẽ thật (assets/art/moods/<moodKey>.webp) — bo tròn nhẹ, cover.
 * API giữ nguyên ({ mood, size }): dùng cho thẻ "Hôm nay", màn chọn mood và khung mood.
 */
const FaceIcon = memo(function FaceIcon({ mood, size = 44 }: { mood: string; size?: number }) {
  const src = MOOD_ART[mood] ?? MOOD_ART["joy"];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), overflow: "hidden", backgroundColor: "#fff" }}>
      <Image source={src} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={mood} />
    </View>
  );
});

export default FaceIcon;

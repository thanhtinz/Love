import { Image } from "expo-image";
import { Text, View } from "react-native";
import { FONT, SHADOW_FLOAT } from "./theme";

/**
 * Khung POLAROID cho ảnh thật của hai đứa (đợt "chất app" 3): viền trắng dày,
 * góc bo nhẹ, bóng đổ mềm — không xoay, không hiệu ứng thừa, để tấm ảnh tự nó
 * là điểm ấm nhất trên màn. Dùng ở thẻ hồ sơ tab Hai đứa (lớn) và góc hero
 * trang Nhà (nhỏ, ~84px).
 */
export function CouplePolaroid({ url, width, caption }: { url: string; width: number; caption?: string }) {
  const pad = Math.max(5, Math.round(width * 0.07));
  const photoW = width - pad * 2;
  const photoH = Math.round(photoW * 0.75); // ảnh được cắt 4:3 lúc chọn
  return (
    <View style={{ width, backgroundColor: "#FFFFFF", borderRadius: 12, padding: pad, paddingBottom: caption ? pad + 2 : pad + 7, ...SHADOW_FLOAT }}>
      <Image
        source={{ uri: url }}
        style={{ width: photoW, height: photoH, borderRadius: 6, backgroundColor: "#F6E8EC" }}
        contentFit="cover"
        accessibilityLabel="Ảnh của hai đứa"
      />
      {caption ? (
        <Text style={{ fontFamily: FONT.medium, fontStyle: "italic", fontSize: 12.5, color: "#7A5A66", textAlign: "center", marginTop: 7 }} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

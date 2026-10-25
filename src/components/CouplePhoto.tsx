import { Image } from "expo-image";
import { Text, View } from "react-native";
import { FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * Khung POLAROID NHỎ cho ảnh thật của hai đứa: viền trắng dày, góc bo nhẹ,
 * bóng đổ mềm — không xoay, không hiệu ứng thừa. Hiện chỉ dùng ở góc hero
 * trang Nhà (~84px); ở tab Hai đứa ảnh hiện khổ lớn bằng CouplePhotoLarge.
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

/**
 * Ảnh của hai đứa bản LỚN (tab Hai đứa): phủ kín bề ngang thẻ theo đúng tỉ lệ
 * 4:3 lúc chọn ảnh, bo góc + bóng mềm — KHÔNG khung polaroid, KHÔNG ghi chú,
 * để tấm ảnh hiện tự nhiên như một khung cảnh trong thẻ hồ sơ.
 */
export function CouplePhotoLarge({ url }: { url: string }) {
  return (
    <Image
      source={{ uri: url }}
      style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: RADIUS.inner, backgroundColor: "#F6E8EC", ...SHADOW_FLOAT }}
      contentFit="cover"
      accessibilityLabel="Ảnh của hai đứa"
    />
  );
}

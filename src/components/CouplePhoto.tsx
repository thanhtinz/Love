import { Image } from "expo-image";
import { Text, View } from "react-native";
import { FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * Khung ảnh VUÔNG cho ảnh thật của hai đứa: viền trắng đều, góc bo nhẹ, bóng
 * đổ mềm — một Ô RIÊNG ngay hàng dưới của hero trang Nhà (~92px, in-flow,
 * không còn gác absolute đè lên chữ). Ảnh cắt vuông (cover) cho vừa ô; ở tab
 * Hai đứa ảnh hiện khổ lớn bằng CouplePhotoLarge.
 */
export function CouplePolaroid({ url, width, caption }: { url: string; width: number; caption?: string }) {
  const pad = Math.max(5, Math.round(width * 0.065));
  const photoSide = width - pad * 2;
  return (
    <View style={{ width, height: caption ? undefined : width, backgroundColor: "#FFFFFF", borderRadius: 12, padding: pad, ...SHADOW_FLOAT }}>
      <Image
        source={{ uri: url }}
        style={{ width: photoSide, height: photoSide, borderRadius: 6, backgroundColor: "#F6E8EC" }}
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

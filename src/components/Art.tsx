import { Image } from "expo-image";
import { View } from "react-native";
import heroSrc from "../../assets/art/couple-hero.webp";
import letterSrc from "../../assets/art/couple-letter.webp";
import mascotSrc from "../../assets/art/mascot-mam.webp";
import mailboxSrc from "../../assets/art/mailbox-wings.webp";

// Màu nền đo trực tiếp từ góc tranh — khung bọc dùng đúng màu này để tranh hoà vào khung, không lộ vệt nền.
export const ART_BG = {
  letter: "#fbd9d7", // nền hồng mềm của couple-letter.webp
  mascot: "#fdf6df", // nền kem của mascot-mam.webp
  mailbox: "#fbf2e7", // nền kem của mailbox-wings.webp
} as const;

// HERO trang Nhà: tranh vẽ thật cặp đôi bên chậu hoa hồng, cover kín khung hero.
export function HeroArt() {
  return <Image source={heroSrc} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel="Hai đứa bên chậu hoa hồng" />;
}

// Tranh thư tình cho màn hình đăng nhập/đăng ký và ghép cặp — contain trong khung nền khớp màu tranh.
export function LetterArtImage({ height = 168 }: { height?: number }) {
  return (
    <View style={{ width: "100%", height, borderRadius: 20, overflow: "hidden", backgroundColor: ART_BG.letter }}>
      <Image source={letterSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Hai đứa và lá thư tình" />
    </View>
  );
}

// Mascot Mầm (tranh thật) — chỉ dùng tiết chế: đầu trang Nhiệm vụ, vườn trống, cây héo.
// Luôn nằm trong khung nền kem khớp màu nền tranh.
export function MascotArt({ size = 72 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), overflow: "hidden", backgroundColor: ART_BG.mascot }}>
      <Image source={mascotSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Mầm chibi trong chậu" />
    </View>
  );
}

// Hộp thư có cánh (tranh thật) cho trạng thái trống của trang Thư — khung nền kem khớp màu tranh.
export function MailboxArt({ size = 132 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 20, overflow: "hidden", backgroundColor: ART_BG.mailbox }}>
      <Image source={mailboxSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Hộp thư có cánh" />
    </View>
  );
}

// ===== TRANH CÂY VẼ THẬT (assets/art/plants) — ánh xạ loài + stageIndex 0-based -> file s<i+1> =====
const PLANT_ART: Record<string, number[]> = {
  "love-tree": [require("../../assets/art/plants/love-tree-s1.webp"), require("../../assets/art/plants/love-tree-s2.webp"), require("../../assets/art/plants/love-tree-s3.webp"), require("../../assets/art/plants/love-tree-s4.webp"), require("../../assets/art/plants/love-tree-s5.webp"), require("../../assets/art/plants/love-tree-s6.webp"), require("../../assets/art/plants/love-tree-s7.webp")],
  "sunflower": [require("../../assets/art/plants/sunflower-s1.webp"), require("../../assets/art/plants/sunflower-s2.webp"), require("../../assets/art/plants/sunflower-s3.webp"), require("../../assets/art/plants/sunflower-s4.webp"), require("../../assets/art/plants/sunflower-s5.webp")],
  "sakura": [require("../../assets/art/plants/sakura-s1.webp"), require("../../assets/art/plants/sakura-s2.webp"), require("../../assets/art/plants/sakura-s3.webp"), require("../../assets/art/plants/sakura-s4.webp"), require("../../assets/art/plants/sakura-s5.webp"), require("../../assets/art/plants/sakura-s6.webp")],
  "cactus": [require("../../assets/art/plants/cactus-s1.webp"), require("../../assets/art/plants/cactus-s2.webp"), require("../../assets/art/plants/cactus-s3.webp"), require("../../assets/art/plants/cactus-s4.webp"), require("../../assets/art/plants/cactus-s5.webp"), require("../../assets/art/plants/cactus-s6.webp")],
  "strawberry": [require("../../assets/art/plants/strawberry-s1.webp"), require("../../assets/art/plants/strawberry-s2.webp"), require("../../assets/art/plants/strawberry-s3.webp"), require("../../assets/art/plants/strawberry-s4.webp"), require("../../assets/art/plants/strawberry-s5.webp"), require("../../assets/art/plants/strawberry-s6.webp")],
  "legendary-tree": [require("../../assets/art/plants/legendary-tree-s1.webp"), require("../../assets/art/plants/legendary-tree-s2.webp"), require("../../assets/art/plants/legendary-tree-s3.webp"), require("../../assets/art/plants/legendary-tree-s4.webp"), require("../../assets/art/plants/legendary-tree-s5.webp"), require("../../assets/art/plants/legendary-tree-s6.webp"), require("../../assets/art/plants/legendary-tree-s7.webp"), require("../../assets/art/plants/legendary-tree-s8.webp")],
};
const EMPTY_PLOT_ART = require("../../assets/art/plants/empty-plot.webp");

/**
 * Cây vẽ thật theo loài/giai đoạn. Trạng thái yếu/héo thể hiện bằng opacity + lớp phủ xám
 * (héo: 0.55 + phủ xám; yếu "need": 0.8) — không vẽ SVG đè lên tranh.
 */
export function PlantImage({ speciesId, stageIndex, size, status }: { speciesId: string; stageIndex: number; size: number; status?: string }) {
  const stages = PLANT_ART[speciesId] ?? PLANT_ART["love-tree"];
  const src = stages[Math.max(0, Math.min(stageIndex, stages.length - 1))];
  const wilted = status === "wilted";
  const weak = status === "need";
  return (
    <View style={{ width: size, height: size, backgroundColor: "#fff", overflow: "hidden", borderRadius: 12 }}>
      <Image source={src} style={{ width: "100%", height: "100%", opacity: wilted ? 0.55 : weak ? 0.8 : 1 }} contentFit="contain" accessibilityLabel="Cây trong vườn" />
      {wilted && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(105,105,105,0.20)" }} />}
    </View>
  );
}

// Ô đất trống — tranh vẽ thật empty-plot.
export function EmptyPlotImage({ size = 62 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, backgroundColor: "#fff", overflow: "hidden", borderRadius: 12 }}>
      <Image source={EMPTY_PLOT_ART} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Ô đất trống" />
    </View>
  );
}

// ===== BỘ TRANH THẬT THỨ HAI: avatar / mood / shop / misc =====
export const AVATAR_ART: Record<string, number> = {
  "svg-a": require("../../assets/art/avatars/svg-a.webp"),
  "svg-b": require("../../assets/art/avatars/svg-b.webp"),
  "bunny": require("../../assets/art/avatars/bunny.webp"),
  "bear": require("../../assets/art/avatars/bear.webp"),
  "cat": require("../../assets/art/avatars/cat.webp"),
  "dog": require("../../assets/art/avatars/dog.webp"),
  "fox": require("../../assets/art/avatars/fox.webp"),
  "panda": require("../../assets/art/avatars/panda.webp"),
  "frog": require("../../assets/art/avatars/frog.webp"),
  "pig": require("../../assets/art/avatars/pig.webp"),
  "chick": require("../../assets/art/avatars/chick.webp"),
  "koala": require("../../assets/art/avatars/koala.webp"),
};
export const MOOD_ART: Record<string, number> = {
  "joy": require("../../assets/art/moods/joy.webp"),
  "love": require("../../assets/art/moods/love.webp"),
  "heartEyes": require("../../assets/art/moods/heartEyes.webp"),
  "sleepy": require("../../assets/art/moods/sleepy.webp"),
  "pleading": require("../../assets/art/moods/pleading.webp"),
  "huff": require("../../assets/art/moods/huff.webp"),
  "sick": require("../../assets/art/moods/sick.webp"),
  "celebrate": require("../../assets/art/moods/celebrate.webp"),
  "calm": require("../../assets/art/moods/calm.webp"),
  "excited": require("../../assets/art/moods/excited.webp"),
  "sad": require("../../assets/art/moods/sad.webp"),
  "energetic": require("../../assets/art/moods/energetic.webp"),
};
export const SHOP_ART: Record<string, number> = {
  "pot-basic": require("../../assets/art/shop/pot-basic.webp"),
  "pot-pink": require("../../assets/art/shop/pot-pink.webp"),
  "pot-blue": require("../../assets/art/shop/pot-blue.webp"),
  "pot-gold": require("../../assets/art/shop/pot-gold.webp"),
  "scene-auto": require("../../assets/art/shop/scene-auto.webp"),
  "scene-sunset": require("../../assets/art/shop/scene-sunset.webp"),
  "scene-night": require("../../assets/art/shop/scene-night.webp"),
  "scene-rainbow": require("../../assets/art/shop/scene-rainbow.webp"),
  "acc-none": require("../../assets/art/shop/acc-none.webp"),
  "acc-bow": require("../../assets/art/shop/acc-bow.webp"),
  "acc-butterfly": require("../../assets/art/shop/acc-butterfly.webp"),
  "acc-lantern": require("../../assets/art/shop/acc-lantern.webp"),
  "acc-chime": require("../../assets/art/shop/acc-chime.webp"),
};
const LETTER_ENVELOPE_ART = require("../../assets/art/misc/letter-envelope.webp");
const HEART_GAME_ART = require("../../assets/art/misc/heart-game.webp");
const MEMORIES_EMPTY_ART = require("../../assets/art/misc/memories-empty.webp");
const BUCKET_EMPTY_ART = require("../../assets/art/misc/bucket-empty.webp");

// Phong bì thư vẽ thật — thư rơi trong vườn + minh hoạ trong modal đọc thư (nền trắng, contain).
export function LetterEnvelopeImage({ size = 58 }: { size?: number }) {
  return <Image source={LETTER_ENVELOPE_ART} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Phong bì thư" />;
}

// Trái tim vẽ thật — mục tiêu trong game Bắt tim bay (nền trắng, contain).
export function HeartGameImage({ size = 44 }: { size?: number }) {
  return <Image source={HEART_GAME_ART} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Trái tim" />;
}

// Trạng thái trống Kỷ niệm — khung nền kem khớp màu nền tranh (#fbecdd đo từ góc tranh).
export function MemoriesEmptyArt({ size = 132 }: { size?: number }) {
  return (
    <View style={{ width: size, height: Math.round(size * 0.72), borderRadius: 20, overflow: "hidden", backgroundColor: "#fbecdd" }}>
      <Image source={MEMORIES_EMPTY_ART} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Chưa có kỷ niệm" />
    </View>
  );
}

// Trạng thái trống Danh sách ước mơ — khung nền kem khớp màu nền tranh (#fdf0e0 đo từ góc tranh).
export function BucketEmptyArt({ size = 132 }: { size?: number }) {
  return (
    <View style={{ width: size, height: Math.round(size * 0.72), borderRadius: 20, overflow: "hidden", backgroundColor: "#fdf0e0" }}>
      <Image source={BUCKET_EMPTY_ART} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Chưa có ước mơ nào" />
    </View>
  );
}

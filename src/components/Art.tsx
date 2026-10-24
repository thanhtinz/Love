import { Image } from "expo-image";
import { View } from "react-native";
import { COLOR } from "./theme";
import heroSrc from "../../assets/art/couple-hero.webp";
import letterSrc from "../../assets/art/couple-letter.webp";
import mascotSrc from "../../assets/art/mascot-mam.webp";
import mailboxSrc from "../../assets/art/mailbox-wings.webp";
import homeGardenSceneSrc from "../../assets/art/home-garden-scene.webp";

/** Bản đồ tranh cảnh dùng theo khóa (các tranh lẻ còn lại import trực tiếp bên dưới). */
export const ART = {
  homeGardenScene: homeGardenSceneSrc,
} as const;

/**
 * Tranh vẽ thật của app (assets/art/**.webp, giải mã từ .webp.b64 bằng
 * scripts/decode-art.mjs). Bản rebuild chỉ dùng: cảnh vườn Home, hero cặp đôi,
 * thư tình, mascot Mầm, hộp thư, 7 giai đoạn Cây Tình Yêu, 12 avatar, 12 mặt
 * mood, phong bì.
 */

// Màu nền đo trực tiếp từ góc tranh — khung bọc dùng đúng màu này để tranh hoà vào khung.
export const ART_BG = {
  letter: "#fbd9d7",
  mascot: "#fdf6df",
  mailbox: "#fbf2e7",
} as const;

/**
 * Cảnh vườn cho HERO Trang Nhà (từ 2026-10-23): hai cây hoa đan tán thành hình
 * trái tim, lối đi đá, nắng vàng — tranh FULL-BLEED phủ kín khối hero, chữ
 * "Ngày N" nằm trên lớp scrim mềm ở đáy do màn Home tự chồng lên.
 */
export function HomeGardenScene({ height = 320 }: { height?: number }) {
  return (
    <Image
      source={ART.homeGardenScene}
      style={{ width: "100%", height }}
      contentFit="cover"
      contentPosition={{ top: "30%" }}
      accessibilityLabel="Hai cây hoa đan vào nhau thành hình trái tim trong khu vườn đầy nắng"
    />
  );
}

// Dải tranh hero: tranh là một DẢI CẢNH phía trên tấm giấy "Ngày N" —
// neo điểm lấy nét ở 28% chiều cao tranh như mockup đã duyệt.
export function HeroBand({ height = 118 }: { height?: number }) {
  return (
    <View style={{ width: "100%", height, overflow: "hidden" }}>
      <Image source={heroSrc} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition={{ top: "28%" }} accessibilityLabel="Hai đứa bên chậu hoa hồng" />
    </View>
  );
}

// Tranh thư tình cho màn hình đăng nhập/đăng ký và ghép cặp.
export function LetterArtImage({ height = 168 }: { height?: number }) {
  return (
    <View style={{ width: "100%", height, borderRadius: 20, overflow: "hidden", backgroundColor: ART_BG.letter }}>
      <Image source={letterSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Hai đứa và lá thư tình" />
    </View>
  );
}

// Mascot Mầm (tranh thật) — dùng tiết chế: trạng thái trống, cây héo, dải kết màn.
export function MascotArt({ size = 72 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), overflow: "hidden", backgroundColor: ART_BG.mascot }}>
      <Image source={mascotSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Mầm chibi trong chậu" />
    </View>
  );
}

// Hộp thư có cánh (tranh thật) — trạng thái trống của tab Note.
export function MailboxArt({ size = 132 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 20, overflow: "hidden", backgroundColor: ART_BG.mailbox }}>
      <Image source={mailboxSrc} style={{ width: "100%", height: "100%" }} contentFit="contain" accessibilityLabel="Hộp thư có cánh" />
    </View>
  );
}

// ===== CÂY TÌNH YÊU — 7 giai đoạn vẽ thật (stageIndex 0-based -> file s<i+1>) =====
const LOVE_TREE_ART: number[] = [
  require("../../assets/art/plants/love-tree-s1.webp"),
  require("../../assets/art/plants/love-tree-s2.webp"),
  require("../../assets/art/plants/love-tree-s3.webp"),
  require("../../assets/art/plants/love-tree-s4.webp"),
  require("../../assets/art/plants/love-tree-s5.webp"),
  require("../../assets/art/plants/love-tree-s6.webp"),
  require("../../assets/art/plants/love-tree-s7.webp"),
];

/**
 * Khoảng trong suốt dưới ĐÁY VẼ THẬT của từng giai đoạn (đo từ hộp alpha của
 * file 512×512, đơn vị px nguồn): tranh là ảnh vuông nhưng phần vẽ không chạm
 * đáy ảnh — giai đoạn 2 chừa tới 80px. Nếu cứ neo theo hộp ảnh, đáy chậu dừng
 * lưng chừng trên mặt đất và cây trông LƠ LỬNG. Mọi khung vẽ cây bên dưới đều
 * dịch tranh xuống theo đúng khoảng chừa này để đáy chậu chạm một đường đất
 * chung (groundLift px trên đáy khung).
 */
const LOVE_TREE_BOTTOM_MARGIN = [56, 80, 24, 8, 21, 21, 12];
const ART_SOURCE_SIZE = 512;

/** Độ dịch dọc (px) để đáy vẽ thật của giai đoạn nằm đúng đường đất. */
function treeBaseShiftY(stageIndex: number, renderedSize: number, groundLift: number): number {
  const margin = LOVE_TREE_BOTTOM_MARGIN[stageIndex] ?? 0;
  return Math.round((margin / ART_SOURCE_SIZE) * renderedSize) - groundLift;
}

/**
 * BỆ CẢNH cây — "tranh là cảnh" của hệ Vườn giấy ấm. Neo đất gồm 4 lớp vẽ SAU
 * lưng tranh (tranh luôn ở trên cùng):
 * 1) Bệ cỏ: ellipse successSoft rộng 88%, cao ~13% cảnh, chìm 12px dưới đáy
 *    khung (khung cảnh cắt phần thừa) — mặt đất chung của cả cảnh.
 * 2) Bệ đất: ellipse COLOR.soil rộng 74%, cao ~9.5% cảnh, chìm 8px — lớp đất
 *    ấm ngay dưới chậu.
 * 3+4) Bóng tiếp xúc hai lớp mực ấm rgba(51,39,46): lớp ngoài rộng 72% bề
 *    ngang tranh, cao 18px, opacity qua màu 0.10; lớp trong 58% × 12px,
 *    0.16 — chồng nhau giả lập bóng mềm, ôm đúng đường đất nơi đáy chậu chạm.
 * Tranh được dịch xuống bằng treeBaseShiftY để ĐÁY CHẬU chạm đường đất (cao
 * hơn đáy khung 10px) và chìm nhẹ vào bệ đất thay vì lơ lửng phía trên.
 * Trạng thái yếu/héo thể hiện bằng opacity + lớp phủ xám (héo: 0.55 + phủ
 * xám; yếu: 0.8) — không vẽ đè lên tranh.
 */
export function PlantScene({ stageIndex, status, height, imgHeight }: {
  stageIndex: number;
  status?: string;
  height: number;
  imgHeight: number;
}) {
  const idx = Math.max(0, Math.min(stageIndex, LOVE_TREE_ART.length - 1));
  const src = LOVE_TREE_ART[idx];
  const wilted = status === "wilted";
  const weak = status === "need";
  const groundLift = 10;
  return (
    <View style={{ height, alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
      <View style={{ position: "absolute", bottom: -12, alignSelf: "center", width: "88%", height: Math.round(height * 0.13), backgroundColor: COLOR.successSoft, borderRadius: 999 }} />
      <View style={{ position: "absolute", bottom: -8, alignSelf: "center", width: "74%", height: Math.round(height * 0.095), backgroundColor: COLOR.soil, borderRadius: 999 }} />
      <View style={{ position: "absolute", bottom: groundLift - 7, alignSelf: "center", width: Math.round(imgHeight * 0.72), height: 18, backgroundColor: "rgba(51,39,46,0.10)", borderRadius: 999 }} />
      <View style={{ position: "absolute", bottom: groundLift - 5, alignSelf: "center", width: Math.round(imgHeight * 0.58), height: 12, backgroundColor: "rgba(51,39,46,0.16)", borderRadius: 999 }} />
      <Image
        source={src}
        style={{ height: imgHeight, width: imgHeight, opacity: wilted ? 0.55 : weak ? 0.8 : 1, transform: [{ translateY: treeBaseShiftY(idx, imgHeight, groundLift) }] }}
        contentFit="contain"
        accessibilityLabel="Cây tình yêu"
      />
      {wilted && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(105,105,105,0.14)" }} />}
    </View>
  );
}

/**
 * Cây vẽ thật dạng ô vuông (xem trước widget trong Tài khoản) — neo đất thu
 * nhỏ cùng luật với PlantScene: bệ đất + bóng tiếp xúc ở đáy ô, tranh dịch
 * xuống theo khoảng chừa đáy của giai đoạn để đáy chậu chạm bệ.
 */
export function PlantImage({ stageIndex, size, status }: { stageIndex: number; size: number; status?: string }) {
  const idx = Math.max(0, Math.min(stageIndex, LOVE_TREE_ART.length - 1));
  const src = LOVE_TREE_ART[idx];
  const wilted = status === "wilted";
  const weak = status === "need";
  const groundLift = Math.max(3, Math.round(size * 0.05));
  return (
    <View style={{ width: size, height: size, overflow: "hidden", borderRadius: 12, position: "relative" }}>
      <View style={{ position: "absolute", bottom: -3, alignSelf: "center", width: "82%", height: Math.round(size * 0.2), backgroundColor: COLOR.soil, borderRadius: 999 }} />
      <View style={{ position: "absolute", bottom: groundLift - 2, alignSelf: "center", width: Math.round(size * 0.6), height: Math.max(4, Math.round(size * 0.09)), backgroundColor: "rgba(51,39,46,0.18)", borderRadius: 999 }} />
      <Image source={src} style={{ width: "100%", height: "100%", opacity: wilted ? 0.55 : weak ? 0.8 : 1, transform: [{ translateY: treeBaseShiftY(idx, size, groundLift) }] }} contentFit="contain" accessibilityLabel="Cây tình yêu" />
      {wilted && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(105,105,105,0.20)" }} />}
    </View>
  );
}

// ===== Avatar + mood (tranh thật) =====
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

const LETTER_ENVELOPE_ART = require("../../assets/art/misc/letter-envelope.webp");
// Phong bì thư vẽ thật (nền trong suốt) — khoảnh khắc thư rơi.
export function LetterEnvelopeImage({ size = 58 }: { size?: number }) {
  return <Image source={LETTER_ENVELOPE_ART} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="Phong bì thư" />;
}

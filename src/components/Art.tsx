import { Image } from "expo-image";
import { View } from "react-native";
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
 * NỀN CẢNH cây — gradient dọc ấm 12 dải màu liên tiếp (kem ấm ở trên, qua
 * vàng nắng, tới xô thơm ở đáy): các dải kề nhau chênh màu rất nhẹ nên mắt
 * đọc thành một chuyển sắc mềm, KHÔNG hình khối, KHÔNG ellipse, KHÔNG cạnh
 * cứng. Tranh cây đời mới đã có bóng tiếp xúc vẽ sẵn trong tranh (xem
 * PlantScene) nên nền chỉ cần ấm và lặng để tranh nổi lên.
 */
const SCENE_GRADIENT = [
  "#FFF6E8", "#FEF2DB", "#FCECCC", "#FAE7C0", "#F6E2BA", "#F0E0B4",
  "#E8E0B0", "#DEE0AC", "#D2DEA8", "#C6DAA2", "#BCD49C", "#B4CE96",
] as const;

function hexLerp(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const pc = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${pc[0]},${pc[1]},${pc[2]})`;
}

const SCENE_BANDS = 64;

function SceneBackdrop({ height }: { height: number }) {
  const band = height / SCENE_BANDS;
  const stops = SCENE_GRADIENT.length - 1;
  return (
    <>
      {Array.from({ length: SCENE_BANDS }, (_, i) => {
        const pos = (i / (SCENE_BANDS - 1)) * stops;
        const lo = Math.min(Math.floor(pos), stops - 1);
        const color = hexLerp(SCENE_GRADIENT[lo], SCENE_GRADIENT[lo + 1], pos - lo);
        return (
          <View
            key={i}
            style={{ position: "absolute", left: 0, right: 0, top: Math.floor(i * band), height: Math.ceil(band) + 1, backgroundColor: color }}
          />
        );
      })}
    </>
  );
}

/**
 * BỆ CẢNH cây — "tranh là cảnh" của hệ Vườn giấy ấm. Từ vòng vẽ lại tranh
 * 2026-10-24, mỗi giai đoạn đã mang SẴN trong tranh: chậu chạm đáy khung
 * (khoảng trong suốt dưới chậu ≤4px trên canvas 512) và một bóng tiếp xúc vẽ
 * tay mềm ôm chân chậu. Vì vậy PlantScene KHÔNG còn vẽ bệ/bóng bằng CSS
 * (bản ellipse cũ trông như ván kệ và bị user bác) — chỉ neo tranh xuống đáy
 * khung trên nền gradient ấm, bóng trong tranh tự làm phần neo đất.
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
  return (
    <View style={{ height, width: "100%", alignItems: "center", justifyContent: "flex-end", position: "relative", overflow: "hidden" }}>
      <SceneBackdrop height={height} />
      <Image
        source={src}
        style={{ height: imgHeight, width: imgHeight, opacity: wilted ? 0.55 : weak ? 0.8 : 1 }}
        contentFit="contain"
        accessibilityLabel="Cây tình yêu"
      />
      {wilted && <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(105,105,105,0.14)" }} />}
    </View>
  );
}

/**
 * Cây vẽ thật dạng ô vuông (xem trước widget trong Tài khoản) — cùng luật với
 * PlantScene thu nhỏ: nền gradient ấm, tranh neo đáy, bóng tiếp xúc nằm ngay
 * trong tranh (không bệ/bóng CSS).
 */
export function PlantImage({ stageIndex, size, status }: { stageIndex: number; size: number; status?: string }) {
  const idx = Math.max(0, Math.min(stageIndex, LOVE_TREE_ART.length - 1));
  const src = LOVE_TREE_ART[idx];
  const wilted = status === "wilted";
  const weak = status === "need";
  return (
    <View style={{ width: size, height: size, overflow: "hidden", borderRadius: 12, position: "relative" }}>
      <SceneBackdrop height={size} />
      <Image source={src} style={{ width: "100%", height: "100%", opacity: wilted ? 0.55 : weak ? 0.8 : 1 }} contentFit="contain" accessibilityLabel="Cây tình yêu" />
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

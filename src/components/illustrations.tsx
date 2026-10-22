import React, { memo } from "react";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";
import { COLOR, ROLE } from "./theme";

/**
 * HỆ THỐNG MINH HỌA VẼ TAY (SVG vector — không ảnh raster, không emoji).
 * Phong cách chibi pastel đồng bộ palette 3 vai: Bạn #FF8FA3 · Người ấy #3EC6B8 · Chúng mình #2F4A67.
 * Mọi component đều là hàm thuần theo props -> bọc React.memo để không vẽ lại thừa trong list/scroll.
 */

/* ---------- Mảnh ghép dùng chung ---------- */

/** Đường path trái tim (gốc tại (0,0), khổ ~36x31) — dùng với transform translate/scale. */
const HEART_D = "M0 4 C-6 -4 -18 -2 -18 7 C-18 15 -8 20 0 27 C8 20 18 15 18 7 C18 -2 6 -4 0 4Z";

export function HeartShape({ x = 0, y = 0, s = 1, fill = COLOR.primary, opacity = 1 }: { x?: number; y?: number; s?: number; fill?: string; opacity?: number }) {
  return <Path d={HEART_D} transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={opacity} />;
}

/** Tia lấp lánh 4 cánh (gốc tại tâm). */
export function Sparkle({ x = 0, y = 0, s = 1, fill = "#F2B33D", opacity = 1 }: { x?: number; y?: number; s?: number; fill?: string; opacity?: number }) {
  return <Path d="M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2Z" transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={opacity} />;
}

function Cloud({ x, y, s = 1, opacity = 0.95 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <Ellipse cx="0" cy="0" rx="17" ry="10" fill="#FFFFFF" />
      <Ellipse cx="-13" cy="3" rx="11" ry="7" fill="#FFFFFF" />
      <Ellipse cx="13" cy="3" rx="12" ry="7.5" fill="#FFFFFF" />
    </G>
  );
}

function Butterfly({ x, y, s = 1, wing = "#F9A8D4", body = "#BE185D" }: { x: number; y: number; s?: number; wing?: string; body?: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Ellipse cx="-6" cy="0" rx="7" ry="4.6" fill={wing} transform="rotate(-24)" />
      <Ellipse cx="6" cy="0" rx="7" ry="4.6" fill={wing} transform="rotate(24)" />
      <Rect x="-1.4" y="-6" width="2.8" height="12" rx="1.4" fill={body} />
    </G>
  );
}

function MiniFlower({ x, y, s = 1, petal = "#FFB7C9", center = "#F2B33D" }: { x: number; y: number; s?: number; petal?: string; center?: string }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      {petals.map((a) => {
        const rad = (a * Math.PI) / 180;
        return <Circle key={a} cx={4.6 * Math.cos(rad)} cy={4.6 * Math.sin(rad)} r="3.4" fill={petal} />;
      })}
      <Circle cx="0" cy="0" r="2.6" fill={center} />
    </G>
  );
}

function GrassTuft({ x, y, color = "#3D9B6E", s = 1 }: { x: number; y: number; color?: string; s?: number }) {
  return <Path d="M0 0 Q-2 -9 -6 -12 M0 0 Q0 -11 1 -14 M0 0 Q3 -9 7 -11" transform={`translate(${x} ${y}) scale(${s})`} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
}

/* ---------- 1. HeroCouple — cặp đôi chibi bên cây tình yêu ---------- */

function ChibiChar({ x, flip = false, main, dark, hair, bow = false }: { x: number; flip?: boolean; main: string; dark: string; hair: string; bow?: boolean }) {
  return (
    <G transform={`translate(${x} 0) ${flip ? "scale(-1 1) translate(-184 0)" : ""}`}>
      {/* tay vươn về phía cây */}
      <Path d="M100 138 Q117 145 126 136" stroke="#FFD9C2" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <Path d="M84 138 Q68 148 61 137" stroke="#FFD9C2" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      {/* váy/áo */}
      <Path d="M92 124 L73 170 Q92 178 111 170 Z" fill={main} />
      <Path d="M73 170 Q92 178 111 170 L108 176 Q92 182 76 176 Z" fill={dark} opacity="0.55" />
      {/* chân */}
      <Ellipse cx="83" cy="180" rx="5.5" ry="2.8" fill={dark} />
      <Ellipse cx="101" cy="180" rx="5.5" ry="2.8" fill={dark} />
      {/* tóc hai bên + đầu */}
      <Ellipse cx="70" cy="110" rx="5.5" ry="11" fill={hair} />
      <Ellipse cx="114" cy="110" rx="5.5" ry="11" fill={hair} />
      <Circle cx="92" cy="104" r="21" fill="#FFE3D0" />
      <Path d="M71 103 A21 21 0 0 1 113 103 L110 90 Q92 79 74 90 Z" fill={hair} />
      {bow ? (
        <G transform="translate(107 82)">
          <Polygon points="0,0 -11,-6 -11,6" fill={COLOR.primary} />
          <Polygon points="0,0 11,-6 11,6" fill={COLOR.primary} />
          <Circle cx="0" cy="0" r="3.4" fill={ROLE.selfDark} />
        </G>
      ) : (
        <Path d="M84 84 Q92 78 101 83" stroke={hair} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      )}
      {/* mặt */}
      <Circle cx="85" cy="104" r="2.1" fill="#334155" />
      <Circle cx="99" cy="104" r="2.1" fill="#334155" />
      <Path d="M87 112 Q92 116.5 97 112" stroke="#334155" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Circle cx="77" cy="111" r="3.6" fill="#FDA4AF" opacity="0.85" />
      <Circle cx="107" cy="111" r="3.6" fill="#FDA4AF" opacity="0.85" />
    </G>
  );
}

export const HeroCouple = memo(function HeroCouple({ width = 340, height = 200 }: { width?: number | string; height?: number }) {
  return (
    <Svg width={width as never} height={height} viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE3EC" />
          <Stop offset="1" stopColor="#FFF6E9" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="340" height="200" fill="url(#heroSky)" />
      {/* mặt trời + mây */}
      <Circle cx="296" cy="34" r="15" fill="#FFD66B" />
      <G stroke="#FFD66B" strokeWidth="3" strokeLinecap="round">
        <Line x1="296" y1="10" x2="296" y2="15" /><Line x1="272" y1="34" x2="277" y2="34" />
        <Line x1="315" y1="34" x2="320" y2="34" /><Line x1="279" y1="17" x2="283" y2="21" /><Line x1="313" y1="17" x2="309" y2="21" />
      </G>
      <Cloud x={54} y={32} s={0.9} />
      <Cloud x={238} y={20} s={0.62} opacity={0.85} />
      {/* cây tình yêu ở giữa sau lưng */}
      <Path d="M170 172 C166 146 168 122 170 102" stroke="#A16207" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path d="M170 128 C156 120 148 110 144 100 M170 122 C184 114 192 106 196 96" stroke="#A16207" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Circle cx="170" cy="72" r="34" fill="#69C779" />
      <Circle cx="138" cy="88" r="24" fill="#69C779" />
      <Circle cx="202" cy="88" r="24" fill="#69C779" />
      <Circle cx="152" cy="58" r="15" fill="#3D9B6E" opacity="0.35" />
      <HeartShape x={152} y={58} s={0.5} fill="#FF6B8A" />
      <HeartShape x={190} y={50} s={0.42} fill={ROLE.self} />
      <HeartShape x={172} y={78} s={0.36} fill={COLOR.primary} />
      {/* đồi cỏ */}
      <Path d="M0 200 L0 168 Q85 150 170 164 Q255 178 340 162 L340 200 Z" fill="#CDEFD3" />
      <Path d="M0 200 L0 184 Q110 170 220 182 Q300 190 340 182 L340 200 Z" fill="#A9E2B4" opacity="0.85" />
      {/* hai nhân vật */}
      <ChibiChar x={0} main={ROLE.self} dark={ROLE.selfDark} hair="#8D5A3B" bow />
      <ChibiChar x={156} flip main={ROLE.partner} dark={ROLE.partnerDark} hair="#3D3A44" />
      {/* tim bay giữa hai người */}
      <HeartShape x={170} y={118} s={0.55} fill={COLOR.primary} />
      <HeartShape x={143} y={132} s={0.32} fill={ROLE.self} />
      <HeartShape x={199} y={132} s={0.32} fill={ROLE.partner} />
      <Sparkle x={170} y={104} s={0.8} />
      <Sparkle x={128} y={118} s={0.55} fill={ROLE.self} />
      {/* hoa + cỏ trên đồi */}
      <MiniFlower x={34} y={186} s={0.85} />
      <MiniFlower x={306} y={190} s={0.8} petal="#CDE7FF" />
      <MiniFlower x={84} y={193} s={0.65} petal="#FFE58A" center="#E8A13A" />
      <GrassTuft x={52} y={196} />
      <GrassTuft x={282} y={197} />
      <GrassTuft x={226} y={195} s={0.85} />
      <Butterfly x={36} y={74} s={0.9} />
      <Butterfly x={308} y={102} s={0.75} wing="#C4B5FD" body="#7C3AED" />
    </Svg>
  );
});

/* ---------- 2. GardenScene — phông nền vườn nhiều lớp ---------- */

export const GardenScene = memo(function GardenScene({ width = "100%", height = 200, sky = "#BAE6FD", night = false, hillFar, hill }: { width?: number | string; height?: number; sky?: string; night?: boolean; hillFar?: string; hill?: string }) {
  const far = hillFar || (night ? "#4B4690" : "#BDEECB");
  const near = hill || (night ? "#3A3674" : "#93DFA9");
  const fence = night ? "#8E8CC0" : "#FFF7EA";
  const grass = night ? "#55519B" : "#3D9B6E";
  return (
    <Svg width={width as never} height={height} viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
      <Rect x="0" y="0" width="360" height="200" fill={sky} />
      {night ? (
        <G>
          <Path d="M316 22 a15 15 0 1 0 10 26 a12 12 0 1 1 -10 -26Z" fill="#F5F3CE" />
          <Sparkle x={44} y={26} s={0.6} fill="#FFF7C4" />
          <Sparkle x={120} y={16} s={0.45} fill="#FFF7C4" />
          <Sparkle x={238} y={30} s={0.5} fill="#FFF7C4" />
          <Sparkle x={84} y={48} s={0.4} fill="#FFF7C4" />
        </G>
      ) : (
        <G>
          <Circle cx="40" cy="32" r="16" fill="#FFD66B" />
          <G stroke="#FFD66B" strokeWidth="3" strokeLinecap="round">
            <Line x1="40" y1="8" x2="40" y2="13" /><Line x1="16" y1="32" x2="21" y2="32" /><Line x1="59" y1="32" x2="64" y2="32" />
            <Line x1="23" y1="15" x2="27" y2="19" /><Line x1="57" y1="15" x2="53" y2="19" />
          </G>
        </G>
      )}
      <Cloud x={286} y={30} s={0.85} opacity={night ? 0.35 : 0.95} />
      <Cloud x={160} y={18} s={0.55} opacity={night ? 0.3 : 0.85} />
      {/* đồi xa + đồi gần */}
      <Path d="M0 200 L0 118 Q90 92 190 108 Q290 122 360 104 L360 200 Z" fill={far} />
      {/* hàng rào */}
      <G opacity={night ? 0.75 : 1}>
        <Rect x="0" y="126" width="360" height="5" fill={fence} />
        <Rect x="0" y="140" width="360" height="5" fill={fence} />
        {Array.from({ length: 13 }, (_, i) => (
          <Path key={i} d={`M${8 + i * 28} 118 l6 -6 6 6 v36 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 Z`} fill={fence} />
        ))}
      </G>
      <Path d="M0 200 L0 158 Q100 142 200 154 Q300 166 360 152 L360 200 Z" fill={near} />
      {/* hoa, cỏ, bướm */}
      <MiniFlower x={28} y={178} s={0.8} />
      <MiniFlower x={330} y={172} s={0.85} petal="#CDE7FF" />
      <MiniFlower x={66} y={190} s={0.6} petal="#FFE58A" center="#E8A13A" />
      <MiniFlower x={296} y={190} s={0.62} />
      <GrassTuft x={96} y={194} color={grass} />
      <GrassTuft x={180} y={197} color={grass} s={0.9} />
      <GrassTuft x={252} y={193} color={grass} s={0.85} />
      <Butterfly x={318} y={66} s={0.85} />
      <Butterfly x={52} y={88} s={0.7} wing="#C4B5FD" body="#7C3AED" />
    </Svg>
  );
});

/* ---------- 3. Mascot "Mầm" — mầm cây nhỏ có biểu cảm ---------- */

export type MamMood = "happy" | "sleepy" | "thirsty" | "celebrate";

export const MascotMam = memo(function MascotMam({ mood = "happy", size = 84 }: { mood?: MamMood; size?: number }) {
  const ink = "#334155";
  const leafDroop = mood === "thirsty";
  return (
    <Svg width={size} height={size * (124 / 120)} viewBox="0 0 120 124">
      {/* lá mầm trên đầu */}
      <G transform={leafDroop ? "rotate(20 60 26)" : undefined}>
        <Path d="M60 24 C48 24 41 14 41 3 C54 5 60 12 60 24Z" fill="#3D9B6E" />
      </G>
      <G transform={leafDroop ? "rotate(-20 60 26)" : undefined}>
        <Path d="M60 24 C72 24 79 14 79 3 C66 5 60 12 60 24Z" fill="#57B87B" />
      </G>
      <Path d="M60 28 C59 24 59 21 60 17" stroke="#3D9B6E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* đầu mầm tròn */}
      <Circle cx="60" cy="42" r="20" fill="#8FE388" />
      <Circle cx="52" cy="34" r="6" fill="#B9F2AE" opacity="0.8" />
      {/* mặt theo mood */}
      {mood === "happy" && (
        <G>
          <Path d="M46 42 Q51 37 56 42 M64 42 Q69 37 74 42" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <Path d="M53 49 Q60 55.5 67 49" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </G>
      )}
      {mood === "sleepy" && (
        <G>
          <Path d="M46 42 Q51 45 56 42 M64 42 Q69 45 74 42" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <Circle cx="60" cy="51" r="2.8" fill="none" stroke={ink} strokeWidth="2.2" />
          <Path d="M88 8 h9 l-9 8 h9 M99 -2 h7 l-7 6 h7" transform="translate(0 6)" stroke="#ABA3B3" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      )}
      {mood === "thirsty" && (
        <G>
          <Circle cx="51" cy="41" r="1.9" fill={ink} /><Circle cx="69" cy="41" r="1.9" fill={ink} />
          <Path d="M45 36 Q51 33.5 57 36 M63 36 Q69 33.5 75 36" stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <Path d="M52 51 Q56 48 60 51 Q64 54 68 51" stroke={ink} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <Path d="M88 24 C92.5 30.5 94.5 34 94.5 38 a6.5 6.5 0 1 1 -13 0 C81.5 34 83.5 30.5 88 24Z" fill="#7DD3FC" />
        </G>
      )}
      {mood === "celebrate" && (
        <G>
          <Sparkle x={51} y={41} s={0.85} fill="#E8A13A" />
          <Sparkle x={69} y={41} s={0.85} fill="#E8A13A" />
          <Path d="M52 47 Q60 58 68 47 Q60 52 52 47Z" fill="#7F1D1D" />
          <Sparkle x={18} y={22} s={0.7} fill={ROLE.self} />
          <Sparkle x={103} y={16} s={0.8} fill={ROLE.partner} />
          <Circle cx="14" cy="44" r="2.6" fill={COLOR.primary} />
          <Circle cx="106" cy="42" r="2.6" fill="#F2B33D" />
        </G>
      )}
      {mood !== "thirsty" && (
        <G>
          <Circle cx="43" cy="49" r="3.4" fill="#FDA4AF" opacity="0.8" />
          <Circle cx="77" cy="49" r="3.4" fill="#FDA4AF" opacity="0.8" />
        </G>
      )}
      {/* chậu */}
      <Ellipse cx="60" cy="80" rx="21" ry="4.5" fill="#92400E" />
      <Path d="M37 86 L83 86 L78 112 Q60 117 42 112 Z" fill="#FB923C" />
      <Rect x="33" y="78" width="54" height="11" rx="5.5" fill="#F97316" />
      <HeartShape x={60} y={93} s={0.34} fill="#FFF3E4" />
    </Svg>
  );
});

/* ---------- 4. Tranh trạng thái trống ---------- */

export const EmptyMailboxArt = memo(function EmptyMailboxArt({ size = 130 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (130 / 170)} viewBox="0 0 170 130">
      <Path d="M22 108 Q85 84 148 106" stroke="#F0C6CE" strokeWidth="2.4" fill="none" strokeDasharray="5 6" strokeLinecap="round" />
      {/* cánh */}
      <Path d="M36 64 C15 55 5 42 7 30 C20 30 31 39 38 52 Z" fill="#E5EBF2" stroke="#C9D6E4" strokeWidth="1.6" />
      <Path d="M134 64 C155 55 165 42 163 30 C150 30 139 39 132 52 Z" fill="#E5EBF2" stroke="#C9D6E4" strokeWidth="1.6" />
      {/* phong bì */}
      <Rect x="37" y="46" width="96" height="60" rx="10" fill="#FFFFFF" stroke="#F0C6CE" strokeWidth="2" />
      <Path d="M39 50 L85 84 L131 50" stroke="#F0C6CE" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Circle cx="85" cy="86" r="10.5" fill={COLOR.primary} />
      <HeartShape x={85} y={80} s={0.34} fill="#FFFFFF" />
      <Sparkle x={22} y={98} s={0.75} fill={ROLE.self} />
      <Sparkle x={150} y={38} s={0.85} />
      <Sparkle x={146} y={102} s={0.6} fill={ROLE.partner} />
      <Ellipse cx="85" cy="116" rx="42" ry="5" fill="#3D3A44" opacity="0.06" />
    </Svg>
  );
});

export const EmptyMemoriesArt = memo(function EmptyMemoriesArt({ size = 130 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (130 / 170)} viewBox="0 0 170 130">
      <Rect x="7" y="4" width="34" height="13" rx="4" fill="#FFE9EE" transform="rotate(-14 24 10)" />
      <Rect x="129" y="4" width="34" height="13" rx="4" fill="#D9F4F0" transform="rotate(14 146 10)" />
      <Rect x="28" y="14" width="114" height="94" rx="11" fill="#FFFFFF" stroke="#F3DCE0" strokeWidth="2" />
      <Rect x="39" y="25" width="92" height="56" rx="7" fill="#FFF3D6" />
      <Circle cx="117" cy="39" r="7.5" fill="#FFD66B" />
      <Path d="M39 81 L39 62 Q66 48 92 58 Q114 66 131 56 L131 81 Z" fill="#BDEECB" />
      {/* mầm trong khung ảnh */}
      <Path d="M85 74 V62" stroke="#3D9B6E" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M85 66 C76 66 71 59 71 52 C79 52 84 57 85 66Z" fill="#57B87B" />
      <Path d="M85 63 C94 63 99 56 99 49 C91 49 86 54 85 63Z" fill="#3D9B6E" />
      <Rect x="52" y="90" width="66" height="6" rx="3" fill="#F6EDEF" />
      <Rect x="66" y="99" width="38" height="5" rx="2.5" fill="#F6EDEF" />
      <Sparkle x={150} y={96} s={0.7} />
    </Svg>
  );
});

export const EmptyBucketArt = memo(function EmptyBucketArt({ size = 124 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (130 / 160)} viewBox="0 0 160 130">
      <Path d="M45 60 A35 33 0 0 1 115 60" stroke="#B08968" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M37 58 L123 58 L114 106 Q80 113 46 106 Z" fill="#E9B872" />
      <Path d="M41 74 L119 74 M44 88 L116 88" stroke="#C98F4A" strokeWidth="2.6" />
      <Path d="M62 60 L60 108 M80 60 L80 110 M98 60 L100 108" stroke="#C98F4A" strokeWidth="2.2" opacity="0.7" />
      <HeartShape x={80} y={72} s={0.52} fill={COLOR.primary} />
      <Sparkle x={24} y={34} s={0.75} fill={ROLE.self} />
      <Sparkle x={138} y={28} s={0.85} />
      <MiniFlower x={132} y={66} s={0.75} />
      <Ellipse cx="80" cy="118" rx="44" ry="5" fill="#3D3A44" opacity="0.06" />
    </Svg>
  );
});

export const EmptyPlotArt = memo(function EmptyPlotArt({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (96 / 130)} viewBox="0 0 130 96">
      {/* mầm nhỏ nhú bên trái */}
      <Path d="M42 66 V54" stroke="#3D9B6E" strokeWidth="3.2" strokeLinecap="round" />
      <Path d="M42 58 C34 58 30 52 30 46 C37 46 41 50 42 58Z" fill="#57B87B" />
      <Path d="M42 55 C50 55 54 49 54 43 C47 43 43 47 42 55Z" fill="#3D9B6E" />
      {/* mô đất */}
      <Path d="M10 86 Q65 46 120 86 Q65 97 10 86Z" fill="#B07B4F" />
      <Path d="M30 80 Q65 58 100 80" stroke="#96653B" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <Circle cx="48" cy="80" r="2.2" fill="#8A5A34" /><Circle cx="84" cy="76" r="2.2" fill="#8A5A34" /><Circle cx="66" cy="84" r="1.8" fill="#8A5A34" />
      {/* biển gỗ nhỏ */}
      <Rect x="88" y="34" width="4.5" height="34" rx="2" fill="#A16207" />
      <Rect x="68" y="14" width="46" height="23" rx="6" fill="#DEB887" stroke="#A16207" strokeWidth="1.8" />
      <HeartShape x={91} y={19} s={0.36} fill={COLOR.primary} />
      <Sparkle x={20} y={22} s={0.65} fill={ROLE.self} />
      <Sparkle x={120} y={48} s={0.55} />
    </Svg>
  );
});

/* ---------- 5. LetterArt — phong bì có dấu sáp trái tim ---------- */

export const LetterArt = memo(function LetterArt({ size = 84, seal = COLOR.primary }: { size?: number; seal?: string }) {
  return (
    <Svg width={size} height={size * (96 / 120)} viewBox="0 0 120 96">
      <Ellipse cx="60" cy="88" rx="36" ry="5" fill="#3D3A44" opacity="0.07" />
      <Rect x="10" y="20" width="100" height="60" rx="9" fill="#FFFFFF" stroke="#F0C6CE" strokeWidth="2" />
      <Polygon points="10,22 60,56 110,22" fill="#FFF1F4" />
      <Path d="M12 24 L60 57 L108 24" stroke="#F0C6CE" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M13 77 L45 51 M107 77 L75 51" stroke="#F6EDEF" strokeWidth="2" fill="none" />
      <Circle cx="60" cy="57" r="11.5" fill={seal} />
      <Circle cx="60" cy="57" r="11.5" fill="none" stroke="#00000018" strokeWidth="1" />
      <HeartShape x={60} y={51} s={0.36} fill="#FFFFFF" />
      <Sparkle x={13} y={10} s={0.62} fill={ROLE.self} />
      <Sparkle x={108} y={8} s={0.72} />
    </Svg>
  );
});

/* ---------- 6. GameArt — tim có mặt (Bắt tim bay) + vành vòng quay ---------- */

export const HeartFace = memo(function HeartFace({ size = 44, variant = "happy", color = "#FF6B8A" }: { size?: number; variant?: "happy" | "wink"; color?: string }) {
  const ink = "#7F1D2E";
  return (
    <Svg width={size} height={size * (96 / 100)} viewBox="0 0 100 96">
      <Ellipse cx="50" cy="89" rx="24" ry="4" fill="#3D3A44" opacity="0.08" />
      <Path d="M50 84 C20 62 8 44 8 29 C8 15 19 7 31 7 C40 7 47 12 50 19 C53 12 60 7 69 7 C81 7 92 15 92 29 C92 44 80 62 50 84Z" fill={color} />
      <Path d="M26 20 C22 25 21 31 23 37" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
      {variant === "happy" ? (
        <G>
          <Path d="M29 38 Q35 31.5 41 38 M59 38 Q65 31.5 71 38" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <Path d="M41 49 Q50 57 59 49" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </G>
      ) : (
        <G>
          <Path d="M29 38 Q35 31.5 41 38" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <Circle cx="65" cy="36" r="2.8" fill={ink} />
          <Path d="M41 49 Q50 57 59 49" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <Path d="M52 54 Q55 61 59 55 Q55 52 52 54Z" fill="#FF9FB0" />
        </G>
      )}
      <Circle cx="25" cy="47" r="4.6" fill="#FFFFFF" opacity="0.38" />
      <Circle cx="75" cy="47" r="4.6" fill="#FFFFFF" opacity="0.38" />
    </Svg>
  );
});

/** Vành trang trí cánh hoa/lá bọc quanh vòng quay — chỉ vẽ vành ngoài, tâm trong suốt. */
export const WheelRim = memo(function WheelRim({ size = 252 }: { size?: number }) {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const dots = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <Svg width={size} height={size} viewBox="0 0 260 260">
      <Circle cx="130" cy="130" r="119" fill="none" stroke="#FFE9EE" strokeWidth="15" />
      {petals.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const x = 130 + 119 * Math.cos(rad);
        const y = 130 + 119 * Math.sin(rad);
        return <Ellipse key={a} cx={x} cy={y} rx="8.5" ry="4.6" fill={i % 2 ? "#BDEAE4" : "#FFC9D6"} transform={`rotate(${a + 90} ${x} ${y})`} />;
      })}
      {dots.map((a) => {
        const rad = ((a + 22.5) * Math.PI) / 180;
        return <Circle key={a} cx={130 + 106 * Math.cos(rad)} cy={130 + 106 * Math.sin(rad)} r="2.6" fill="#F2B33D" />;
      })}
    </Svg>
  );
});

/* ---------- 7. FrameGarland — vòng hoa góc cho khung widget ---------- */

/** Cụm hoa lá ở một góc (mặc định góc trên-trái); lật 180° để dùng cho góc dưới-phải. */
export const FrameGarland = memo(function FrameGarland({ size = 104 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G opacity="0.95">
        <Path d="M4 34 Q6 14 26 6" stroke="#A9DDB5" strokeWidth="3" fill="none" strokeLinecap="round" />
        <Path d="M34 4 Q14 6 6 26" stroke="#A9DDB5" strokeWidth="3" fill="none" strokeLinecap="round" />
        <Ellipse cx="30" cy="7" rx="9" ry="4" fill="#A9DDB5" transform="rotate(14 30 7)" />
        <Ellipse cx="52" cy="9" rx="8" ry="3.8" fill="#8FD0A0" transform="rotate(8 52 9)" />
        <Ellipse cx="7" cy="30" rx="4" ry="9" fill="#A9DDB5" transform="rotate(14 7 30)" />
        <Ellipse cx="9" cy="52" rx="3.8" ry="8" fill="#8FD0A0" transform="rotate(8 9 52)" />
        <MiniFlower x={17} y={17} s={1.05} />
        <MiniFlower x={42} y={13} s={0.72} petal="#BDEAE4" center="#E8A13A" />
        <MiniFlower x={13} y={42} s={0.72} petal="#FFE58A" center="#E8A13A" />
        <Circle cx="64" cy="6" r="2.2" fill="#F2B33D" />
        <Circle cx="6" cy="64" r="2.2" fill="#F2B33D" />
        <Sparkle x={30} y={30} s={0.5} fill={ROLE.self} opacity={0.8} />
      </G>
    </Svg>
  );
});

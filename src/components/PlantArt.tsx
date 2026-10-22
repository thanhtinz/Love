import React from "react";
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from "react-native-svg";

/**
 * Hình cây vẽ bằng SVG (react-native-svg), thay đổi theo LOÀI + GIAI ĐOẠN.
 * Port ý tưởng từ TreeArt.tsx của bản web (ở web là cây chung; bản mobile vẽ riêng từng loài).
 */
export interface PlantArtProps {
  speciesId: string;
  stageIndex: number;
  totalStages: number;
  wilted?: boolean;
  potColor?: string;
  accessory?: string; // "", "bow", "chime", "lantern", "butterfly"
  fruitReady?: boolean;
  size?: number;
}

const HEART_SM = "M0 4 C-6 -4 -18 -2 -18 7 C-18 15 -8 20 0 27 C8 20 18 15 18 7 C18 -2 6 -4 0 4Z";

function Heart({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <Path d={HEART_SM} transform={`translate(${x} ${y}) scale(${s})`} fill={fill} />;
}
function Star({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <Polygon points="0,-8 2.4,-2.6 8,-2.6 3.4,1 5,6.8 0,3.4 -5,6.8 -3.4,1 -8,-2.6 -2.4,-2.6" transform={`translate(${x} ${y}) scale(${s})`} fill={fill} />;
}

function Seedling({ stageIndex, color }: { stageIndex: number; color: string }) {
  if (stageIndex === 0) {
    return (<G><Ellipse cx="100" cy="150" rx="11" ry="7" fill="#92400e" /><Path d="M100 146 q2 -7 8 -9" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" /></G>);
  }
  return (
    <G>
      <Path d="M100 152 V128" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
      <Path d="M100 136 C84 136 76 126 76 114 C90 114 99 122 100 136Z" fill={color} />
      <Path d="M100 132 C116 132 124 122 124 110 C110 110 101 118 100 132Z" fill={color} />
    </G>
  );
}

function TreeFamily({ f, stageIndex, totalStages, canopy, dark, accent, kind, wilted }: { f: number; stageIndex: number; totalStages: number; canopy: string; dark: string; accent: string; kind: string; wilted: boolean }) {
  if (stageIndex <= 1) return <Seedling stageIndex={stageIndex} color={canopy} />;
  const topY = 148 - (34 + 62 * f);
  const r = 16 + 30 * f;
  const isFinal = stageIndex >= totalStages - 1;
  const hasBuds = stageIndex >= totalStages - 3;
  const hasFlowers = stageIndex >= totalStages - 2;
  return (
    <G>
      <Path d={`M100 152 C96 120 98 ${topY + 26} 100 ${topY + 14}`} stroke="#a16207" strokeWidth={6 + 5 * f} fill="none" strokeLinecap="round" />
      <Path d={`M100 ${topY + 34} C84 ${topY + 24} 74 ${topY + 12} 68 ${topY}`} stroke="#a16207" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d={`M100 ${topY + 30} C116 ${topY + 20} 126 ${topY + 10} 132 ${topY - 2}`} stroke="#a16207" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Circle cx="100" cy={topY} r={r} fill={canopy} />
      <Circle cx={100 - r * 0.75} cy={topY + r * 0.42} r={r * 0.66} fill={canopy} />
      <Circle cx={100 + r * 0.75} cy={topY + r * 0.42} r={r * 0.66} fill={canopy} />
      <Circle cx={100 - r * 0.3} cy={topY - r * 0.34} r={r * 0.3} fill={dark} opacity="0.35" />
      {hasBuds && !hasFlowers && (<><Circle cx={84} cy={topY + 6} r="4.5" fill={accent} /><Circle cx={114} cy={topY - 6} r="4.5" fill={accent} /><Circle cx={102} cy={topY + 18} r="4.5" fill={accent} /></>)}
      {hasFlowers && kind === "sakura" && (<><Circle cx={80} cy={topY + 2} r="6" fill="#fbcfe8" /><Circle cx={118} cy={topY - 10} r="6" fill="#fbcfe8" /><Circle cx={100} cy={topY + 16} r="6" fill="#fbcfe8" /><Circle cx={126} cy={topY + 14} r="5" fill="#fbcfe8" /><Circle cx={72} cy={topY + 18} r="5" fill="#fbcfe8" /></>)}
      {isFinal && kind === "love-tree" && (<><Heart x={84} y={topY - 8} s={0.85} fill="#f43f5e" /><Heart x={112} y={topY + 2} s={0.7} fill="#fb7185" /><Heart x={96} y={topY + 14} s={0.6} fill="#e11d48" /></>)}
      {isFinal && kind === "legendary-tree" && (<><Star x={82} y={topY - 4} s={1} fill="#fde68a" /><Star x={116} y={topY + 6} s={0.8} fill="#fef3c7" /><Star x={99} y={topY + 18} s={0.7} fill="#fde68a" /></>)}
      {wilted && <Path d="M70 150 q30 -12 60 0" stroke="#a8a29e" strokeWidth="3" fill="none" strokeDasharray="4 5" />}
    </G>
  );
}

function Sunflower({ f, stageIndex, totalStages }: { f: number; stageIndex: number; totalStages: number }) {
  if (stageIndex <= 1) return <Seedling stageIndex={stageIndex} color="#84cc16" />;
  const topY = 148 - (30 + 66 * f);
  const isFinal = stageIndex >= totalStages - 1;
  const hasBud = stageIndex >= totalStages - 2;
  const petals = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);
  return (
    <G>
      <Path d={`M100 152 C98 120 100 ${topY + 16} 100 ${topY + 10}`} stroke="#16a34a" strokeWidth="6" fill="none" strokeLinecap="round" />
      <Path d="M100 122 C82 122 74 112 74 100 C88 100 98 108 100 122Z" fill="#22c55e" />
      <Path d="M100 108 C116 108 124 98 124 88 C110 88 102 96 100 108Z" fill="#22c55e" />
      {isFinal ? (
        <G>
          {petals.map((a, i) => (<Ellipse key={i} cx={100 + 21 * Math.cos(a)} cy={topY + 21 * Math.sin(a)} rx="10" ry="6" fill="#facc15" transform={`rotate(${(a * 180) / Math.PI} ${100 + 21 * Math.cos(a)} ${topY + 21 * Math.sin(a)})`} />))}
          <Circle cx="100" cy={topY} r="17" fill="#92400e" />
          <Circle cx="94" cy={topY - 4} r="2" fill="#78350f" /><Circle cx="104" cy={topY + 3} r="2" fill="#78350f" /><Circle cx="100" cy={topY + 8} r="2" fill="#78350f" />
        </G>
      ) : hasBud ? (<><Circle cx="100" cy={topY} r="13" fill="#84cc16" /><Circle cx="100" cy={topY} r="7" fill="#eab308" /></>) : (<Circle cx="100" cy={topY} r="8" fill="#22c55e" />)}
    </G>
  );
}

function Cactus({ f, stageIndex, totalStages }: { f: number; stageIndex: number; totalStages: number }) {
  if (stageIndex === 0) return <Seedling stageIndex={0} color="#22c55e" />;
  const hgt = 26 + 74 * f;
  const topY = 150 - hgt;
  const isFinal = stageIndex >= totalStages - 1;
  const arms = stageIndex >= 3;
  return (
    <G>
      {arms && (<><Rect x="58" y={topY + 34} width="16" height="34" rx="8" fill="#22c55e" /><Rect x="60" y={topY + 58} width="26" height="14" rx="7" fill="#22c55e" /><Rect x="126" y={topY + 26} width="16" height="30" rx="8" fill="#22c55e" /><Rect x="114" y={topY + 48} width="26" height="14" rx="7" fill="#22c55e" /></>)}
      <Rect x="84" y={topY} width="32" height={hgt} rx="16" fill="#22c55e" />
      <Path d={`M94 ${topY + 12} v${hgt - 26} M106 ${topY + 12} v${hgt - 26}`} stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
      <Path d="M88 60 l5 5 M112 84 l5 5 M90 108 l5 5 M110 128 l5 5" stroke="#bbf7d0" strokeWidth="2.4" strokeLinecap="round" />
      {isFinal && (<G><Circle cx="100" cy={topY - 6} r="9" fill="#f472b6" /><Circle cx="91" cy={topY - 1} r="6.5" fill="#fb7185" /><Circle cx="109" cy={topY - 1} r="6.5" fill="#fb7185" /><Circle cx="100" cy={topY - 5} r="3.4" fill="#fde047" /></G>)}
    </G>
  );
}

function Strawberry({ f, stageIndex, totalStages, fruitReady }: { f: number; stageIndex: number; totalStages: number; fruitReady?: boolean }) {
  if (stageIndex === 0) return <Seedling stageIndex={0} color="#22c55e" />;
  const spread = 14 + 30 * f;
  const isFinal = stageIndex >= totalStages - 1;
  const hasFlowers = stageIndex >= totalStages - 2;
  const berries: [number, number][] = [[100 - spread, 132], [100, 126], [100 + spread, 132], [100 - spread / 2, 140], [100 + spread / 2, 140]];
  return (
    <G>
      {berries.map(([x], i) => (<Path key={i} d={`M100 148 C${88 + i * 6} 138 ${x - 6} 128 ${x} 118`} stroke="#16a34a" strokeWidth="3.4" fill="none" strokeLinecap="round" />))}
      {[-1, -0.5, 0, 0.5, 1].map((k, i) => (<Ellipse key={i} cx={100 + k * spread} cy={134 - Math.abs(k) * -4} rx="15" ry="9" fill={i % 2 ? "#22c55e" : "#4ade80"} transform={`rotate(${k * 24} ${100 + k * spread} 134)`} />))}
      {hasFlowers && !isFinal && (<><Circle cx="82" cy="120" r="4.6" fill="#ffffff" /><Circle cx="118" cy="118" r="4.6" fill="#ffffff" /><Circle cx="100" cy="112" r="4.6" fill="#ffffff" /></>)}
      {(isFinal || fruitReady) && berries.map(([x, y], i) => (<G key={i}><Path d={`M${x} ${y} c-7 -1 -11 5 -9 11 c1.6 5 6 8 9 10 c3 -2 7.4 -5 9 -10 c2 -6 -2 -12 -9 -11Z`} fill={fruitReady || isFinal ? "#ef4444" : "#fca5a5"} /><Circle cx={x - 2.4} cy={y + 6} r="1.6" fill="#fecdd3" /></G>))}
    </G>
  );
}

function Accessory({ kind }: { kind: string }) {
  if (kind === "bow") return (<G transform="translate(140 38)"><Polygon points="0,0 -16,-9 -16,9" fill="#f472b6" /><Polygon points="0,0 16,-9 16,9" fill="#f472b6" /><Circle cx="0" cy="0" r="4.6" fill="#e11d48" /></G>);
  if (kind === "chime") return (<G transform="translate(152 30)"><Rect x="-9" y="0" width="18" height="7" rx="3" fill="#38bdf8" /><Path d="M-5 7 v14 M0 7 v18 M5 7 v14" stroke="#7dd3fc" strokeWidth="2.4" /><Polygon points="-5,21 0,30 -5,30" fill="#bae6fd" /></G>);
  if (kind === "lantern") return (<G transform="translate(44 96)"><Path d="M0 -16 v8" stroke="#92400e" strokeWidth="2.6" /><Rect x="-10" y="-8" width="20" height="26" rx="9" fill="#fb923c" /><Circle cx="0" cy="5" r="4.4" fill="#fde68a" /></G>);
  if (kind === "butterfly") return (<G><G transform="translate(48 52)"><Ellipse cx="-6" cy="0" rx="7" ry="4.6" fill="#c084fc" transform="rotate(-24)" /><Ellipse cx="6" cy="0" rx="7" ry="4.6" fill="#c084fc" transform="rotate(24)" /><Rect x="-1.4" y="-6" width="2.8" height="12" rx="1.4" fill="#7c3aed" /></G><G transform="translate(158 84) scale(0.8)"><Ellipse cx="-6" cy="0" rx="7" ry="4.6" fill="#f9a8d4" transform="rotate(-24)" /><Ellipse cx="6" cy="0" rx="7" ry="4.6" fill="#f9a8d4" transform="rotate(24)" /><Rect x="-1.4" y="-6" width="2.8" height="12" rx="1.4" fill="#be185d" /></G></G>);
  return null;
}

export default function PlantArt({ speciesId, stageIndex, totalStages, wilted, potColor = "#fb923c", accessory = "", fruitReady, size = 180 }: PlantArtProps) {
  const f = totalStages > 1 ? stageIndex / (totalStages - 1) : 0;
  const gray = wilted ? "#a8a29e" : undefined;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G opacity={wilted ? 0.75 : 1} transform={wilted ? "rotate(-5 100 150)" : undefined}>
        {speciesId === "sunflower" && <Sunflower f={f} stageIndex={stageIndex} totalStages={totalStages} />}
        {speciesId === "cactus" && <Cactus f={f} stageIndex={stageIndex} totalStages={totalStages} />}
        {speciesId === "strawberry" && <Strawberry f={f} stageIndex={stageIndex} totalStages={totalStages} fruitReady={fruitReady} />}
        {speciesId === "love-tree" && <TreeFamily f={f} stageIndex={stageIndex} totalStages={totalStages} canopy={gray || "#4ade80"} dark="#16a34a" accent="#f472b6" kind="love-tree" wilted={!!wilted} />}
        {speciesId === "sakura" && <TreeFamily f={f} stageIndex={stageIndex} totalStages={totalStages} canopy={gray || "#f9a8d4"} dark="#ec4899" accent="#fbcfe8" kind="sakura" wilted={!!wilted} />}
        {speciesId === "legendary-tree" && <TreeFamily f={f} stageIndex={stageIndex} totalStages={totalStages} canopy={gray || "#a78bfa"} dark="#7c3aed" accent="#ddd6fe" kind="legendary-tree" wilted={!!wilted} />}
      </G>
      <Ellipse cx="100" cy="152" rx="46" ry="7" fill="#92400e" opacity="0.85" />
      <Path d="M62 156 L138 156 L128 196 L72 196 Z" fill={potColor} />
      <Rect x="56" y="148" width="88" height="13" rx="6" fill={potColor} stroke="#00000022" />
      <Accessory kind={accessory} />
    </Svg>
  );
}

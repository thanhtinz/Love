"use client";
import React from "react";

/**
 * V4 — Cây tình yêu vẽ hoàn toàn bằng SVG, 7 giai đoạn lớn dần theo XP.
 * viewBox 200x200, gốc cây ở y≈192 (phía trên chậu do TreeGame render riêng bên dưới).
 * Trạng thái héo do lớp cha xử lý bằng CSS filter + rotate như V3.
 */
const TRUNK = "#a16207";
const TRUNK_D = "#854d0e";
const LEAF = "#34d399";
const LEAF_D = "#10b981";
const LEAF_L = "#6ee7b7";
const BLOSSOM = "#f9a8d4";
const BLOSSOM_D = "#f472b6";

function HeartShape({ x, y, s, fill, o = 1 }: { x: number; y: number; s: number; fill: string; o?: number }) {
  return <path d="M0 4.6C-5 .9-6.8-1.2-6.8-3.5c0-2.2 1.6-3.8 3.7-3.8 1.3 0 2.5.7 3.1 1.7.6-1 1.8-1.7 3.1-1.7 2.1 0 3.7 1.6 3.7 3.8C6.8-1.2 5 .9 0 4.6z" transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o} />;
}
function Blossom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <circle key={r} cx={Math.sin((r * Math.PI) / 180) * 5.4} cy={-Math.cos((r * Math.PI) / 180) * 5.4} r={4.1} fill={BLOSSOM} />
      ))}
      <circle r={2.6} fill="#fff7ed" />
    </g>
  );
}
function Canopy({ blossoms = 0, hearts = false }: { blossoms?: number; hearts?: boolean }) {
  const buds: [number, number][] = [[70, 62], [128, 55], [100, 40], [146, 84], [56, 88], [112, 74], [84, 92]];
  return (
    <g>
      <circle cx={100} cy={74} r={46} fill={LEAF} />
      <circle cx={62} cy={94} r={30} fill={LEAF_D} />
      <circle cx={138} cy={94} r={30} fill={LEAF_D} />
      <circle cx={82} cy={58} r={26} fill={LEAF_L} />
      <circle cx={122} cy={60} r={22} fill={LEAF_L} opacity={0.8} />
      {buds.slice(0, blossoms).map(([x, y], i) => (hearts ? <HeartShape key={i} x={x} y={y} s={1.5} fill={i % 2 ? "#f43f5e" : BLOSSOM_D} /> : <circle key={i} cx={x} cy={y} r={5} fill={BLOSSOM_D} stroke="#fff" strokeWidth={1.4} />))}
      {hearts && <><HeartShape x={100} y={96} s={2} fill="#e11d48" /><HeartShape x={66} y={110} s={1.2} fill="#fb7185" /><HeartShape x={138} y={112} s={1.2} fill="#fb7185" /></>}
    </g>
  );
}
function Trunk() {
  return (
    <g>
      <path d="M94 196c1.5-18 2.5-34 3-52l6 0c.5 18 1.5 34 3 52z" fill={TRUNK} />
      <path d="M97 150c-8-6-15-8-22-7M103 148c7-7 14-10 22-10" stroke={TRUNK_D} strokeWidth={5.5} fill="none" strokeLinecap="round" />
    </g>
  );
}

export default function TreeArt({ stage, className = "", style }: { stage: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} role="img" aria-label={`cây giai đoạn ${stage + 1}`}>
      {stage === 0 && (
        <g>
          <ellipse cx={100} cy={188} rx={46} ry={10} fill="#b45309" />
          <ellipse cx={100} cy={184} rx={34} ry={8} fill="#92400e" />
          <ellipse cx={100} cy={180} rx={11} ry={14} transform="rotate(22 100 180)" fill="#d97706" stroke="#92400e" strokeWidth={2} />
          <path d="M105 168c1-4.5 3.6-7.4 8-8.8" stroke={LEAF_D} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        </g>
      )}
      {stage === 1 && (
        <g>
          <ellipse cx={100} cy={190} rx={40} ry={9} fill="#b45309" />
          <path d="M100 190v-26" stroke={LEAF_D} strokeWidth={5} strokeLinecap="round" />
          <path d="M100 168c-1-10-9-16-22-16 .8 11 8 18 22 16z" fill={LEAF} />
          <path d="M100 162c.6-9.4 7.6-14.6 19-14.4-.4 10-6.8 16-19 14.4z" fill={LEAF_L} />
        </g>
      )}
      {stage === 2 && (
        <g>
          <ellipse cx={100} cy={192} rx={42} ry={8} fill="#b45309" />
          <path d="M100 192c0-22 1-40 4-58" stroke={LEAF_D} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M102 158c-8-4-16-3-24 2 5 8 14 10 24-2z" fill={LEAF} />
          <path d="M103 146c6-8 15-11 25-9-2 10-10 15-25 9z" fill={LEAF_L} />
          <path d="M104 134c-1-10 4-18 14-22 2 10-3 19-14 22z" fill={LEAF} />
          <path d="M102 128c-8-6-18-6-26-1 4 9 14 12 26 1z" fill={LEAF_D} />
        </g>
      )}
      {stage >= 3 && (
        <g>
          <ellipse cx={100} cy={194} rx={48} ry={7} fill="#b45309" opacity={0.55} />
          <Trunk />
          {stage === 3 && <Canopy />}
          {stage === 4 && <Canopy blossoms={5} />}
          {stage === 5 && (
            <g>
              <Canopy blossoms={2} />
              <Blossom x={66} y={70} /><Blossom x={104} y={48} s={1.15} /><Blossom x={140} y={76} /><Blossom x={86} y={96} s={0.9} /><Blossom x={122} y={100} s={0.9} /><Blossom x={100} y={70} s={0.8} />
            </g>
          )}
          {stage >= 6 && (
            <g>
              <Canopy hearts blossoms={7} />
              <Blossom x={58} y={64} s={0.9} /><Blossom x={146} y={60} s={0.9} />
              <path d="M160 34l1.8 4.6 4.6 1.8-4.6 1.8L160 46.8l-1.8-4.6-4.6-1.8 4.6-1.8z" fill="#fbbf24" />
              <path d="M38 44l1.4 3.6 3.6 1.4-3.6 1.4L38 54l-1.4-3.6L33 49l3.6-1.4z" fill="#fbbf24" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

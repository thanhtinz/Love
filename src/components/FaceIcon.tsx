"use client";
import React from "react";

/**
 * V4 — Mặt cảm xúc vẽ bằng SVG (thay bộ emoji mood cũ).
 * id giữ dạng chuỗi ngắn ổn định để lưu trong state; id emoji cũ được map sang đây ở normalize (types.ts).
 */
export type MoodId = "joy" | "love" | "heartEyes" | "sleepy" | "pleading" | "huff" | "sick" | "celebrate" | "calm" | "excited" | "sad" | "energetic";

const SKIN = "#ffe3ae";
const LINE = "#92400e";
const CHEEK = "#ffb3c6";

function HeartPath({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <path d="M0 3.2C-3.4.9-4.6-.8-4.6-2.4c0-1.5 1.1-2.6 2.5-2.6.9 0 1.7.5 2.1 1.2.4-.7 1.2-1.2 2.1-1.2 1.4 0 2.5 1.1 2.5 2.6C4.6-.8 3.4.9 0 3.2z" transform={`translate(${x} ${y}) scale(${s})`} fill={fill} />;
}

function Eyes({ mood }: { mood: MoodId }) {
  const dot = (cx: number) => <circle cx={cx} cy={44} r={3.1} fill={LINE} />;
  switch (mood) {
    case "heartEyes":
      return <><HeartPath x={38} y={44} s={1.7} fill="#f43f5e" /><HeartPath x={62} y={44} s={1.7} fill="#f43f5e" /></>;
    case "joy": case "excited": case "celebrate":
      return <><path d="M32 46q6-7 12 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" /><path d="M56 46q6-7 12 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" /></>;
    case "calm": case "sleepy":
      return <><path d="M32 44q6 5 12 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" /><path d="M56 44q6 5 12 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" /></>;
    case "pleading":
      return <><circle cx={38} cy={45} r={4} fill={LINE} /><circle cx={62} cy={45} r={4} fill={LINE} /><circle cx={39.5} cy={43.4} r={1.5} fill="#fff" /><circle cx={63.5} cy={43.4} r={1.5} fill="#fff" /></>;
    case "sick":
      return <><path d="M32 42l9 5M41 42l-9 5M56 42l9 5M65 42l-9 5" stroke={LINE} strokeWidth={3} strokeLinecap="round" /></>;
    case "huff":
      return <><path d="M31 40l10 4M57 44l10-4" stroke={LINE} strokeWidth={3.2} strokeLinecap="round" />{dot(38)}{dot(62)}</>;
    case "sad":
      return <><path d="M31 39l10 3M69 39l-10 3" stroke={LINE} strokeWidth={3} strokeLinecap="round" />{dot(38)}{dot(62)}</>;
    default:
      return <>{dot(38)}{dot(62)}</>;
  }
}

function Mouth({ mood }: { mood: MoodId }) {
  switch (mood) {
    case "joy": case "love": case "heartEyes": case "excited": case "celebrate":
      return <path d="M39 58q11 10 22 0q-2.5 8-11 8t-11-8z" fill={LINE} />;
    case "calm":
      return <path d="M41 59q9 6 18 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
    case "sleepy":
      return <ellipse cx={50} cy={62} rx={4.6} ry={5.4} fill={LINE} />;
    case "pleading":
      return <path d="M43 64q7-4.5 14 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
    case "sad":
      return <path d="M41 66q9-7 18 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
    case "huff":
      return <path d="M42 62h16" stroke={LINE} strokeWidth={3.6} strokeLinecap="round" />;
    case "sick":
      return <path d="M41 62q4.5-3 9 0t9 0" stroke={LINE} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M41 59q9 6 18 0" stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  }
}

function Extras({ mood }: { mood: MoodId }) {
  switch (mood) {
    case "love":
      return <><HeartPath x={20} y={30} s={1.15} fill="#fb7185" /><HeartPath x={81} y={26} s={0.95} fill="#f43f5e" /><HeartPath x={84} y={52} s={0.8} fill="#fda4af" /></>;
    case "sleepy":
      return <text x={70} y={30} fontSize={17} fontWeight={800} fill="#7aa5fb" fontFamily="inherit">Z</text>;
    case "pleading": case "sad":
      return <path d="M28 56c2.4 3.4 3.6 5.4 3.6 7a3.6 3.6 0 1 1-7.2 0c0-1.6 1.2-3.6 3.6-7z" fill="#7dd3fc" />;
    case "huff":
      return <><path d="M22 62q-4 1-4.6 4.4M79 62q4 1 4.6 4.4" stroke="#cbd5e1" strokeWidth={3.4} fill="none" strokeLinecap="round" /></>;
    case "sick":
      return <><rect x={66} y={56} width={17} height={5.6} rx={2.8} transform="rotate(24 66 56)" fill="#e2e8f0" stroke={LINE} strokeWidth={1.6} /><circle cx={81} cy={66} r={3.4} fill="#f43f5e" /></>;
    case "celebrate": case "excited":
      return <><path d="M50 4l7 15H43z" fill="#fb7aa0" /><circle cx={50} cy={4} r={3} fill="#fbbf24" /><path d="M18 22l3 3M82 20l-3 3M24 10v4M78 34h-4" stroke="#f59e0b" strokeWidth={2.6} strokeLinecap="round" /></>;
    case "energetic":
      return <path d="M50 2c1.8 3.8-.6 5.6-1.9 7.6-.9 1.4-1 3 .1 4.4-3-1-4.9-3.4-4.4-6.2.3-1.9 1.7-3.2 2.9-4.6.3 1 .9 1.8 1.8 2.3C48.3 3.9 49 1.9 50 2z" fill="#fb923c" stroke="#ea580c" strokeWidth={1.4} transform="translate(0 -1) scale(1.15) translate(-6.5 0)" />;
    default:
      return null;
  }
}

export default function FaceIcon({ mood, size = 44, className = "" }: { mood: string; size?: number; className?: string }) {
  const m = (["joy", "love", "heartEyes", "sleepy", "pleading", "huff", "sick", "celebrate", "calm", "excited", "sad", "energetic"].includes(mood) ? mood : "joy") as MoodId;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block shrink-0 ${className}`} role="img" aria-label={`mood ${m}`}>
      <Extras mood={m} />
      <circle cx={50} cy={54} r={38} fill={SKIN} stroke="#f59e0b" strokeWidth={2.4} />
      <circle cx={30} cy={60} r={6} fill={CHEEK} opacity={0.75} />
      <circle cx={70} cy={60} r={6} fill={CHEEK} opacity={0.75} />
      <Eyes mood={m} />
      <Mouth mood={m} />
    </svg>
  );
}

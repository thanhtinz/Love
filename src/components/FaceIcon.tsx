import React, { memo } from "react";
import Svg, { Circle, Path } from "react-native-svg";

/** Khuôn mặt cảm xúc vẽ bằng SVG theo mood id (port từ FaceIcon của bản web). */
const HEART = "M50 62 C38 52 30 45 30 35 C30 27 36 22 43 22 C47 22 49 25 50 27 C51 25 53 22 57 22 C64 22 70 27 70 35 C70 45 62 52 50 62Z";
function Eyes({ mood }: { mood: string }) {
  const ink = "#334155";
  switch (mood) {
    case "love":
    case "heartEyes":
      return (<><Path d="M28 44 C24 38 26 31 31 31 C34 31 35 33 36 34 C37 33 38 31 41 31 C46 31 48 38 44 44 L36 52 Z" fill="#f43f5e" /><Path d="M56 44 C52 38 54 31 59 31 C62 31 63 33 64 34 C65 33 66 31 69 31 C74 31 76 38 72 44 L64 52 Z" fill="#f43f5e" /></>);
    case "sleepy":
      return (<><Path d="M26 42 Q36 48 46 42" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" /><Path d="M54 42 Q64 48 74 42" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" /><Path d="M76 16 h10 l-10 8 h10" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>);
    case "pleading":
      return (<><Circle cx="36" cy="40" r="6" fill={ink} /><Circle cx="64" cy="40" r="6" fill={ink} /><Circle cx="38" cy="37" r="2.2" fill="#fff" /><Circle cx="66" cy="37" r="2.2" fill="#fff" /><Path d="M28 26 Q36 20 44 25 M56 25 Q64 20 72 26" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /></>);
    case "huff":
      return (<><Path d="M26 34 L44 40 M74 34 L56 40" stroke={ink} strokeWidth="3.4" strokeLinecap="round" /><Circle cx="36" cy="46" r="3" fill={ink} /><Circle cx="64" cy="46" r="3" fill={ink} /></>);
    case "sick":
      return (<><Path d="M27 38 L43 44 M43 38 L27 44 M57 38 L73 44 M73 38 L57 44" stroke={ink} strokeWidth="3" strokeLinecap="round" /><Path d="M34 78 h32" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" /></>);
    case "sad":
      return (<><Circle cx="36" cy="42" r="3.4" fill={ink} /><Circle cx="64" cy="42" r="3.4" fill={ink} /><Path d="M30 28 Q36 24 42 28 M58 28 Q64 24 70 28" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /><Path d="M70 56 q5 8 0 11 q-5 -3 0 -11" fill="#38bdf8" /></>);
    case "celebrate":
    case "excited":
      return (<><Path d="M26 44 Q36 34 46 44 M54 44 Q64 34 74 44" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" /><Path d="M20 14 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#facc15" /></>);
    case "calm":
      return (<><Path d="M26 42 Q36 46 46 42 M54 42 Q64 46 74 42" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" /></>);
    case "energetic":
      return (<><Circle cx="36" cy="40" r="3.6" fill={ink} /><Circle cx="64" cy="40" r="3.6" fill={ink} /><Path d="M80 8 l-6 10 h5 l-4 9 12 -13 h-6 l5 -6 Z" fill="#f59e0b" /></>);
    default: // joy
      return (<><Circle cx="36" cy="40" r="3.6" fill={ink} /><Circle cx="64" cy="40" r="3.6" fill={ink} /></>);
  }
}
function Mouth({ mood }: { mood: string }) {
  const ink = "#334155";
  switch (mood) {
    case "sleepy": return <Circle cx="50" cy="66" r="5" fill="none" stroke={ink} strokeWidth="3" />;
    case "huff": return <Path d="M40 72 Q50 66 60 72" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
    case "sad": return <Path d="M38 74 Q50 64 62 74" stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
    case "sick": return null;
    case "celebrate":
    case "excited": return <Path d="M36 60 Q50 78 64 60 Q50 66 36 60Z" fill="#7f1d1d" />;
    case "love":
    case "heartEyes": return <Path d={HEART} transform="translate(28 30) scale(0.44)" fill="#f43f5e" />;
    default: return <Path d="M36 60 Q50 74 64 60" stroke={ink} strokeWidth="3.4" fill="none" strokeLinecap="round" />;
  }
}
const FaceIcon = memo(function FaceIcon({ mood, size = 44 }: { mood: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="46" fill="#fff7ed" stroke="#fdba74" strokeWidth="2.5" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      <Circle cx="22" cy="60" r="6" fill="#fda4af" opacity="0.75" />
      <Circle cx="78" cy="60" r="6" fill="#fda4af" opacity="0.75" />
    </Svg>
  );
});

export default FaceIcon;

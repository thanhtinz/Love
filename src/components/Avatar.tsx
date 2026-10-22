import React from "react";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { avatarById } from "../lib/types";

/**
 * Avatar chibi vẽ bằng SVG theo id (giữ id tương thích với bản web / cột profiles.avatar).
 * Mỗi avatar: khuôn mặt tròn + tai/chi tiết riêng theo loài + má hồng.
 */
const EARS: Record<string, (c: string) => React.ReactNode> = {
  "svg-a": (c) => (<><Circle cx="26" cy="18" r="9" fill="#f472b6" /><Circle cx="74" cy="18" r="9" fill="#f472b6" /><Circle cx="26" cy="18" r="4" fill="#fbcfe8" /><Circle cx="74" cy="18" r="4" fill="#fbcfe8" /></>),
  "svg-b": (c) => (<Path d="M50 2 L56 14 L69 15 L59 23 L62 36 L50 28 L38 36 L41 23 L31 15 L44 14 Z" fill="#facc15" />),
  bunny: (c) => (<><Ellipse cx="34" cy="12" rx="7" ry="14" fill={c} /><Ellipse cx="66" cy="12" rx="7" ry="14" fill={c} /><Ellipse cx="34" cy="13" rx="3.5" ry="9" fill="#fbcfe8" /><Ellipse cx="66" cy="13" rx="3.5" ry="9" fill="#fbcfe8" /></>),
  bear: (c) => (<><Circle cx="24" cy="24" r="11" fill={c} /><Circle cx="76" cy="24" r="11" fill={c} /><Circle cx="24" cy="24" r="5" fill="#fde68a" /><Circle cx="76" cy="24" r="5" fill="#fde68a" /></>),
  cat: (c) => (<><Path d="M24 34 L18 8 L42 20 Z" fill={c} /><Path d="M76 34 L82 8 L58 20 Z" fill={c} /></>),
  dog: (c) => (<><Ellipse cx="16" cy="46" rx="9" ry="16" fill={c} /><Ellipse cx="84" cy="46" rx="9" ry="16" fill={c} /></>),
  fox: (c) => (<><Path d="M22 36 L14 4 L46 18 Z" fill={c} /><Path d="M78 36 L86 4 L54 18 Z" fill={c} /><Path d="M22 30 L19 12 L38 20 Z" fill="#ffedd5" /><Path d="M78 30 L81 12 L62 20 Z" fill="#ffedd5" /></>),
  panda: (c) => (<><Circle cx="24" cy="24" r="11" fill="#334155" /><Circle cx="76" cy="24" r="11" fill="#334155" /></>),
  frog: (c) => (<><Circle cx="28" cy="22" r="10" fill={c} /><Circle cx="72" cy="22" r="10" fill={c} /><Circle cx="28" cy="22" r="5" fill="#fff" /><Circle cx="72" cy="22" r="5" fill="#fff" /></>),
  pig: (c) => (<><Circle cx="25" cy="22" r="9" fill={c} /><Circle cx="75" cy="22" r="9" fill={c} /></>),
  chick: (c) => (<Path d="M50 6 q4 -10 12 -10 M50 6 q-2 -11 -11 -12" stroke="#eab308" strokeWidth="4" fill="none" strokeLinecap="round" />),
  koala: (c) => (<><Circle cx="20" cy="34" r="13" fill={c} /><Circle cx="80" cy="34" r="13" fill={c} /><Circle cx="20" cy="34" r="7" fill="#e2e8f0" /><Circle cx="80" cy="34" r="7" fill="#e2e8f0" /></>),
};

export default function Avatar({ id, size = 44 }: { id?: string; size?: number }) {
  const a = avatarById(id);
  const earFn = EARS[a.id] || EARS["svg-a"];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {earFn(a.color)}
      <Circle cx="50" cy="56" r="36" fill={a.bg} stroke={a.color} strokeWidth="2.5" />
      {a.id === "panda" ? (<><Ellipse cx="38" cy="52" rx="7" ry="9" fill="#334155" /><Ellipse cx="62" cy="52" rx="7" ry="9" fill="#334155" /><Circle cx="38" cy="50" r="2.6" fill="#fff" /><Circle cx="62" cy="50" r="2.6" fill="#fff" /></>) : (<><Circle cx="38" cy="52" r="3.4" fill="#334155" /><Circle cx="62" cy="52" r="3.4" fill="#334155" /></>)}
      {a.id === "pig" ? (<Ellipse cx="50" cy="62" rx="8" ry="6" fill="#f9a8d4" stroke="#db2777" strokeWidth="1.6" />) : a.id === "chick" ? (<Path d="M44 60 L56 60 L50 68 Z" fill="#f97316" />) : (<Path d="M42 64 Q50 71 58 64" stroke="#334155" strokeWidth="2.6" fill="none" strokeLinecap="round" />)}
      <Circle cx="29" cy="63" r="5" fill="#fda4af" opacity="0.8" />
      <Circle cx="71" cy="63" r="5" fill="#fda4af" opacity="0.8" />
    </Svg>
  );
}

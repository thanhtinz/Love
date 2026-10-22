import { avatarById } from "@/lib/types";

/**
 * Avatar chibi: mặc định là SVG tự vẽ (variant A/B như V1/V2).
 * V3: truyền `avatarId` (id trong AVATARS ở types.ts) để hiện avatar tài khoản đã chọn —
 * "svg-a"/"svg-b" dùng lại SVG gốc, các id còn lại là emoji chibi trong vòng tròn pastel.
 */
export default function ChibiAvatar({ variant = "A", size = 56, avatarId }: { variant?: "A" | "B"; size?: number; avatarId?: string }) {
  if (avatarId && avatarId !== "svg-a" && avatarId !== "svg-b") {
    const opt = avatarById(avatarId);
    return (
      <span
        className="animate-float drop-shadow-sm inline-grid place-items-center rounded-full shrink-0"
        style={{ width: size, height: size, background: opt.bg, fontSize: Math.round(size * 0.55) }}
        aria-label={`avatar ${opt.label}`}
        role="img"
      >
        {opt.emoji}
      </span>
    );
  }
  const v = avatarId === "svg-b" ? "B" : avatarId === "svg-a" ? "A" : variant;
  const skin = "#ffe0bd"; const hair = v === "A" ? "#fb7aa0" : "#7aa5fb"; const cheek = "#ffb3c6";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="animate-float drop-shadow-sm shrink-0" aria-label="avatar chibi">
      <circle cx="50" cy="50" r="46" fill={v === "A" ? "#ffe4ec" : "#dbeafe"} />
      <circle cx="50" cy="55" r="30" fill={skin} />
      <path d="M20 52 Q22 18 50 16 Q78 18 80 52 Q66 34 50 36 Q34 34 20 52Z" fill={hair} />
      {v === "A" && <><circle cx="76" cy="28" r="8" fill="#f45383" /><circle cx="76" cy="28" r="3" fill="#fff" /></>}
      {v === "B" && <path d="M50 8 L54 18 L64 18 L56 24 L59 34 L50 27 L41 34 L44 24 L36 18 L46 18Z" fill="#fbbf24" />}
      <circle cx="40" cy="56" r="3.5" fill="#333" /><circle cx="60" cy="56" r="3.5" fill="#333" />
      <circle cx="41" cy="55" r="1.2" fill="#fff" /><circle cx="61" cy="55" r="1.2" fill="#fff" />
      <circle cx="32" cy="64" r="5" fill={cheek} opacity="0.8" /><circle cx="68" cy="64" r="5" fill={cheek} opacity="0.8" />
      <path d="M44 66 Q50 71 56 66" stroke="#e11d63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

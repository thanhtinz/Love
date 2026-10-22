import { avatarById } from "@/lib/types";

/**
 * Avatar chibi — 100% SVG tự vẽ (V4: bỏ hẳn nhánh emoji cũ).
 * "svg-a"/"svg-b": nhân vật chibi gốc. Các id còn lại: mặt thú chibi vẽ bằng SVG theo từng loài.
 */
const EYE = "#33323e";

function AnimalFace({ id }: { id: string }) {
  const eyes = (<><circle cx={38} cy={56} r={3.6} fill={EYE} /><circle cx={62} cy={56} r={3.6} fill={EYE} /><circle cx={39.2} cy={54.8} r={1.2} fill="#fff" /><circle cx={63.2} cy={54.8} r={1.2} fill="#fff" /></>);
  const cheeks = (<><circle cx={28} cy={66} r={5.4} fill="#ffb3c6" opacity={0.85} /><circle cx={72} cy={66} r={5.4} fill="#ffb3c6" opacity={0.85} /></>);
  const mouth = <path d="M45 67 Q50 71.5 55 67" stroke="#b4536e" strokeWidth={2.4} fill="none" strokeLinecap="round" />;
  switch (id) {
    case "bunny": return (<>
      <ellipse cx={36} cy={20} rx={8} ry={17} fill="#fff" stroke="#e7c8d8" strokeWidth={2} /><ellipse cx={36} cy={23} rx={4} ry={11} fill="#fda4bc" />
      <ellipse cx={64} cy={20} rx={8} ry={17} fill="#fff" stroke="#e7c8d8" strokeWidth={2} /><ellipse cx={64} cy={23} rx={4} ry={11} fill="#fda4bc" />
      <circle cx={50} cy={60} r={31} fill="#fff" stroke="#e7c8d8" strokeWidth={2} />{eyes}{cheeks}
      <path d="M47 64 Q50 66.5 53 64" stroke="#e0608a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </>);
    case "bear": return (<>
      <circle cx={26} cy={32} r={10} fill="#b07a45" /><circle cx={26} cy={32} r={5} fill="#e8c39a" />
      <circle cx={74} cy={32} r={10} fill="#b07a45" /><circle cx={74} cy={32} r={5} fill="#e8c39a" />
      <circle cx={50} cy={58} r={32} fill="#c98d54" />{eyes}
      <ellipse cx={50} cy={67} rx={10} ry={7.5} fill="#f3ddba" /><ellipse cx={50} cy={64} rx={4} ry={2.8} fill="#5b3a21" />{mouth}
    </>);
    case "cat": return (<>
      <path d="M24 40 L22 18 L42 28 Z" fill="#f5a54a" /><path d="M76 40 L78 18 L58 28 Z" fill="#f5a54a" />
      <path d="M27 36 L26 24 L38 29 Z" fill="#fda4bc" /><path d="M73 36 L74 24 L62 29 Z" fill="#fda4bc" />
      <circle cx={50} cy={58} r={32} fill="#f7b267" />{eyes}{cheeks}
      <path d="M47.5 63.5 Q50 65.5 52.5 63.5" stroke="#b4536e" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M14 58h10M15 66l9-2M86 58H76M85 66l-9-2" stroke="#d98a4a" strokeWidth={2} strokeLinecap="round" />
    </>);
    case "dog": return (<>
      <ellipse cx={20} cy={52} rx={9} ry={17} fill="#a06a35" transform="rotate(14 20 52)" />
      <ellipse cx={80} cy={52} rx={9} ry={17} fill="#a06a35" transform="rotate(-14 80 52)" />
      <circle cx={50} cy={56} r={32} fill="#eec27f" />{eyes}
      <ellipse cx={50} cy={66} rx={10.5} ry={8} fill="#fdf3e0" /><ellipse cx={50} cy={63} rx={4.4} ry={3.2} fill="#4a3121" /><path d="M50 66v3M50 69q-3 3-6 1.6M50 69q3 3 6 1.6" stroke="#4a3121" strokeWidth={2} fill="none" strokeLinecap="round" />
    </>);
    case "fox": return (<>
      <path d="M22 42 L16 12 L44 26 Z" fill="#f0742c" /><path d="M78 42 L84 12 L56 26 Z" fill="#f0742c" />
      <path d="M26 36 L22 20 L40 27 Z" fill="#5b3a21" /><path d="M74 36 L78 20 L60 27 Z" fill="#5b3a21" />
      <circle cx={50} cy={58} r={32} fill="#f58a3c" />
      <path d="M24 66 Q50 92 76 66 Q74 84 50 86 Q26 84 24 66z" fill="#fff" opacity={0.92} />{eyes}{cheeks}
      <ellipse cx={50} cy={64} rx={4.2} ry={3} fill="#4a3121" />{mouth}
    </>);
    case "panda": return (<>
      <circle cx={25} cy={33} r={11} fill="#3f3f46" /><circle cx={75} cy={33} r={11} fill="#3f3f46" />
      <circle cx={50} cy={58} r={32} fill="#fff" stroke="#e4e4e7" strokeWidth={2} />
      <ellipse cx={37} cy={55} rx={7} ry={9} fill="#3f3f46" transform="rotate(-14 37 55)" /><ellipse cx={63} cy={55} rx={7} ry={9} fill="#3f3f46" transform="rotate(14 63 55)" />
      <circle cx={38} cy={54} r={3} fill="#fff" /><circle cx={62} cy={54} r={3} fill="#fff" />
      <ellipse cx={50} cy={64} rx={3.6} ry={2.6} fill="#3f3f46" />{mouth}{cheeks}
    </>);
    case "frog": return (<>
      <circle cx={31} cy={32} r={10} fill="#57cc6f" stroke="#34a853" strokeWidth={2} /><circle cx={69} cy={32} r={10} fill="#57cc6f" stroke="#34a853" strokeWidth={2} />
      <circle cx={31} cy={33} r={4.6} fill="#fff" /><circle cx={69} cy={33} r={4.6} fill="#fff" /><circle cx={31} cy={34} r={2.4} fill={EYE} /><circle cx={69} cy={34} r={2.4} fill={EYE} />
      <ellipse cx={50} cy={62} rx={34} ry={27} fill="#6fdc85" stroke="#34a853" strokeWidth={2} />{cheeks}
      <path d="M36 64 Q50 74 64 64" stroke="#20703a" strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </>);
    case "pig": return (<>
      <circle cx={26} cy={34} r={9} fill="#f79ec4" /><circle cx={74} cy={34} r={9} fill="#f79ec4" />
      <circle cx={50} cy={58} r={32} fill="#fbc2da" />{eyes}{cheeks}
      <ellipse cx={50} cy={65} rx={9} ry={6.8} fill="#f78fb8" stroke="#e0608a" strokeWidth={1.8} /><circle cx={46.8} cy={65} r={1.7} fill="#b93a68" /><circle cx={53.2} cy={65} r={1.7} fill="#b93a68" />
    </>);
    case "chick": return (<>
      <path d="M44 24 Q46 14 52 12 Q50 20 54 22 Q46 26 44 24z" fill="#f59e0b" />
      <circle cx={50} cy={58} r={32} fill="#fde047" stroke="#facc15" strokeWidth={2} />{eyes}{cheeks}
      <path d="M43 63 L57 63 L50 71 Z" fill="#fb923c" stroke="#ea580c" strokeWidth={1.6} strokeLinejoin="round" />
    </>);
    case "koala": return (<>
      <circle cx={20} cy={44} r={13} fill="#b9c2cc" /><circle cx={20} cy={44} r={8} fill="#e8edf2" />
      <circle cx={80} cy={44} r={13} fill="#b9c2cc" /><circle cx={80} cy={44} r={8} fill="#e8edf2" />
      <circle cx={50} cy={58} r={31} fill="#ccd6df" />{eyes}{cheeks}
      <ellipse cx={50} cy={63} rx={6.4} ry={8.4} fill="#5b6b7a" />{mouth}
    </>);
    default: return (<><circle cx={50} cy={56} r={32} fill="#ffe4ec" />{eyes}{cheeks}{mouth}</>);
  }
}

export default function ChibiAvatar({ variant = "A", size = 56, avatarId }: { variant?: "A" | "B"; size?: number; avatarId?: string }) {
  if (avatarId && avatarId !== "svg-a" && avatarId !== "svg-b") {
    const opt = avatarById(avatarId);
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="animate-float drop-shadow-sm shrink-0" role="img" aria-label={`avatar ${opt.label}`}>
        <circle cx={50} cy={52} r={47} fill={opt.bg} />
        <AnimalFace id={avatarId} />
      </svg>
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

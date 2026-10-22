/** Artwork dùng chung cho các route icon PWA (next/og ImageResponse -> PNG). Vẽ bằng div + SVG, không file binary. */
export default function IconArtwork({ size }: { size: number }) {
  const inner = Math.round(size * 0.74);
  return (
    <div
      style={{
        width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #ffe0ea 0%, #ffb3cd 55%, #f98fb8 100%)",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 100 100">
        <path d="M50 60c-10.5-7-16.4-12.4-16.4-18.1 0-4.7 3.5-8.4 8.1-8.4 3.2 0 6.2 1.9 8.3 4.8 2.1-2.9 5.1-4.8 8.3-4.8 4.6 0 8.1 3.7 8.1 8.4C66.4 47.6 60.5 53 50 60z" fill="#e11d48" />
        <path d="M50 86V66" stroke="#059669" strokeWidth={5} strokeLinecap="round" />
        <path d="M50 76c-.9-8.6-6.6-13.2-17-13.7C33.9 71.2 39.8 77 50 76z" fill="#34d399" />
        <path d="M50 72c.6-7.7 5.7-11.9 14.8-12.3C64.2 68.6 59 73.7 50 72z" fill="#6ee7b7" />
        <circle cx="24" cy="22" r="4.4" fill="#f9a8d4" />
        <circle cx="76" cy="18" r="3.4" fill="#fda4bc" />
        <path d="M86 30l1.4 3.8 3.8 1.4-3.8 1.4L86 40.4l-1.4-3.8-3.8-1.4 3.8-1.4z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

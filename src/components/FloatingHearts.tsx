"use client";
export interface Burst { id: number; emoji: string; x: number; }
export default function FloatingHearts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bursts.map((b) => (
        <span key={b.id} className="absolute bottom-16 animate-rise text-3xl" style={{ left: `${b.x}%` }}>{b.emoji}</span>
      ))}
    </div>
  );
}

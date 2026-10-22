"use client";
import { Icon, type IconName } from "./Icon";

export interface Burst { id: number; icon: IconName; x: number; color?: string }
export default function FloatingHearts({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bursts.map((b) => (
        <span key={b.id} className="absolute bottom-16 animate-rise" style={{ left: `${b.x}%`, color: b.color || "#f43f5e" }}>
          <Icon name={b.icon} className="w-8 h-8" />
        </span>
      ))}
    </div>
  );
}

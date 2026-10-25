import React, { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, ROLE } from "./theme";

/**
 * MƯA TIM / CÁNH HOA (đợt "chất app" 1) — lớp khoảnh khắc dùng chung:
 * - mode "hearts": ~12 trái tim hồng bay lên + mờ dần + lượn nhẹ (~900ms) —
 *   dùng khi GỬI nhịp nhớ (Trang Nhà + sheet hành động nhanh).
 * - mode "petals": ~12 cánh hoa/lá rơi xuống + xoay nhẹ quanh cây — dùng khi
 *   CHĂM CÂY thành công, đi cùng cú "nhún vui" của cây ở tab Cây.
 * Cách dùng: đặt <HeartBurst burstKey={n} /> phủ lên vùng muốn ăn mừng (cha
 * position relative / overflow tùy ý), tăng n mỗi lần muốn bắn một đợt. Lớp này
 * pointerEvents="none" — không bao giờ chặn chạm. Hạt sinh bằng rand có seed
 * theo burstKey nên bố cục mỗi đợt ổn định, không nhảy hình giữa chừng.
 */
type Mode = "hearts" | "petals";

interface Spec {
  dx: number; // lệch ngang xuất phát so với tâm (px)
  sway: number; // biên độ lượn giữa hành trình
  drift: number; // lệch ngang cuối hành trình
  dist: number; // quãng bay lên (hearts) / rơi xuống (petals)
  size: number;
  delay: number;
  dur: number;
  rot: number; // độ xoay cuối (deg)
  icon: "heart" | "flower" | "leaf";
  color: string;
}

/** Rand xác định theo seed (mulberry32) — cùng burstKey luôn ra cùng bố cục. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEART_COLORS = [COLOR.primary, ROLE.self, ROLE.selfDark];
const COUNT = 12;

function makeSpecs(burstKey: number, mode: Mode): Spec[] {
  const rand = mulberry32(burstKey * 7919 + (mode === "petals" ? 131 : 17));
  return Array.from({ length: COUNT }, (_, i) => {
    if (mode === "hearts") {
      return {
        dx: (rand() - 0.5) * 150,
        sway: (rand() - 0.5) * 36,
        drift: (rand() - 0.5) * 90,
        dist: 95 + rand() * 85,
        size: 12 + rand() * 12,
        delay: rand() * 140,
        dur: 780 + rand() * 260,
        rot: (rand() - 0.5) * 36,
        icon: "heart" as const,
        color: HEART_COLORS[i % HEART_COLORS.length],
      };
    }
    const leaf = i % 3 === 2;
    return {
      dx: (rand() - 0.5) * 220,
      sway: (rand() - 0.5) * 44,
      drift: (rand() - 0.5) * 70,
      dist: 120 + rand() * 80,
      size: 11 + rand() * 8,
      delay: rand() * 160,
      dur: 900 + rand() * 300,
      rot: (rand() - 0.5) * 110,
      icon: leaf ? ("leaf" as const) : ("flower" as const),
      color: leaf ? ROLE.partner : i % 2 ? ROLE.self : COLOR.primary,
    };
  });
}

function Particle({ spec, mode }: { spec: Spec; mode: Mode }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: spec.dur, delay: spec.delay, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rise = mode === "hearts" ? -spec.dist : spec.dist;
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: "50%",
        ...(mode === "hearts" ? { bottom: 4 } : { top: 4 }),
        marginLeft: -spec.size / 2,
        opacity: p.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [spec.dx, spec.dx + spec.sway, spec.dx + spec.drift] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, rise] }) },
          { scale: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.9] }) },
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spec.rot}deg`] }) },
        ],
      }}
    >
      <Ionicons name={spec.icon} size={spec.size} color={spec.color} />
    </Animated.View>
  );
}

function BurstLayer({ burstKey, mode, onDone }: { burstKey: number; mode: Mode; onDone: () => void }) {
  const [specs] = useState(() => makeSpecs(burstKey, mode));
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {specs.map((sp, i) => (
        <Particle key={i} spec={sp} mode={mode} />
      ))}
    </>
  );
}

export function HeartBurst({ burstKey, mode = "hearts" }: { burstKey: number; mode?: Mode }) {
  const [layers, setLayers] = useState<number[]>([]);
  const seenRef = useRef(0);
  useEffect(() => {
    if (burstKey > 0 && burstKey !== seenRef.current) {
      seenRef.current = burstKey;
      setLayers((ls) => [...ls.slice(-2), burstKey]);
    }
  }, [burstKey]);
  if (layers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 }}>
      {layers.map((k) => (
        <BurstLayer key={k} burstKey={k} mode={mode} onDone={() => setLayers((ls) => ls.filter((x) => x !== k))} />
      ))}
    </View>
  );
}

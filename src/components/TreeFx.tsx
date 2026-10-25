import React, { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hashString } from "../lib/content";
import { COLOR } from "./theme";

/**
 * VFX RIÊNG CHO TỪNG HÀNH ĐỘNG CHĂM CÂY + SÂU HIỆN HÌNH (đợt "chăm cây 2").
 * Tất cả đều là lớp phủ pointerEvents="none" trên khung cảnh cây (cha position
 * relative, overflow hidden) — không bao giờ chặn chạm vào cây/nút:
 * - BugSprite / PestOverlay: sâu VẼ bằng View thuần (bảng màu ấm của app —
 *   TUYỆT ĐỐI không dùng emoji), 6 con đậu trên tán lá + ngọ nguậy nhẹ trong
 *   lúc đợt sâu đang sống. Vị trí xác định theo seed = id của sự kiện sâu.
 * - BugScatter: bắn khi BẮT SÂU thành công — đàn sâu văng ra khỏi tán + lấp
 *   lánh, rồi biến mất (sự kiện sâu đã kết thúc ở state).
 * - SunGlow: PHƠI NẮNG — quầng vàng ấm phủ cảnh, nhịp sáng ~1.5 giây.
 * - PotSplash: TƯỚI NƯỚC — vòng sóng nước lan ở chân chậu, đi cùng mưa giọt
 *   (HeartBurst mode "droplets").
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= CON SÂU VẼ BẰNG VIEW ================= */
/**
 * Một con sâu nhỏ vẽ thuần bằng View: thân bầu nâu/olive + đầu đậm + 3 cặp
 * chân mảnh + một đốm sáng trên lưng. Ở cỡ hiển thị ~14–20px trên tán lá,
 * hình khối đơn giản này đọc rõ là "con bọ" mà vẫn hợp bảng màu tranh vẽ.
 */
export function BugSprite({ size = 18, tone = 0 }: { size?: number; tone?: number }) {
  const body = tone % 2 ? "#7A4A21" : "#5E7A2E";
  const dark = tone % 2 ? "#4A2C0E" : "#3A5220";
  const legH = Math.max(2, Math.round(size * 0.1));
  const legs = [0.3, 0.52, 0.74];
  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      {legs.map((topPct, i) => (
        <View key={`l${i}`} style={{ position: "absolute", left: -size * 0.08, top: size * topPct, width: size * 0.3, height: legH, borderRadius: legH, backgroundColor: dark, transform: [{ rotate: `${-35 + i * 35}deg` }] }} />
      ))}
      {legs.map((topPct, i) => (
        <View key={`r${i}`} style={{ position: "absolute", right: -size * 0.08, top: size * topPct, width: size * 0.3, height: legH, borderRadius: legH, backgroundColor: dark, transform: [{ rotate: `${35 - i * 35}deg` }] }} />
      ))}
      {/* thân */}
      <View style={{ position: "absolute", left: size * 0.18, top: size * 0.3, width: size * 0.64, height: size * 0.46, borderRadius: size * 0.3, backgroundColor: body }} />
      {/* đốm lưng */}
      <View style={{ position: "absolute", left: size * 0.3, top: size * 0.4, width: size * 0.2, height: size * 0.14, borderRadius: size * 0.1, backgroundColor: "rgba(255,255,255,0.35)" }} />
      {/* đầu */}
      <View style={{ position: "absolute", left: size * 0.37, top: size * 0.1, width: size * 0.27, height: size * 0.27, borderRadius: size * 0.14, backgroundColor: dark }} />
    </View>
  );
}

interface BugSpot { leftPct: number; topPct: number; size: number; tone: number; phase: number }

/** Vị trí sâu trên tán: xác định theo id sự kiện — 2 máy thấy cùng một đàn. */
function bugSpots(seedKey: string, count = 6): BugSpot[] {
  const rand = mulberry32(hashString(seedKey));
  return Array.from({ length: count }, (_, i) => ({
    leftPct: 13 + rand() * 70,
    topPct: 7 + rand() * 36,
    size: 14 + rand() * 7,
    tone: i,
    phase: Math.floor(rand() * 500),
  }));
}

function WiggleBug({ spot }: { spot: BugSpot }) {
  const [w] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(w, { toValue: 1, duration: 460 + spot.phase, useNativeDriver: true }),
        Animated.timing(w, { toValue: 0, duration: 460 + spot.phase, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${spot.leftPct}%`,
        top: `${spot.topPct}%`,
        transform: [
          { rotate: w.interpolate({ inputRange: [0, 1], outputRange: ["-7deg", "7deg"] }) },
          { translateY: w.interpolate({ inputRange: [0, 1], outputRange: [0, 1.6] }) },
        ],
      }}
    >
      <BugSprite size={spot.size} tone={spot.tone} />
    </Animated.View>
  );
}

/** Đàn sâu HIỆN HÌNH trên tán lá trong lúc đợt sâu đang sống (pestId null = ẩn). */
export function PestOverlay({ pestId }: { pestId: string | null }) {
  if (!pestId) return null;
  const spots = bugSpots(pestId);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 24 }}>
      {spots.map((spot, i) => (
        <WiggleBug key={i} spot={spot} />
      ))}
    </View>
  );
}

/* ================= BẮT SÂU: ĐÀN SÂU VĂNG RA ================= */
interface ScatterSpec { spot: BugSpot; dx: number; dy: number; rot: number }
interface SparkSpec { leftPct: number; topPct: number; dx: number; dy: number; size: number }

function ScatterBug({ spec }: { spec: ScatterSpec }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: 780, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${spec.spot.leftPct}%`,
        top: `${spec.spot.topPct}%`,
        opacity: p.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spec.rot}deg`] }) },
        ],
      }}
    >
      <BugSprite size={spec.spot.size} tone={spec.spot.tone} />
    </Animated.View>
  );
}

function ScatterSpark({ spec }: { spec: SparkSpec }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: 700, delay: 90, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${spec.leftPct}%`,
        top: `${spec.topPct}%`,
        opacity: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) },
        ],
      }}
    >
      <Ionicons name="sparkles" size={spec.size} color={COLOR.warning} />
    </Animated.View>
  );
}

function ScatterLayer({ burstKey, pestId, onDone }: { burstKey: number; pestId: string; onDone: () => void }) {
  const [bugs] = useState<ScatterSpec[]>(() => {
    const rand = mulberry32(burstKey * 331 + 7);
    return bugSpots(pestId).map((spot) => ({
      spot,
      dx: (rand() - 0.5) * 240,
      dy: -30 - rand() * 110,
      rot: (rand() - 0.5) * 260,
    }));
  });
  const [sparks] = useState<SparkSpec[]>(() => {
    const rand = mulberry32(burstKey * 977 + 3);
    return Array.from({ length: 5 }, () => ({
      leftPct: 22 + rand() * 56,
      topPct: 10 + rand() * 26,
      dx: (rand() - 0.5) * 130,
      dy: -20 - rand() * 70,
      size: 11 + rand() * 8,
    }));
  });
  useEffect(() => {
    const t = setTimeout(onDone, 950);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {bugs.map((spec, i) => (
        <ScatterBug key={`b${i}`} spec={spec} />
      ))}
      {sparks.map((spec, i) => (
        <ScatterSpark key={`s${i}`} spec={spec} />
      ))}
    </>
  );
}

/** Bắn 1 đợt khi burstKey tăng: đàn sâu (theo vị trí của chính đợt sâu đó) văng khỏi tán. */
export function BugScatter({ burstKey, pestId }: { burstKey: number; pestId: string }) {
  const [layers, setLayers] = useState<number[]>([]);
  const seenRef = useRef(0);
  useEffect(() => {
    if (burstKey > 0 && burstKey !== seenRef.current) {
      seenRef.current = burstKey;
      setLayers((ls) => [...ls.slice(-1), burstKey]);
    }
  }, [burstKey]);
  if (layers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 32 }}>
      {layers.map((k) => (
        <ScatterLayer key={k} burstKey={k} pestId={pestId} onDone={() => setLayers((ls) => ls.filter((x) => x !== k))} />
      ))}
    </View>
  );
}

/* ================= PHƠI NẮNG: QUẦNG VÀNG ẤM ================= */
function GlowLayer({ onDone }: { onDone: () => void }) {
  const [o] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.45, duration: 380, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0.85, duration: 320, useNativeDriver: true }),
      Animated.timing(o, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]);
    anim.start();
    const t = setTimeout(onDone, 1650);
    return () => { anim.stop(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: o }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,183,50,0.16)" }} />
      <View style={{ position: "absolute", left: "50%", top: "26%", marginLeft: -130, marginTop: -130, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,205,80,0.30)" }} />
    </Animated.View>
  );
}

/** Quầng nắng vàng nhịp sáng mỗi khi glowKey tăng (~1.5s rồi tắt). */
export function SunGlow({ glowKey }: { glowKey: number }) {
  const [layers, setLayers] = useState<number[]>([]);
  const seenRef = useRef(0);
  useEffect(() => {
    if (glowKey > 0 && glowKey !== seenRef.current) {
      seenRef.current = glowKey;
      setLayers((ls) => [...ls.slice(-1), glowKey]);
    }
  }, [glowKey]);
  if (layers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 26 }}>
      {layers.map((k) => (
        <GlowLayer key={k} onDone={() => setLayers((ls) => ls.filter((x) => x !== k))} />
      ))}
    </View>
  );
}

/* ================= HÀO QUANG VÀNG — THƯỞNG NHIỆM VỤ NGÀY ================= */
/**
 * Cây tỏa hào quang vàng MỀM đến hết ngày sau khi hoàn thành đủ 3 nhiệm vụ
 * (UI suy ra từ dailyQuests.allCompletedAt của hôm nay — không có state phụ):
 * lớp vàng nhịp sáng chậm (cùng họ với quầng phơi nắng nhưng dịu và kéo dài)
 * + 4 tia lấp lánh ở các góc tán. pointerEvents="none" như mọi VFX khác.
 */
export function GoldenAura() {
  const [o] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.55, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sparks: { left: string; top: string; size: number }[] = [
    { left: "16%", top: "10%", size: 15 },
    { left: "78%", top: "7%", size: 12 },
    { left: "86%", top: "30%", size: 14 },
    { left: "8%", top: "34%", size: 11 },
  ];
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 23, opacity: o }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,190,60,0.10)" }} />
      <View style={{ position: "absolute", left: "50%", top: "24%", marginLeft: -120, marginTop: -120, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,205,80,0.16)" }} />
      {sparks.map((sp, i) => (
        <View key={i} style={{ position: "absolute", left: sp.left as never, top: sp.top as never }}>
          <Ionicons name="sparkles" size={sp.size} color={COLOR.warning} />
        </View>
      ))}
    </Animated.View>
  );
}

/* ================= TƯỚI NƯỚC: SÓNG NƯỚC Ở CHÂN CHẬU ================= */
function SplashRing({ delay, wide }: { delay: number; wide: number }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: 620, delay, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: "50%",
        bottom: 20,
        marginLeft: -wide / 2,
        width: wide,
        height: wide * 0.26,
        borderRadius: wide / 2,
        borderWidth: 2,
        borderColor: "rgba(74,163,216,0.75)",
        backgroundColor: "rgba(127,196,232,0.18)",
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.25] }) }],
      }}
    />
  );
}

function SplashLayer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 950);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <SplashRing delay={0} wide={120} />
      <SplashRing delay={170} wide={170} />
    </>
  );
}

/** Sóng nước lan ở chân chậu mỗi khi splashKey tăng (đi cùng mưa giọt tưới). */
export function PotSplash({ splashKey }: { splashKey: number }) {
  const [layers, setLayers] = useState<number[]>([]);
  const seenRef = useRef(0);
  useEffect(() => {
    if (splashKey > 0 && splashKey !== seenRef.current) {
      seenRef.current = splashKey;
      setLayers((ls) => [...ls.slice(-1), splashKey]);
    }
  }, [splashKey]);
  if (layers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 25 }}>
      {layers.map((k) => (
        <SplashLayer key={k} onDone={() => setLayers((ls) => ls.filter((x) => x !== k))} />
      ))}
    </View>
  );
}

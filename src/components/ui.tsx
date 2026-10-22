import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "./theme";

/**
 * Bộ màu tương thích ngược cho các màn hình cũ — mọi token đều trỏ về theme mới
 * (src/components/theme.ts): hồng đào = Bạn, xanh mint = Người ấy, navy = Chúng mình.
 * Màn hình mới nên import thẳng từ theme.ts.
 */
export const C = {
  bg: COLOR.bg,
  card: COLOR.card,
  pink: COLOR.primary,
  pinkDark: ROLE.selfDark,
  pinkSoft: ROLE.selfSoft,
  pinkBorder: COLOR.border,
  amber: COLOR.warning,
  sky: ROLE.partner,
  green: COLOR.success,
  violet: "#8B5CF6",
  text: COLOR.text,
  textSoft: COLOR.textSoft,
  textFaint: COLOR.textFaint,
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.bg },
  scroll: { padding: SPACE.screenX, paddingBottom: 32, gap: SPACE.cardGap },
  card: { backgroundColor: COLOR.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, padding: SPACE.lg },
  title: { ...TYPE.title, color: COLOR.text },
  cardTitle: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 21, color: COLOR.text },
  body: { ...TYPE.body, color: COLOR.text },
  sub: { ...TYPE.caption, color: COLOR.textSoft },
  small: { fontFamily: FONT.medium, fontSize: 12, lineHeight: 16, color: COLOR.textFaint },
  row: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  btn: { backgroundColor: COLOR.primary, borderRadius: RADIUS.pill, minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnText: { color: "#fff", fontFamily: FONT.semibold, fontSize: 15 },
  btnGhost: { backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnGhostText: { color: ROLE.selfDark, fontFamily: FONT.semibold, fontSize: 13.5 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.regular, fontSize: 15.5, color: COLOR.text },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, minHeight: 28 },
  chipText: { ...TYPE.captionStrong, color: ROLE.selfDark },
});

export function SectionTitle({ icon, children, color = COLOR.primary }: { icon: string; children: React.ReactNode; color?: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as never} size={20} color={color} />
      <Text style={s.title}>{children}</Text>
    </View>
  );
}

export function StatBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={s.row}>
          <Ionicons name={icon as never} size={15} color={color} />
          <Text style={{ ...TYPE.captionStrong, color: COLOR.text }}>{label}</Text>
        </View>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color }}>{Math.round(value)}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 99, backgroundColor: COLOR.track, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: value < 20 ? COLOR.danger : color, borderRadius: 99 }} />
      </View>
    </View>
  );
}

/** Thanh tiến trình DUY NHẤT cho một mục tiêu (quy tắc Finch: one clear bar). */
export function ProgressBar({ value, color = COLOR.primary, height = 10 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: COLOR.track, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

/** Đồng hồ tick cho các màn hình cần đếm ngược/cooldown theo thời gian thật. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

/** Header chuẩn cho màn hình con (stack): nút quay lại (kèm nhãn) + tiêu đề tiếng Việt. */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 44, paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.sm }}>
      <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Quay lại" accessibilityRole="button">
        <Ionicons name="chevron-back" size={22} color={ROLE.selfDark} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** Hàng điều hướng tính năng — dùng ở các màn hình hub (chỉ điều hướng, không chứa chức năng). */
export function FeatureCard({ icon, title, desc, color = COLOR.primary, bg = ROLE.selfSoft, route, badge }: { icon: string; title: string; desc: string; color?: string; bg?: string; route: string; badge?: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, padding: 14, minHeight: 68 }}>
      <View style={{ width: 46, height: 46, borderRadius: RADIUS.inner, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as never} size={23} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }}>{title}</Text>
        <Text style={s.sub}>{desc}</Text>
      </View>
      {badge ? (
        <View style={{ backgroundColor: COLOR.primary, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: "#fff", fontSize: 10.5, fontFamily: FONT.bold }}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={COLOR.textFaint} />
    </TouchableOpacity>
  );
}

/** Ô lối tắt nhỏ cho lưới khám phá ở Trang chủ — luôn có icon + NHÃN chữ (không icon-only). */
export function FeatureTile({ icon, title, color = COLOR.primary, bg = ROLE.selfSoft, route, badge }: { icon: string; title: string; color?: string; bg?: string; route: string; badge?: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center", gap: 8, minHeight: 84 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as never} size={22} color={color} />
      </View>
      <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.text, textAlign: "center" }}>{title}</Text>
      {badge ? (
        <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: COLOR.primary, borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontFamily: FONT.bold }}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function IconBtn({ icon, label, color, bg, onPress, disabled }: { icon: string; label: string; color: string; bg: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ flex: 1, backgroundColor: bg, borderRadius: RADIUS.button, minHeight: 56, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4, opacity: disabled ? 0.45 : 1 }}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={{ fontSize: 12, fontFamily: FONT.semibold, color }}>{label}</Text>
    </TouchableOpacity>
  );
}

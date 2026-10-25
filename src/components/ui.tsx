import React, { memo, useEffect, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLOR, FONT, RADIUS, ROLE, SHADOW, SPACE, TILE, TYPE } from "./theme";
import type { Rarity } from "../lib/types";

/**
 * Bộ màu tương thích ngược cho các màn hình con — mọi token đều trỏ về theme
 * "Vườn giấy ấm" (src/components/theme.ts): rose = Bạn + CTA chính, mint = Người ấy,
 * navy = Chúng mình. Màn hình mới nên import thẳng từ theme.ts.
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
  violet: ROLE.shared, // tương thích ngược: tím rải rác đã bị loại khỏi hệ — trỏ về navy "Chúng mình"
  text: COLOR.text,
  textSoft: COLOR.textSoft,
  textFaint: COLOR.textFaint,
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.bg },
  scroll: { padding: SPACE.screenX, paddingBottom: 32, gap: SPACE.cardGap },
  // Card chính: trắng, radius 24, viền ấm 1px + bóng E1 — tách khỏi nền giấy bằng CẢ hai.
  card: { backgroundColor: COLOR.card, borderRadius: RADIUS.card, padding: 18, borderWidth: 1, borderColor: COLOR.border, ...SHADOW },
  // Card phụ E0: nền tint, không bóng — dùng cho hàng menu, ô trạng thái.
  cardSoft: { backgroundColor: COLOR.surfaceSoft, borderRadius: RADIUS.card, padding: SPACE.lg, borderWidth: 1, borderColor: COLOR.border },
  title: { ...TYPE.title, color: COLOR.text },
  cardTitle: { ...TYPE.cardTitle, color: COLOR.text },
  body: { ...TYPE.body, color: COLOR.text },
  sub: { ...TYPE.caption, color: COLOR.textSoft },
  small: { fontFamily: FONT.medium, fontSize: 12, lineHeight: 16, color: COLOR.textFaint },
  row: { flexDirection: "row", alignItems: "center", gap: SPACE.sm },
  // Nút primary: cao 52, radius control 18 (không pill), MỖI viewport tối đa 1 nút.
  btn: { backgroundColor: COLOR.primary, borderRadius: RADIUS.control, minHeight: 52, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 16 },
  // Nút secondary: nền trắng, viền lineStrong 1.5, chữ ink.
  btnGhost: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: COLOR.lineStrong, borderRadius: RADIUS.control, minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnGhostText: { color: COLOR.text, fontFamily: FONT.bold, fontSize: 14 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.lineStrong, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.regular, fontSize: 15.5, color: COLOR.text },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 7, minHeight: 34 },
  chipText: { ...TYPE.captionStrong, color: ROLE.selfDark },
});

/* ---------- Đệm đáy cho màn hình TAB (vòng polish 2026-10-23) ----------
 * Thanh tab cao 66 (xem (tabs)/_layout) + safe-area đáy: nội dung cuộn của 3 tab
 * chính phải chừa đúng khoảng này, nếu không cụm cuối màn bị thanh tab che nửa
 * (lỗi "cụm thống kê hub Hai đứa bị che" ở bản audit). Màn Stack không dùng. */
export const TAB_BAR_HEIGHT = 66;
export const tabBarPad = (bottomInset: number, extra = 20) => TAB_BAR_HEIGHT + Math.max(0, bottomInset) + extra;

/* ---------- HỆ CHIP THỐNG NHẤT (vòng polish 2026-10-23) ----------
 * MỘT component chip cho toàn app: cùng khuôn (pill, minHeight 34, padding 11/7),
 * chỉ khác MÀU ĐIỀN theo NGHĨA của trạng thái — không theo người, không theo màn.
 * Cùng một trạng thái ở bất cứ đâu cũng ra đúng một variant:
 * done = đã xong/đã trả lời (xanh lá mềm) · waiting = đang chờ/chưa làm (hổ phách
 * mềm) · accent = điểm nhấn rose (đang dùng, ví chung) · partner = dữ kiện của
 * người ấy (mint) · info = thông tin chung (navy mềm) · neutral = metadata lặng ·
 * price = nút giá (trắng + viền, dùng qua ChipButton). */
export type ChipVariant = "accent" | "done" | "waiting" | "info" | "partner" | "neutral" | "price";
export const CHIP_STYLE: Record<ChipVariant, { bg: string; text: string; border?: string }> = {
  accent: { bg: ROLE.selfSoft, text: ROLE.selfDark },
  done: { bg: COLOR.successSoft, text: COLOR.successText },
  waiting: { bg: COLOR.warningSoft, text: COLOR.warningText },
  info: { bg: ROLE.sharedSoft, text: ROLE.sharedDark },
  partner: { bg: ROLE.partnerSoft, text: ROLE.partnerDark },
  neutral: { bg: COLOR.track, text: COLOR.textSoft },
  price: { bg: "#fff", text: COLOR.text, border: COLOR.lineStrong },
};
const chipBase = { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, borderRadius: RADIUS.pill, paddingHorizontal: 11, paddingVertical: 7, minHeight: 34 };

export function StatusChip({ label, variant = "accent", icon, style }: { label: string; variant?: ChipVariant; icon?: string; style?: object }) {
  const v = CHIP_STYLE[variant];
  return (
    <View style={[chipBase, { backgroundColor: v.bg, flexShrink: 0 }, v.border ? { borderWidth: 1.5, borderColor: v.border } : null, style]}>
      {icon ? <Ionicons name={icon as never} size={13} color={v.text} /> : null}
      <Text style={{ ...TYPE.captionStrong, color: v.text }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Nút bấm mang khuôn chip (giá / "Dùng" / "Đang dùng · gỡ" ở Shop...) — cùng
 * khuôn và padding với StatusChip, chỉ khác variant điền. */
export function ChipButton({ label, variant = "price", icon, onPress, disabled, style }: { label: string; variant?: ChipVariant; icon?: string; onPress: () => void; disabled?: boolean; style?: object }) {
  const v = CHIP_STYLE[variant];
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[chipBase, { backgroundColor: v.bg, flexShrink: 0, justifyContent: "center" }, v.border ? { borderWidth: 1.5, borderColor: v.border } : null, disabled && { opacity: 0.5 }, style]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      {icon ? <Ionicons name={icon as never} size={13} color={v.text} /> : null}
      <Text style={{ ...TYPE.captionStrong, color: v.text }} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Dải kết màn yên tĩnh cho các màn NGẮN (vòng polish 2026-10-23): tranh thật có
 * sẵn + đúng một câu nhẹ, đặt trong khung giấy mềm — màn hình "kết thúc có chủ
 * đích" thay vì hụt hơi giữa chừng. Không chứa dữ kiện giả hay tính năng mới.
 * MICRO-FIX: dải bám theo nội dung với khoảng đệm phía trên GIỚI HẠN (2× section
 * gap, nằm trong chính component này) — các màn KHÔNG được chèn spacer flex:1
 * đẩy dải xuống đáy nữa, vì trên màn cao sẽ thành một khoảng kem trống khổng lồ
 * giữa nội dung và dải.
 */
export function ClosingBand({ art, line }: { art: React.ReactNode; line: string }) {
  return (
    <View style={{ alignItems: "center", gap: 9, backgroundColor: COLOR.surfaceSoft, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 20, paddingHorizontal: 22, marginTop: SPACE.sectionGap * 2 }}>
      {art}
      <Text style={{ ...TYPE.caption, color: COLOR.textSoft, textAlign: "center", lineHeight: 19 }}>{line}</Text>
    </View>
  );
}

/** Tiêu đề section: micro label viết hoa nhẹ + H2 — icon CHỈ khi nó là dữ liệu/trạng thái. */
export function SectionTitle({ icon, children, color = COLOR.primary }: { icon?: string; children: React.ReactNode; color?: string }) {
  return (
    <View style={s.row}>
      {icon ? <Ionicons name={icon as never} size={20} color={color} /> : null}
      <Text style={s.cardTitle}>{children}</Text>
    </View>
  );
}

/** Thanh chỉ số phụ (Vườn): nhãn + % cùng hàng, thanh 8px trên track trung tính.
 *  Đỏ CHỈ khi chỉ số thật sự thấp (<20) — không dùng đỏ cho "chưa đầy". */
export function StatBar({ label, value, color }: { label: string; icon?: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.text }}>{label}</Text>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.textSoft }}>{Math.round(v)}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 99, backgroundColor: COLOR.track, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${v}%`, backgroundColor: v < 20 ? COLOR.danger : color, borderRadius: 99 }} />
      </View>
    </View>
  );
}

/** Thanh tiến trình DUY NHẤT cho một mục tiêu (quy tắc Finch: one clear bar). */
export function ProgressBar({ value, color = COLOR.primary, height = 8 }: { value: number; color?: string; height?: number }) {
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

/**
 * Header chuẩn cho màn hình con (stack): nút back tròn 40px nền soft + tiêu đề H1.
 * `fallback`: nơi về khi KHÔNG còn lịch sử stack (mở trực tiếp/deep link/web refresh) —
 * mặc định tab chính; các màn thuộc hub phải truyền hub của mình (vd /games,
 * /utilities, /(tabs)/couple) để người dùng không bị rơi về Trang chủ.
 */
export function ScreenHeader({ title, subtitle, fallback = "/(tabs)" }: { title: string; subtitle?: string; fallback?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: insets.top + 12, paddingHorizontal: SPACE.screenX, paddingBottom: SPACE.sm }}>
      <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace(fallback as never); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLOR.surfaceSoft, borderWidth: 1, borderColor: COLOR.border, alignItems: "center", justifyContent: "center" }} accessibilityLabel="Quay lại" accessibilityRole="button">
        <Ionicons name="chevron-back" size={21} color={COLOR.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** Vòng medallion tròn cho icon trong hàng/tile — thay ô vuông bo góc cũ.
 *  Mặc định = TILE trung tính (giấy-hồng + ink-rose): chỉ truyền color/bg khi
 *  hàng nói về đúng một người/vai (xem quy tắc ở TILE trong theme.ts). */
export function Medallion({ icon, color = TILE.icon, bg = TILE.bg, size = 48, iconSize }: { icon: string; color?: string; bg?: string; size?: number; iconSize?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Ionicons name={icon as never} size={iconSize ?? Math.round(size * 0.5)} color={color} />
    </View>
  );
}

/** Hàng điều hướng tính năng — dùng ở các hub dạng danh sách (Tiện ích, Khung).
 *  Tile mặc định TRUNG TÍNH (TILE) — không còn mỗi hàng một màu pastel.
 *  Badge trạng thái nằm TRONG cột chữ (dưới mô tả) qua hệ chip thống nhất, khe
 *  trailing chỉ còn chevron — chip không còn chen giữa nhãn và chevron nữa. */
export const FeatureCard = memo(function FeatureCard({ icon, title, desc, color, bg, route, badge, badgeVariant = "accent" }: { icon: string; title: string; desc: string; color?: string; bg?: string; route: string; badge?: string; badgeVariant?: ChipVariant }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 13, paddingHorizontal: 14, minHeight: 68 }}>
      <Medallion icon={icon} color={color} bg={bg} size={46} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{title}</Text>
        <Text style={s.sub}>{desc}</Text>
        {badge ? (
          <View style={{ flexDirection: "row", marginTop: 5 }}>
            <StatusChip label={badge} variant={badgeVariant} />
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLOR.chevron} style={{ flexShrink: 0 }} />
    </TouchableOpacity>
  );
});

/** Ô lối tắt nhỏ dạng tile: medallion + tên + một dòng trạng thái, không chevron. */
export const FeatureTile = memo(function FeatureTile({ icon, title, color, bg, route, badge }: { icon: string; title: string; color?: string; bg?: string; route: string; badge?: string }) {
  return (
    <TouchableOpacity onPress={() => router.push(route as never)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLOR.border, padding: 14, gap: 8, minHeight: 84 }}>
      <Medallion icon={icon} color={color} bg={bg} size={44} />
      <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }}>{title}</Text>
      {badge ? <Text style={s.sub}>{badge}</Text> : null}
    </TouchableOpacity>
  );
});

/**
 * Tem độ hiếm thư — ĐÚNG mockup vòng 2: Thường = navy soft, Hiếm = rose soft,
 * Huyền thoại = navy đặc chữ trắng. Độ hiếm CHỈ là tem nhỏ, không nhuộm cả hàng thư.
 */
export const RARITY_STAMP: Record<Rarity, { bg: string; text: string; label: string }> = {
  common: { bg: ROLE.sharedSoft, text: ROLE.shared, label: "Thường" },
  rare: { bg: ROLE.selfSoft, text: ROLE.selfDark, label: "Hiếm" },
  legendary: { bg: ROLE.shared, text: "#fff", label: "Huyền thoại" },
};

export function Stamp({ rarity }: { rarity: Rarity }) {
  const st = RARITY_STAMP[rarity];
  return (
    <View style={{ backgroundColor: st.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, fontFamily: FONT.extrabold, color: st.text, lineHeight: 13 }}>{st.label}</Text>
    </View>
  );
}

/**
 * Segmented control trong 1 màn hình: track trung tính, mục chọn trắng + bóng E1.
 * (Tab Thư KHÔNG còn dùng segmented — giữ cho Nhiệm vụ/Gợi ý hẹn hò.)
 */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: COLOR.track, borderRadius: RADIUS.pill, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <TouchableOpacity key={o.id} onPress={() => onChange(o.id)} style={{ flex: 1, minHeight: 44, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center", backgroundColor: on ? "#fff" : "transparent", paddingHorizontal: 8, ...(on ? SHADOW : null) }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: on ? COLOR.text : COLOR.textSoft }} numberOfLines={1}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Khối skeleton nhấp nháy nhẹ trong lúc chờ dữ liệu — thay màn hình trắng trơn. */
export function SkeletonCard({ height = 92, radius = RADIUS.card }: { height?: number; radius?: number }) {
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ height, borderRadius: radius, backgroundColor: "#F6E8E2", opacity: pulse }} />;
}

/** Nút "Tải thêm" dùng cho các danh sách dài (hiện từng đợt ~10 mục). */
export function LoadMoreRow({ onPress, label = "Tải thêm" }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.pill, paddingHorizontal: 16, minHeight: 44, paddingVertical: 8 }}>
      <Ionicons name="chevron-down" size={15} color={ROLE.selfDark} />
      <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: ROLE.selfDark }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function IconBtn({ icon, label, color, bg, onPress, disabled, dimmed }: { icon: string; label: string; color: string; bg: string; onPress: () => void; disabled?: boolean; dimmed?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ flex: 1, backgroundColor: bg, borderRadius: RADIUS.control, minHeight: 56, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4, opacity: disabled || dimmed ? 0.45 : 1 }}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={{ fontSize: 12, fontFamily: FONT.semibold, color }}>{label}</Text>
    </TouchableOpacity>
  );
}

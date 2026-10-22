import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const C = {
  bg: "#fff7f8",
  card: "#ffffff",
  pink: "#f43f5e",
  pinkDark: "#be123c",
  pinkSoft: "#ffe4ec",
  pinkBorder: "#fbcfe8",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  green: "#22c55e",
  violet: "#8b5cf6",
  text: "#334155",
  textSoft: "#64748b",
  textFaint: "#94a3b8",
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 14 },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  sub: { fontSize: 12.5, color: C.textSoft, lineHeight: 18 },
  small: { fontSize: 11.5, color: C.textFaint },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { backgroundColor: C.pink, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14.5 },
  btnGhost: { backgroundColor: C.pinkSoft, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  btnGhostText: { color: C.pinkDark, fontWeight: "700", fontSize: 13.5 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: C.pinkBorder, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.text },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.pinkSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: C.pinkDark, fontWeight: "800", fontSize: 12 },
});

export function SectionTitle({ icon, children, color = C.pink }: { icon: string; children: React.ReactNode; color?: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as never} size={19} color={color} />
      <Text style={s.title}>{children}</Text>
    </View>
  );
}

export function StatBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={s.row}>
          <Ionicons name={icon as never} size={14} color={color} />
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color }}>{Math.round(value)}%</Text>
      </View>
      <View style={{ height: 9, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: value < 20 ? "#ef4444" : color, borderRadius: 99 }} />
      </View>
    </View>
  );
}

export function IconBtn({ icon, label, color, bg, onPress, disabled }: { icon: string; label: string; color: string; bg: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ flex: 1, backgroundColor: bg, borderRadius: 16, paddingVertical: 10, alignItems: "center", gap: 3, opacity: disabled ? 0.45 : 1 }}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={{ fontSize: 11.5, fontWeight: "800", color }}>{label}</Text>
    </TouchableOpacity>
  );
}

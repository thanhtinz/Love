import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { SHOP_ITEMS } from "../../lib/data";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";

const SHOP_CATS: { id: "pot" | "scene" | "accessory"; label: string }[] = [
  { id: "pot", label: "Chậu cây" },
  { id: "scene", label: "Khung cảnh vườn" },
  { id: "accessory", label: "Phụ kiện" },
];

export default function ShopScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const meName = myName(state);
  // Lọc theo nhóm bằng chip: chỉ hiện 1 nhóm mỗi lần thay vì xếp chồng cả 3 nhóm.
  const [cat, setCat] = useState<(typeof SHOP_CATS)[0]["id"]>("pot");
  const items = SHOP_ITEMS.filter((i) => i.category === cat);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Cửa hàng trang trí" subtitle="Xu Tim là ví chung của khu vườn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <View style={[s.chip, { paddingVertical: 7, paddingHorizontal: 12 }]}><Ionicons name="diamond" size={14} color={C.pinkDark} /><Text style={[s.chipText, { fontSize: 13 }]}>Ví chung: {state.coins} Xu Tim</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>Người đang mua:</Text>
            <PersonChip state={state} slot={me.slot} />
          </View>
        </View>

        {/* Chip lọc nhóm */}
        <View style={{ flexDirection: "row", gap: 7 }}>
          {SHOP_CATS.map((c) => {
            const on = cat === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={{ flex: 1, minHeight: 42, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, backgroundColor: on ? C.pink : "#fff", borderWidth: 1.5, borderColor: on ? C.pink : C.pinkBorder }}>
                <Text style={{ fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, color: on ? "#fff" : C.textSoft }} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.card}>
          <View style={{ gap: 8 }}>
            {items.map((item) => {
              const owned = state.inventory.includes(item.id);
              const equipped = state.equipped[cat] === item.id;
              return (
                <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff", borderRadius: 13, borderWidth: 1.5, borderColor: "#f1f5f9", padding: 9 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.category === "pot" && item.visual ? item.visual : C.pinkSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={item.icon as never} size={19} color={item.category === "pot" && item.visual ? "#fff" : C.pinkDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "BeVietnamPro_700Bold", color: C.text, fontSize: 13 }}>{item.name}</Text>
                    <Text style={s.small}>{item.desc}</Text>
                  </View>
                  {equipped ? (<View style={s.chip}><Text style={s.chipText}>Đang dùng</Text></View>) : owned ? (
                    <TouchableOpacity style={s.btnGhost} onPress={() => dispatch({ type: "EQUIP_ITEM", category: cat, itemId: item.id })}><Text style={s.btnGhostText}>Dùng</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[s.btnGhost, state.coins < item.price && { opacity: 0.5 }]} disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_ITEM", itemId: item.id, actor: meName })}>
                      <Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.btnGhostText}>{item.price} Xu</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        <Text style={[s.small, { textAlign: "center" }]}>Đồ mua xong áp dụng ngay ở tab Vườn — mua trùng không trừ tiền hai lần.</Text>
      </ScrollView>
    </View>
  );
}

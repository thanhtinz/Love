import React from "react";
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

  return (
    <View style={s.screen}>
      <ScreenHeader title="Cửa hàng trang trí" subtitle="Xu Tim là ví CHUNG của khu vườn — ai mua cũng trừ vào ví chung" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <View style={[s.chip, { paddingVertical: 7, paddingHorizontal: 12 }]}><Ionicons name="diamond" size={14} color={C.pinkDark} /><Text style={[s.chipText, { fontSize: 13 }]}>Ví chung: {state.coins} Xu Tim</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>Người đang mua:</Text>
            <PersonChip state={state} slot={me.slot} />
          </View>
        </View>

        {SHOP_CATS.map((cat) => (
          <View key={cat.id} style={s.card}>
            <Text style={{ fontWeight: "900", color: C.text }}>{cat.label}</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {SHOP_ITEMS.filter((i) => i.category === cat.id).map((item) => {
                const owned = state.inventory.includes(item.id);
                const equipped = state.equipped[cat.id] === item.id;
                return (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff", borderRadius: 13, borderWidth: 1.5, borderColor: "#f1f5f9", padding: 9 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.category === "pot" && item.visual ? item.visual : C.pinkSoft, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={item.icon as never} size={19} color={item.category === "pot" && item.visual ? "#fff" : C.pinkDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: C.text, fontSize: 13 }}>{item.name}</Text>
                      <Text style={s.small}>{item.desc}</Text>
                    </View>
                    {equipped ? (<View style={s.chip}><Text style={s.chipText}>Đang dùng</Text></View>) : owned ? (
                      <TouchableOpacity style={s.btnGhost} onPress={() => dispatch({ type: "EQUIP_ITEM", category: cat.id, itemId: item.id })}><Text style={s.btnGhostText}>Dùng</Text></TouchableOpacity>
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
        ))}
        <Text style={[s.small, { textAlign: "center" }]}>Đồ trang trí áp dụng ngay lên cây và nền vườn ở tab Vườn. Mua trùng món đã có sẽ không bị trừ tiền lần hai.</Text>
      </ScrollView>
    </View>
  );
}

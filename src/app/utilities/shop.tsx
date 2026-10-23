import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { DECOR_CATS, DECOR_ITEMS, SHOP_ITEMS, type DecorCategory } from "../../lib/data";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { C, ScreenHeader, s } from "../../components/ui";
import { Image } from "expo-image";
import { DECOR_ART, SHOP_ART } from "../../components/Art";

const SHOP_CATS: { id: "pot" | "scene" | "accessory"; label: string }[] = [
  { id: "pot", label: "Chậu cây" },
  { id: "scene", label: "Khung cảnh vườn" },
  { id: "accessory", label: "Phụ kiện" },
];
type CatId = (typeof SHOP_CATS)[number]["id"] | `decor-${DecorCategory}`;
const ALL_CATS: { id: CatId; label: string }[] = [
  ...SHOP_CATS,
  ...DECOR_CATS.map((c) => ({ id: `decor-${c.id}` as CatId, label: c.label })),
];

export default function ShopScreen() {
  const { state, dispatch } = useLove();
  const me = selfOf(state);
  const meName = myName(state);
  // Lọc theo nhóm bằng chip: chỉ hiện 1 nhóm mỗi lần thay vì xếp chồng mọi nhóm.
  const [cat, setCat] = useState<CatId>("pot");
  const isDecor = cat.startsWith("decor-");
  const decorCat = isDecor ? (cat.slice(6) as DecorCategory) : null;
  const items = !isDecor ? SHOP_ITEMS.filter((i) => i.category === cat) : [];
  const decorItems = decorCat ? DECOR_ITEMS.filter((i) => i.category === decorCat) : [];

  const decorEquipped = (id: string, category: DecorCategory): boolean =>
    category === "scene" ? state.decor.sceneBg === id
    : category === "fence" ? state.decor.fence === id
    : category === "path" ? state.decor.path === id
    : state.decor.placed.includes(id);

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/utilities" title="Cửa hàng trang trí" subtitle="Xu Tim là ví chung của khu vườn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <View style={[s.chip, { paddingVertical: 7, paddingHorizontal: 12 }]}><Ionicons name="diamond" size={14} color={C.pinkDark} /><Text style={[s.chipText, { fontSize: 13 }]}>Ví chung: {state.coins} Xu Tim</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.small}>Người đang mua:</Text>
            <PersonChip state={state} slot={me.slot} />
          </View>
        </View>

        {/* Chip lọc nhóm — cuộn ngang vì có thêm 4 nhóm trang trí vườn */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 4 }}>
          {ALL_CATS.map((c) => {
            const on = cat === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={{ minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: on ? C.pink : "#fff", borderWidth: 1.5, borderColor: on ? C.pink : C.pinkBorder }}>
                <Text style={{ fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, color: on ? "#fff" : C.textSoft }} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!isDecor && (
          <View style={s.card}>
            <View style={{ gap: 8 }}>
              {items.map((item) => {
                const owned = state.inventory.includes(item.id);
                const equipped = state.equipped[cat as (typeof SHOP_CATS)[number]["id"]] === item.id;
                return (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff", borderRadius: 13, borderWidth: 1.5, borderColor: "#f1f5f9", padding: 9 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f1f5f9" }}>
                      <Image source={SHOP_ART[item.id]} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={item.name} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: "BeVietnamPro_700Bold", color: C.text, fontSize: 13 }}>{item.name}</Text>
                      <Text style={s.small}>{item.desc}</Text>
                    </View>
                    {equipped ? (<View style={[s.chip, { flexShrink: 0 }]}><Text style={s.chipText}>Đang dùng</Text></View>) : owned ? (
                      <TouchableOpacity style={[s.btnGhost, { flexShrink: 0 }]} onPress={() => dispatch({ type: "EQUIP_ITEM", category: cat as (typeof SHOP_CATS)[number]["id"], itemId: item.id })}><Text style={s.btnGhostText}>Dùng</Text></TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[s.btnGhost, { flexShrink: 0 }, state.coins < item.price && { opacity: 0.5 }]} disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_ITEM", itemId: item.id, actor: meName })}>
                        <Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.btnGhostText}>{item.price} Xu</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {isDecor && decorCat && (
          <View style={s.card}>
            <View style={{ gap: 8 }}>
              {decorItems.map((item) => {
                const owned = state.decor.owned.includes(item.id);
                const equipped = decorEquipped(item.id, item.category);
                const placedFull = item.category === "item" && state.decor.placed.length >= 3 && !equipped;
                return (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#fff", borderRadius: 13, borderWidth: 1.5, borderColor: "#f1f5f9", padding: 9 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f1f5f9" }}>
                      <Image source={DECOR_ART[item.id]} style={{ width: "100%", height: "100%" }} contentFit={item.category === "scene" ? "cover" : "contain"} accessibilityLabel={item.name} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: "BeVietnamPro_700Bold", color: C.text, fontSize: 13 }}>{item.name}</Text>
                      <Text style={s.small}>{item.desc}</Text>
                    </View>
                    {equipped ? (
                      <TouchableOpacity style={[s.chip, { flexShrink: 0 }]} onPress={() => dispatch({ type: "EQUIP_DECOR", itemId: item.id })}>
                        <Text style={s.chipText}>{item.category === "item" ? "Đang đặt · gỡ" : "Đang dùng · gỡ"}</Text>
                      </TouchableOpacity>
                    ) : owned ? (
                      <TouchableOpacity style={[s.btnGhost, { flexShrink: 0 }]} onPress={() => dispatch({ type: "EQUIP_DECOR", itemId: item.id })}>
                        <Text style={s.btnGhostText}>{item.category === "item" ? (placedFull ? "Đặt thay khe cuối" : "Đặt vào vườn") : "Dùng"}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[s.btnGhost, { flexShrink: 0 }, state.coins < item.price && { opacity: 0.5 }]} disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_DECOR", itemId: item.id, actor: meName })}>
                        <Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.btnGhostText}>{item.price} Xu</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
        <Text style={[s.small, { textAlign: "center" }]}>
          {isDecor
            ? decorCat === "item"
              ? "Vật đặt: tối đa 3 vật cùng lúc trong vườn (khe trái · giữa · phải). Mua xong là dùng được ngay — không có tiến độ sưu tập."
              : "Cảnh mùa, hàng rào và lối đi trang trí cho cả khu vườn chung — mua xong áp dụng ngay ở tab Vườn."
            : "Đồ mua xong áp dụng ngay ở tab Vườn — mua trùng không trừ tiền hai lần."}
        </Text>
      </ScrollView>
    </View>
  );
}

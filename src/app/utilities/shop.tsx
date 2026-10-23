import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLove, myName } from "../../lib/store";
import { DECOR_CATS, DECOR_ITEMS, SHOP_ITEMS, type DecorCategory } from "../../lib/data";
import { PersonChip, selfOf } from "../../components/PersonChip";
import { COLOR, FONT } from "../../components/theme";
import { ChipButton, ClosingBand, ScreenHeader, StatusChip, s } from "../../components/ui";
import { Image } from "expo-image";
import { DECOR_ART, MascotArt, SHOP_ART } from "../../components/Art";

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

/**
 * Vòng polish 2026-10-23:
 * - Bỏ "mega-card" trắng bọc cả danh sách: món hàng là HÀNG trên nền canvas,
 *   ngăn nhau bằng hairline — hết cảnh card-trong-card.
 * - Trạng thái và giá dùng CHUNG một khuôn chip (ChipButton/StatusChip): "Đang
 *   dùng" = điền accent, "Dùng/Đặt" = điền info, giá = trắng + viền (price).
 * - Dải chip nhóm cuộn ngang có vệt mờ mềm ở mép phải để hiệu "còn cuộn tiếp".
 */
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

  const rowDivider = (idx: number) => (idx === 0 ? null : { borderTopWidth: 1, borderTopColor: COLOR.border });

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/utilities" title="Cửa hàng trang trí" subtitle="Xu Tim là ví chung của khu vườn" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <StatusChip icon="diamond" label={`Ví chung: ${state.coins} Xu Tim`} variant="accent" />
          <View style={{ flex: 1 }}>
            <Text style={s.small}>Người đang mua:</Text>
            <PersonChip state={state} slot={me.slot} />
          </View>
        </View>

        {/* Chip lọc nhóm — cuộn ngang vì có thêm 4 nhóm trang trí vườn; vệt mờ
            ở mép phải (3 lớp canvas bán trong) để chip cuối bị cắt đọc thành
            "còn cuộn được" thay vì lỗi hiển thị. */}
        <View style={{ position: "relative" }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 30 }}>
            {ALL_CATS.map((c) => {
              const on = cat === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={{ minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, backgroundColor: on ? COLOR.primary : "#fff", borderWidth: 1.5, borderColor: on ? COLOR.primary : COLOR.lineStrong }}>
                  <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: on ? "#fff" : COLOR.textSoft }} numberOfLines={1}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 30, flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "rgba(255,247,240,0.35)" }} />
            <View style={{ flex: 1, backgroundColor: "rgba(255,247,240,0.6)" }} />
            <View style={{ flex: 1, backgroundColor: "rgba(255,247,240,0.88)" }} />
          </View>
        </View>

        {!isDecor && (
          <View>
            {items.map((item, idx) => {
              const owned = state.inventory.includes(item.id);
              const equipped = state.equipped[cat as (typeof SHOP_CATS)[number]["id"]] === item.id;
              return (
                <View key={item.id} style={[{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 }, rowDivider(idx)]}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border }}>
                    <Image source={SHOP_ART[item.id]} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel={item.name} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.bold, color: COLOR.text, fontSize: 13.5 }}>{item.name}</Text>
                    <Text style={s.small}>{item.desc}</Text>
                  </View>
                  {equipped ? (
                    <StatusChip label="Đang dùng" variant="accent" />
                  ) : owned ? (
                    <ChipButton label="Dùng" variant="info" onPress={() => dispatch({ type: "EQUIP_ITEM", category: cat as (typeof SHOP_CATS)[number]["id"], itemId: item.id })} />
                  ) : (
                    <ChipButton label={`${item.price} Xu`} icon="diamond" variant="price" disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_ITEM", itemId: item.id, actor: meName })} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {isDecor && decorCat && (
          <View>
            {decorItems.map((item, idx) => {
              const owned = state.decor.owned.includes(item.id);
              const equipped = decorEquipped(item.id, item.category);
              const placedFull = item.category === "item" && state.decor.placed.length >= 3 && !equipped;
              return (
                <View key={item.id} style={[{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 }, rowDivider(idx)]}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border }}>
                    <Image source={DECOR_ART[item.id]} style={{ width: "100%", height: "100%" }} contentFit={item.category === "scene" ? "cover" : "contain"} accessibilityLabel={item.name} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.bold, color: COLOR.text, fontSize: 13.5 }}>{item.name}</Text>
                    <Text style={s.small}>{item.desc}</Text>
                  </View>
                  {equipped ? (
                    <ChipButton label={item.category === "item" ? "Đang đặt · gỡ" : "Đang dùng · gỡ"} variant="accent" onPress={() => dispatch({ type: "EQUIP_DECOR", itemId: item.id })} />
                  ) : owned ? (
                    <ChipButton label={item.category === "item" ? (placedFull ? "Đặt thay khe cuối" : "Đặt vào vườn") : "Dùng"} variant="info" onPress={() => dispatch({ type: "EQUIP_DECOR", itemId: item.id })} />
                  ) : (
                    <ChipButton label={`${item.price} Xu`} icon="diamond" variant="price" disabled={state.coins < item.price} onPress={() => dispatch({ type: "BUY_DECOR", itemId: item.id, actor: meName })} />
                  )}
                </View>
              );
            })}
          </View>
        )}
        <Text style={[s.small, { textAlign: "center" }]}>
          {isDecor
            ? decorCat === "item"
              ? "Vật đặt: tối đa 3 vật cùng lúc trong vườn (khe trái · giữa · phải). Mua xong là dùng được ngay — không có tiến độ sưu tập."
              : "Cảnh mùa, hàng rào và lối đi trang trí cho cả khu vườn chung — mua xong áp dụng ngay ở tab Vườn."
            : "Đồ mua xong áp dụng ngay ở tab Vườn — mua trùng không trừ tiền hai lần."}
        </Text>
        <ClosingBand art={<MascotArt size={72} />} line="Mỗi món đồ là một góc nhỏ hai đứa tự tay chọn cho khu vườn chung — mua xong qua tab Vườn ngắm thành quả nhé." />
      </ScrollView>
    </View>
  );
}

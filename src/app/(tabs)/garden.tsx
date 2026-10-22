import React, { useEffect, useMemo, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove, decideCareDrop, makeLetter, myName, type CareKind } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { shopItem, timeSky } from "../../lib/data";
import { MAX_PLOTS, SPECIES, careStatus, decayedPlantStats, formatDuration, fruitPending, growthFactor, speciesById, stageInfo, totalGrowthMs, totalMaturedCount } from "../../lib/plants";
import { treeHealth, type LoveLetter } from "../../lib/types";
import PlantArt from "../../components/PlantArt";
import { PersonChip } from "../../components/PersonChip";
import { C, IconBtn, SectionTitle, StatBar, s, useNow } from "../../components/ui";

const CARE_BTNS: { kind: CareKind; icon: string; label: string; color: string; bg: string }[] = [
  { kind: "water", icon: "water", label: "Tưới nước", color: "#0284c7", bg: "#D9F4F0" },
  { kind: "sun", icon: "sunny", label: "Tắm nắng", color: "#d97706", bg: "#fef3c7" },
  { kind: "love", icon: "heart", label: "Bón tim", color: "#C93A5B", bg: "#FFE9EE" },
  { kind: "bug", icon: "bug", label: "Bắt sâu", color: "#16a34a", bg: "#dcfce7" },
];

export default function GardenScreen() {
  const { state, dispatch, connected, hydrated } = useLove();
  const { couple } = useAuth();
  const now = useNow(1000);
  const [seedOpen, setSeedOpen] = useState(false);
  const [falling, setFalling] = useState<LoveLetter | null>(null);
  const [fallAnim] = useState(() => new Animated.Value(0));
  const [careMsg, setCareMsg] = useState("");

  const me = state.currentUser;
  const meName = myName(state);
  const selected = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const sky = timeSky(new Date().getHours());
  const sceneItem = shopItem(state.equipped.scene);
  const sceneColor = state.equipped.scene === "scene-auto" || !sceneItem.visual ? sky.sky : sceneItem.visual;
  const potColor = shopItem(state.equipped.pot).visual || "#fb923c";
  const accessory = shopItem(state.equipped.accessory).visual || "";

  /* Lên giai đoạn theo thời gian thật -> STAGE_UP (+ thư mừng theo tỉ lệ loài) */
  useEffect(() => {
    for (const p of state.plants) {
      const info = stageInfo(p);
      if (info.index > p.announcedStage) {
        const sp = speciesById(p.speciesId);
        let drop: LoveLetter | null = null;
        // Một lần rút thăm duy nhất cho cả 2 ngưỡng (bản cũ rút 2 số ngẫu nhiên khác nhau cho điều kiện và kết quả -> sai tỉ lệ)
        const r = Math.random();
        if (r < 0.7) {
          const rarity = info.mature && Math.random() < 0.5 ? "legendary" : r < sp.stageLetterLegendary ? "legendary" : r < sp.stageLetterLegendary + sp.stageLetterRare || sp.stageLetterRare >= 1 ? "rare" : "common";
          // Id XÁC ĐỊNH theo (cây, giai đoạn): cả 2 máy đều chạy effect này khi cây lên
          // giai đoạn — id giống nhau để merge/store chống trùng, thư chỉ xuất hiện 1 lần.
          drop = { ...makeLetter(rarity, info.mature ? "Cây trưởng thành" : "Lên giai đoạn mới", state.letters.map((l) => l.messageId)), id: `stageup-${p.id}-${info.index}` };
        }
        dispatch({ type: "STAGE_UP", plantId: p.id, drop });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hiện animation thư rơi khi cây tự lên giai đoạn theo thời gian thật
        if (drop) setFalling(drop);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plants]);

  useEffect(() => {
    if (!falling) return;
    fallAnim.setValue(0);
    Animated.timing(fallAnim, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
    const t = setTimeout(() => setFalling(null), 9000);
    return () => clearTimeout(t);
  }, [falling, fallAnim]);

  const proj = useMemo(() => (selected ? stageInfo(selected, now) : null), [selected, now]);
  const stats = useMemo(() => (selected ? decayedPlantStats(selected, now) : null), [selected, now]);
  const health = stats ? treeHealth(stats) : null;
  const factor = stats ? growthFactor(stats) : 1;

  function care(kind: CareKind) {
    if (!selected) return;
    // Kiểm tra hiệu lực TRƯỚC khi quyết định thư rơi: lần chăm vô hiệu (cooldown/chỉ số đầy)
    // thì không dispatch, không thư, không Xu/XP — chỉ hiện lý do cho người dùng.
    const cs = careStatus(selected, kind, me, now);
    if (!cs.ok) { setCareMsg(cs.reason); return; }
    setCareMsg("");
    const { drop, combo } = decideCareDrop(state, selected.id, kind);
    dispatch({ type: "TREE_ACTION", kind, actor: meName, user: me, plantId: selected.id, drop, combo });
    if (drop) setFalling(drop);
  }

  if (!hydrated) {
    return <View style={styles.center}><Ionicons name="leaf" size={40} color={C.pink} /><Text style={s.sub}>Đang tải khu vườn...</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: sceneColor }} contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 12 }}>
        {/* Header gọn của vườn */}
        <View style={[s.card, { marginTop: 26 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: "BeVietnamPro_900Black", color: C.text }}>Vườn cây</Text>
              <Text style={s.small}>{sky.label} · {connected ? "Đang kết nối realtime" : "Chế độ ngoại tuyến"} · {state.plants.length}/{MAX_PLOTS} ô đất</Text>
            </View>
            <View style={s.chip}><Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.chipText}>{state.coins} Xu Tim</Text></View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <PersonChip state={state} slot="A" />
            <PersonChip state={state} slot="B" />
          </View>
        </View>

        {/* Cây đang chọn */}
        {selected && proj && stats && health ? (
          <View style={s.card}>
            <View style={{ alignItems: "center" }}>
              <PlantArt speciesId={selected.speciesId} stageIndex={proj.index} totalStages={speciesById(selected.speciesId).stages.length} wilted={health.status === "wilted"} potColor={potColor} accessory={accessory} fruitReady={fruitPending(selected, now)} size={190} />
              <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_900Black", color: C.text }}>{speciesById(selected.speciesId).name}</Text>
              <Text style={{ fontSize: 13, color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>Giai đoạn {proj.index + 1}/{speciesById(selected.speciesId).stages.length}: {proj.stage.name}</Text>
              <Text style={[s.sub, { textAlign: "center" }]}>{proj.stage.desc}</Text>
              <View style={[s.chip, { backgroundColor: health.status === "wilted" ? "#fee2e2" : health.status === "need" ? "#fef3c7" : "#dcfce7", marginTop: 6 }]}>
                <Ionicons name={health.status === "wilted" ? "alert-circle" : "happy"} size={13} color={health.status === "wilted" ? "#b91c1c" : C.text} />
                <Text style={[s.chipText, { color: C.text }]}>{health.message} · Tốc độ lớn x{factor}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
              <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
              <StatBar label="Tình yêu" icon="heart" value={stats.love} color="#E75480" />
            </View>

            <View style={{ marginTop: 10, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12.5, fontFamily: "BeVietnamPro_700Bold", color: C.text }}>{proj.mature ? "Đã trưởng thành" : proj.next ? `Tới "${proj.next.name}"` : ""}</Text>
                <Text style={{ fontSize: 12.5, color: C.pinkDark, fontFamily: "BeVietnamPro_800ExtraBold" }}>{proj.mature ? "Hoàn thành" : factor <= 0 ? "cây đang héo — chưa lớn tiếp" : `còn ${formatDuration(Math.max(0, proj.remainingToNextMs / factor))}`}</Text>
              </View>
              <View style={{ height: 9, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${proj.progressInStage}%`, backgroundColor: C.green, borderRadius: 99 }} />
              </View>
              <Text style={s.small}>Cây vẫn lớn theo thời gian thật, kể cả khi hai bạn không mở app.</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {CARE_BTNS.map((b) => {
                const cs = careStatus(selected, b.kind, me, now);
                return <IconBtn key={b.kind} icon={b.icon} label={b.label} color={b.color} bg={b.bg} disabled={!cs.ok} onPress={() => care(b.kind)} />;
              })}
            </View>
            {careMsg ? <Text style={{ textAlign: "center", color: "#b45309", fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, marginTop: 7 }}>{careMsg}</Text> : null}
            <Text style={[s.small, { textAlign: "center", marginTop: 6 }]}>Nghỉ 60 giây giữa 2 lần chăm cùng một cây · Người chăm gần nhất: {selected.lastCareBy ? (selected.lastCareBy === "A" ? state.personA : state.personB) : "chưa ai"}</Text>

            {fruitPending(selected, now) && (
              <TouchableOpacity style={[s.btn, { backgroundColor: "#dc2626", marginTop: 10 }]} onPress={() => dispatch({ type: "HARVEST_FRUIT", plantId: selected.id, actor: meName })}>
                <Ionicons name="gift" size={17} color="#fff" /><Text style={s.btnText}>Thu hoạch quả chín (+{speciesById(selected.speciesId).fruitCoins} Xu)</Text>
              </TouchableOpacity>
            )}
            {proj.mature && speciesById(selected.speciesId).fruitCycleMs <= 0 && (
              <TouchableOpacity style={[s.btn, { backgroundColor: C.violet, marginTop: 10 }]} onPress={() => dispatch({ type: "COLLECT_PLANT", plantId: selected.id, actor: meName })}>
                <Ionicons name="trophy" size={17} color="#fff" /><Text style={s.btnText}>Thu vào kỷ niệm (+{speciesById(selected.speciesId).matureRewardCoins} Xu)</Text>
              </TouchableOpacity>
            )}
            <Text style={[s.small, { textAlign: "center", marginTop: 8 }]}>Đã chăm {selected.careCount} lần · Chăm hiệu quả mới có cơ hội rơi thư tình</Text>
          </View>
        ) : (
          <View style={[s.card, { alignItems: "center", gap: 8 }]}>
            <Ionicons name="leaf-outline" size={38} color={C.green} />
            <Text style={s.title}>Vườn đang trống</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Gieo hạt đầu tiên để bắt đầu hành trình trồng cây tình yêu theo thời gian thật nhé.</Text>
            <TouchableOpacity style={s.btn} onPress={() => setSeedOpen(true)}><Ionicons name="add" size={17} color="#fff" /><Text style={s.btnText}>Gieo hạt ngay</Text></TouchableOpacity>
          </View>
        )}

        {/* 4 ô đất */}
        <View style={s.card}>
          <SectionTitle icon="grid">Ô đất ({state.plants.length}/{MAX_PLOTS})</SectionTitle>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {Array.from({ length: MAX_PLOTS }, (_, i) => {
              const p = state.plants[i];
              if (!p) {
                return (
                  <TouchableOpacity key={i} style={styles.plotEmpty} onPress={() => setSeedOpen(true)}>
                    <Ionicons name="add-circle-outline" size={26} color={C.textFaint} />
                    <Text style={{ fontSize: 11, color: C.textFaint, fontFamily: "BeVietnamPro_700Bold" }}>Gieo hạt</Text>
                  </TouchableOpacity>
                );
              }
              const info = stageInfo(p, now);
              const isSel = selected?.id === p.id;
              return (
                <TouchableOpacity key={p.id} style={[styles.plot, isSel && styles.plotSel]} onPress={() => dispatch({ type: "SELECT_PLANT", plantId: p.id })}>
                  <PlantArt speciesId={p.speciesId} stageIndex={info.index} totalStages={speciesById(p.speciesId).stages.length} potColor={potColor} fruitReady={fruitPending(p, now)} size={64} />
                  <Text style={{ fontSize: 10.5, fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, textAlign: "center" }} numberOfLines={1}>{speciesById(p.speciesId).name}</Text>
                  <Text style={{ fontSize: 9.5, color: C.textFaint }}>{info.stage.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hoạt động chăm vườn gần đây (chỉ hoạt động liên quan tới cây) */}
        <View style={s.card}>
          <SectionTitle icon="time" color={C.sky}>Hoạt động chăm vườn</SectionTitle>
          <View style={{ gap: 8, marginTop: 10 }}>
            {state.activities.filter((a) => ["leaf", "water", "sunny", "heart", "bug", "gift", "trophy", "mail", "sparkles"].includes(a.icon)).slice(0, 5).map((a) => (
              <View key={a.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Ionicons name={(a.icon + "-outline") as never} size={16} color={C.pink} />
                <Text style={{ flex: 1, fontSize: 12.5, color: C.text }}><Text style={{ fontFamily: "BeVietnamPro_800ExtraBold" }}>{a.actor}</Text> {a.text}</Text>
                <Text style={s.small}>{new Date(a.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            ))}
            {state.activities.length === 0 && <Text style={s.sub}>Chưa có hoạt động nào. Hãy chăm cây đầu tiên nhé!</Text>}
          </View>
          {couple && couple.members.length < 2 && <Text style={[s.small, { marginTop: 8 }]}>Vườn đang có 1 người — gửi mã mời {couple.code} cho người ấy để cùng chăm nhé.</Text>}
        </View>
      </ScrollView>

      {/* Thư rơi */}
      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 130] }) }, { rotate: fallAnim.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "3deg"] }) }] }}>
          <TouchableOpacity style={styles.fallingCard} onPress={() => { setFalling(null); router.push("/(tabs)/letters"); }}>
            <Ionicons name="mail" size={34} color={C.pink} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Một lá thư vừa rơi!</Text>
            <Text style={s.small}>Chạm để vào Hộp thư mở đọc</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modal gieo hạt */}
      <Modal visible={seedOpen} transparent animationType="slide" onRequestClose={() => setSeedOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.title}>Chọn hạt giống</Text>
              <TouchableOpacity onPress={() => setSeedOpen(false)}><Ionicons name="close-circle" size={26} color={C.textFaint} /></TouchableOpacity>
            </View>
            <Text style={s.sub}>Số dư: {state.coins} Xu Tim · Đã thu {totalMaturedCount(state)} cây trưởng thành vào kỷ niệm</Text>
            <ScrollView style={{ maxHeight: 430 }} contentContainerStyle={{ gap: 9 }}>
              {SPECIES.map((sp) => {
                const locked = sp.lockMaturedCount > 0 && totalMaturedCount(state) < sp.lockMaturedCount;
                const afford = state.coins >= sp.seedPrice;
                const daysTotal = Math.max(1, Math.round(totalGrowthMs(sp) / 86400000));
                return (
                  <TouchableOpacity key={sp.id} disabled={locked || !afford} style={[styles.seedRow, (locked || !afford) && { opacity: 0.5 }]} onPress={() => { dispatch({ type: "PLANT_SEED", speciesId: sp.id, actor: meName }); setSeedOpen(false); }}>
                    <PlantArt speciesId={sp.id} stageIndex={sp.stages.length - 1} totalStages={sp.stages.length} size={54} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text, fontSize: 13.5 }}>{sp.name}</Text>
                      <Text style={s.small}>{sp.stages.length} giai đoạn · khoảng {daysTotal} ngày · {sp.trait}</Text>
                      <Text style={{ fontSize: 11.5, color: locked ? "#b91c1c" : C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>{locked ? `Khóa: cần thu ${sp.lockMaturedCount} cây trưởng thành vào kỷ niệm` : sp.seedPrice === 0 ? "Miễn phí" : `${sp.seedPrice} Xu Tim`}</Text>
                    </View>
                    <Ionicons name={locked ? "lock-closed" : "add-circle"} size={22} color={locked ? C.textFaint : C.green} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.bg },
  plot: { flex: 1, alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 14, borderWidth: 2, borderColor: "transparent", paddingVertical: 6 },
  plotSel: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  plotEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: "#cbd5e1", paddingVertical: 18 },
  fallingCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.pink, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3, elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: "86%" },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff7f8", borderRadius: 16, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 10 },
});

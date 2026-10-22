import React, { useEffect, useMemo, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove, decideCareDrop, makeLetter, myName, type CareKind } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { shopItem, timeSky } from "../../lib/data";
import { MAX_PLOTS, SPECIES, careStatus, decayedPlantStats, formatDuration, fruitPending, growthFactor, speciesById, stageInfo, totalGrowthMs, totalMaturedCount } from "../../lib/plants";
import { treeHealth, type AppState, type LoveLetter, type PersonId, type PlantState } from "../../lib/types";
import PlantArt from "../../components/PlantArt";
import { EmptyPlotArt, GardenScene, LetterArt, MascotMam } from "../../components/illustrations";
import { PersonChip } from "../../components/PersonChip";
import { C, IconBtn, SectionTitle, SkeletonCard, StatBar, s, useNow } from "../../components/ui";

const CARE_BTNS: { kind: CareKind; icon: string; label: string; color: string; bg: string }[] = [
  { kind: "water", icon: "water", label: "Tưới nước", color: "#0284c7", bg: "#D9F4F0" },
  { kind: "sun", icon: "sunny", label: "Tắm nắng", color: "#d97706", bg: "#fef3c7" },
  { kind: "love", icon: "heart", label: "Bón tim", color: "#C93A5B", bg: "#FFE9EE" },
  { kind: "bug", icon: "bug", label: "Bắt sâu", color: "#16a34a", bg: "#dcfce7" },
];

/**
 * Hàng nút chăm cây — component NHỎ có đồng hồ tick 1 giây riêng, để việc đếm
 * cooldown không kéo cả màn Vườn vẽ lại mỗi giây (trước đây useNow(1000) đặt ở
 * root màn hình khiến toàn bộ cây component re-render liên tục).
 */
function CareButtons({ plant, me, onCare }: { plant: PlantState; me: PersonId; onCare: (kind: CareKind) => void }) {
  const now = useNow(1000);
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {CARE_BTNS.map((b) => {
        const cs = careStatus(plant, b.kind, me, now);
        return <IconBtn key={b.kind} icon={b.icon} label={b.label} color={b.color} bg={b.bg} disabled={!cs.ok} onPress={() => onCare(b.kind)} />;
      })}
    </View>
  );
}

/**
 * Bottom sheet CHI TIẾT cây: 3 chỉ số, tiến trình giai đoạn + đếm ngược (tick 1s
 * chỉ trong sheet nhỏ này), thu hoạch/thu kỷ niệm. Màn Vườn chính không còn
 * phải gánh cả khối chi tiết này nữa.
 */
function PlantDetailSheet({ plant, state, potColor, accessory, onClose, onHarvest, onCollect }: {
  plant: PlantState;
  state: AppState;
  potColor: string;
  accessory: string;
  onClose: () => void;
  onHarvest: () => void;
  onCollect: () => void;
}) {
  const now = useNow(1000);
  const sp = speciesById(plant.speciesId);
  const proj = stageInfo(plant, now);
  const stats = decayedPlantStats(plant, now);
  const health = treeHealth(stats);
  const factor = growthFactor(stats);
  const fruit = fruitPending(plant, now);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{sp.name}</Text>
              <Text style={{ fontSize: 13, color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>Giai đoạn {proj.index + 1}/{sp.stages.length}: {proj.stage.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={26} color={C.textFaint} /></TouchableOpacity>
          </View>
          <View style={{ alignItems: "center" }}>
            <PlantArt speciesId={plant.speciesId} stageIndex={proj.index} totalStages={sp.stages.length} wilted={health.status === "wilted"} potColor={potColor} accessory={accessory} fruitReady={fruit} size={132} />
            <Text style={[s.sub, { textAlign: "center" }]}>{proj.stage.desc}</Text>
            <View style={[s.chip, { backgroundColor: health.status === "wilted" ? "#fee2e2" : health.status === "need" ? "#fef3c7" : "#dcfce7", marginTop: 6 }]}>
              <Ionicons name={health.status === "wilted" ? "alert-circle" : "happy"} size={13} color={health.status === "wilted" ? "#b91c1c" : C.text} />
              <Text style={[s.chipText, { color: C.text }]}>{health.message} · Tốc độ lớn x{factor}</Text>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
            <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
            <StatBar label="Tình yêu" icon="heart" value={stats.love} color="#E75480" />
          </View>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12.5, fontFamily: "BeVietnamPro_700Bold", color: C.text }}>{proj.mature ? "Đã trưởng thành" : proj.next ? `Tới "${proj.next.name}"` : ""}</Text>
              <Text style={{ fontSize: 12.5, color: C.pinkDark, fontFamily: "BeVietnamPro_800ExtraBold" }}>{proj.mature ? "Hoàn thành" : factor <= 0 ? "cây đang héo — chưa lớn tiếp" : `còn ${formatDuration(Math.max(0, proj.remainingToNextMs / factor))}`}</Text>
            </View>
            <View style={{ height: 9, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${proj.progressInStage}%`, backgroundColor: C.green, borderRadius: 99 }} />
            </View>
          </View>
          {fruit && (
            <TouchableOpacity style={[s.btn, { backgroundColor: "#dc2626" }]} onPress={onHarvest}>
              <Ionicons name="gift" size={17} color="#fff" /><Text style={s.btnText}>Thu hoạch quả chín (+{sp.fruitCoins} Xu)</Text>
            </TouchableOpacity>
          )}
          {proj.mature && sp.fruitCycleMs <= 0 && (
            <TouchableOpacity style={[s.btn, { backgroundColor: C.violet }]} onPress={onCollect}>
              <Ionicons name="trophy" size={17} color="#fff" /><Text style={s.btnText}>Thu vào kỷ niệm (+{sp.matureRewardCoins} Xu)</Text>
            </TouchableOpacity>
          )}
          <Text style={[s.small, { textAlign: "center" }]}>Đã chăm {plant.careCount} lần · Người chăm gần nhất: {plant.lastCareBy ? (plant.lastCareBy === "A" ? state.personA : state.personB) : "chưa ai"}</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function GardenScreen() {
  const { state, dispatch, connected, hydrated } = useLove();
  const { couple } = useAuth();
  // Tick THÔ (30s) cho hiển thị cảnh/tiến trình ở màn chính — chi tiết đếm ngược
  // từng giây đã chuyển vào CareButtons và PlantDetailSheet (component con nhỏ).
  const now = useNow(30000);
  const [seedOpen, setSeedOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllActs, setShowAllActs] = useState(false);
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

  function care(kind: CareKind) {
    if (!selected) return;
    // Kiểm tra hiệu lực TRƯỚC khi quyết định thư rơi: lần chăm vô hiệu (cooldown/chỉ số đầy)
    // thì không dispatch, không thư, không Xu/XP — chỉ hiện lý do cho người dùng.
    const cs = careStatus(selected, kind, me, Date.now());
    if (!cs.ok) { setCareMsg(cs.reason); return; }
    setCareMsg("");
    const { drop, combo } = decideCareDrop(state, selected.id, kind);
    dispatch({ type: "TREE_ACTION", kind, actor: meName, user: me, plantId: selected.id, drop, combo });
    if (drop) setFalling(drop);
  }

  const gardenActs = state.activities.filter((a) => ["leaf", "water", "sunny", "heart", "bug", "gift", "trophy", "mail", "sparkles"].includes(a.icon));
  const visibleActs = showAllActs ? gardenActs.slice(0, 12) : gardenActs.slice(0, 3);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 42, gap: 12 }}>
        <SkeletonCard height={86} />
        <SkeletonCard height={210} />
        <SkeletonCard height={120} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải khu vườn...</Text>
      </View>
    );
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

        {selected && proj && stats && health ? (
          <>
            {/* Cảnh vườn vẽ nhiều lớp — chạm vào cây mở sheet chi tiết chỉ số */}
            <View style={{ borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#00000010" }}>
              <GardenScene sky={sceneColor} night={sky.night} height={204} />
              <TouchableOpacity activeOpacity={0.92} onPress={() => setDetailOpen(true)} style={{ position: "absolute", left: 0, right: 0, top: 8, alignItems: "center" }} accessibilityLabel="Xem chi tiết cây đang chọn">
                <PlantArt speciesId={selected.speciesId} stageIndex={proj.index} totalStages={speciesById(selected.speciesId).stages.length} wilted={health.status === "wilted"} potColor={potColor} accessory={accessory} fruitReady={fruitPending(selected, now)} size={158} />
              </TouchableOpacity>
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center" }}>
                <View style={{ backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12.5, fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>{speciesById(selected.speciesId).name} · {proj.stage.name}</Text>
                </View>
              </View>
            </View>

            {/* Mầm nhắc khi cây héo/khát */}
            {health.status === "wilted" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1.5, borderColor: "#FED7AA", paddingHorizontal: 12, paddingVertical: 8 }}>
                <MascotMam mood="thirsty" size={46} />
                <Text style={{ flex: 1, fontSize: 13, color: "#9A3412", fontFamily: "BeVietnamPro_600SemiBold", lineHeight: 18 }}>Mầm bảo: cây đang héo nên tạm ngừng lớn — chăm cây ngay để cây hồi sức nhé.</Text>
              </View>
            ) : (
              <View style={[s.chip, { alignSelf: "center", backgroundColor: health.status === "need" ? "#fef3c7" : "#dcfce7" }]}>
                <Ionicons name="happy" size={13} color={C.text} />
                <Text style={[s.chipText, { color: C.text }]}>{health.message}</Text>
              </View>
            )}

            {/* Hàng nút chăm — luôn ở màn chính */}
            <View style={s.card}>
              <CareButtons plant={selected} me={me} onCare={care} />
              {careMsg ? <Text style={{ textAlign: "center", color: "#b45309", fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, marginTop: 7 }}>{careMsg}</Text> : null}
              <Text style={[s.small, { textAlign: "center", marginTop: 6 }]}>Nghỉ 60 giây giữa 2 lần chăm cùng một cây · Chạm vào cây để xem chỉ số chi tiết</Text>
            </View>
          </>
        ) : (
          <View style={[s.card, { alignItems: "center", gap: 6 }]}>
            <MascotMam mood="happy" size={86} />
            <Text style={s.title}>Vườn đang trống</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Gieo hạt đầu tiên để bắt đầu trồng cây nhé.</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 4 }]} onPress={() => setSeedOpen(true)}><Ionicons name="add" size={17} color="#fff" /><Text style={s.btnText}>Gieo hạt ngay</Text></TouchableOpacity>
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
                    <EmptyPlotArt size={56} />
                    <Text style={{ fontSize: 11, color: C.textSoft, fontFamily: "BeVietnamPro_700Bold" }}>Gieo hạt</Text>
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

        {/* Hoạt động chăm vườn: mặc định 3 mục gần nhất */}
        <View style={s.card}>
          <SectionTitle icon="time" color={C.sky}>Hoạt động chăm vườn</SectionTitle>
          <View style={{ gap: 8, marginTop: 10 }}>
            {visibleActs.map((a) => (
              <View key={a.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Ionicons name={(a.icon + "-outline") as never} size={16} color={C.pink} />
                <Text style={{ flex: 1, fontSize: 12.5, color: C.text }}><Text style={{ fontFamily: "BeVietnamPro_800ExtraBold" }}>{a.actor}</Text> {a.text}</Text>
                <Text style={s.small}>{new Date(a.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            ))}
            {gardenActs.length === 0 && <Text style={s.sub}>Chưa có hoạt động nào. Hãy chăm cây đầu tiên nhé!</Text>}
          </View>
          {gardenActs.length > 3 && (
            <TouchableOpacity onPress={() => setShowAllActs((v) => !v)} style={{ alignSelf: "center", marginTop: 9, flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: 10 }}>
              <Text style={{ fontFamily: "BeVietnamPro_700Bold", fontSize: 12.5, color: C.pinkDark }}>{showAllActs ? "Thu gọn" : `Xem tất cả (${gardenActs.length})`}</Text>
              <Ionicons name={showAllActs ? "chevron-up" : "chevron-down"} size={14} color={C.pinkDark} />
            </TouchableOpacity>
          )}
          {couple && couple.members.length < 2 && <Text style={[s.small, { marginTop: 8 }]}>Vườn đang có 1 người — gửi mã mời {couple.code} cho người ấy để cùng chăm nhé.</Text>}
        </View>
      </ScrollView>

      {/* Thư rơi — phong bì vẽ có dấu sáp trái tim */}
      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 130] }) }, { rotate: fallAnim.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "3deg"] }) }] }}>
          <TouchableOpacity style={styles.fallingCard} onPress={() => { setFalling(null); router.push("/(tabs)/letters"); }}>
            <LetterArt size={76} />
            <Text style={{ fontFamily: "BeVietnamPro_900Black", color: C.pinkDark }}>Một lá thư vừa rơi!</Text>
            <Text style={s.small}>Chạm để vào Hộp thư mở đọc</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Sheet chi tiết cây */}
      {detailOpen && selected && (
        <PlantDetailSheet
          plant={selected}
          state={state}
          potColor={potColor}
          accessory={accessory}
          onClose={() => setDetailOpen(false)}
          onHarvest={() => { dispatch({ type: "HARVEST_FRUIT", plantId: selected.id, actor: meName }); setDetailOpen(false); }}
          onCollect={() => { dispatch({ type: "COLLECT_PLANT", plantId: selected.id, actor: meName }); setDetailOpen(false); }}
        />
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
  plot: { flex: 1, alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 14, borderWidth: 2, borderColor: "transparent", paddingVertical: 6 },
  plotSel: { borderColor: C.pink, backgroundColor: C.pinkSoft },
  plotEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 14, borderWidth: 2, borderStyle: "dashed", borderColor: "#cbd5e1", paddingVertical: 10 },
  fallingCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.pink, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3, elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: "86%" },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff7f8", borderRadius: 16, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 10 },
});

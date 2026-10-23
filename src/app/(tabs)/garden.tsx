import React, { useEffect, useMemo, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove, decideCareDrop, makeLetter, myName, type CareKind } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { SPECIES, careStatus, decayedPlantStats, formatDuration, fruitPending, growthFactor, speciesById, stageInfo, totalGrowthMs, totalMaturedCount } from "../../lib/plants";
import { treeHealth, type AppState, type LoveLetter, type PersonId, type PlantState } from "../../lib/types";
import { EmptyPlotImage, LetterEnvelopeImage, MascotArt, PlantImage } from "../../components/Art";
import { COLOR, FONT, RADIUS, ROLE, SPACE } from "../../components/theme";
import { C, IconBtn, SectionTitle, SkeletonCard, StatBar, s, useNow } from "../../components/ui";

/** Nút chăm: nền teal mềm thống nhất theo spec mockup; icon giữ màu ngữ nghĩa của từng hành động. */
const CARE_BTNS: { kind: CareKind; icon: string; label: string; color: string }[] = [
  { kind: "water", icon: "water", label: "Tưới nước", color: "#0284c7" },
  { kind: "sun", icon: "sunny", label: "Tắm nắng", color: "#d97706" },
  { kind: "love", icon: "heart", label: "Bón tim", color: "#C93A5B" },
  { kind: "bug", icon: "bug", label: "Bắt sâu", color: "#16a34a" },
];

/** Hàng nút chăm — nhận `now` từ panel cha (component nhỏ, tick 1s riêng trong panel). */
function CareButtons({ plant, me, now, onCare }: { plant: PlantState; me: PersonId; now: number; onCare: (kind: CareKind) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {CARE_BTNS.map((b) => {
        const cs = careStatus(plant, b.kind, me, now);
        return <IconBtn key={b.kind} icon={b.icon} label={b.label} color={b.color} bg={ROLE.partnerSoft} disabled={!cs.ok} onPress={() => onCare(b.kind)} />;
      })}
    </View>
  );
}

/**
 * Card "Đang chăm" — chi tiết cây đang chọn nằm INLINE trong card (không bottom sheet):
 * hình cây + giai đoạn, 3 thanh chỉ số, tiến trình, nút thu hoạch/thu kỷ niệm, hàng nút chăm.
 * Có đồng hồ tick 1 giây riêng để đếm ngược/cooldown không kéo cả màn Vườn vẽ lại.
 */
function PlantCarePanel({ plant, state, onCare, careMsg, onHarvest, onCollect }: {
  plant: PlantState;
  state: AppState;
  onCare: (kind: CareKind) => void;
  careMsg: string;
  onHarvest: () => void;
  onCollect: () => void;
}) {
  const now = useNow(1000);
  const me = state.currentUser;
  const sp = speciesById(plant.speciesId);
  const proj = stageInfo(plant, now);
  const stats = decayedPlantStats(plant, now);
  const health = treeHealth(stats);
  const factor = growthFactor(stats);
  const fruit = fruitPending(plant, now);
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="flower" size={18} color={COLOR.tealDark} />
        <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: COLOR.text, flex: 1 }}>Đang chăm</Text>
        {/* Chip trạng thái cây: health.message là câu dài (ổn/khát nước/thiếu nắng/nhớ yêu
            thương — cùng một vị trí này) nên chip + Text PHẢI co được (flexShrink 1,
            minWidth 0) để chữ xuống dòng gọn trong thẻ; thiếu 2 thuộc tính này thì Text
            bị đo theo bề rộng nội dung 1 dòng và tràn/cắt chữ ở mép phải thẻ. */}
        <View style={[s.chip, { flexShrink: 1, minWidth: 0, backgroundColor: health.status === "wilted" ? COLOR.dangerSoft : health.status === "need" ? COLOR.warningSoft : COLOR.successSoft }]}>
          <Ionicons name={health.status === "wilted" ? "alert-circle" : "happy"} size={13} color={health.status === "wilted" ? COLOR.danger : COLOR.text} />
          <Text style={[s.chipText, { color: COLOR.text, flexShrink: 1, minWidth: 0 }]}>{health.message}</Text>
        </View>
      </View>

      {health.status === "wilted" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <MascotArt size={46} />
          <Text style={[s.small, { flex: 1 }]}>Mầm nhắc: cây đang héo nên tạm ngừng lớn — tưới nước, phơi nắng và gửi yêu thương để cứu cây nhé.</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 12, marginTop: 10, alignItems: "center" }}>
        <PlantImage speciesId={plant.speciesId} stageIndex={proj.index} size={96} status={health.status} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{sp.name}</Text>
          <Text style={{ fontSize: 12.5, color: ROLE.selfDark, fontFamily: FONT.bold }}>Giai đoạn {proj.index + 1}/{sp.stages.length}: {proj.stage.name}</Text>
          <Text style={s.small}>{proj.stage.desc}</Text>
          <Text style={s.small}>Đã chăm {plant.careCount} lần · Gần nhất: {plant.lastCareBy ? (plant.lastCareBy === "A" ? state.personA : state.personB) : "chưa ai"}</Text>
        </View>
      </View>

      <View style={{ gap: 8, marginTop: 12 }}>
        <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
        <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
        <StatBar label="Tình yêu" icon="heart" value={stats.love} color={COLOR.primary} />
      </View>

      <View style={{ gap: 4, marginTop: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12.5, fontFamily: FONT.bold, color: COLOR.text }}>{proj.mature ? "Đã trưởng thành" : proj.next ? `Tới "${proj.next.name}"` : ""}</Text>
          <Text style={{ fontSize: 12.5, color: ROLE.selfDark, fontFamily: FONT.extrabold }}>{proj.mature ? "Hoàn thành" : factor <= 0 ? "cây đang héo — chưa lớn tiếp" : `còn ${formatDuration(Math.max(0, proj.remainingToNextMs / factor))}`}</Text>
        </View>
        <View style={{ height: 9, borderRadius: 99, backgroundColor: COLOR.track, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${proj.progressInStage}%`, backgroundColor: COLOR.success, borderRadius: 99 }} />
        </View>
      </View>

      {fruit && (
        <TouchableOpacity style={[s.btn, { backgroundColor: "#dc2626", marginTop: 12 }]} onPress={onHarvest}>
          <Ionicons name="gift" size={17} color="#fff" /><Text style={s.btnText}>Thu hoạch quả chín (+{sp.fruitCoins} Xu)</Text>
        </TouchableOpacity>
      )}
      {proj.mature && sp.fruitCycleMs <= 0 && (
        <TouchableOpacity style={[s.btn, { backgroundColor: "#8B5CF6", marginTop: 12 }]} onPress={onCollect}>
          <Ionicons name="trophy" size={17} color="#fff" /><Text style={s.btnText}>Thu vào kỷ niệm (+{sp.matureRewardCoins} Xu)</Text>
        </TouchableOpacity>
      )}

      <View style={{ marginTop: 14 }}>
        <CareButtons plant={plant} me={me} now={now} onCare={onCare} />
        {careMsg ? <Text style={{ textAlign: "center", color: "#b45309", fontFamily: FONT.bold, fontSize: 12.5, marginTop: 7 }}>{careMsg}</Text> : null}
        <Text style={[s.small, { textAlign: "center", marginTop: 6 }]}>Nghỉ 60 giây giữa 2 lần chăm cùng một cây</Text>
      </View>
    </View>
  );
}

export default function GardenScreen() {
  const { state, dispatch, hydrated } = useLove();
  const { couple } = useAuth();
  // Tick THÔ (30s) cho ô đất ở màn chính — đếm ngược từng giây nằm trong PlantCarePanel.
  const now = useNow(30000);
  const [seedOpen, setSeedOpen] = useState(false);
  const [falling, setFalling] = useState<LoveLetter | null>(null);
  const [fallAnim] = useState(() => new Animated.Value(0));
  const [careMsg, setCareMsg] = useState("");

  const me = state.currentUser;
  const meName = myName(state);
  const selected = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];

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

  const gardenActs = useMemo(
    () => state.activities.filter((a) => ["leaf", "water", "sunny", "heart", "bug", "gift", "trophy", "mail", "sparkles"].includes(a.icon)).slice(0, 5),
    [state.activities],
  );

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: COLOR.bg, padding: SPACE.screenX, paddingTop: 42, gap: SPACE.cardGap }}>
        <SkeletonCard height={210} />
        <SkeletonCard height={240} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải khu vườn...</Text>
      </View>
    );
  }

  const plotCell = (i: number) => {
    const p = state.plants[i];
    if (!p) {
      return (
        <TouchableOpacity key={i} style={styles.plotEmpty} onPress={() => setSeedOpen(true)}>
          <EmptyPlotImage size={62} />
          <Text style={{ fontSize: 11, color: C.textSoft, fontFamily: FONT.bold }}>Gieo hạt</Text>
        </TouchableOpacity>
      );
    }
    const info = stageInfo(p, now);
    const isSel = selected?.id === p.id;
    return (
      <TouchableOpacity key={p.id} style={[styles.plot, isSel && styles.plotSel]} onPress={() => dispatch({ type: "SELECT_PLANT", plantId: p.id })}>
        <PlantImage speciesId={p.speciesId} stageIndex={info.index} size={72} />
        <Text style={{ fontSize: 11.5, fontFamily: FONT.extrabold, color: COLOR.text, textAlign: "center" }} numberOfLines={1}>{speciesById(p.speciesId).name}</Text>
        <Text style={{ fontSize: 10, color: C.textFaint }}>{info.stage.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: COLOR.bg }} contentContainerStyle={{ padding: SPACE.screenX, paddingTop: 46, paddingBottom: 30, gap: SPACE.cardGap }}>
        {/* Tiêu đề mỏng — không phải card */}
        <Text style={{ fontSize: 18, fontFamily: FONT.black, color: COLOR.text }}>Vườn cây</Text>

        {/* CARD 1 — lưới ô đất 2x2; ô đang chọn viền mint */}
        <View style={s.card}>
          <View style={{ gap: SPACE.sm }}>
            <View style={{ flexDirection: "row", gap: SPACE.sm }}>{plotCell(0)}{plotCell(1)}</View>
            <View style={{ flexDirection: "row", gap: SPACE.sm }}>{plotCell(2)}{plotCell(3)}</View>
          </View>
        </View>

        {/* CARD 2 — Đang chăm: chi tiết cây INLINE trong card */}
        {selected ? (
          <PlantCarePanel
            plant={selected}
            state={state}
            onCare={care}
            careMsg={careMsg}
            onHarvest={() => dispatch({ type: "HARVEST_FRUIT", plantId: selected.id, actor: meName })}
            onCollect={() => dispatch({ type: "COLLECT_PLANT", plantId: selected.id, actor: meName })}
          />
        ) : (
          <View style={[s.card, { alignItems: "center", gap: 6 }]}>
            <MascotArt size={104} />
            <Text style={s.title}>Vườn đang trống</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Gieo hạt đầu tiên để bắt đầu trồng cây nhé.</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 4 }]} onPress={() => setSeedOpen(true)}><Ionicons name="add" size={17} color="#fff" /><Text style={s.btnText}>Gieo hạt ngay</Text></TouchableOpacity>
          </View>
        )}

        {/* Hoạt động chăm vườn — danh sách ngắn tối đa 5 dòng, nằm dưới 2 card */}
        <View style={{ paddingHorizontal: 2 }}>
          <SectionTitle icon="time" color={ROLE.partner}>Hoạt động chăm vườn</SectionTitle>
          <View style={{ gap: 8, marginTop: 10 }}>
            {gardenActs.map((a) => (
              <View key={a.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Ionicons name={(a.icon + "-outline") as never} size={16} color={COLOR.primary} />
                <Text style={{ flex: 1, fontSize: 12.5, color: COLOR.text }}><Text style={{ fontFamily: FONT.extrabold }}>{a.actor}</Text> {a.text}</Text>
                <Text style={s.small}>{new Date(a.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            ))}
            {gardenActs.length === 0 && <Text style={s.sub}>Chưa có hoạt động nào. Hãy chăm cây đầu tiên nhé!</Text>}
          </View>
          {couple && couple.members.length < 2 && <Text style={[s.small, { marginTop: 8 }]}>Vườn đang có 1 người — gửi mã mời {couple.code} cho người ấy để cùng chăm nhé.</Text>}
        </View>
      </ScrollView>

      {/* Thư rơi — phong bì nét mảnh đơn giản, đồng bộ với tab Thư */}
      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 130] }) }, { rotate: fallAnim.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "3deg"] }) }] }}>
          <TouchableOpacity style={styles.fallingCard} onPress={() => { setFalling(null); router.push("/(tabs)/letters"); }}>
            <LetterEnvelopeImage size={58} />
            <Text style={{ fontFamily: FONT.black, color: C.pinkDark }}>Một lá thư vừa rơi!</Text>
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
                    <PlantImage speciesId={sp.id} stageIndex={sp.stages.length - 1} size={54} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.extrabold, color: COLOR.text, fontSize: 13.5 }}>{sp.name}</Text>
                      <Text style={s.small}>{sp.stages.length} giai đoạn · khoảng {daysTotal} ngày · {sp.trait}</Text>
                      <Text style={{ fontSize: 11.5, color: locked ? "#b91c1c" : C.pinkDark, fontFamily: FONT.bold }}>{locked ? `Khóa: cần thu ${sp.lockMaturedCount} cây trưởng thành vào kỷ niệm` : sp.seedPrice === 0 ? "Miễn phí" : `${sp.seedPrice} Xu Tim`}</Text>
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
  plot: { flex: 1, alignItems: "center", backgroundColor: "#FFFCFA", borderRadius: RADIUS.inner, borderWidth: 2, borderColor: COLOR.border, paddingVertical: 10, gap: 2 },
  plotSel: { borderColor: ROLE.partner, backgroundColor: "#FFFFFF" },
  plotEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: RADIUS.inner, borderWidth: 2, borderStyle: "dashed", borderColor: "#D8CBD2", paddingVertical: 12 },
  fallingCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: COLOR.primary, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3, elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: "86%" },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff7f8", borderRadius: 16, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 10 },
});

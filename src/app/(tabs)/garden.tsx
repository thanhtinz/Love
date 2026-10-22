import React, { useEffect, useMemo, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLove, makeLetter, decideCareDrop, myName, type CareKind } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { ACHIEVEMENTS, DATE_IDEAS, LOVE_ACTIONS, MOODS, QUESTS, shopItem, timeSky } from "../../lib/data";
import { MAX_PLOTS, SPECIES, decayedPlantStats, formatDuration, fruitPending, growthFactor, speciesById, stageInfo, totalGrowthMs, totalMaturedCount } from "../../lib/plants";
import { daysTogether, treeHealth, type LoveLetter } from "../../lib/types";
import PlantArt from "../../components/PlantArt";
import Avatar from "../../components/Avatar";
import FaceIcon from "../../components/FaceIcon";
import { C, IconBtn, SectionTitle, StatBar, s } from "../../components/ui";

const CARE_BTNS: { kind: CareKind; icon: string; label: string; color: string; bg: string }[] = [
  { kind: "water", icon: "water", label: "Tưới nước", color: "#0284c7", bg: "#e0f2fe" },
  { kind: "sun", icon: "sunny", label: "Tắm nắng", color: "#d97706", bg: "#fef3c7" },
  { kind: "love", icon: "heart", label: "Bón tim", color: "#e11d48", bg: "#ffe4e6" },
  { kind: "bug", icon: "bug", label: "Bắt sâu", color: "#16a34a", bg: "#dcfce7" },
];

export default function GardenScreen() {
  const { state, dispatch, connected, hydrated } = useLove();
  const { couple } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [seedOpen, setSeedOpen] = useState(false);
  const [ideaIdx, setIdeaIdx] = useState(() => Math.floor(Date.now() / 86400000) % DATE_IDEAS.length);
  const [falling, setFalling] = useState<LoveLetter | null>(null);
  const [fallAnim] = useState(() => new Animated.Value(0));

  const me = state.currentUser;
  const meName = myName(state);
  const selected = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const sky = timeSky(new Date().getHours());
  const sceneItem = shopItem(state.equipped.scene);
  const sceneColor = state.equipped.scene === "scene-auto" || !sceneItem.visual ? sky.sky : sceneItem.visual;
  const potColor = shopItem(state.equipped.pot).visual || "#fb923c";
  const accessory = shopItem(state.equipped.accessory).visual || "";
  const days = daysTogether(state.startDate);

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  /* Lên giai đoạn theo thời gian thật -> STAGE_UP (+ thư mừng theo tỉ lệ loài) */
  useEffect(() => {
    for (const p of state.plants) {
      const info = stageInfo(p);
      if (info.index > p.announcedStage) {
        const sp = speciesById(p.speciesId);
        let drop: LoveLetter | null = null;
        const r = Math.random();
        if (Math.random() < 0.7) {
          const rarity = info.mature && Math.random() < 0.5 ? "legendary" : r < sp.stageLetterLegendary ? "legendary" : r < sp.stageLetterLegendary + sp.stageLetterRare || sp.stageLetterRare >= 1 ? "rare" : "common";
          drop = makeLetter(rarity, info.mature ? "Cây trưởng thành" : "Lên giai đoạn mới", state.letters.map((l) => l.messageId));
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
    const { drop, combo } = decideCareDrop(state, selected.id, kind);
    dispatch({ type: "TREE_ACTION", kind, actor: meName, user: me, plantId: selected.id, drop, combo });
    if (drop) setFalling(drop);
  }

  function questProgress(q: (typeof QUESTS)[0]): number {
    if (q.key === "water") return state.daily.water;
    if (q.key === "love") return state.daily.love;
    return (state.daily.caredA ? 1 : 0) + (state.daily.caredB ? 1 : 0);
  }
  function claimQuest(q: (typeof QUESTS)[0]) {
    const drop = q.id === "both" ? makeLetter("rare", "Thưởng nhiệm vụ Song chăm", state.letters.map((l) => l.messageId)) : null;
    dispatch({ type: "CLAIM_QUEST", questId: q.id, actor: meName, rewardXp: q.rewardXp, drop });
    if (drop) setFalling(drop);
  }

  if (!hydrated) {
    return <View style={styles.center}><Ionicons name="leaf" size={40} color={C.pink} /><Text style={s.sub}>Đang tải khu vườn...</Text></View>;
  }

  const idea = DATE_IDEAS[ideaIdx % DATE_IDEAS.length];
  const myMood = me === "A" ? state.moods.A : state.moods.B;
  const partnerMood = me === "A" ? state.moods.B : state.moods.A;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: sceneColor }} contentContainerStyle={{ padding: 14, paddingBottom: 30, gap: 14 }}>
        {/* Header */}
        <View style={[s.card, { marginTop: 26 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: "900", color: C.text }}>{state.gardenName}</Text>
              <Text style={s.small}>{sky.label} · Mã vườn {state.roomCode} · {connected ? "Đang kết nối realtime" : "Chế độ ngoại tuyến"}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 5 }}>
              <View style={s.chip}><Ionicons name="diamond" size={13} color={C.pinkDark} /><Text style={s.chipText}>{state.coins} Xu Tim</Text></View>
              <View style={[s.chip, { backgroundColor: "#ffedd5" }]}><Ionicons name="flame" size={13} color="#ea580c" /><Text style={[s.chipText, { color: "#9a3412" }]}>Streak {state.streak.count} ngày</Text></View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            <Avatar id={state.avatarA} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{state.personA} + {state.personB}</Text>
              <Text style={s.small}>Ngày thứ {days} bên nhau · XP vườn {state.tree.xp}</Text>
            </View>
            <Avatar id={state.avatarB} size={38} />
          </View>
          {state.lastLoveAction && (
            <View style={{ marginTop: 10, backgroundColor: C.pinkSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", gap: 7, alignItems: "center" }}>
              <Ionicons name={state.lastLoveAction.icon as never} size={16} color={C.pink} />
              <Text style={{ fontSize: 12.5, color: C.pinkDark, flex: 1 }}>{state.lastLoveAction.actor} vừa {state.lastLoveAction.label}</Text>
            </View>
          )}
        </View>

        {/* Cây đang chọn */}
        {selected && proj && stats && health ? (
          <View style={s.card}>
            <View style={{ alignItems: "center" }}>
              <PlantArt speciesId={selected.speciesId} stageIndex={proj.index} totalStages={speciesById(selected.speciesId).stages.length} wilted={health.status === "wilted"} potColor={potColor} accessory={accessory} fruitReady={fruitPending(selected, now)} size={190} />
              <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>{speciesById(selected.speciesId).name}</Text>
              <Text style={{ fontSize: 13, color: C.pinkDark, fontWeight: "700" }}>Giai đoạn {proj.index + 1}/{speciesById(selected.speciesId).stages.length}: {proj.stage.name}</Text>
              <Text style={[s.sub, { textAlign: "center" }]}>{proj.stage.desc}</Text>
              <View style={[s.chip, { backgroundColor: health.status === "wilted" ? "#fee2e2" : health.status === "need" ? "#fef3c7" : "#dcfce7", marginTop: 6 }]}>
                <Ionicons name={health.status === "wilted" ? "alert-circle" : "happy"} size={13} color={health.status === "wilted" ? "#b91c1c" : C.text} />
                <Text style={[s.chipText, { color: C.text }]}>{health.message} · Tốc độ lớn x{factor}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
              <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
              <StatBar label="Tình yêu" icon="heart" value={stats.love} color="#f43f5e" />
            </View>

            <View style={{ marginTop: 10, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text }}>{proj.mature ? "Đã trưởng thành" : proj.next ? `Tới "${proj.next.name}"` : ""}</Text>
                <Text style={{ fontSize: 12.5, color: C.pinkDark, fontWeight: "800" }}>{proj.mature ? "Hoàn thành" : `còn ${formatDuration(Math.max(0, proj.remainingToNextMs / Math.max(factor, 0.0001)))}`}</Text>
              </View>
              <View style={{ height: 9, borderRadius: 99, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${proj.progressInStage}%`, backgroundColor: C.green, borderRadius: 99 }} />
              </View>
              <Text style={s.small}>Đếm ngược theo thời gian thật (đã tính tốc độ theo sức khỏe cây). Cây lớn cả khi hai bạn không mở app.</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {CARE_BTNS.map((b) => (<IconBtn key={b.kind} icon={b.icon} label={b.label} color={b.color} bg={b.bg} onPress={() => care(b.kind)} />))}
            </View>

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
            <Text style={[s.small, { textAlign: "center", marginTop: 8 }]}>Đã chăm cây này {selected.careCount} lần · Chăm cây có cơ hội rơi thư tình vào Hộp thư</Text>
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
                    <Text style={{ fontSize: 11, color: C.textFaint, fontWeight: "700" }}>Gieo hạt</Text>
                  </TouchableOpacity>
                );
              }
              const info = stageInfo(p, now);
              const isSel = selected?.id === p.id;
              return (
                <TouchableOpacity key={p.id} style={[styles.plot, isSel && styles.plotSel]} onPress={() => dispatch({ type: "SELECT_PLANT", plantId: p.id })}>
                  <PlantArt speciesId={p.speciesId} stageIndex={info.index} totalStages={speciesById(p.speciesId).stages.length} potColor={potColor} fruitReady={fruitPending(p, now)} size={64} />
                  <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.text, textAlign: "center" }} numberOfLines={1}>{speciesById(p.speciesId).name}</Text>
                  <Text style={{ fontSize: 9.5, color: C.textFaint }}>{info.stage.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hành động yêu thương + mood + gợi ý hẹn */}
        <View style={s.card}>
          <SectionTitle icon="heart">Gửi yêu thương nhanh</SectionTitle>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {LOVE_ACTIONS.map((a) => (
              <IconBtn key={a.kind} icon={a.icon.replace("-outline", "")} label={a.name} color={C.pinkDark} bg={C.pinkSoft} onPress={() => dispatch({ type: "LOVE_ACTION", kind: a.kind, icon: a.icon, label: a.label, actor: meName, user: me })} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <View style={styles.moodBox}><FaceIcon mood={myMood} size={40} /><Text style={styles.moodName}>Bạn: {MOODS.find((m) => m.id === myMood)?.label || "..."}</Text></View>
            <View style={styles.moodBox}><FaceIcon mood={partnerMood} size={40} /><Text style={styles.moodName}>Người ấy: {MOODS.find((m) => m.id === partnerMood)?.label || "..."}</Text></View>
          </View>
          <TouchableOpacity style={[s.btnGhost, { marginTop: 10 }]} onPress={() => router.push("/(tabs)/utilities")}>
            <Ionicons name="create" size={15} color={C.pinkDark} /><Text style={s.btnGhostText}>Cập nhật tâm trạng ở mục Tiện ích</Text>
          </TouchableOpacity>
          <View style={{ marginTop: 12, backgroundColor: "#fff7ed", borderRadius: 14, padding: 10, flexDirection: "row", gap: 9, alignItems: "center" }}>
            <Ionicons name={idea.icon as never} size={22} color="#ea580c" />
            <Text style={{ flex: 1, fontSize: 13, color: C.text }}><Text style={{ fontWeight: "800" }}>Gợi ý hẹn hò: </Text>{idea.text}</Text>
            <TouchableOpacity onPress={() => setIdeaIdx((v) => v + 1)}><Ionicons name="refresh-circle" size={26} color={C.amber} /></TouchableOpacity>
          </View>
        </View>

        {/* Nhiệm vụ ngày */}
        <View style={s.card}>
          <SectionTitle icon="trophy" color={C.amber}>Nhiệm vụ hôm nay</SectionTitle>
          <View style={{ gap: 9, marginTop: 10 }}>
            {QUESTS.map((q) => {
              const prog = Math.min(questProgress(q), q.target);
              const claimed = state.daily.claimed.includes(q.id);
              const done = prog >= q.target;
              return (
                <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <Ionicons name={q.icon as never} size={19} color={done ? C.green : C.textFaint} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{q.label}</Text>
                    <Text style={s.small}>Tiến độ {prog}/{q.target} · Thưởng +{q.rewardXp} XP, +{q.rewardCoins} Xu{q.id === "both" ? ", +1 thư Hiếm" : ""}</Text>
                  </View>
                  {claimed ? (<View style={s.chip}><Text style={s.chipText}>Đã nhận</Text></View>) : done ? (
                    <TouchableOpacity style={[s.btnGhost, { paddingVertical: 7 }]} onPress={() => claimQuest(q)}><Text style={s.btnGhostText}>Nhận</Text></TouchableOpacity>
                  ) : (<Text style={s.small}>...</Text>)}
                </View>
              );
            })}
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.text, marginBottom: 6 }}>Huy hiệu ({state.achievements.length}/{ACHIEVEMENTS.length})</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {ACHIEVEMENTS.map((a) => {
                const has = state.achievements.includes(a.id);
                return (<View key={a.id} style={[s.chip, { backgroundColor: has ? "#fef3c7" : "#f1f5f9", opacity: has ? 1 : 0.55 }]}><Ionicons name={a.icon as never} size={13} color={has ? "#b45309" : C.textFaint} /><Text style={[s.chipText, { color: has ? "#92400e" : C.textFaint }]}>{a.label}</Text></View>);
              })}
            </View>
          </View>
        </View>

        {/* Hoạt động gần đây */}
        <View style={s.card}>
          <SectionTitle icon="time" color={C.sky}>Hoạt động gần đây</SectionTitle>
          <View style={{ gap: 8, marginTop: 10 }}>
            {state.activities.slice(0, 6).map((a) => (
              <View key={a.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Ionicons name={(a.icon + "-outline") as never} size={16} color={C.pink} />
                <Text style={{ flex: 1, fontSize: 12.5, color: C.text }}><Text style={{ fontWeight: "800" }}>{a.actor}</Text> {a.text}</Text>
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
            <Text style={{ fontWeight: "900", color: C.pinkDark }}>Một lá thư vừa rơi!</Text>
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
                      <Text style={{ fontWeight: "800", color: C.text, fontSize: 13.5 }}>{sp.name}</Text>
                      <Text style={s.small}>{sp.stages.length} giai đoạn · khoảng {daysTotal} ngày · {sp.trait}</Text>
                      <Text style={{ fontSize: 11.5, color: locked ? "#b91c1c" : C.pinkDark, fontWeight: "700" }}>{locked ? `Khóa: cần thu ${sp.lockMaturedCount} cây trưởng thành vào kỷ niệm` : sp.seedPrice === 0 ? "Miễn phí" : `${sp.seedPrice} Xu Tim`}</Text>
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
  moodBox: { flex: 1, alignItems: "center", gap: 3, backgroundColor: "#fff7ed", borderRadius: 14, paddingVertical: 8 },
  moodName: { fontSize: 11.5, fontWeight: "700", color: C.text },
  fallingCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderColor: C.pink, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3, elevation: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 10, maxHeight: "86%" },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff7f8", borderRadius: 16, borderWidth: 1.5, borderColor: C.pinkBorder, padding: 10 },
});

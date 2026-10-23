import React, { useEffect, useMemo, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLove, decideCareDrop, makeStageUpDrop, myName, type CareKind } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { SPECIES, careStatus, decayedPlantStats, formatDuration, fruitPending, growthFactor, speciesById, stageInfo, totalGrowthMs, totalMaturedCount } from "../../lib/plants";
import { PET_STAGE_LABEL, petCareStatus, petNeedsAt, petStageIndex, type PetCareKind } from "../../lib/features";
import { dayKeyLocal, treeHealth, type AppState, type LoveLetter, type PersonId, type PlantState } from "../../lib/types";
import { DECOR_FENCE_ART, DECOR_ITEM_ART, DECOR_PATH_ART, DECOR_SCENE_ART, EmptyPlotScene, LetterEnvelopeImage, MascotArt, PetImage, PlantScene } from "../../components/Art";
import Avatar from "../../components/Avatar";
import { partnerOf, selfOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW_FLOAT, SPACE, TYPE } from "../../components/theme";
import { ProgressBar, SkeletonCard, StatBar, s, useNow } from "../../components/ui";

/**
 * Tab Vườn — hệ "Vườn giấy ấm" (mockup vòng 2, user duyệt 2026-10-23).
 * Ngân sách phần tử: 1 CẢNH chung + 1 panel chăm + 1 danh sách dấu vết ngắn.
 * - Cảnh vườn: nền gardenWash bo 28 chứa 4 ô đất là BỆ (ellipse đất + tranh cây),
 *   không còn hộp trắng lồng trong hộp trắng; ô đang chọn có vòng mint + thẻ "Đang chọn".
 * - Panel chăm (card trắng duy nhất của màn): dòng trạng thái tổng một câu, cây trên
 *   bệ cảnh lớn, 3 stat bar trong một vùng tint (Nước mint · Nắng rose · Tình yêu primary),
 *   thanh giai đoạn, 4 hành động chăm dạng cột medallion.
 * - "Dấu vết chăm vườn": mọi dòng avatar-first (người chăm nào thì avatar người đó).
 * Lối vào Cửa hàng trang trí giữ lại thành một hàng E0 gọn dưới danh sách dấu vết —
 * đây là lối vào shop DUY NHẤT của tab Vườn (đã từng mất và bị user phàn nàn), mockup
 * không vẽ nhưng không được xoá; xem ghi chú trong báo cáo độ khớp.
 * Toàn bộ logic chăm/gieo hạt/thư rơi giữ nguyên như trước vòng làm lại giao diện.
 */

/** 4 hành động chăm: medallion tròn theo vai/màu ngữ nghĩa của mockup vòng 2. */
const CARE_BTNS: { kind: CareKind; icon: string; label: string; color: string; bg: string }[] = [
  { kind: "water", icon: "water", label: "Tưới nước", color: ROLE.partnerDark, bg: ROLE.partnerSoft },
  { kind: "sun", icon: "sunny", label: "Phơi nắng", color: ROLE.selfDark, bg: ROLE.selfSoft },
  { kind: "love", icon: "heart", label: "Lời yêu", color: ROLE.selfDark, bg: ROLE.selfSoft },
  { kind: "bug", icon: "bug", label: "Bắt sâu", color: ROLE.shared, bg: ROLE.sharedSoft },
];

/** Hàng nút chăm dạng cột (medallion 50 + nhãn) — nhận `now` từ panel cha (tick 1s). */
function CareButtons({ plant, me, now, onCare }: { plant: PlantState; me: PersonId; now: number; onCare: (kind: CareKind) => void }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {CARE_BTNS.map((b) => {
        const cs = careStatus(plant, b.kind, me, now);
        return (
          <TouchableOpacity
            key={b.kind}
            disabled={!cs.ok}
            onPress={() => onCare(b.kind)}
            accessibilityLabel={b.label}
            accessibilityState={{ disabled: !cs.ok }}
            style={{ flex: 1, alignItems: "center", gap: 6, opacity: cs.ok ? 1 : 0.45, paddingVertical: 2 }}
          >
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: b.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={b.icon as never} size={24} color={b.color} />
            </View>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.text }}>{b.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Panel chăm cây — chi tiết cây đang chọn INLINE trong card trắng duy nhất của màn.
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
  const firstBlockedReason = CARE_BTNS.map((b) => careStatus(plant, b.kind, me, now)).find((cs) => !cs.ok)?.reason || "";
  const dotColor = health.status === "wilted" ? COLOR.danger : health.status === "need" ? COLOR.warning : ROLE.partner;
  return (
    <View style={s.card}>
      {/* Dòng trạng thái tổng thể: chấm màu + đúng một câu */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dotColor, flexShrink: 0 }} />
        <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }}>{health.message}</Text>
      </View>

      {health.status === "wilted" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <MascotArt size={46} />
          <Text style={[s.small, { flex: 1 }]}>Mầm nhắc: cây đang héo nên tạm ngừng lớn — tưới nước, phơi nắng và gửi yêu thương để cứu cây nhé.</Text>
        </View>
      )}

      {/* Bệ cảnh lớn: cây đứng trên ellipse đất trong vùng gardenWash */}
      <View style={{ backgroundColor: COLOR.gardenWash, borderRadius: RADIUS.inner, marginTop: 14, overflow: "hidden" }}>
        <PlantScene speciesId={plant.speciesId} stageIndex={proj.index} status={health.status} height={158} imgHeight={142} soilRatio={0.13} />
      </View>
      <Text style={{ ...TYPE.caption, color: COLOR.textSoft, textAlign: "center", marginTop: 8 }}>
        {sp.name} · Đã chăm {plant.careCount} lần · Gần nhất: {plant.lastCareBy ? (plant.lastCareBy === "A" ? state.personA : state.personB) : "chưa ai"}
      </Text>

      {/* Vùng stat tint: 3 chỉ số — Nước mint, Nắng rose, Tình yêu primary (đúng mockup) */}
      <View style={{ backgroundColor: COLOR.bg, borderRadius: RADIUS.tile, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 5, marginTop: 12, gap: 11 }}>
        <StatBar label="Nước" value={stats.water} color={ROLE.partner} />
        <StatBar label="Nắng" value={stats.sun} color={ROLE.self} />
        <StatBar label="Tình yêu" value={stats.love} color={COLOR.primary} />
      </View>

      {/* Giai đoạn + tiến trình tới giai đoạn kế */}
      <View style={{ marginTop: 13 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.text }}>Giai đoạn {proj.index + 1} — {proj.stage.name}</Text>
          <Text style={{ ...TYPE.caption, color: COLOR.textSoft, textAlign: "right", flexShrink: 1 }}>
            {proj.mature ? "Đã trưởng thành" : factor <= 0 ? "Cây đang héo — chưa lớn tiếp" : `Còn ${formatDuration(Math.max(0, proj.remainingToNextMs / factor))} tới giai đoạn ${proj.index + 2}`}
          </Text>
        </View>
        <ProgressBar value={proj.progressInStage} color={COLOR.primary} height={8} />
      </View>

      {/* Thu hoạch / thu kỷ niệm: nút SECONDARY (không còn 2 khối màu đặc đỏ/tím giành
          sự chú ý với CTA và tranh cây như bản cũ). */}
      {fruit && (
        <TouchableOpacity style={[s.btnGhost, { backgroundColor: COLOR.warningSoft, borderColor: "transparent", marginTop: 14 }]} onPress={onHarvest}>
          <Ionicons name="gift" size={17} color={COLOR.warningText} />
          <Text style={[s.btnGhostText, { color: COLOR.warningText }]}>Thu hoạch quả chín (+{sp.fruitCoins} Xu)</Text>
        </TouchableOpacity>
      )}
      {proj.mature && sp.fruitCycleMs <= 0 && (
        <TouchableOpacity style={[s.btnGhost, { backgroundColor: ROLE.sharedSoft, borderColor: "transparent", marginTop: 14 }]} onPress={onCollect}>
          <Ionicons name="trophy" size={17} color={ROLE.sharedDark} />
          <Text style={[s.btnGhostText, { color: ROLE.sharedDark }]}>Thu vào kỷ niệm (+{sp.matureRewardCoins} Xu)</Text>
        </TouchableOpacity>
      )}

      <View style={{ marginTop: 16 }}>
        <CareButtons plant={plant} me={me} now={now} onCare={onCare} />
        {careMsg ? <Text style={{ textAlign: "center", color: COLOR.warningText, fontFamily: FONT.bold, fontSize: 12.5, marginTop: 9 }}>{careMsg}</Text> : null}
        {/* Lý do chặn của nút chăm đầu tiên đang bị khóa: nút bị disabled thì người dùng
            không bấm được để xem lý do (careMsg không bao giờ được set) — hiện sẵn ở đây
            (vd "Chờ 23 giây nữa" / "Nước đã đầy"). */}
        {!careMsg && firstBlockedReason ? <Text style={{ textAlign: "center", color: COLOR.warningText, fontFamily: FONT.bold, fontSize: 12.5, marginTop: 9 }}>{firstBlockedReason}</Text> : null}
      </View>
    </View>
  );
}

/** 3 hành động chăm pet — cùng ngôn ngữ medallion với nút chăm cây. */
const PET_BTNS: { kind: PetCareKind; icon: string; label: string; color: string; bg: string }[] = [
  { kind: "feed", icon: "restaurant", label: "Cho ăn", color: COLOR.warningText, bg: COLOR.warningSoft },
  { kind: "pet", icon: "heart", label: "Vuốt ve", color: ROLE.selfDark, bg: ROLE.selfSoft },
  { kind: "play", icon: "football", label: "Chơi cùng", color: ROLE.partnerDark, bg: ROLE.partnerSoft },
];

/**
 * Panel thú cưng chung — pet sống trong cảnh vườn (xem dải sân trước), panel này
 * là nơi chăm: 2 chỉ số No/Vui hao theo giờ, 3 hành động chăm với cooldown 60s/
 * người như chăm cây (khóa cứng ở reducer qua petCareStatus), lớn theo NGÀY chăm
 * khác nhau. Đổi tên pet: chạm vào ô tên, sửa rồi bấm xong.
 */
function PetPanel({ state, meName }: { state: AppState; meName: string }) {
  const { dispatch } = useLove();
  const now = useNow(1000);
  const pet = state.pet;
  const me = state.currentUser;
  const needs = petNeedsAt(pet, now);
  const stage = petStageIndex(pet);
  const [careMsg, setCareMsg] = useState("");
  const [nameText, setNameText] = useState(pet.name);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ ô tên khi tên pet đổi từ máy người ấy
  useEffect(() => { setNameText(pet.name); }, [pet.name]);

  function onCare(kind: PetCareKind) {
    const cs = petCareStatus(pet, kind, me, now);
    if (!cs.ok) { setCareMsg(cs.reason); return; }
    setCareMsg("");
    dispatch({ type: "PET_CARE", kind, user: me, actor: meName });
  }
  function saveName() {
    const v = nameText.trim();
    if (v && v !== pet.name) dispatch({ type: "PET_RENAME", name: v });
    else setNameText(pet.name);
  }
  const firstBlocked = PET_BTNS.map((b) => petCareStatus(pet, b.kind, me, now)).find((cs) => !cs.ok)?.reason || "";
  const statusText = needs.hunger < 25 ? `${pet.name} đang đói lắm — cho bé ăn nhé` : needs.joy < 25 ? `${pet.name} đang buồn — vuốt ve hay chơi cùng bé đi` : needs.hunger < 55 ? `${pet.name} hơi đói rồi` : needs.joy < 55 ? `${pet.name} muốn được chơi cùng` : `${pet.name} đang no và vui vẻ`;

  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ alignItems: "center", width: 96 }}>
          <PetImage stage={stage} size={92} />
          <View style={{ backgroundColor: ROLE.selfSoft, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, marginTop: 2 }}>
            <Text style={{ fontSize: 11, fontFamily: FONT.extrabold, color: ROLE.selfDark }}>{PET_STAGE_LABEL[stage]}</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <TextInput
              style={{ fontFamily: FONT.extrabold, fontSize: 18, color: COLOR.text, flexShrink: 1, minWidth: 60, paddingVertical: 0 }}
              value={nameText}
              onChangeText={setNameText}
              onBlur={saveName}
              onSubmitEditing={saveName}
              maxLength={20}
              accessibilityLabel="Tên thú cưng — sửa rồi bấm xong để lưu"
            />
            <Ionicons name="create-outline" size={15} color={COLOR.textFaint} />
          </View>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: COLOR.text }}>{statusText}</Text>
          <Text style={s.sub}>
            Đã chăm {pet.careCount.A + pet.careCount.B} lần · {pet.careDays.length} ngày có chăm · Lớn theo ngày chăm, không theo số lần trong ngày
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: COLOR.bg, borderRadius: RADIUS.tile, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 5, marginTop: 12, gap: 11 }}>
        <StatBar label="Độ no" value={needs.hunger} color={COLOR.warning} />
        <StatBar label="Niềm vui" value={needs.joy} color={COLOR.primary} />
      </View>

      <View style={{ flexDirection: "row", marginTop: 14 }}>
        {PET_BTNS.map((b) => {
          const cs = petCareStatus(pet, b.kind, me, now);
          return (
            <TouchableOpacity key={b.kind} disabled={!cs.ok} onPress={() => onCare(b.kind)} accessibilityLabel={`${b.label} ${pet.name}`} accessibilityState={{ disabled: !cs.ok }} style={{ flex: 1, alignItems: "center", gap: 6, opacity: cs.ok ? 1 : 0.45, paddingVertical: 2 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: b.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={b.icon as never} size={24} color={b.color} />
              </View>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.text }}>{b.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {careMsg ? <Text style={{ textAlign: "center", color: COLOR.warningText, fontFamily: FONT.bold, fontSize: 12.5, marginTop: 9 }}>{careMsg}</Text> : null}
      {!careMsg && firstBlocked ? <Text style={{ textAlign: "center", color: COLOR.warningText, fontFamily: FONT.bold, fontSize: 12.5, marginTop: 9 }}>{firstBlocked}</Text> : null}
      <Text style={[s.small, { textAlign: "center", marginTop: 8 }]}>Chăm pet nhận +3 Xu Tim, tối đa 5 lần được thưởng mỗi ngày cho mỗi người.</Text>
    </View>
  );
}

export default function GardenScreen() {
  const { state, dispatch, hydrated } = useLove();
  const { couple } = useAuth();
  const insets = useSafeAreaInsets();
  // Tick THÔ (30s) cho ô đất ở màn chính — đếm ngược từng giây nằm trong PlantCarePanel.
  const now = useNow(30000);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedErr, setSeedErr] = useState("");
  // Khóa gieo hạt: chạm đúp rất nhanh vào một hàng hạt có thể dispatch PLANT_SEED 2 lần
  // trước khi modal kịp đóng (trừ tiền 2 lần, 2 cây) — khóa ngay từ lần chạm đầu tiên.
  const [planting, setPlanting] = useState(false);
  const [falling, setFalling] = useState<LoveLetter | null>(null);
  const [fallAnim] = useState(() => new Animated.Value(0));
  const [careMsg, setCareMsg] = useState("");
  // Đổi cây đang chọn là thông báo chăm của cây cũ phải biến mất — bản cũ careMsg là
  // state cấp màn hình nên lý do của cây này còn dính khi đã chuyển sang cây khác.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset thông báo khi đổi cây chọn
  useEffect(() => { setCareMsg(""); }, [state.selectedPlantId]);

  const me = state.currentUser;
  const meName = myName(state);
  const meP = selfOf(state);
  const partnerP = partnerOf(state);
  const selected = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];

  /* Lên giai đoạn theo thời gian thật -> STAGE_UP (+ thư mừng theo tỉ lệ loài).
     Thư dùng makeStageUpDrop XÁC ĐỊNH theo (cây, giai đoạn): cả 2 máy cùng phát hiện
     cây lên giai đoạn sẽ tạo CÙNG id + CÙNG nội dung — bản cũ mỗi máy rút Math.random
     riêng nên cùng một id thư mang 2 nội dung khác nhau vĩnh viễn trên 2 máy. */
  useEffect(() => {
    for (const p of state.plants) {
      const info = stageInfo(p);
      if (info.index > p.announcedStage) {
        const drop = makeStageUpDrop(state, p.id, info.index, info.mature);
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
    () => state.activities.filter((a) => ["leaf", "water", "sunny", "heart", "bug", "gift", "trophy", "mail", "sparkles", "paw"].includes(a.icon)).slice(0, 5),
    [state.activities],
  );

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: COLOR.bg, padding: SPACE.screenX, paddingTop: insets.top + 42, gap: SPACE.cardGap }}>
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
        <TouchableOpacity key={i} style={styles.plotEmpty} onPress={() => setSeedOpen(true)} accessibilityLabel="Gieo hạt mới">
          <EmptyPlotScene height={86} imgHeight={78} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text, textAlign: "center", marginTop: 4 }}>Ô đất trống</Text>
          <Text style={{ fontSize: 12, color: COLOR.textSoft, textAlign: "center" }}>Gieo hạt mới</Text>
        </TouchableOpacity>
      );
    }
    const info = stageInfo(p, now);
    const isSel = selected?.id === p.id;
    // Truyền status để cây héo/yếu trên các ô KHÔNG được chọn cũng hiện mờ/xám —
    // bản cũ không truyền nên ngoài ô đang chọn, cây héo trông y như cây khỏe.
    const cellStatus = treeHealth(decayedPlantStats(p, now)).status;
    return (
      <TouchableOpacity key={p.id} style={[styles.plot, isSel && styles.plotSel]} onPress={() => dispatch({ type: "SELECT_PLANT", plantId: p.id })} accessibilityLabel={`Chọn ${speciesById(p.speciesId).name}`}>
        {isSel && (
          <View style={styles.selTag}>
            <Text style={{ fontSize: 10.5, fontFamily: FONT.extrabold, color: "#fff", lineHeight: 13 }}>Đang chọn</Text>
          </View>
        )}
        <PlantScene speciesId={p.speciesId} stageIndex={info.index} status={cellStatus} height={104} imgHeight={98} soilRatio={0.15} />
        <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text, textAlign: "center", marginTop: 4 }} numberOfLines={1}>{speciesById(p.speciesId).name}</Text>
        <Text style={{ fontSize: 12, color: COLOR.textSoft, textAlign: "center" }} numberOfLines={1}>Giai đoạn {info.index + 1} · {info.stage.name}</Text>
      </TouchableOpacity>
    );
  };

  // Thời gian thân thiện cho dòng dấu vết: hôm nay -> giờ; hôm qua -> "Hôm qua"; cũ hơn -> ngày/tháng.
  // Dùng `now` (state tick của màn hình) thay vì Date.now() trực tiếp trong render.
  const traceTime = (iso: string) => {
    const d = new Date(iso);
    const key = dayKeyLocal(d);
    if (key === dayKeyLocal(new Date(now))) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (key === dayKeyLocal(new Date(now - 86400000))) return "Hôm qua";
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: COLOR.bg }} contentContainerStyle={{ padding: SPACE.screenX, paddingTop: insets.top + 14, paddingBottom: 30, gap: SPACE.sectionGap }}>
        {/* Đầu màn: H1 + mô tả + chip Xu Tim trắng */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>Vườn của hai đứa</Text>
            <Text style={[s.sub, { marginTop: 3 }]}>Bốn ô đất, một khu vườn chung</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border, borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: 11, marginTop: 4 }}>
            <Ionicons name="heart" size={14} color={COLOR.primary} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: COLOR.text }}>{state.coins.toLocaleString("vi-VN")} Xu Tim</Text>
          </View>
        </View>

        {/* CẢNH VƯỜN CHUNG — nền mùa (nếu đã trang bị cảnh decor) + lối đi giữa +
            4 bệ đất + dải sân trước (vật đặt + thú cưng) + hàng rào viền dưới */}
        <View style={styles.scene}>
          {state.decor.sceneBg && DECOR_SCENE_ART[state.decor.sceneBg] ? (
            <Image source={DECOR_SCENE_ART[state.decor.sceneBg]} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Cảnh vườn theo mùa" />
          ) : null}
          {state.decor.path && DECOR_PATH_ART[state.decor.path] ? (
            <View style={{ position: "absolute", top: 6, bottom: 34, left: "50%", width: 76, marginLeft: -38 }}>
              <Image source={DECOR_PATH_ART[state.decor.path]} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel="Lối đi trong vườn" />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>{plotCell(0)}{plotCell(1)}</View>
          <View style={{ flexDirection: "row", gap: 10 }}>{plotCell(2)}{plotCell(3)}</View>
          {/* Dải sân trước: 3 khe vật đặt (trái/giữa/phải) + pet đứng ở góc phải */}
          <View style={styles.yard}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.yardSlot}>
                {state.decor.placed[i] && DECOR_ITEM_ART[state.decor.placed[i]] ? (
                  <Image source={DECOR_ITEM_ART[state.decor.placed[i]]} style={{ width: 54, height: 54 }} contentFit="contain" accessibilityLabel="Vật trang trí trong vườn" />
                ) : null}
              </View>
            ))}
            <View style={styles.yardPet}>
              <PetImage stage={petStageIndex(state.pet)} size={56} />
              <Text style={{ fontSize: 10.5, fontFamily: FONT.extrabold, color: COLOR.text, marginTop: -2 }} numberOfLines={1}>{state.pet.name}</Text>
            </View>
          </View>
          {state.decor.fence && DECOR_FENCE_ART[state.decor.fence] ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, zIndex: 3 }} pointerEvents="none">
              <Image source={DECOR_FENCE_ART[state.decor.fence]} style={{ width: "100%", height: "100%" }} contentFit="cover" accessibilityLabel="Hàng rào vườn" />
            </View>
          ) : null}
        </View>

        {/* PANEL CHĂM — card trắng duy nhất của màn */}
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
            <Text style={s.cardTitle}>Vườn đang trống</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Gieo hạt đầu tiên để bắt đầu trồng cây nhé.</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 4 }]} onPress={() => setSeedOpen(true)}><Ionicons name="add" size={17} color="#fff" /><Text style={s.btnText}>Gieo hạt ngay</Text></TouchableOpacity>
          </View>
        )}

        {/* THÚ CƯNG CHUNG — panel chăm pet (pet đứng ở dải sân trước trong cảnh) */}
        <PetPanel state={state} meName={meName} />

        {/* DẤU VẾT CHĂM VƯỜN — avatar-first, tối đa 5 dòng */}
        <View>
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text }}>Dấu vết chăm vườn</Text>
          <View style={{ marginTop: 6 }}>
            {gardenActs.map((a, idx) => {
              const slot = a.slot ?? (a.actor === state.personB ? "B" : a.actor === state.personA ? "A" : null);
              const person = slot === "A" ? (meP.slot === "A" ? meP : partnerP) : slot === "B" ? (meP.slot === "B" ? meP : partnerP) : null;
              return (
                <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: COLOR.border }}>
                  {person ? (
                    <Avatar id={person.avatar} size={28} ring={person.main} />
                  ) : (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ROLE.sharedSoft, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={(a.icon + "-outline") as never} size={15} color={ROLE.shared} />
                    </View>
                  )}
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, color: COLOR.text }}><Text style={{ fontFamily: FONT.bold }}>{a.actor}</Text> {a.text}</Text>
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.textSoft }}>{traceTime(a.time)}</Text>
                </View>
              );
            })}
            {gardenActs.length === 0 && <Text style={[s.sub, { marginTop: 4 }]}>Chưa có hoạt động nào. Hãy chăm cây đầu tiên nhé!</Text>}
          </View>
          {couple && couple.members.length < 2 && <Text style={[s.small, { marginTop: 8 }]}>Vườn đang có 1 người — gửi mã mời {couple.code} cho người ấy để cùng chăm nhé.</Text>}
        </View>

        {/* Lối vào Cửa hàng trang trí (hàng E0 gọn — giữ lối vào shop của tab Vườn) */}
        <TouchableOpacity style={styles.shopRow} onPress={() => router.push("/utilities/shop")} accessibilityLabel="Mở cửa hàng trang trí" accessibilityRole="button">
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: COLOR.warningSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="bag-handle" size={22} color={COLOR.warningText} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: COLOR.text }}>Cửa hàng trang trí</Text>
            <Text style={s.sub}>Chậu cây, khung cảnh vườn, phụ kiện — mua bằng Xu Tim chung</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLOR.chevron} style={{ flexShrink: 0 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* Thư rơi — thẻ giấy thư nổi E2, đồng bộ ngôn ngữ với trang Thư đã lưu (/letters) */}
      {falling && (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, alignItems: "center", transform: [{ translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 130] }) }, { rotate: fallAnim.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "3deg"] }) }] }}>
          <TouchableOpacity style={styles.fallingCard} onPress={() => { setFalling(null); router.push("/letters"); }}>
            <LetterEnvelopeImage size={58} />
            <Text style={{ fontFamily: FONT.black, fontSize: 15, color: COLOR.text }}>Một lá thư vừa rơi!</Text>
            <Text style={s.small}>Chạm để vào Hộp thư mở đọc</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modal gieo hạt — sheet bo 32 theo hệ mới */}
      <Modal visible={seedOpen} transparent animationType="slide" onRequestClose={() => setSeedOpen(false)} onShow={() => { setPlanting(false); setSeedErr(""); }}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.grab} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.cardTitle}>Chọn hạt giống</Text>
              <TouchableOpacity onPress={() => setSeedOpen(false)} hitSlop={10}><Ionicons name="close-circle" size={26} color={COLOR.textFaint} /></TouchableOpacity>
            </View>
            <Text style={s.sub}>Số dư: {state.coins.toLocaleString("vi-VN")} Xu Tim · Đã thu {totalMaturedCount(state)} cây trưởng thành vào kỷ niệm</Text>
            {seedErr ? <Text style={{ color: COLOR.danger, fontFamily: FONT.bold, fontSize: 12.5 }}>{seedErr}</Text> : null}
            <ScrollView style={{ maxHeight: 430 }} contentContainerStyle={{ gap: 9 }}>
              {SPECIES.map((sp) => {
                const locked = sp.lockMaturedCount > 0 && totalMaturedCount(state) < sp.lockMaturedCount;
                const afford = state.coins >= sp.seedPrice;
                const daysTotal = Math.max(1, Math.round(totalGrowthMs(sp) / 86400000));
                return (
                  <TouchableOpacity key={sp.id} disabled={locked || !afford || planting} style={[styles.seedRow, (locked || !afford) && { opacity: 0.5 }]} onPress={() => {
                    if (planting) return;
                    // Kiểm lại điều kiện NGAY lúc bấm bằng state mới nhất: trong lúc modal
                    // đang mở, đồng bộ có thể đã thay đổi vườn (người thương vừa gieo cây
                    // thứ 4 / vừa tiêu Xu) — bản cũ cứ dispatch rồi đóng modal, reducer
                    // từ chối lặng lẽ: không cây, không trừ tiền, không một lời giải thích.
                    if (state.plants.length >= 4) { setSeedErr("Vườn đã đủ 4 cây rồi — thu hoạch hoặc thu một cây vào kỷ niệm trước nhé."); return; }
                    if (state.coins < sp.seedPrice) { setSeedErr(`Chưa đủ Xu Tim cho hạt này (cần ${sp.seedPrice} Xu).`); return; }
                    setPlanting(true); dispatch({ type: "PLANT_SEED", speciesId: sp.id, actor: meName }); setSeedOpen(false);
                  }}>
                    <View style={{ width: 62 }}>
                      <PlantScene speciesId={sp.id} stageIndex={sp.stages.length - 1} height={56} imgHeight={50} soilRatio={0.18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.extrabold, color: COLOR.text, fontSize: 13.5 }}>{sp.name}</Text>
                      <Text style={s.small}>{sp.stages.length} giai đoạn · khoảng {daysTotal} ngày · {sp.trait}</Text>
                      <Text style={{ fontSize: 11.5, color: locked ? COLOR.danger : ROLE.selfDark, fontFamily: FONT.bold }}>{locked ? `Khóa: cần thu ${sp.lockMaturedCount} cây trưởng thành vào kỷ niệm` : sp.seedPrice === 0 ? "Miễn phí" : `${sp.seedPrice} Xu Tim`}</Text>
                    </View>
                    <Ionicons name={locked ? "lock-closed" : "add-circle"} size={22} color={locked ? COLOR.textFaint : COLOR.success} />
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
  scene: { backgroundColor: COLOR.gardenWash, borderRadius: RADIUS.scene, borderWidth: 1, borderColor: "rgba(47,191,174,0.14)", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, gap: 12, overflow: "hidden", position: "relative" },
  yard: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "rgba(255,255,255,0.38)", borderRadius: RADIUS.inner, paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8, marginBottom: 14, zIndex: 1 },
  yardSlot: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: 56 },
  yardPet: { width: 72, alignItems: "center", justifyContent: "flex-end" },
  plot: { flex: 1, alignItems: "center", borderRadius: RADIUS.inner, borderWidth: 2, borderColor: "transparent", paddingTop: 8, paddingBottom: 8, paddingHorizontal: 4, position: "relative" },
  plotSel: { borderColor: ROLE.partner, backgroundColor: "rgba(255,255,255,0.45)" },
  selTag: { position: "absolute", top: 6, right: 6, zIndex: 2, backgroundColor: ROLE.partner, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  plotEmpty: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.inner, borderWidth: 1.6, borderStyle: "dashed", borderColor: "#D9B98F", paddingTop: 8, paddingBottom: 10, paddingHorizontal: 4 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLOR.surfaceSoft, borderRadius: 20, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 12, paddingHorizontal: 14 },
  fallingCard: { backgroundColor: COLOR.letterPaper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.letterLine, paddingHorizontal: 22, paddingVertical: 14, alignItems: "center", gap: 3, ...SHADOW_FLOAT },
  modalWrap: { flex: 1, backgroundColor: "rgba(51,39,46,0.42)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, padding: 20, gap: 10, maxHeight: "86%" },
  grab: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: "#EBD9D2", marginBottom: 2 },
  seedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLOR.bg, borderRadius: RADIUS.inner, borderWidth: 1, borderColor: COLOR.border, padding: 10 },
});

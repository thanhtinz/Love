import React, { useState } from "react";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { careTouch, softWarning } from "../../lib/feedback";
import { COMBO_WINDOW_MS, dayCount, decideCareLetter, timeAgoText } from "../../lib/features";
import { TREE_STAGES, careStatus, decayedStats, isPestActive, treeHealth, treeStageForDay, type CareKind } from "../../lib/tree";
import { PlantScene, MascotArt } from "../../components/Art";
import { HeartBurst } from "../../components/HeartBurst";
import { BugScatter, GoldenAura, PestOverlay, PotSplash, SunGlow } from "../../components/TreeFx";
import { PersonChip, partnerOf, personOf } from "../../components/PersonChip";
import { currentDailyQuests, questDef, questStreak } from "../../lib/quests";
import { usePestWatch, useStageUp } from "../../components/Popups";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { ClosingBand, IconBtn, ProgressBar, StatBar, StatusChip, s, tabBarPad, useNow } from "../../components/ui";

/**
 * Tab Cây — MỘT Cây Tình Yêu duy nhất của hai đứa.
 * - GIAI ĐOẠN đi theo NGÀY YÊU THẬT (treeStageForDay từ ngày bắt đầu yêu):
 *   tranh giai đoạn + thanh tiến độ trong giai đoạn đều suy ra từ số ngày.
 * - 3 thanh chỉ số Nước/Nắng/Yêu là SỨC SỐNG hiển thị, hao theo giờ thật; chăm
 *   cây có cooldown 60 giây mỗi người và VÔ HIỆU khi chỉ số liên quan đã >= 95%
 *   — lý do chặn hiện rõ ngay dưới cụm nút (khóa cứng nằm ở reducer, UI chỉ
 *   trình bày lại). Nút bị chặn chỉ MỜ đi (dimmed) chứ vẫn nhận chạm để rung
 *   cảnh báo mềm. Đợt "chăm cây 2": mỗi hành động chăm có VFX RIÊNG — tưới:
 *   mưa giọt + sóng nước ở chậu · nắng: quầng vàng ấm · lời yêu: mưa tim ·
 *   bắt sâu: đàn sâu văng khỏi tán — đi cùng cú "nhún vui" của cây.
 *   Chăm cây giữ cây tươi khỏe, KHÔNG đổi giai đoạn.
 * - SÂU LÀ SỰ KIỆN THẬT (đợt "chăm cây 2"): sâu chỉ xuất hiện khi điều kiện
 *   theo seed thỏa (pestSpawnFor — cây bị bỏ bê dễ có sâu hơn), HIỆN HÌNH trên
 *   tán lá, làm cây hao sức nhanh hơn một chút; "Bắt sâu" chỉ có tác dụng
 *   trong lúc sâu đang sống, ngoài lúc đó bị chặn như các nút chăm khác.
 * - "Song chăm": người ấy chăm trong 90 giây gần đây -> dòng gợi ý combo.
 * - Dấu vết chăm cây: lần chăm gần nhất + nhật ký chăm rút gọn.
 */
const CARE_DEFS: { kind: CareKind; label: string; icon: string; color: string; bg: string }[] = [
  { kind: "water", label: "Tưới nước", icon: "water", color: COLOR.water, bg: "#E1F0FA" },
  { kind: "sun", label: "Phơi nắng", icon: "sunny", color: COLOR.warning, bg: COLOR.warningSoft },
  { kind: "love", label: "Lời yêu", icon: "heart", color: COLOR.primary, bg: ROLE.selfSoft },
  { kind: "bug", label: "Bắt sâu", icon: "bug", color: COLOR.successText, bg: COLOR.successSoft },
];
const CARE_ICONS = new Set(["water", "sunny", "heart", "bug", "sparkles"]);

export default function TreeScreen() {
  const { state, dispatch, hydrated } = useLove();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [sceneScale] = useState(() => new Animated.Value(1));
  // VFX riêng theo hành động (đợt "chăm cây 2"): burst dùng chung cho mưa tim
  // (love) / mưa giọt (water) theo burstMode; glow = phơi nắng; splash = sóng
  // nước ở chậu khi tưới; scatter = đàn sâu văng ra khi bắt sâu thành công.
  const [burstMode, setBurstMode] = useState<"hearts" | "droplets">("hearts");
  const [burstKey, setBurstKey] = useState(0);
  const [glowKey, setGlowKey] = useState(0);
  const [splashKey, setSplashKey] = useState(0);
  const [scatterKey, setScatterKey] = useState(0);
  const [scatterPestId, setScatterPestId] = useState("");
  useStageUp(state, dispatch);
  usePestWatch(state, dispatch);

  const me = state.currentUser;
  const partner = partnerOf(state);
  const day = dayCount(state.couple.startDate, now);
  const stageForDay = treeStageForDay(day);
  const stageIdx = stageForDay.stage - 1;
  const stageDef = TREE_STAGES[stageIdx];
  const pestActive = isPestActive(state.treePest, now);
  const stats = decayedStats(state.tree, now, state.treePest);
  // Nhiệm vụ ngày: bộ đang hiệu lực của hôm nay (state đã lăn ngày thì hiển thị
  // bộ mới ở tiến độ 0) + chuỗi ngày chăm đủ + hào quang khi đã đủ 3/3.
  const dq = currentDailyQuests(state.dailyQuests);
  const questsDone = dq.quests.filter((q) => q.count >= q.target).length;
  const streak = questStreak(state.questHistory);
  const auraOn = Boolean(dq.allCompletedAt);
  const health = treeHealth(stats);
  const statuses = CARE_DEFS.map((d) => ({ def: d, cs: careStatus(state.tree, d.kind, me, now, state.treePest) }));
  const firstBlocked = statuses.find((x) => !x.cs.ok);
  const partnerLastCare = state.tree.lastCareAtBy[partner.slot];
  const partnerCareMs = partnerLastCare ? new Date(partnerLastCare).getTime() : 0;
  const comboWindowOpen = partnerCareMs > 0 && now - partnerCareMs < COMBO_WINDOW_MS
    && partnerCareMs > (state.tree.lastCareAtBy[me] ? new Date(state.tree.lastCareAtBy[me]).getTime() : 0);
  const careActs = state.activities.filter((a) => CARE_ICONS.has(a.icon)).slice(0, 5);
  const lastCareSlot = state.tree.lastCareBySlot;

  /** Cây "đáp lại" khi được chăm: nhún vui 1 -> 1.03 -> 1 (mọi hành động). */
  function bounceTree() {
    sceneScale.setValue(1);
    Animated.sequence([
      Animated.timing(sceneScale, { toValue: 1.03, duration: 160, useNativeDriver: true }),
      Animated.spring(sceneScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
    ]).start();
  }

  /** VFX RIÊNG của từng hành động chăm (đợt "chăm cây 2") — thay cho cánh hoa chung trước đây. */
  function careFx(kind: CareKind) {
    if (kind === "water") {
      setBurstMode("droplets");
      setBurstKey((k) => k + 1);
      setSplashKey((k) => k + 1);
    } else if (kind === "sun") {
      setGlowKey((k) => k + 1);
    } else if (kind === "love") {
      setBurstMode("hearts");
      setBurstKey((k) => k + 1);
    } else {
      // Bắt sâu thành công (chỉ tới được đây khi sâu đang sống): đàn sâu theo
      // đúng vị trí của đợt sâu đó văng khỏi tán + lấp lánh.
      if (state.treePest) setScatterPestId(state.treePest.id);
      setScatterKey((k) => k + 1);
    }
  }

  function onCare(kind: CareKind, ok: boolean) {
    if (!ok) {
      // Chạm vào nút đang bị chặn: chỉ rung cảnh báo mềm + dòng lý do đã hiện
      // sẵn dưới cụm nút — khóa cứng vẫn nằm ở reducer/careStatus như cũ.
      softWarning();
      return;
    }
    const { drop, combo } = decideCareLetter(state, kind, now);
    dispatch({ type: "TREE_CARE", kind, user: me, actor: myName(state), drop, combo });
    careTouch();
    bounceTree();
    careFx(kind);
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Cây Tình Yêu</Text>
            <Text style={[s.sub, { marginTop: 2, fontSize: 13.5 }]}>Cây của hai đứa — lớn lên theo ngày yêu</Text>
          </View>
          <StatusChip label={`Giai đoạn ${stageForDay.stage}/7`} variant="accent" />
        </View>

        {/* Bệ cảnh cây — cây nhún vui + VFX theo hành động khi chăm; sâu hiện hình khi đang có đợt sâu */}
        <View style={{ backgroundColor: COLOR.gardenWash, borderRadius: RADIUS.scene, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden" }}>
          <Animated.View style={{ transform: [{ scale: sceneScale }] }}>
            <PlantScene stageIndex={stageIdx} status={health.status} height={308} imgHeight={284} />
          </Animated.View>
          <PestOverlay pestId={pestActive && state.treePest ? state.treePest.id : null} />
          {auraOn ? <GoldenAura /> : null}
          <SunGlow glowKey={glowKey} />
          <PotSplash splashKey={splashKey} />
          <HeartBurst burstKey={burstKey} mode={burstMode} />
          <BugScatter burstKey={scatterKey} pestId={scatterPestId} />
        </View>

        {/* Trạng thái + chỉ số */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, flex: 1 }}>{stageDef.name}</Text>
            {health.status === "wilted" ? <StatusChip label="Đang mệt" variant="waiting" /> : health.status === "need" ? <StatusChip label="Cần chăm" variant="waiting" /> : <StatusChip label="Khỏe mạnh" variant="done" />}
          </View>
          <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 3 }}>{stageDef.desc}</Text>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={Math.round(stageForDay.progress * 100)} color={ROLE.partner} height={8} />
          </View>
          <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, marginTop: 6 }}>
            {stageForDay.daysToNextStage != null
              ? `Ngày ${day} · còn ${stageForDay.daysToNextStage} ngày nữa cây lên giai đoạn mới`
              : `Ngày ${day} · cây đang ở giai đoạn cao nhất rồi`}
          </Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 3 }}>
            Cây lớn lên theo thời gian yêu của hai bạn — chăm cây là để cây luôn tươi khỏe.
          </Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            <StatBar label="Nước" value={stats.water} color={COLOR.water} />
            <StatBar label="Nắng" value={stats.sun} color={COLOR.sun} />
            <StatBar label="Yêu" value={stats.love} color={COLOR.primary} />
          </View>
          <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 10 }}>{health.message}</Text>
        </View>

        {/* Chăm cây */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Chăm cây</Text>
          {pestActive ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: COLOR.warningSoft, borderRadius: RADIUS.tile, paddingHorizontal: 12, paddingVertical: 9 }}>
              <Ionicons name="bug" size={16} color={COLOR.warning} />
              <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 13, color: COLOR.text }}>
                Có sâu trên cây! Bắt ngay kẻo cây héo — sâu đang làm cây hao sức nhanh hơn bình thường.
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {statuses.slice(0, 2).map(({ def, cs }) => (
              <IconBtn key={def.kind} icon={def.icon} label={def.label} color={def.color} bg={def.bg} dimmed={!cs.ok} onPress={() => onCare(def.kind, cs.ok)} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            {statuses.slice(2).map(({ def, cs }) => (
              <IconBtn key={def.kind} icon={def.icon} label={def.kind === "bug" && pestActive ? "Bắt sâu!" : def.label} color={def.color} bg={def.bg} dimmed={!cs.ok} onPress={() => onCare(def.kind, cs.ok)} />
            ))}
          </View>
          {firstBlocked ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
              <Ionicons name="information-circle-outline" size={15} color={COLOR.textFaint} />
              <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft }}>
                {firstBlocked.def.label}: {firstBlocked.cs.reason}
              </Text>
            </View>
          ) : null}
          {comboWindowOpen ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: ROLE.selfSoft, borderRadius: RADIUS.tile, paddingHorizontal: 12, paddingVertical: 9 }}>
              <Ionicons name="sparkles" size={16} color={ROLE.selfDark} />
              <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 13, color: ROLE.selfDark }}>
                {partner.name} vừa chăm cây xong — chăm ngay bây giờ để tạo combo Song chăm và làm rơi thư tình!
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 12 }}>
              {"Mẹo: hai đứa chăm gần nhau trong 90 giây sẽ thành combo \"Song chăm\" — cây vui hơn và dễ rơi thư tình."}
            </Text>
          )}
        </View>

        {/* Nhiệm vụ hôm nay — 3 việc nhỏ mỗi ngày, tiến độ từ hành động thật của cả hai */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ ...TYPE.micro, color: COLOR.textSoft, flex: 1 }}>Nhiệm vụ hôm nay</Text>
            <StatusChip label={`${questsDone}/3`} variant={auraOn ? "done" : "accent"} />
          </View>
          <View style={{ marginTop: 12, gap: 11 }}>
            {dq.quests.map((q) => {
              const def = questDef(q.kind);
              const doneQ = q.count >= q.target;
              const contributors = [
                q.byA > 0 ? personOf(state, "A").name : "",
                q.byB > 0 ? personOf(state, "B").name : "",
              ].filter(Boolean);
              return (
                <View key={q.kind} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: doneQ ? COLOR.successSoft : COLOR.gardenWash, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={def.icon as never} size={16} color={doneQ ? COLOR.successText : COLOR.textSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.text }}>{def.label}</Text>
                    {contributors.length > 0 ? (
                      <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint, marginTop: 1 }}>
                        {contributors.join(" và ")} đã góp phần
                      </Text>
                    ) : null}
                  </View>
                  {doneQ ? (
                    <Ionicons name="checkmark-circle" size={20} color={COLOR.successText} />
                  ) : (
                    <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: COLOR.textSoft }}>{Math.min(q.count, q.target)}/{q.target}</Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 13 }}>
            <Ionicons name="flame" size={14} color={COLOR.warning} />
            <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft }}>
              {auraOn
                ? `Chuỗi ngày chăm đủ: ${streak} ngày — hôm nay đã đủ, cây đang tỏa hào quang vàng.`
                : `Chuỗi ngày chăm đủ: ${streak} ngày — làm đủ 3 việc, cây sẽ nhận thêm sức sống và hào quang vàng.`}
            </Text>
          </View>
        </View>

        {/* Dấu vết chăm cây */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Dấu vết chăm cây</Text>
          {lastCareSlot && state.tree.lastCareAt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <PersonChip state={state} slot={lastCareSlot} size={20} />
              <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textSoft }}>
                chăm gần nhất {timeAgoText(state.tree.lastCareAt, now)} · tổng {state.tree.careCount} lần chăm
              </Text>
            </View>
          ) : (
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 8 }}>Chưa ai chăm cây lần nào — bắt đầu bằng một lần tưới nước nhé.</Text>
          )}
          {careActs.length > 0 ? (
            <View style={{ marginTop: 12, gap: 9 }}>
              {careActs.map((a) => (
                <View key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <Ionicons name={(a.icon === "sunny" ? "sunny" : a.icon) as never} size={14} color={COLOR.textFaint} />
                  <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.text }}>
                    <Text style={{ fontFamily: FONT.bold }}>{a.actor}</Text> {a.text}
                  </Text>
                  <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint }}>{timeAgoText(a.time, now)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {/* Lối vào Hộp thư đã giữ (kỷ vật đợt 2): thư rơi khi chăm cây được giữ tại đây */}
          <TouchableOpacity
            onPress={() => router.push("/letters")}
            style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14, backgroundColor: COLOR.letterPaper, borderWidth: 1, borderColor: COLOR.letterLine, borderRadius: RADIUS.tile, paddingHorizontal: 12, paddingVertical: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Mở hộp thư đã giữ"
          >
            <Ionicons name="mail" size={16} color={COLOR.primary} />
            <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.text }}>Hộp thư đã giữ</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>
              {state.keptLetters.length > 0 ? `${state.keptLetters.length} lá thư` : "chưa có lá nào"}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={COLOR.textFaint} />
          </TouchableOpacity>
        </View>

        {health.status === "wilted" ? (
          <ClosingBand art={<MascotArt size={64} />} line="Cây đang mệt vì chỉ số xuống quá thấp — tưới nước, phơi nắng và gửi lời yêu để cây tươi lại nhé. Cây vẫn lớn theo ngày yêu như thường." />
        ) : null}
        {!hydrated ? <Text style={{ textAlign: "center", color: COLOR.textFaint, fontFamily: FONT.regular, fontSize: 12.5 }}>Đang tải khu vườn...</Text> : null}
      </ScrollView>
    </View>
  );
}

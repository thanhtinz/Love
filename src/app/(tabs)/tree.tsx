import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../../lib/store";
import { COMBO_WINDOW_MS, dayCount, decideCareLetter, timeAgoText } from "../../lib/features";
import { TREE_STAGES, careStatus, decayedStats, treeHealth, treeStageForDay, type CareKind } from "../../lib/tree";
import { PlantScene, MascotArt } from "../../components/Art";
import { PersonChip, partnerOf } from "../../components/PersonChip";
import { LetterAndPingPops, useStageUp } from "../../components/Popups";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { ClosingBand, IconBtn, ProgressBar, StatBar, StatusChip, s, tabBarPad, useNow } from "../../components/ui";

/**
 * Tab Cây — MỘT Cây Tình Yêu duy nhất của hai đứa.
 * - GIAI ĐOẠN đi theo NGÀY YÊU THẬT (treeStageForDay từ ngày bắt đầu yêu):
 *   tranh giai đoạn + thanh tiến độ trong giai đoạn đều suy ra từ số ngày.
 * - 3 thanh chỉ số Nước/Nắng/Yêu là SỨC SỐNG hiển thị, hao theo giờ thật; chăm
 *   cây có cooldown 60 giây mỗi người và VÔ HIỆU khi chỉ số liên quan đã >= 95%
 *   — lý do chặn hiện rõ ngay dưới cụm nút (khóa cứng nằm ở reducer, UI chỉ
 *   trình bày lại). Chăm cây giữ cây tươi khỏe, KHÔNG đổi giai đoạn.
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
  useStageUp(state, dispatch);

  const me = state.currentUser;
  const partner = partnerOf(state);
  const day = dayCount(state.couple.startDate, now);
  const stageForDay = treeStageForDay(day);
  const stageIdx = stageForDay.stage - 1;
  const stageDef = TREE_STAGES[stageIdx];
  const stats = decayedStats(state.tree, now);
  const health = treeHealth(stats);
  const statuses = CARE_DEFS.map((d) => ({ def: d, cs: careStatus(state.tree, d.kind, me, now) }));
  const firstBlocked = statuses.find((x) => !x.cs.ok);
  const partnerLastCare = state.tree.lastCareAtBy[partner.slot];
  const partnerCareMs = partnerLastCare ? new Date(partnerLastCare).getTime() : 0;
  const comboWindowOpen = partnerCareMs > 0 && now - partnerCareMs < COMBO_WINDOW_MS
    && partnerCareMs > (state.tree.lastCareAtBy[me] ? new Date(state.tree.lastCareAtBy[me]).getTime() : 0);
  const careActs = state.activities.filter((a) => CARE_ICONS.has(a.icon)).slice(0, 5);
  const lastCareSlot = state.tree.lastCareBySlot;

  function onCare(kind: CareKind) {
    const { drop, combo } = decideCareLetter(state, kind, now);
    dispatch({ type: "TREE_CARE", kind, user: me, actor: myName(state), drop, combo });
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

        {/* Bệ cảnh cây */}
        <View style={{ backgroundColor: COLOR.gardenWash, borderRadius: RADIUS.scene, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden" }}>
          <PlantScene stageIndex={stageIdx} status={health.status} height={308} imgHeight={284} />
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
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {statuses.slice(0, 2).map(({ def, cs }) => (
              <IconBtn key={def.kind} icon={def.icon} label={def.label} color={def.color} bg={def.bg} disabled={!cs.ok} onPress={() => onCare(def.kind)} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            {statuses.slice(2).map(({ def, cs }) => (
              <IconBtn key={def.kind} icon={def.icon} label={def.label} color={def.color} bg={def.bg} disabled={!cs.ok} onPress={() => onCare(def.kind)} />
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
        </View>

        {health.status === "wilted" ? (
          <ClosingBand art={<MascotArt size={64} />} line="Cây đang mệt vì chỉ số xuống quá thấp — tưới nước, phơi nắng và gửi lời yêu để cây tươi lại nhé. Cây vẫn lớn theo ngày yêu như thường." />
        ) : null}
        {!hydrated ? <Text style={{ textAlign: "center", color: COLOR.textFaint, fontFamily: FONT.regular, fontSize: 12.5 }}>Đang tải khu vườn...</Text> : null}
      </ScrollView>
      <LetterAndPingPops />
    </View>
  );
}

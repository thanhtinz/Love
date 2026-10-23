import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLove } from "../../lib/store";
import { decayedPlantStats, speciesById, stageInfo } from "../../lib/plants";
import { treeHealth } from "../../lib/types";
import { PlantImage } from "../../components/Art";
import { FrameExport } from "../../components/FrameExport";
import { COLOR } from "../../components/theme";
import { C, ProgressBar, ScreenHeader, s, useNow } from "../../components/ui";

/**
 * Khung Cây hôm nay — quy tắc widget: khung chỉ nêu MỘT thông tin chính:
 * cây đang ở đâu trong hành trình lớn (giai đoạn + 1 thanh tiến trình duy nhất),
 * kèm 1 dòng trạng thái sức khoẻ. Không xếp 3 thanh chỉ số cạnh tranh nhau.
 */
export default function FrameTreeScreen() {
  const { state } = useLove();
  // Tick 60 giây: stageInfo/decayedPlantStats tính THEO THỜI GIAN tại lúc tính — memo
  // chỉ theo [plant] khiến khung đứng yên nhiều giờ vẫn hiện giai đoạn/sức khoẻ cũ
  // (vật thể plant không đổi reference khi thời gian trôi mà chưa có thao tác nào).
  const now = useNow(60000);
  const plant = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const info = useMemo(() => (plant ? stageInfo(plant, now) : null), [plant, now]);
  const stats = useMemo(() => (plant ? decayedPlantStats(plant, now) : null), [plant, now]);
  const health = stats ? treeHealth(stats) : null;

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/frames" title="Khung Cây hôm nay" subtitle="Một thông tin chính: cây đang lớn tới đâu" />
      <ScrollView contentContainerStyle={s.scroll}>
        <FrameExport kind="tree" hasContent={!!plant}>
          <Text style={{ fontSize: 15, fontFamily: "BeVietnamPro_700Bold", color: C.pinkDark }}>Cây hôm nay</Text>
          {plant && info && health ? (
            <>
              <PlantImage speciesId={plant.speciesId} stageIndex={info.index} size={170} status={health.status} />
              <Text style={{ fontSize: 17, fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>{speciesById(plant.speciesId).name}</Text>
              <Text style={{ fontSize: 13.5, color: C.pinkDark, fontFamily: "BeVietnamPro_700Bold" }}>Giai đoạn {info.index + 1}/{speciesById(plant.speciesId).stages.length}: {info.stage.name}</Text>
              <View style={{ width: "100%", gap: 6, marginTop: 4 }}>
                <ProgressBar value={info.progressInStage} color={COLOR.success} height={10} />
                <Text style={[s.small, { textAlign: "center" }]}>{info.mature ? "Đã trưởng thành" : `Đã đi được ${info.progressInStage}% của giai đoạn này`} · {health.message}</Text>
              </View>
            </>
          ) : (<Text style={s.sub}>Chưa có cây nào trong vườn để đưa vào khung.</Text>)}
        </FrameExport>
      </ScrollView>
    </View>
  );
}

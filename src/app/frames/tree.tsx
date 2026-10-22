import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLove } from "../../lib/store";
import { decayedPlantStats, speciesById, stageInfo } from "../../lib/plants";
import PlantArt from "../../components/PlantArt";
import { FrameExport } from "../../components/FrameExport";
import { C, ScreenHeader, StatBar, s } from "../../components/ui";

export default function FrameTreeScreen() {
  const { state } = useLove();
  const plant = state.plants.find((p) => p.id === state.selectedPlantId) || state.plants[0];
  const info = useMemo(() => (plant ? stageInfo(plant) : null), [plant]);
  const stats = useMemo(() => (plant ? decayedPlantStats(plant) : null), [plant]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Khung Cây hôm nay" subtitle="Cây đang chọn trong vườn: giai đoạn + chỉ số hiện tại" />
      <ScrollView contentContainerStyle={s.scroll}>
        <FrameExport kind="tree">
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.pinkDark }}>Cây hôm nay</Text>
          {plant && info && stats ? (
            <>
              <PlantArt speciesId={plant.speciesId} stageIndex={info.index} totalStages={speciesById(plant.speciesId).stages.length} size={170} />
              <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>{speciesById(plant.speciesId).name}</Text>
              <Text style={{ fontSize: 13, color: C.pinkDark, fontWeight: "700" }}>Giai đoạn: {info.stage.name} ({info.progressInStage}%)</Text>
              <View style={{ width: "100%", gap: 7, marginTop: 6 }}>
                <StatBar label="Nước" icon="water" value={stats.water} color="#0ea5e9" />
                <StatBar label="Nắng" icon="sunny" value={stats.sun} color="#f59e0b" />
                <StatBar label="Tình yêu" icon="heart" value={stats.love} color="#f43f5e" />
              </View>
            </>
          ) : (<Text style={s.sub}>Chưa có cây nào trong vườn để đưa vào khung.</Text>)}
        </FrameExport>
      </ScrollView>
    </View>
  );
}

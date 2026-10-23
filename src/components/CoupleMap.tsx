import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { TILE_SIZE, fitMapPoints, latLonToWorldPx, tileUrl } from "../lib/maptiles";
import { distanceText } from "../lib/features";
import Avatar from "./Avatar";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * BẢN ĐỒ HAI ĐỨA — bản đồ THẬT dựng từ gạch ảnh OpenStreetMap bằng <Image>
 * thuần (không SDK bản đồ, không API key, không WebView):
 * - Lưới gạch phủ khung hình theo tâm + zoom do fitMapPoints chọn (mọi ghim
 *   đều lọt khung). Gạch CHỈ được tải khi component này được gắn — nơi gọi
 *   (màn /location) chỉ gắn nó khi có ít nhất một phía đang chia sẻ và đã có
 *   snapshot vị trí; không ai chia sẻ -> không một request gạch nào.
 * - Ghim: avatar tròn viền trắng + chip tên; hai ghim nối bằng đường đứt nét
 *   với chip khoảng cách ở trung điểm.
 * - Dòng ghi công "© OpenStreetMap contributors" ở góc bản đồ (bắt buộc theo
 *   giấy phép ODbL của OSM).
 */
export interface CoupleMapPoint {
  key: string;
  lat: number;
  lon: number;
  name: string;
  avatarId: string;
}

export default function CoupleMap({ points, distanceKm, height = 340 }: {
  points: CoupleMapPoint[];
  distanceKm: number | null;
  height?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View
      onLayout={(e) => {
        const { width, height: hh } = e.nativeEvent.layout;
        if (width !== size.w || hh !== size.h) setSize({ w: width, h: hh });
      }}
      style={{ height, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, overflow: "hidden", backgroundColor: "#E7EFE3" }}
    >
      {size.w > 0 && points.length > 0 ? (
        <MapTiles points={points} distanceKm={distanceKm} width={size.w} height={size.h} />
      ) : null}
    </View>
  );
}

function MapTiles({ points, distanceKm, width, height }: {
  points: CoupleMapPoint[];
  distanceKm: number | null;
  width: number;
  height: number;
}) {
  // Đệm 56px: ghim (avatar + chip tên) vươn lên/xuống quanh điểm neo ~50px.
  const { zoom, center } = fitMapPoints(points.map((p) => ({ lat: p.lat, lon: p.lon })), width, height, 56);
  const centerPx = latLonToWorldPx(center.lat, center.lon, zoom);
  const tlX = centerPx.x - width / 2;
  const tlY = centerPx.y - height / 2;
  const maxTile = Math.pow(2, zoom) - 1;
  const txMin = Math.floor(tlX / TILE_SIZE);
  const txMax = Math.floor((tlX + width - 1) / TILE_SIZE);
  const tyMin = Math.floor(tlY / TILE_SIZE);
  const tyMax = Math.floor((tlY + height - 1) / TILE_SIZE);

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      if (ty < 0 || ty > maxTile) continue;
      const urlX = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
      tiles.push({ key: `${tx}:${ty}`, url: tileUrl(urlX, ty, zoom), left: tx * TILE_SIZE - tlX, top: ty * TILE_SIZE - tlY });
    }
  }

  const projected = points.map((p) => {
    const px = latLonToWorldPx(p.lat, p.lon, zoom);
    return { ...p, x: px.x - tlX, y: px.y - tlY };
  });
  const two = projected.length === 2 ? projected : null;
  const mid = two ? { x: (two[0].x + two[1].x) / 2, y: (two[0].y + two[1].y) / 2 } : null;

  return (
    <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {tiles.map((t) => (
        <Image key={t.key} source={{ uri: t.url }} style={{ position: "absolute", left: t.left, top: t.top, width: TILE_SIZE + 1, height: TILE_SIZE + 1 }} />
      ))}

      {two ? (
        <Svg style={{ position: "absolute", left: 0, top: 0 }} width={width} height={height}>
          <Line x1={two[0].x} y1={two[0].y} x2={two[1].x} y2={two[1].y} stroke={COLOR.primary} strokeWidth={2.5} strokeDasharray="7 6" strokeLinecap="round" />
        </Svg>
      ) : null}

      {projected.map((p) => (
        <View key={p.key} style={{ position: "absolute", left: p.x - 38, top: p.y - 47, width: 76, alignItems: "center" }}>
          <View style={{ borderRadius: 999, ...SHADOW_FLOAT }}>
            <Avatar id={p.avatarId} size={44} ring="#fff" />
          </View>
          <View style={{ marginTop: 3, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5, borderWidth: 1, borderColor: COLOR.border, maxWidth: 76 }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 11, color: COLOR.text }}>{p.name}</Text>
          </View>
        </View>
      ))}

      {two && mid && distanceKm != null ? (
        <View style={{ position: "absolute", left: mid.x - 62, top: mid.y - 15, width: 124, alignItems: "center" }}>
          <View style={{ backgroundColor: COLOR.primary, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, ...SHADOW_FLOAT }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 12, color: "#fff" }}>
              {distanceKm < 0.3 ? distanceText(distanceKm) : `Cách nhau ${distanceText(distanceKm)}`}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ position: "absolute", right: 8, bottom: 6, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ fontFamily: FONT.regular, fontSize: 10, color: COLOR.textSoft }}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

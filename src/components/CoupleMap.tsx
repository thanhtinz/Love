import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import {
  MAP_ZOOM_INTERACTIVE_MAX,
  MAP_ZOOM_MIN,
  TILE_SIZE,
  fitMapPoints,
  latLonToWorldPx,
  panCenterByPixels,
  tileUrl,
  wrapTileX,
  zoomCenterAroundAnchor,
  type LatLon,
} from "../lib/maptiles";
import { distanceText } from "../lib/features";
import Avatar from "./Avatar";
import { COLOR, FONT, RADIUS, SHADOW_FLOAT } from "./theme";

/**
 * BẢN ĐỒ HAI ĐỨA — bản đồ THẬT dựng từ gạch ảnh OpenStreetMap bằng <Image>
 * thuần (không SDK bản đồ, không API key, không WebView) và TƯƠNG TÁC THẬT:
 * - KÉO để di chuyển (một ngón / chuột): nội dung đi theo ngón tay.
 * - PINCH hai ngón để zoom quanh điểm giữa hai ngón; lăn chuột (web) zoom
 *   quanh con trỏ; nút + / − zoom quanh tâm khung; chạm đúp zoom +1 quanh
 *   điểm chạm; nút "về giữa hai đứa" fit lại khung quanh các ghim.
 * - Ghim + đường nối + chip khoảng cách được chiếu lại qua transform hiện tại
 *   ở MỖI render nên đi theo ngón tay ngay trong lúc kéo/pinch.
 * Toán học nằm ở lib/maptiles.ts THUẦN (panCenterByPixels /
 * zoomCenterAroundAnchor, test nhóm H). Gạch vẽ ở zoom nguyên gần nhất, hiển
 * thị co giãn theo zoom lẻ (hệ số 2^(zoom−zoomNguyên)) để pinch mượt mà ghim
 * vẫn khớp gạch từng pixel.
 * - Khung nhìn TỰ fit khi gắn và mỗi khi TẬP ghim đổi — TRỪ khi người dùng đã
 *   tự kéo/zoom (cờ userMoved): không bao giờ giật bản đồ lúc họ đang xem.
 *   Nút về-giữa xoá cờ và fit lại ngay.
 * - Gạch CHỈ tải khi component được gắn — nơi gọi (màn /location) chỉ gắn khi
 *   có ít nhất một phía đang chia sẻ và đã có snapshot; không ai chia sẻ ->
 *   không một request gạch nào.
 * - Lớp gesto nhận responder (onStartShouldSetResponder + không nhường khi bị
 *   xin) nên kéo bắt đầu TRONG bản đồ không cuộn trang; kéo bắt đầu NGOÀI bản
 *   đồ vẫn cuộn bình thường. "© OpenStreetMap contributors" ở góc (ODbL).
 */
export interface CoupleMapPoint {
  key: string;
  lat: number;
  lon: number;
  name: string;
  avatarId: string;
}

interface MapView_ {
  center: LatLon;
  zoom: number;
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
        <InteractiveMap points={points} distanceKm={distanceKm} width={size.w} height={size.h} />
      ) : null}
    </View>
  );
}

function InteractiveMap({ points, distanceKm, width, height }: {
  points: CoupleMapPoint[];
  distanceKm: number | null;
  width: number;
  height: number;
}) {
  const fitOf = (pts: CoupleMapPoint[]): MapView_ =>
    fitMapPoints(pts.map((p) => ({ lat: p.lat, lon: p.lon })), width, height, 56);

  const [view, setView] = useState<MapView_ | null>(null);
  const active: MapView_ = view ?? fitOf(points);
  const viewRef = useRef(active);
  /** Ghi khung nhìn mới: cập nhật ref NGAY (gesto đọc liên tục giữa hai lần
   * render) rồi mới setState để vẽ lại. */
  const commitView = useCallback((v: MapView_) => {
    viewRef.current = v;
    setView(v);
  }, []);
  /** Người dùng đã tự kéo/zoom kể từ lần fit cuối -> cấm tự fit lại. */
  const userMovedRef = useRef(false);

  /* Tự fit khi TẬP ghim đổi (ghim mới / snapshot mới) — chỉ khi người dùng
   * chưa tự khám phá. fitKey gồm cả toạ độ nên đối tác di chuyển cũng fit. */
  const fitKey = points.map((p) => `${p.key}:${p.lat.toFixed(6)}:${p.lon.toFixed(6)}`).join("|");
  const lastFitKeyRef = useRef("");
  useEffect(() => {
    if (lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey;
    if (!userMovedRef.current) commitView(fitOf(points));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const frameRef = useRef<React.ElementRef<typeof View>>(null);

  /* Web: touch-action none để kéo bằng cảm ứng không cuộn trang + nghe lăn
   * chuột để zoom quanh con trỏ (passive:false mới preventDefault được). */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = frameRef.current as unknown as HTMLElement | null;
    if (!el || typeof el.addEventListener !== "function") return;
    el.style.touchAction = "none";
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const v = viewRef.current;
      userMovedRef.current = true;
      commitView(zoomCenterAroundAnchor(v.center, v.zoom, v.zoom - ev.deltaY * 0.0022, anchor, { w: width, h: height }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [width, height, commitView]);

  /* ---------- Gesto: kéo (1 chạm) + pinch (2 chạm) + chạm đúp ---------- */
  const touchesRef = useRef(new Map<number, { x: number; y: number }>());
  const downRef = useRef<{ t: number; x: number; y: number; moved: boolean; multi: boolean } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const readTouches = (e: GestureResponderEvent) => {
    const m = new Map<number, { x: number; y: number }>();
    for (const t of e.nativeEvent.touches) m.set(Number(t.identifier), { x: t.locationX, y: t.locationY });
    return m;
  };

  const onGrant = (e: GestureResponderEvent) => {
    const now = readTouches(e);
    touchesRef.current = now;
    const first = now.values().next().value as { x: number; y: number } | undefined;
    if (first) {
      const prev = downRef.current;
      downRef.current = {
        t: Date.now(),
        x: first.x,
        y: first.y,
        moved: prev?.moved ?? false,
        multi: now.size > 1 || (prev?.multi ?? false),
      };
    }
  };

  const onMove = (e: GestureResponderEvent) => {
    const now = readTouches(e);
    const prev = touchesRef.current;
    const v = viewRef.current;
    if (now.size > 1 && downRef.current) downRef.current.multi = true;
    if (now.size === 1 && prev.size === 1) {
      const [id, p] = [...now.entries()][0];
      const q = prev.get(id);
      if (q) {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        if (dx !== 0 || dy !== 0) {
          const d = downRef.current;
          if (d && Math.hypot(p.x - d.x, p.y - d.y) > 8) d.moved = true;
          userMovedRef.current = true;
          commitView({ center: panCenterByPixels(v.center, v.zoom, dx, dy), zoom: v.zoom });
        }
      }
    } else if (now.size === 2 && prev.size === 2) {
      const [a, b] = [...now.values()];
      const pa = prev.get([...now.keys()][0]);
      const pb = prev.get([...now.keys()][1]);
      if (pa && pb) {
        const dPrev = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        const dNow = Math.hypot(a.x - b.x, a.y - b.y);
        const midPrev = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const midNow = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (dPrev > 0 && dNow > 0) {
          userMovedRef.current = true;
          if (downRef.current) downRef.current.moved = true;
          // Bước 1: tịnh tiến theo điểm giữa; bước 2: zoom quanh điểm giữa MỚI
          // (điểm địa lý dưới hai ngón tay ở yên dưới hai ngón tay).
          const panned = panCenterByPixels(v.center, v.zoom, midNow.x - midPrev.x, midNow.y - midPrev.y);
          commitView(zoomCenterAroundAnchor(panned, v.zoom, v.zoom + Math.log2(dNow / dPrev), midNow, { w: width, h: height }));
        }
      }
    }
    // Số chạm thay đổi (1<->2): chỉ đặt lại mốc, không biến hình -> không nhảy.
    touchesRef.current = now;
  };

  const onRelease = () => {
    const d = downRef.current;
    touchesRef.current = new Map();
    downRef.current = null;
    if (!d || d.multi || d.moved) return;
    if (Date.now() - d.t > 260) return;
    // Một chạm ngắn, đứng yên = "tap": hai tap liên tiếp gần nhau = chạm đúp.
    const last = lastTapRef.current;
    if (last && d.t - last.t < 320 && Math.hypot(d.x - last.x, d.y - last.y) < 48) {
      lastTapRef.current = null;
      const v = viewRef.current;
      userMovedRef.current = true;
      commitView(zoomCenterAroundAnchor(v.center, v.zoom, v.zoom + 1, { x: d.x, y: d.y }, { w: width, h: height }));
    } else {
      lastTapRef.current = { t: d.t, x: d.x, y: d.y };
    }
  };

  /* ---------- Nút bấm ---------- */
  const zoomStep = (dir: 1 | -1) => {
    const v = viewRef.current;
    userMovedRef.current = true;
    commitView(zoomCenterAroundAnchor(v.center, v.zoom, v.zoom + dir, { x: width / 2, y: height / 2 }, { w: width, h: height }));
  };
  const recenter = () => {
    userMovedRef.current = false;
    commitView(fitOf(points));
  };

  /* ---------- Vẽ qua transform hiện tại (zoom lẻ -> gạch zoom nguyên co giãn) ---------- */
  const { center, zoom } = active;
  const zi = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_INTERACTIVE_MAX, Math.round(zoom)));
  const scale = Math.pow(2, zoom - zi);
  const tileDisp = TILE_SIZE * scale;
  const centerPx = latLonToWorldPx(center.lat, center.lon, zoom);
  const tlX = centerPx.x - width / 2;
  const tlY = centerPx.y - height / 2;
  const maxTileY = Math.pow(2, zi) - 1;
  const txMin = Math.floor(tlX / tileDisp) - 1;
  const txMax = Math.floor((tlX + width) / tileDisp) + 1;
  const tyMin = Math.floor(tlY / tileDisp) - 1;
  const tyMax = Math.floor((tlY + height) / tileDisp) + 1;

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      if (ty < 0 || ty > maxTileY) continue;
      tiles.push({
        key: `${zi}:${tx}:${ty}`,
        url: tileUrl(wrapTileX(tx, zi), ty, zi),
        left: tx * tileDisp - tlX,
        top: ty * tileDisp - tlY,
      });
    }
  }

  const projected = points.map((p) => {
    const px = latLonToWorldPx(p.lat, p.lon, zoom);
    return { ...p, x: px.x - tlX, y: px.y - tlY };
  });
  const two = projected.length === 2 ? projected : null;
  const mid = two ? { x: (two[0].x + two[1].x) / 2, y: (two[0].y + two[1].y) / 2 } : null;

  return (
    <>
      <View
        ref={frameRef}
        style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onRelease}
      >
        <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
          {tiles.map((t) => (
            <Image key={t.key} source={{ uri: t.url }} style={{ position: "absolute", left: t.left, top: t.top, width: tileDisp + 1, height: tileDisp + 1 }} />
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
        </View>
      </View>

      {/* Nút zoom + về giữa hai đứa — anh em của lớp gesto, không phải con,
          nên bấm nút không kéo bản đồ. */}
      <View style={{ position: "absolute", left: 10, bottom: 10, gap: 8 }}>
        <MapBtn icon="add" label="Phóng to" disabled={zoom >= MAP_ZOOM_INTERACTIVE_MAX} onPress={() => zoomStep(1)} />
        <MapBtn icon="remove" label="Thu nhỏ" disabled={zoom <= MAP_ZOOM_MIN} onPress={() => zoomStep(-1)} />
        <MapBtn icon="locate" label="Về giữa hai đứa" onPress={recenter} />
      </View>

      <View pointerEvents="none" style={{ position: "absolute", right: 8, bottom: 6, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ fontFamily: FONT.regular, fontSize: 10, color: COLOR.textSoft }}>© OpenStreetMap contributors</Text>
      </View>
    </>
  );
}

function MapBtn({ icon, label, disabled, onPress }: {
  icon: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 999,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLOR.border,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        ...SHADOW_FLOAT,
      })}
    >
      <Ionicons name={icon as never} size={20} color={COLOR.text} />
    </Pressable>
  );
}

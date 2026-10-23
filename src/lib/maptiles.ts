/**
 * TOÁN BẢN ĐỒ GẠCH (slippy map) — module THUẦN cho "Bản đồ hai đứa".
 * Bản đồ vẽ bằng gạch ảnh OpenStreetMap công khai (không API key, không SDK):
 * - latLonToWorldPx: toạ độ địa lý -> pixel "thế giới" ở một mức zoom
 *   (thế giới là hình vuông 2^zoom × 256 px mỗi cạnh).
 * - tileUrl: URL gạch theo chỉ số x/y/zoom.
 * - fitMapPoints: chọn zoom + tâm sao cho MỌI điểm đều nằm trong khung hình
 *   (trừ đệm), zoom kẹp 3..17; 1 điểm -> zoom 15 tâm là điểm đó.
 * - panCenterByPixels / zoomCenterAroundAnchor: toán TƯƠNG TÁC (kéo, pinch,
 *   lăn chuột, nút zoom) — thuần, có test ở nhóm H (H8..H16).
 * Kiểm chứng bằng Node trong scripts/test-logic.mjs (nhóm H).
 */

export const TILE_SIZE = 256;
/** Vĩ độ tối đa của phép chiếu Web Mercator (quá đây công thức log/tan nổ) */
const MAX_LAT = 85.05112878;
export const MAP_ZOOM_MIN = 3;
export const MAP_ZOOM_MAX = 17;
/** Trần zoom khi người dùng TỰ zoom (pinch/nút/lăn chuột) — cao hơn trần fit 1 mức */
export const MAP_ZOOM_INTERACTIVE_MAX = 18;
/** Zoom mặc định khi chỉ có 1 điểm (mức khu phố) */
export const MAP_SINGLE_POINT_ZOOM = 15;

export interface LatLon { lat: number; lon: number }
export interface WorldPx { x: number; y: number }

const clampLat = (lat: number): number => Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));

/** Toạ độ địa lý -> pixel thế giới tại zoom (gốc ở góc tây-bắc của bản đồ). */
export function latLonToWorldPx(lat: number, lon: number, zoom: number): WorldPx {
  const world = Math.pow(2, zoom) * TILE_SIZE;
  const x = ((lon + 180) / 360) * world;
  const latRad = (clampLat(lat) * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * world;
  return { x, y };
}

/** Pixel thế giới tại zoom -> toạ độ địa lý (nghịch đảo của latLonToWorldPx). */
export function worldPxToLatLon(x: number, y: number, zoom: number): LatLon {
  const world = Math.pow(2, zoom) * TILE_SIZE;
  const lon = (x / world) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world)));
  return { lat: (latRad * 180) / Math.PI, lon };
}

/** Chỉ số gạch chứa một toạ độ tại zoom. */
export function tileIndices(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const p = latLonToWorldPx(lat, lon, zoom);
  return { x: Math.floor(p.x / TILE_SIZE), y: Math.floor(p.y / TILE_SIZE) };
}

/** URL gạch OpenStreetMap chuẩn. */
export function tileUrl(x: number, y: number, zoom: number): string {
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

/**
 * Chọn { zoom, center } để mọi điểm đều thấy trong khung widthPx×heightPx với
 * đệm paddingPx mỗi phía: thử zoom từ cao xuống thấp, lấy zoom LỚN NHẤT mà
 * hộp bao của các điểm vẫn lọt khung; không zoom nào lọt -> zoom tối thiểu.
 * 0 điểm -> tâm 0,0 (nơi gọi không được vẽ bản đồ khi không có điểm nào).
 */
export function fitMapPoints(
  points: LatLon[],
  widthPx: number,
  heightPx: number,
  paddingPx = 40,
): { zoom: number; center: LatLon } {
  if (points.length === 0) return { zoom: MAP_SINGLE_POINT_ZOOM, center: { lat: 0, lon: 0 } };
  if (points.length === 1) return { zoom: MAP_SINGLE_POINT_ZOOM, center: { lat: points[0].lat, lon: points[0].lon } };
  const availW = Math.max(1, widthPx - paddingPx * 2);
  const availH = Math.max(1, heightPx - paddingPx * 2);
  const centerAt = (zoom: number): LatLon => {
    const pxs = points.map((p) => latLonToWorldPx(p.lat, p.lon, zoom));
    const minX = Math.min(...pxs.map((p) => p.x));
    const maxX = Math.max(...pxs.map((p) => p.x));
    const minY = Math.min(...pxs.map((p) => p.y));
    const maxY = Math.max(...pxs.map((p) => p.y));
    return worldPxToLatLon((minX + maxX) / 2, (minY + maxY) / 2, zoom);
  };
  for (let z = MAP_ZOOM_MAX; z >= MAP_ZOOM_MIN; z--) {
    const pxs = points.map((p) => latLonToWorldPx(p.lat, p.lon, z));
    const spanX = Math.max(...pxs.map((p) => p.x)) - Math.min(...pxs.map((p) => p.x));
    const spanY = Math.max(...pxs.map((p) => p.y)) - Math.min(...pxs.map((p) => p.y));
    if (spanX <= availW && spanY <= availH) return { zoom: z, center: centerAt(z) };
  }
  return { zoom: MAP_ZOOM_MIN, center: centerAt(MAP_ZOOM_MIN) };
}

/* ================= TƯƠNG TÁC BẢN ĐỒ (kéo / pinch / zoom) ================= */

/** Kẹp zoom tương tác vào [3, 18]. */
export function clampZoom(zoom: number): number {
  return Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_INTERACTIVE_MAX, zoom));
}

/** Chỉ số gạch X gói vòng qua kinh tuyến 180 (thế giới lặp ngang vô hạn). */
export function wrapTileX(x: number, zoom: number): number {
  const n = Math.pow(2, Math.round(zoom));
  return ((x % n) + n) % n;
}

/** Chỉ số gạch Y kẹp vào [0, 2^zoom − 1] (hai cực không có gạch ngoài biên). */
export function clampTileY(y: number, zoom: number): number {
  const max = Math.pow(2, Math.round(zoom)) - 1;
  return Math.max(0, Math.min(max, y));
}

/**
 * Chuẩn hoá một pixel thế giới thành tâm hợp lệ: X gói vòng (kinh độ luôn về
 * [−180, 180)), Y kẹp vào [0, world] (vĩ độ không vượt ±85.0511 của Mercator).
 */
function normalizeCenterPx(px: WorldPx, zoom: number): LatLon {
  const world = Math.pow(2, zoom) * TILE_SIZE;
  const wrappedX = ((px.x % world) + world) % world;
  const clampedY = Math.max(0, Math.min(world, px.y));
  return worldPxToLatLon(wrappedX, clampedY, zoom);
}

/**
 * KÉO BẢN ĐỒ: nội dung đi THEO ngón tay — kéo phải dx>0 thì khung nhìn trượt
 * sang TÂY (tâm giảm kinh độ), kéo xuống dy>0 thì tâm tăng vĩ độ. Độ lớn: dịch
 * đúng dx/dy pixel thế giới tại zoom hiện tại (256px ở zoom z = 360/2^z độ kinh).
 */
export function panCenterByPixels(center: LatLon, zoom: number, dxPx: number, dyPx: number): LatLon {
  const c = latLonToWorldPx(center.lat, center.lon, zoom);
  return normalizeCenterPx({ x: c.x - dxPx, y: c.y - dyPx }, zoom);
}

/**
 * ZOOM QUANH MỘT ĐIỂM NEO trên màn hình: điểm địa lý đang nằm dưới anchorPx
 * (px tính từ góc trái-trên của khung nhìn) PHẢI vẫn nằm đúng dưới anchorPx sau
 * khi zoom — tính bằng cách neo pixel thế giới của điểm đó rồi suy tâm mới.
 * Zoom đích bị kẹp [3, 18]. Trả cả zoom đã kẹp để nơi gọi đồng bộ state.
 */
export function zoomCenterAroundAnchor(
  center: LatLon,
  zoom: number,
  newZoomRaw: number,
  anchorPx: WorldPx,
  viewportSize: { w: number; h: number },
): { center: LatLon; zoom: number } {
  const newZoom = clampZoom(newZoomRaw);
  if (newZoom === zoom) return { center, zoom };
  const c = latLonToWorldPx(center.lat, center.lon, zoom);
  const off = { x: anchorPx.x - viewportSize.w / 2, y: anchorPx.y - viewportSize.h / 2 };
  const anchorWorld = { x: c.x + off.x, y: c.y + off.y };
  const scale = Math.pow(2, newZoom - zoom);
  const newCenterPx = { x: anchorWorld.x * scale - off.x, y: anchorWorld.y * scale - off.y };
  return { center: normalizeCenterPx(newCenterPx, newZoom), zoom: newZoom };
}

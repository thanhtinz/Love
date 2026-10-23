/**
 * TOÁN BẢN ĐỒ GẠCH (slippy map) — module THUẦN cho "Bản đồ hai đứa".
 * Bản đồ vẽ bằng gạch ảnh OpenStreetMap công khai (không API key, không SDK):
 * - latLonToWorldPx: toạ độ địa lý -> pixel "thế giới" ở một mức zoom
 *   (thế giới là hình vuông 2^zoom × 256 px mỗi cạnh).
 * - tileUrl: URL gạch theo chỉ số x/y/zoom.
 * - fitMapPoints: chọn zoom + tâm sao cho MỌI điểm đều nằm trong khung hình
 *   (trừ đệm), zoom kẹp 3..17; 1 điểm -> zoom 15 tâm là điểm đó.
 * Kiểm chứng bằng Node trong scripts/test-logic.mjs (nhóm H).
 */

export const TILE_SIZE = 256;
/** Vĩ độ tối đa của phép chiếu Web Mercator (quá đây công thức log/tan nổ) */
const MAX_LAT = 85.05112878;
export const MAP_ZOOM_MIN = 3;
export const MAP_ZOOM_MAX = 17;
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

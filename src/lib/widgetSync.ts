import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import type { Widget } from "expo-widgets";
import { AppState, PersonId } from "./types";
import {
  LoveWidgetProps, WidgetInput, WidgetNoteInput,
  buildWidgetProps, buildWidgetTimeline, widgetInputFromState, widgetSignature,
} from "./widget";

/**
 * Tầng ĐỒNG BỘ widget (chỉ chạy phía app — widget runtime không chạy code này):
 * - Nạp instance widget bằng require CÓ GUARD: web và Expo Go không có widget
 *   gốc -> trả null, mọi hàm thành no-op an toàn. Bản web không bao giờ được vỡ
 *   vì widget.
 * - Chép 7 tranh giai đoạn cây vào widgetsDirectory (thư mục app-group dùng
 *   chung app <-> widget) để widget hiện TRANH VẼ THẬT; chép lỗi/thiếu thì
 *   props.treeImageUri = "" và widget tự vẽ hình bóng theo giai đoạn.
 * - Đẩy dữ liệu: iOS = updateTimeline (entry hiện tại + nửa đêm 30 ngày tới,
 *   mỗi entry trỏ đúng tranh của giai đoạn NGÀY ĐÓ); Android = updateSnapshot.
 * - Chữ ký nội dung (lib/widget.widgetSignature) chặn đẩy trùng: state đổi mà
 *   nội dung widget không đổi thì không đốt ngân sách làm mới của hệ điều hành.
 * - Cache đầu vào widget vào AsyncStorage: khi push note tới lúc app đang tắt,
 *   handler nền (lib/push.ts) dựng lại props từ cache + payload mà không cần
 *   mở store.
 */

const CACHE_KEY = "love-widget-cache-v1";
type LoveWidgetInstance = Widget<LoveWidgetProps, undefined>;

/** Tranh cây 7 giai đoạn — cùng asset với components/Art.tsx (LOVE_TREE_ART). */
const TREE_ART_MODULES: number[] = [
  require("../../assets/art/plants/love-tree-s1.webp"),
  require("../../assets/art/plants/love-tree-s2.webp"),
  require("../../assets/art/plants/love-tree-s3.webp"),
  require("../../assets/art/plants/love-tree-s4.webp"),
  require("../../assets/art/plants/love-tree-s5.webp"),
  require("../../assets/art/plants/love-tree-s6.webp"),
  require("../../assets/art/plants/love-tree-s7.webp"),
];

let widgetCache: LoveWidgetInstance | null | undefined;
function loadWidget(): LoveWidgetInstance | null {
  if (widgetCache !== undefined) return widgetCache;
  if (Platform.OS === "web") { widgetCache = null; return null; }
  try {
    // Metro phân giải theo nền tảng: .ios.tsx / .android.tsx (bản .tsx là stub web).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../widgets/LoveWidget");
    widgetCache = (mod?.default ?? null) as LoveWidgetInstance | null;
  } catch { widgetCache = null; }
  return widgetCache;
}

function loadWidgetsDirectory(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const w = require("expo-widgets");
    const dir = (w as { widgetsDirectory?: unknown }).widgetsDirectory;
    return typeof dir === "string" && dir.length > 0 ? dir.replace(/\/+$/, "") : null;
  } catch { return null; }
}

const asFileUri = (path: string) => (path.startsWith("file://") ? path : `file://${path}`);

/**
 * Chép cả 7 tranh giai đoạn vào thư mục chung, trả map stage -> file:// uri.
 * Idempotent: file đã có thì bỏ qua. Lỗi từng file -> thiếu mục đó (widget
 * dùng hình bóng cho giai đoạn ấy). Chép cả 7 ngay từ đầu vì timeline nửa đêm
 * cần sẵn tranh của các giai đoạn TƯƠNG LAI trong 30 ngày tới.
 */
const copiedStages = new Set<number>();
async function ensureTreeArt(widgetsDir: string): Promise<Map<number, string>> {
  const uris = new Map<number, string>();
  for (let stage = 1; stage <= 7; stage++) {
    const dest = `${widgetsDir}/love-tree-s${stage}.webp`;
    uris.set(stage, asFileUri(dest));
    if (copiedStages.has(stage)) continue;
    try {
      const info = await FileSystem.getInfoAsync(dest);
      if (!info.exists) {
        const asset = Asset.fromModule(TREE_ART_MODULES[stage - 1]);
        await asset.downloadAsync();
        if (asset.localUri) await FileSystem.copyAsync({ from: asset.localUri, to: dest });
      }
      copiedStages.add(stage);
    } catch { uris.delete(stage); }
  }
  return uris;
}

/* ---------- Cache đầu vào cho handler push nền ---------- */
type CachedWidgetBase = Omit<WidgetInput, "nowMs">;
let lastCacheJson = "";
async function saveWidgetCache(base: CachedWidgetBase): Promise<void> {
  const json = JSON.stringify(base);
  if (json === lastCacheJson) return; // state đổi kiểu khác (tick giờ...) — cache không đổi thì khỏi ghi lại
  lastCacheJson = json;
  try { await AsyncStorage.setItem(CACHE_KEY, json); } catch { /* cache là phụ trợ */ }
}
export async function loadWidgetCache(): Promise<CachedWidgetBase | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWidgetBase;
    if (!parsed || typeof parsed.startDate !== "string" || !parsed.prefs) return null;
    return parsed;
  } catch { return null; }
}

/* ---------- Đẩy dữ liệu lên widget ---------- */
let lastSignature = "";

async function pushInput(base: CachedWidgetBase, nowMs: number, force: boolean): Promise<void> {
  const widget = loadWidget();
  if (!widget) return;
  const probe = buildWidgetProps({ ...base, nowMs });
  const sig = widgetSignature(probe);
  if (!force && sig === lastSignature) return;

  let artUris = new Map<number, string>();
  if (base.prefs.tree) {
    const dir = loadWidgetsDirectory();
    if (dir) artUris = await ensureTreeArt(dir);
  }
  const uriForStage = (stage: number) => artUris.get(stage) ?? "";

  try {
    if (Platform.OS === "ios") {
      const entries = buildWidgetTimeline(base, nowMs, 30).map((e) => ({
        date: e.date,
        props: { ...e.props, treeImageUri: uriForStage(e.props.treeStage) },
      }));
      widget.updateTimeline(entries);
    } else {
      widget.updateSnapshot({ ...probe, treeImageUri: uriForStage(probe.treeStage) });
    }
    lastSignature = sig;
  } catch { /* widget chưa được thêm vào màn hình chính / Expo Go — bỏ qua êm */ }
}

/**
 * Đẩy widget từ state hiện tại. Gọi: sau hydrate, mỗi lần state đổi (hàm tự
 * dedupe bằng chữ ký), khi app về foreground (force — qua nửa đêm lúc app đang
 * mở thì ngày/giai đoạn phải lật ngay), và khi người dùng đổi công tắc.
 */
export async function syncWidgetFromState(state: AppState, mySlot: PersonId, force = false): Promise<void> {
  if (Platform.OS === "web") return;
  const input = widgetInputFromState(state, mySlot, Date.now());
  const { nowMs, ...base } = input;
  await saveWidgetCache(base);
  await pushInput(base, nowMs, force);
}

/**
 * Handler nền khi push note tới (app có thể đang tắt): dựng lại props từ cache
 * + note trong payload rồi đẩy. Không có cache (chưa từng mở app sau khi cài)
 * thì thôi — lần mở app tới sẽ đồng bộ. Note trong payload là note của NGƯỜI ẤY
 * vừa gửi cho mình; readAt rỗng (mình chưa xem) -> chấm "chưa đọc" bật.
 */
export async function refreshWidgetForIncomingNote(note: WidgetNoteInput): Promise<void> {
  if (Platform.OS === "web") return;
  const base = await loadWidgetCache();
  if (!base) return;
  await pushInput({ ...base, partnerNote: note }, Date.now(), true);
}

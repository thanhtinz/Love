import { AppState, PersonId, WidgetPrefs } from "./types";
import { TREE_STAGES, treeStageForDay } from "./tree";
import { MILESTONES, dayCount, nextMilestone, timeAgoText } from "./features";

/**
 * WIDGET MÀN HÌNH CHÍNH — tầng THUẦN (không React, không native): dựng props
 * cho widget từ state + công tắc của chính người dùng, quyết định bố cục theo
 * tổ hợp công tắc, và sinh timeline nửa đêm cho iOS. Widget runtime (expo-widgets)
 * bị cô lập hoàn toàn (không hook/state/async) nên MỌI thứ nó cần phải được
 * tính sẵn ở đây — kể cả số ngày/giai đoạn cây của 30 ngày tới: đếm ngày và
 * giai đoạn cây là hàm thuần của ngày bắt đầu yêu nên ở nhà tính trước được,
 * widget ở nhà vẫn đúng kể cả khi điện thoại offline cả tháng.
 *
 * Cập nhật TƯƠNG LAI không suy ra được (note mới của người ấy) KHÔNG nằm trong
 * timeline — nó đến qua đường push + mở app (xem lib/widgetSync.ts, lib/push.ts).
 * Không nơi nào trong app được hứa "note hiện trên widget tức thì": iOS giới
 * hạn số lần làm mới widget nền, Android chỉ đổi khi app đẩy snapshot mới.
 */

/* ---------- Đầu vào tối thiểu (tách khỏi AppState để test + dùng lại cho
 *  đường push nền, nơi chỉ có dữ liệu cache + payload, không có store) ---------- */
export interface WidgetNoteInput {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
  /** "" = người nhận chưa xem */
  readAt: string;
}
export interface WidgetInput {
  startDate: string;
  /** Công tắc của CHÍNH người dùng đang xem (không phải của người ấy) */
  prefs: WidgetPrefs;
  /** Note mới nhất DO NGƯỜI ẤY viết (module Note là "note của người ấy") */
  partnerNote: WidgetNoteInput | null;
  nowMs: number;
}

/* ---------- Props widget: CHỈ kiểu nguyên thủy (serialize được qua timeline) ---------- */
export interface LoveWidgetProps {
  showDay: boolean;
  showNote: boolean;
  showTree: boolean;
  /* Ngày yêu */
  dayCount: number;
  milestoneText: string;
  /** Tiến độ 0..1 từ mốc đã qua (hoặc ngày 1) tới mốc tiếp theo; 1 vào đúng ngày mốc */
  dayProgress: number;
  milestoneToday: boolean;
  /* Note của người ấy */
  noteId: string;
  noteHas: boolean;
  /** Đã cắt cho bố cục Note-hero (tối đa ~4 dòng) */
  noteText: string;
  /** Đã cắt cho ô Note nhỏ (tối đa ~2 dòng) — cắt theo DÒNG ở tầng chữ này, widget không phải nén cỡ chữ */
  noteShortText: string;
  noteAuthor: string;
  noteRelativeTime: string;
  noteUnread: boolean;
  /* Cây tình yêu (theo ngày yêu) */
  treeStage: number;
  treeStageName: string;
  /** Tiến độ 0..1 TRONG giai đoạn hiện tại */
  treeProgress: number;
  /** Còn bao nhiêu ngày lên giai đoạn mới; -1 = giai đoạn cuối */
  daysToNextStage: number;
  /** file:// tới tranh giai đoạn cây trong thư mục chia sẻ với widget; "" = dùng hình bóng (silhouette) */
  treeImageUri: string;
  /* Deep link cho từng vùng chạm (app tự thêm khi dựng props từ state) */
  linkDay: string;
  linkNote: string;
  linkTree: string;
}

/** Ngân sách ký tự cho note trên widget — cắt theo ngân sách này + lineLimit ở UI,
 *  không bao giờ nén chữ nhỏ đi để nhét thêm (bài học từ widget noteit cỡ nhỏ). */
export const NOTE_TEXT_BUDGET = 150;
export const NOTE_SHORT_BUDGET = 78;

/** Cắt note cho widget: gộp khoảng trắng/xuống dòng thành 1 dấu cách, cắt ở ranh
 *  giới từ khi có thể, thêm "…" khi bị cắt. Không bao giờ trả chuỗi dài hơn maxChars. */
export function truncateNoteText(text: string, maxChars: number): string {
  const flat = (text || "").replace(/\s+/g, " ").trim();
  if (maxChars <= 0) return "";
  if (flat.length <= maxChars) return flat;
  const cut = flat.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace >= Math.floor(maxChars * 0.6) ? cut.slice(0, lastSpace) : cut;
  return body.replace(/[\s,;:.!?-]+$/u, "") + "…";
}

/** Bố cục widget theo tổ hợp công tắc — widget tự reflow theo giá trị này. */
export type WidgetLayoutVariant =
  | "none" | "all" | "noteDay" | "noteTree" | "dayTree" | "note" | "day" | "tree";
export function widgetLayoutVariant(p: { showDay: boolean; showNote: boolean; showTree: boolean }): WidgetLayoutVariant {
  const n = (p.showDay ? 1 : 0) + (p.showNote ? 1 : 0) + (p.showTree ? 1 : 0);
  if (n === 0) return "none";
  if (n === 3) return "all";
  if (n === 1) return p.showNote ? "note" : p.showDay ? "day" : "tree";
  if (p.showNote && p.showDay) return "noteDay";
  if (p.showNote && p.showTree) return "noteTree";
  return "dayTree";
}

/** Tiến độ tới mốc tiếp theo: đoạn [mốc đã qua gần nhất (hoặc ngày 1) -> mốc tới]. */
function dayProgressFor(count: number): number {
  const next = nextMilestone(count);
  if (!next) return 1;
  if (MILESTONES.includes(count)) return 1; // đúng ngày mốc: đầy
  const prev = [...MILESTONES].filter((m) => m < count).pop() ?? 1;
  const span = next.days - prev;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (count - prev) / span));
}

export function buildWidgetProps(input: WidgetInput, treeImageUri = ""): LoveWidgetProps {
  const count = dayCount(input.startDate, input.nowMs);
  const milestoneToday = MILESTONES.includes(count);
  const next = nextMilestone(count);
  const milestoneText = milestoneToday
    ? `Hôm nay là mốc ${count} ngày yêu!`
    : next
      ? `Còn ${next.remaining} ngày nữa tới mốc ${next.days} ngày`
      : `Đã bên nhau ${count} ngày`;
  const stage = treeStageForDay(count);
  const note = input.partnerNote;
  return {
    showDay: input.prefs.day,
    showNote: input.prefs.note,
    showTree: input.prefs.tree,
    dayCount: count,
    milestoneText,
    dayProgress: dayProgressFor(count),
    milestoneToday,
    noteId: note?.id ?? "",
    noteHas: Boolean(note),
    noteText: note ? truncateNoteText(note.text, NOTE_TEXT_BUDGET) : "",
    noteShortText: note ? truncateNoteText(note.text, NOTE_SHORT_BUDGET) : "",
    noteAuthor: note?.authorName ?? "",
    noteRelativeTime: note ? timeAgoText(note.createdAt, input.nowMs) : "",
    noteUnread: Boolean(note && !note.readAt),
    treeStage: stage.stage,
    treeStageName: TREE_STAGES[stage.stage - 1]?.name ?? "",
    treeProgress: stage.progress,
    daysToNextStage: stage.daysToNextStage ?? -1,
    treeImageUri,
    linkDay: "lovecouple://",
    linkNote: "lovecouple://notes",
    linkTree: "lovecouple://tree",
  };
}

/** Rút đầu vào widget từ state đầy đủ cho một người (mySlot xem widget của mình). */
export function widgetInputFromState(state: AppState, mySlot: PersonId, nowMs: number = Date.now()): WidgetInput {
  const other: PersonId = mySlot === "A" ? "B" : "A";
  const note = state.notes.find((n) => n.authorSlot === other) ?? null;
  return {
    startDate: state.couple.startDate,
    prefs: state.widgetPrefs[mySlot],
    partnerNote: note
      ? {
          id: note.id,
          text: note.text,
          authorName: other === "A" ? state.personA : state.personB,
          createdAt: note.createdAt,
          readAt: note.readAt,
        }
      : null,
    nowMs,
  };
}

export interface WidgetTimelineEntry {
  date: Date;
  props: LoveWidgetProps;
}

/**
 * Timeline iOS: entry "bây giờ" + một entry tại 0 GIỜ ĐỊA PHƯƠNG của mỗi ngày
 * tiếp theo (mặc định 30 ngày). Ngày yêu + giai đoạn cây là hàm thuần của ngày
 * bắt đầu nên các entry tương lai CHÍNH XÁC tuyệt đối; phần note giữ nguyên như
 * hiện tại (note mới không thể biết trước — nó đến qua push/mở app).
 */
export function buildWidgetTimeline(
  base: Omit<WidgetInput, "nowMs">,
  nowMs: number,
  days = 30,
  treeImageUri = "",
): WidgetTimelineEntry[] {
  const entries: WidgetTimelineEntry[] = [
    { date: new Date(nowMs), props: buildWidgetProps({ ...base, nowMs }, treeImageUri) },
  ];
  const start = new Date(nowMs);
  for (let i = 1; i <= days; i++) {
    const midnight = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    entries.push({ date: midnight, props: buildWidgetProps({ ...base, nowMs: midnight.getTime() }, treeImageUri) });
  }
  return entries;
}

/**
 * Chữ ký nội dung của props — tầng đồng bộ (widgetSync) chỉ đẩy lại khi chữ ký
 * đổi, tránh đốt ngân sách làm mới widget của iOS vào những lần render trùng.
 * Cố ý LOẠI noteRelativeTime (đổi theo phút) và treeImageUri (đường dẫn máy).
 */
export function widgetSignature(props: LoveWidgetProps): string {
  return JSON.stringify([
    props.showDay, props.showNote, props.showTree,
    props.dayCount, props.milestoneText, props.milestoneToday,
    props.noteId, props.noteUnread, props.noteShortText,
    props.treeStage, props.daysToNextStage,
  ]);
}

'widget';

/**
 * WIDGET iOS — SwiftUI qua @expo/ui. File này chạy trong runtime CÔ LẬP của
 * widget extension: không hook, không state, không async — chỉ props do app
 * tính sẵn (src/lib/widget.ts) + environment (widgetFamily). Mọi layout tự
 * reflow theo tổ hợp công tắc của CHÍNH người dùng (variant từ lib/widget).
 *
 * Cây trong widget: app chép tranh vẽ giai đoạn cây vào thư mục dùng chung
 * (widgetsDirectory) và truyền đường dẫn qua props.treeImageUri — có tranh thì
 * hiện tranh (Image uiImage), không có thì vẽ hình bóng (silhouette) bằng các
 * hình SwiftUI tô màu theo giai đoạn. KHÔNG emoji — chỉ hình khối + chữ.
 */
import {
  Circle, Ellipse, HStack, Image, Link, ProgressView, Rectangle, Spacer, Text, VStack, ZStack,
} from "@expo/ui/swift-ui";
import {
  background, containerBackground, cornerRadius, font, foregroundStyle, frame, lineLimit,
  offset, padding, progressViewStyle, tint, widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { widgetLayoutVariant, type LoveWidgetProps } from "../lib/widget";

const INK = "#FFF6EC";
const SUB = "#F0C4D2";
const FAINT = "#C99AAB";
const ROSE = "#FF8FAB";
const GOLD = "#FFC46B";
const CARD = "#FFFFFF16";
const TRUNK = "#8A5A44";
const GROUND = "#2E5D3A";

/** Màu tán lá + điểm hoa theo giai đoạn 1..7 (khớp lib/tree STAGE_DAYS). */
const STAGE_VIS = [
  { canopy: "#9BD49A", blossom: "", scale: 0.36 },
  { canopy: "#7CC47F", blossom: "", scale: 0.52 },
  { canopy: "#5FB878", blossom: "", scale: 0.68 },
  { canopy: "#6FBF73", blossom: "#FFB3C6", scale: 0.8 },
  { canopy: "#5FA86B", blossom: "#FF9FB2", scale: 0.9 },
  { canopy: "#4E9A5F", blossom: "#FF8FAB", scale: 0.97 },
  { canopy: "#3E7D4E", blossom: "#FFC46B", scale: 1 },
] as const;

type Mods = ReturnType<typeof frame>[];

function txt(text: string, size: number, color: string, weight: "regular" | "medium" | "semibold" | "bold" | "black" = "regular", extra: Mods = []) {
  return (
    <Text modifiers={[font({ size, weight, design: "rounded" }), foregroundStyle(color), ...extra]}>
      {text}
    </Text>
  );
}

function bar(value: number, color: string, width?: number) {
  return (
    <ProgressView
      value={Math.min(1, Math.max(0, value))}
      modifiers={[progressViewStyle("linear"), tint(color), ...(width ? [frame({ width })] : [])]}
    />
  );
}

/** Hình bóng cây bằng hình khối (phương án khi chưa có tranh trong thư mục chung). */
function TreeSilhouette({ stage, height }: { stage: number; height: number }) {
  const vis = STAGE_VIS[Math.min(6, Math.max(0, stage - 1))];
  const w = height * 0.92;
  const canopy = height * 0.56 * vis.scale;
  const cy = -height * 0.16;
  return (
    <ZStack modifiers={[frame({ width: w, height })]}>
      <Ellipse modifiers={[foregroundStyle(GROUND), frame({ width: w * 0.86, height: height * 0.13 }), offset({ x: 0, y: height * 0.4 })]} />
      <Rectangle modifiers={[foregroundStyle(TRUNK), frame({ width: Math.max(3, w * 0.07), height: height * 0.4 }), offset({ x: 0, y: height * 0.2 })]} />
      <Circle modifiers={[foregroundStyle(vis.canopy), frame({ width: canopy, height: canopy }), offset({ x: 0, y: cy })]} />
      <Circle modifiers={[foregroundStyle(vis.canopy), frame({ width: canopy * 0.68, height: canopy * 0.68 }), offset({ x: -canopy * 0.42, y: cy + canopy * 0.22 })]} />
      <Circle modifiers={[foregroundStyle(vis.canopy), frame({ width: canopy * 0.68, height: canopy * 0.68 }), offset({ x: canopy * 0.42, y: cy + canopy * 0.22 })]} />
      {vis.blossom ? (
        <>
          <Circle modifiers={[foregroundStyle(vis.blossom), frame({ width: canopy * 0.2, height: canopy * 0.2 }), offset({ x: -canopy * 0.2, y: cy - canopy * 0.12 })]} />
          <Circle modifiers={[foregroundStyle(vis.blossom), frame({ width: canopy * 0.16, height: canopy * 0.16 }), offset({ x: canopy * 0.24, y: cy + canopy * 0.08 })]} />
          <Circle modifiers={[foregroundStyle(vis.blossom), frame({ width: canopy * 0.13, height: canopy * 0.13 }), offset({ x: canopy * 0.02, y: cy + canopy * 0.3 })]} />
        </>
      ) : null}
    </ZStack>
  );
}

/** Cây: ưu tiên tranh vẽ app đã chép sang; chưa có thì hình bóng theo giai đoạn. */
function TreeVisual({ props, height }: { props: LoveWidgetProps; height: number }) {
  if (props.treeImageUri) {
    return <Image uiImage={props.treeImageUri} modifiers={[frame({ width: height * 0.92, height })]} />;
  }
  return <TreeSilhouette stage={props.treeStage} height={height} />;
}

function StageDots({ stage }: { stage: number }) {
  return (
    <HStack spacing={3}>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Circle
          key={i}
          modifiers={[foregroundStyle(i <= stage ? GOLD : "#FFFFFF33"), frame({ width: i === stage ? 7 : 5, height: i === stage ? 7 : 5 })]}
        />
      ))}
    </HStack>
  );
}

function TreeBlock({ props, height, withTracker }: { props: LoveWidgetProps; height: number; withTracker: boolean }) {
  return (
    <VStack alignment="center" spacing={3} modifiers={[frame({ height })]}>
      <TreeVisual props={props} height={withTracker ? height - 44 : height - 24} />
      {txt(props.treeStageName, 11, INK, "semibold")}
      {withTracker ? (
        <>
          <StageDots stage={props.treeStage} />
          {txt(
            props.daysToNextStage >= 0 ? `Còn ${props.daysToNextStage} ngày nữa cây lớn thêm` : "Cây đã trưởng thành",
            9, SUB,
          )}
        </>
      ) : null}
    </VStack>
  );
}

function NoteBlock({ props, hero }: { props: LoveWidgetProps; hero: boolean }) {
  if (!props.noteHas) {
    return (
      <VStack alignment="leading" spacing={4}>
        {txt("Note của người ấy", 10, FAINT, "semibold")}
        {txt("Chưa có note nào. Mở app để viết note đầu tiên cho người ấy nhé.", hero ? 13 : 11, SUB, "regular", [lineLimit(hero ? 4 : 2)])}
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={4}>
      <HStack spacing={5}>
        <Circle modifiers={[foregroundStyle(props.noteUnread ? ROSE : "#FFFFFF33"), frame({ width: 6, height: 6 })]} />
        {txt(props.noteAuthor || "Người ấy", 10, GOLD, "semibold")}
        <Spacer />
        {txt(props.noteRelativeTime, 9, FAINT)}
      </HStack>
      {txt(hero ? props.noteText : props.noteShortText, hero ? 14 : 12, INK, "medium", [lineLimit(hero ? 5 : 2)])}
      {props.noteUnread ? txt("Note mới chưa xem", 9, ROSE, "semibold") : null}
    </VStack>
  );
}

function DayBlock({ props, big }: { props: LoveWidgetProps; big: boolean }) {
  return (
    <VStack alignment={big ? "center" : "leading"} spacing={big ? 2 : 3}>
      {txt("Ngày", big ? 13 : 10, SUB, "semibold")}
      {txt(String(props.dayCount), big ? 56 : 30, INK, "black")}
      {txt(big ? "bên nhau" : props.milestoneText, big ? 12 : 10, big ? SUB : FAINT, "medium", [lineLimit(2)])}
      {big ? txt(props.milestoneText, 10, FAINT, "regular", [lineLimit(1)]) : null}
      {bar(props.dayProgress, props.milestoneToday ? GOLD : ROSE, big ? 110 : undefined)}
    </VStack>
  );
}

function HintBlock() {
  return (
    <VStack alignment="center" spacing={6} modifiers={[padding({ all: 14 })]}>
      {txt("Khu vườn nhỏ", 17, INK, "bold")}
      {txt("Mở app → Tài khoản → Widget để chọn phần muốn hiện", 12, SUB, "medium", [lineLimit(3)])}
      {txt("Đếm ngày · Note của người ấy · Cây tình yêu", 10, FAINT)}
    </VStack>
  );
}

function LoveWidgetView(props: LoveWidgetProps, environment: WidgetEnvironment) {
  const variant = widgetLayoutVariant(props);
  const small = environment.widgetFamily === "systemSmall";
  const primaryLink = props.showNote && props.noteUnread ? props.linkNote : variant === "tree" ? props.linkTree : props.linkDay;

  let content: React.JSX.Element;
  if (variant === "none") {
    content = <HintBlock />;
  } else if (small) {
    content =
      variant === "day" || variant === "all" || variant === "noteDay" || variant === "dayTree" ? (
        <DayBlock props={props} big />
      ) : variant === "tree" || variant === "noteTree" ? (
        <TreeBlock props={props} height={140} withTracker={false} />
      ) : (
        <NoteBlock props={props} hero />
      );
  } else if (variant === "all") {
    content = (
      <HStack spacing={10} modifiers={[padding({ all: 12 })]}>
        <Link destination={props.linkTree}>
          <TreeBlock props={props} height={132} withTracker />
        </Link>
        <VStack alignment="leading" spacing={8}>
          <Link destination={props.linkNote}>
            <VStack alignment="leading" spacing={4} modifiers={[background(CARD), cornerRadius(12), padding({ all: 9 })]}>
              <NoteBlock props={props} hero={false} />
            </VStack>
          </Link>
          <Link destination={props.linkDay}>
            <DayBlock props={props} big={false} />
          </Link>
        </VStack>
      </HStack>
    );
  } else if (variant === "noteDay") {
    content = (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 12 })]}>
        <Link destination={props.linkDay}>
          <HStack spacing={6}>
            {txt(`Ngày ${props.dayCount}`, 13, INK, "bold")}
            {txt(props.milestoneText, 10, FAINT, "regular", [lineLimit(1)])}
          </HStack>
        </Link>
        <Link destination={props.linkNote}>
          <NoteBlock props={props} hero />
        </Link>
      </VStack>
    );
  } else if (variant === "noteTree") {
    content = (
      <HStack spacing={10} modifiers={[padding({ all: 12 })]}>
        <Link destination={props.linkTree}>
          <TreeBlock props={props} height={132} withTracker />
        </Link>
        <Link destination={props.linkNote}>
          <NoteBlock props={props} hero />
        </Link>
      </HStack>
    );
  } else if (variant === "dayTree") {
    content = (
      <HStack spacing={10} modifiers={[padding({ all: 12 })]}>
        <Link destination={props.linkTree}>
          <TreeBlock props={props} height={132} withTracker />
        </Link>
        <Link destination={props.linkDay}>
          <DayBlock props={props} big={false} />
        </Link>
      </HStack>
    );
  } else if (variant === "note") {
    content = (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 })]}>
        <Link destination={props.linkNote}>
          <NoteBlock props={props} hero />
        </Link>
        <Spacer />
        {txt("Chạm để mở Note", 9, FAINT)}
      </VStack>
    );
  } else if (variant === "tree") {
    content = (
      <Link destination={props.linkTree}>
        <TreeBlock props={props} height={150} withTracker />
      </Link>
    );
  } else {
    content = (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Link destination={props.linkDay}>
          <DayBlock props={props} big />
        </Link>
      </VStack>
    );
  }

  return (
    <ZStack
      modifiers={[
        containerBackground(
          { type: "linearGradient", colors: ["#4A1E33", "#2A1220"], startPoint: { x: 0, y: 0 }, endPoint: { x: 0, y: 1 } },
          "widget",
        ),
        widgetURL(primaryLink),
      ]}
    >
      {content}
    </ZStack>
  );
}

export default createWidget("LoveWidget", LoveWidgetView);

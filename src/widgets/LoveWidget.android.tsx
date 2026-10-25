/* eslint-disable react-hooks/static-components -- Widget expo-widgets chạy trong runtime cô lập (không hook, không state, không re-render): expo-widgets BẮT BUỘC mọi hàm phụ khai báo trong thân hàm 'widget', nên rule "không tạo component khi render" là false positive ở file này. */
/**
 * WIDGET ANDROID — Jetpack Compose (Glance) qua @expo/ui. Cùng props, cùng bố
 * cục, cùng reflow theo công tắc như bản iOS (LoveWidget.ios.tsx); khác biệt
 * do nền tảng (theo tài liệu expo-widgets SDK 58):
 * - environment Android KHÔNG có widgetFamily -> widget khai báo một cỡ đích
 *   4x2 trong app.json và mọi biến thể bố cục đều vẽ trong khung đó (module
 *   đơn thì căn giữa).
 * - Android không có widgetURL/Link theo vùng -> chạm bất cứ đâu mở app
 *   (hành vi mặc định của widget Android); deep link theo module chỉ có ở iOS.
 * - Cập nhật bằng updateSnapshot (không có timeline nửa đêm như iOS) — app
 *   đẩy snapshot mới mỗi lần mở app/foreground/push (lib/widgetSync.ts).
 *
 * Cây: có props.treeImageUri (tranh app chép vào widgetsDirectory) thì hiện
 * tranh; chưa có thì hình bóng bằng hình khối tô màu theo giai đoạn.
 * KHÔNG emoji — chỉ hình khối + chữ.
 *
 * CẤU TRÚC BẮT BUỘC (đừng "dọn" ra ngoài — đã từng làm hỏng build APK):
 * - Directive 'widget' phải là câu lệnh ĐẦU TIÊN TRONG THÂN hàm component
 *   (LoveWidgetView). babel-preset-expo (widgetsPlugin) chỉ nhận diện
 *   directive nằm trong thân hàm; để 'widget' ở đầu FILE thì plugin bỏ qua,
 *   component không được serialize thành chuỗi layout, và Gradle task
 *   :expo-widgets:generateExpoWidgetsLayoutRegistry văng lỗi
 *   `Expected "src/widgets/LoveWidget.android.tsx" to register "LoveWidget"
 *   with createWidget`.
 * - Plugin chỉ serialize THÂN HÀM component: mọi hằng số + hàm phụ mà
 *   component dùng phải khai báo BÊN TRONG thân hàm (runtime widget cô lập
 *   không thấy biến module-scope, kể cả import giá trị). Vì vậy file này chỉ
 *   còn import createWidget + type LoveWidgetProps (type bị xoá khi biên
 *   dịch); logic chọn biến thể bố cục (trước là widgetLayoutVariant ở
 *   lib/widget) được chép nguyên xi vào trong hàm.
 */
import { Box, Column, Image, LinearProgressIndicator, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import {
  Shapes, background, clip, cornerRadius, fillMaxSize, fillMaxWidth, offset, paddingAll, size, weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import type { LoveWidgetProps } from "../lib/widget";

function LoveWidgetView(props: LoveWidgetProps) {
  'widget';

  const INK = "#FFF6EC";
  const SUB = "#F0C4D2";
  const FAINT = "#C99AAB";
  const ROSE = "#FF8FAB";
  const GOLD = "#FFC46B";
  const CARD = "#FFFFFF16";
  const TRUNK = "#8A5A44";
  const GROUND = "#2E5D3A";
  const BG = "#2A1220";

  /** Màu tán lá + điểm hoa theo giai đoạn 1..7 (khớp bản iOS + lib/tree). */
  const STAGE_VIS = [
    { canopy: "#9BD49A", blossom: "", scale: 0.36 },
    { canopy: "#7CC47F", blossom: "", scale: 0.52 },
    { canopy: "#5FB878", blossom: "", scale: 0.68 },
    { canopy: "#6FBF73", blossom: "#FFB3C6", scale: 0.8 },
    { canopy: "#5FA86B", blossom: "#FF9FB2", scale: 0.9 },
    { canopy: "#4E9A5F", blossom: "#FF8FAB", scale: 0.97 },
    { canopy: "#3E7D4E", blossom: "#FFC46B", scale: 1 },
  ] as const;

  function txt(text: string, sizeSp: number, color: string, weightW: "400" | "500" | "600" | "700" | "900" = "400", opts: { lines?: number; center?: boolean } = {}) {
    return (
      <Text
        color={color}
        maxLines={opts.lines}
        overflow="ellipsis"
        style={{ fontSize: sizeSp, fontWeight: weightW, textAlign: opts.center ? "center" : undefined }}
      >
        {text}
      </Text>
    );
  }

  function dot(d: number, color: string) {
    return <Box modifiers={[size(d, d), clip(Shapes.Circle), background(color)]} />;
  }

  function bar(value: number, color: string, widthDp?: number) {
    return (
      <LinearProgressIndicator
        progress={Math.min(1, Math.max(0, value))}
        color={color}
        trackColor="#FFFFFF26"
        modifiers={widthDp ? [size(widthDp, 4)] : [fillMaxWidth()]}
      />
    );
  }

  /** Hình bóng cây bằng hình khối (khi chưa có tranh trong thư mục chung). */
  function TreeSilhouette({ stage, height }: { stage: number; height: number }) {
    const vis = STAGE_VIS[Math.min(6, Math.max(0, stage - 1))];
    const w = height * 0.92;
    const canopy = height * 0.56 * vis.scale;
    const cx = w / 2;
    const cy = height * 0.34;
    const side = canopy * 0.68;
    return (
      <Box modifiers={[size(w, height)]}>
        <Box modifiers={[size(w * 0.86, height * 0.13), offset(w * 0.07, height * 0.84), clip(Shapes.Circle), background(GROUND)]} />
        <Box modifiers={[size(Math.max(3, w * 0.07), height * 0.4), offset(cx - Math.max(3, w * 0.07) / 2, height * 0.5), background(TRUNK)]} />
        <Box modifiers={[size(canopy, canopy), offset(cx - canopy / 2, cy - canopy / 2), clip(Shapes.Circle), background(vis.canopy)]} />
        <Box modifiers={[size(side, side), offset(cx - canopy * 0.42 - side / 2, cy + canopy * 0.22 - side / 2), clip(Shapes.Circle), background(vis.canopy)]} />
        <Box modifiers={[size(side, side), offset(cx + canopy * 0.42 - side / 2, cy + canopy * 0.22 - side / 2), clip(Shapes.Circle), background(vis.canopy)]} />
        {vis.blossom ? (
          <>
            <Box modifiers={[size(canopy * 0.2, canopy * 0.2), offset(cx - canopy * 0.2 - canopy * 0.1, cy - canopy * 0.12 - canopy * 0.1), clip(Shapes.Circle), background(vis.blossom)]} />
            <Box modifiers={[size(canopy * 0.16, canopy * 0.16), offset(cx + canopy * 0.24 - canopy * 0.08, cy + canopy * 0.08 - canopy * 0.08), clip(Shapes.Circle), background(vis.blossom)]} />
            <Box modifiers={[size(canopy * 0.13, canopy * 0.13), offset(cx + canopy * 0.02 - canopy * 0.065, cy + canopy * 0.3 - canopy * 0.065), clip(Shapes.Circle), background(vis.blossom)]} />
          </>
        ) : null}
      </Box>
    );
  }

  /** Cây: ưu tiên tranh vẽ app đã chép sang; chưa có thì hình bóng theo giai đoạn. */
  function TreeVisual({ props, height }: { props: LoveWidgetProps; height: number }) {
    if (props.treeImageUri) {
      return <Image source={{ uri: props.treeImageUri }} contentScale="fit" contentDescription="Cây tình yêu" modifiers={[size(height * 0.92, height)]} />;
    }
    return <TreeSilhouette stage={props.treeStage} height={height} />;
  }

  function StageDots({ stage }: { stage: number }) {
    return (
      <Row horizontalArrangement={{ spacedBy: 3 }} verticalAlignment="center">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Box key={i}>{dot(i === stage ? 7 : 5, i <= stage ? GOLD : "#FFFFFF33")}</Box>
        ))}
      </Row>
    );
  }

  function TreeBlock({ props, height, withTracker }: { props: LoveWidgetProps; height: number; withTracker: boolean }) {
    return (
      <Column horizontalAlignment="center" verticalArrangement={{ spacedBy: 3 }} modifiers={[size(height * 0.92 + 24, height)]}>
        <TreeVisual props={props} height={withTracker ? height - 46 : height - 24} />
        {txt(props.treeStageName, 11, INK, "600", { center: true })}
        {withTracker ? (
          <>
            <StageDots stage={props.treeStage} />
            {txt(props.daysToNextStage >= 0 ? `Còn ${props.daysToNextStage} ngày nữa cây lớn thêm` : "Cây đã trưởng thành", 9, SUB, "400", { center: true, lines: 1 })}
          </>
        ) : null}
      </Column>
    );
  }

  function NoteBlock({ props, hero }: { props: LoveWidgetProps; hero: boolean }) {
    if (!props.noteHas) {
      return (
        <Column verticalArrangement={{ spacedBy: 4 }}>
          {txt("Note của người ấy", 10, FAINT, "600")}
          {txt("Chưa có note nào. Mở app để viết note đầu tiên cho người ấy nhé.", hero ? 13 : 11, SUB, "400", { lines: hero ? 4 : 2 })}
        </Column>
      );
    }
    return (
      <Column verticalArrangement={{ spacedBy: 4 }}>
        <Row horizontalArrangement={{ spacedBy: 5 }} verticalAlignment="center">
          {dot(6, props.noteUnread ? ROSE : "#FFFFFF33")}
          {txt(props.noteAuthor || "Người ấy", 10, GOLD, "600", { lines: 1 })}
          <Spacer modifiers={[weight(1)]} />
          {txt(props.noteRelativeTime, 9, FAINT, "400", { lines: 1 })}
        </Row>
        {txt(hero ? props.noteText : props.noteShortText, hero ? 14 : 12, INK, "500", { lines: hero ? 5 : 2 })}
        {props.noteUnread ? txt("Note mới chưa xem", 9, ROSE, "600") : null}
      </Column>
    );
  }

  function DayBlock({ props, big }: { props: LoveWidgetProps; big: boolean }) {
    return (
      <Column horizontalAlignment={big ? "center" : "start"} verticalArrangement={{ spacedBy: big ? 2 : 3 }}>
        {txt("Ngày", big ? 13 : 10, SUB, "600", { center: big })}
        {txt(String(props.dayCount), big ? 52 : 30, INK, "900", { center: big })}
        {txt(big ? "bên nhau" : props.milestoneText, big ? 12 : 10, big ? SUB : FAINT, "500", { lines: 2, center: big })}
        {big ? txt(props.milestoneText, 10, FAINT, "400", { lines: 1, center: true }) : null}
        {bar(props.dayProgress, props.milestoneToday ? GOLD : ROSE, big ? 110 : undefined)}
      </Column>
    );
  }

  function HintBlock() {
    return (
      <Column horizontalAlignment="center" verticalArrangement="center" modifiers={[fillMaxSize()]}>
        {txt("Khu vườn nhỏ", 17, INK, "700", { center: true })}
        {txt("Mở app → Tài khoản → Widget để chọn phần muốn hiện", 12, SUB, "500", { lines: 3, center: true })}
        {txt("Đếm ngày · Note của người ấy · Cây tình yêu", 10, FAINT, "400", { center: true })}
      </Column>
    );
  }

  // Chọn biến thể bố cục theo 3 công tắc — chép nguyên logic của
  // widgetLayoutVariant (lib/widget) vì runtime widget không gọi được
  // hàm module-scope ở ngoài thân hàm này.
  const moduleCount = (props.showDay ? 1 : 0) + (props.showNote ? 1 : 0) + (props.showTree ? 1 : 0);
  const variant =
    moduleCount === 0
      ? "none"
      : moduleCount === 3
        ? "all"
        : moduleCount === 1
          ? props.showNote
            ? "note"
            : props.showDay
              ? "day"
              : "tree"
          : props.showNote && props.showDay
            ? "noteDay"
            : props.showNote && props.showTree
              ? "noteTree"
              : "dayTree";

  let content: React.JSX.Element;
  if (variant === "none") {
    content = <HintBlock />;
  } else if (variant === "all") {
    content = (
      <Row horizontalArrangement={{ spacedBy: 10 }} modifiers={[fillMaxSize()]}>
        <TreeBlock props={props} height={132} withTracker />
        <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[weight(1)]}>
          <Box modifiers={[background(CARD), cornerRadius(12), paddingAll(9), fillMaxWidth()]}>
            <NoteBlock props={props} hero={false} />
          </Box>
          <DayBlock props={props} big={false} />
        </Column>
      </Row>
    );
  } else if (variant === "noteDay") {
    content = (
      <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxSize()]}>
        <Row horizontalArrangement={{ spacedBy: 6 }} verticalAlignment="center">
          {txt(`Ngày ${props.dayCount}`, 13, INK, "700", { lines: 1 })}
          {txt(props.milestoneText, 10, FAINT, "400", { lines: 1 })}
        </Row>
        <NoteBlock props={props} hero />
      </Column>
    );
  } else if (variant === "noteTree") {
    content = (
      <Row horizontalArrangement={{ spacedBy: 10 }} modifiers={[fillMaxSize()]}>
        <TreeBlock props={props} height={132} withTracker />
        <Box modifiers={[weight(1)]}>
          <NoteBlock props={props} hero />
        </Box>
      </Row>
    );
  } else if (variant === "dayTree") {
    content = (
      <Row horizontalArrangement={{ spacedBy: 10 }} modifiers={[fillMaxSize()]}>
        <TreeBlock props={props} height={132} withTracker />
        <DayBlock props={props} big={false} />
      </Row>
    );
  } else if (variant === "note") {
    content = (
      <Column verticalArrangement={{ spacedBy: 6 }} modifiers={[fillMaxSize()]}>
        <NoteBlock props={props} hero />
        <Spacer modifiers={[weight(1)]} />
        {txt("Chạm để mở app", 9, FAINT)}
      </Column>
    );
  } else if (variant === "tree") {
    content = (
      <Row horizontalArrangement="center" modifiers={[fillMaxSize()]}>
        <TreeBlock props={props} height={150} withTracker />
      </Row>
    );
  } else {
    // day only — khung 4x2 rộng: căn giữa cụm số ngày lớn
    content = (
      <Column horizontalAlignment="center" verticalArrangement="center" modifiers={[fillMaxSize()]}>
        <DayBlock props={props} big />
      </Column>
    );
  }

  return (
    <Box modifiers={[fillMaxSize(), background(BG), paddingAll(12)]}>
      {content}
    </Box>
  );
}

export default createWidget("LoveWidget", LoveWidgetView);

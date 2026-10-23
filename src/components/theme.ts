/**
 * DESIGN SYSTEM — Khu Vườn Tình Yêu, hệ "VƯỜN GIẤY ẤM" (2026-10-23).
 *
 * Nguồn: bản tham khảo vòng 2 được user duyệt (artifact
 * b-n-tham-kh-o-giao-di-n-v-ng-2-khu-v-n-t-nh-y-u) + báo cáo
 * ~/workspace/research_notes/couple-app-ui-redo-20261023/report.md (vòng 1)
 * và report-round2.md (4 delta + ngân sách phần tử mỗi màn).
 *
 * Nguyên tắc cốt lõi: Ít card hơn; card quan trọng lớn và ấm hơn. Tranh là CẢNH,
 * không phải thumbnail. Chữ chính phải thật lớn, chữ phụ phải thật lặng. Màu chỉ
 * xuất hiện khi nó mang nghĩa: rose = Bạn + CTA chính, teal = Người ấy + vườn khỏe,
 * navy = Chúng mình. Mỗi viewport tối đa MỘT nút primary #D94373.
 *
 * File này CHỈ chứa hằng số trình bày — không chứa logic nghiệp vụ.
 */

/* ---------- Font (nạp ở src/app/_layout.tsx bằng useFonts) ---------- */
export const FONT = {
  regular: "BeVietnamPro_400Regular",
  medium: "BeVietnamPro_500Medium",
  semibold: "BeVietnamPro_600SemiBold",
  bold: "BeVietnamPro_700Bold",
  extrabold: "BeVietnamPro_800ExtraBold",
  black: "BeVietnamPro_900Black",
} as const;

/* ---------- Ba vai — giữ ý tưởng, chỉnh độ sâu theo mockup vòng 2 ---------- */
export const ROLE = {
  /** Bạn (người đang đăng nhập) — hồng rose */
  self: "#F2789A",
  selfDark: "#C73369", // chữ/icon của "Bạn" trên nền sáng
  selfSoft: "#FFE3EC",
  /** Người ấy (đối phương) — xanh mint */
  partner: "#2FBFAE",
  partnerDark: "#0E7C74",
  partnerSoft: "#DDF5F0",
  /** Chúng mình (việc chung của hai người) — xanh navy */
  shared: "#35506B",
  sharedDark: "#24384E",
  sharedSoft: "#E7EDF4",
} as const;

export const COLOR = {
  bg: "#FFF7F0", // canvas — nền giấy ấm toàn app
  canvasRose: "#FFEFF2", // vùng nền rất nhẹ sau hero/thư
  card: "#FFFFFF", // bề mặt card hành động chính
  surfaceSoft: "#FFFDFB", // card phụ trên nền canvas
  primary: "#D94373", // CTA chính — TỐI ĐA 1 nút/viewport
  primaryPressed: "#BE2F60",
  primaryDark: ROLE.selfDark, // alias tương thích ngược (chữ rose đậm)
  tealDark: ROLE.partnerDark, // alias tương thích ngược
  primarySoft: ROLE.selfSoft,
  border: "rgba(195,51,105,0.09)", // line — viền 1px trên nền sáng (mockup --line)
  lineStrong: "#E3C3CC", // viền khi cần tách trắng khỏi trắng
  text: "#33272E", // ink — nâu tím ấm
  textSoft: "#75666E", // inkSoft — chữ phụ đọc được
  textFaint: "#9B8A91", // inkFaint — CHỈ metadata ngắn
  track: "#F3E3DA", // track tiến trình trung tính (mockup --track)
  gardenWash: "#EAF6EC", // nền cảnh vườn
  letterPaper: "#FFFBF4", // giấy thư
  letterLine: "#F3E3CB", // viền thẻ thư nổi bật
  letterLineSoft: "#F5E9D4", // viền hàng thư gọn
  soil: "#E9D8BE", // ellipse đất dưới cây
  heroBg: "#FBE9E4", // nền dải tranh hero
  footBg: "#FBEFE7", // cụm chân trang hub Hai đứa
  chevron: "#B9A6AE", // chevron trong hàng điều hướng
  onNavySoft: "#C9D6E4", // chữ phụ trên nền navy
  success: "#2F8F5B",
  successSoft: "#E2F4E9",
  warning: "#D98E1B", // sun — icon nắng / nhãn ấm
  warningText: "#A85B00", // chữ cảnh báo trên nền sáng
  warningSoft: "#FDF0DC",
  danger: "#BE4038", // CHỈ lỗi thật hoặc cây héo — không dùng cho "chưa làm"
  dangerSoft: "#FBE7E4",
  sun: "#D98E1B",
  water: "#2F8FC4",
  legendary: "#C98512",
} as const;

/* ---------- Spacing — nhịp "gần trong nhóm, xa giữa nhóm" ---------- */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenX: 20, // lề màn hình (16 -> 20 theo hệ mới)
  cardGap: 12, // khoảng cách trong một nhóm
  sectionGap: 24, // khoảng cách giữa các section
} as const;

export const RADIUS = {
  scene: 28, // hero, cảnh vườn, hồ sơ chung
  card: 24, // card chính
  inner: 18, // ô trong card, tranh cây, game tile ~20
  tile: 16, // ô nhỏ / strip
  control: 18, // nút chính/phụ — KHÔNG mặc định pill nữa
  button: 18, // alias tương thích ngược
  sheet: 32, // góc trên của bottom sheet/modal
  hero: 28, // alias tương thích ngược (= scene)
  pill: 999, // CHỈ chip trạng thái và segmented
} as const;

export const TOUCH = { min: 44 } as const;

/* ---------- Thang chữ — bậc mạnh hơn hẳn bản cũ ---------- */
export const TYPE = {
  /** displayHero 42/900 — CHỈ số ngày trong hero Home */
  display: { fontFamily: FONT.black, fontSize: 42, lineHeight: 44 },
  /** Số lớn ở Games/Couple khi thật cần */
  displaySm: { fontFamily: FONT.black, fontSize: 32, lineHeight: 36 },
  /** h1 — tiêu đề màn hình */
  title: { fontFamily: FONT.extrabold, fontSize: 24, lineHeight: 30 },
  /** h2 — tiêu đề card chính */
  cardTitle: { fontFamily: FONT.extrabold, fontSize: 19, lineHeight: 25 },
  /** Nội dung cảm xúc: câu hỏi hôm nay, trích thư */
  emphasis: { fontFamily: FONT.semibold, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FONT.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 17 },
  captionStrong: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 17 },
  /** Nhãn section viết hoa nhẹ */
  micro: { fontFamily: FONT.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: "uppercase" as const },
} as const;

/* ---------- Độ nổi — 3 mức có nghĩa ---------- */
/** E1 — card trắng chính trên nền giấy */
export const SHADOW = {
  shadowColor: "#783654",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;

/** E2 — phần tử nổi hẳn: nút + giữa, modal, thư rơi, tab bar */
export const SHADOW_FLOAT = {
  shadowColor: "#331824",
  shadowOpacity: 0.16,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;

/**
 * DESIGN SYSTEM — Khu Vườn Tình Yêu (đợt thiết kế lại theo nghiên cứu UI app couple).
 *
 * Nguồn quy tắc: ~/workspace/research_notes/couple-app-ui-references-20261022-1509/report.md
 * - Hệ màu 3 VAI cố định toàn app (Cupla): Bạn / Người ấy / Chúng mình — luôn kèm avatar + tên,
 *   không bao giờ phân biệt chỉ bằng màu.
 * - Spacing lưới 4/8 (quy tắc 11): lề màn hình 16, khoảng cách card 12, trong card 16, nhóm cách 20.
 * - Bo góc: card 20, nút 16 (CTA chính dạng pill), avatar tròn. Touch target tối thiểu 44px.
 * - Thang chữ 4 CẤP (quy tắc 12): Display 30 CHỈ dành cho số ngày yêu (D-day);
 *   Title 19, Body 15.5, Caption 12.5. Font Be Vietnam Pro (bo tròn, đủ dấu tiếng Việt).
 * - Mật độ (quy tắc 10): 1 card = 1 ý, tối đa 3 card trên fold, mỗi section 1 CTA chính.
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

/* ---------- Màu: 3 vai + trung tính ấm ---------- */
export const ROLE = {
  /** Bạn (người đang đăng nhập) — hồng đào */
  self: "#FF8FA3",
  selfDark: "#C93A5B", // chữ/icon của "Bạn" trên nền sáng (đủ tương phản)
  selfSoft: "#FFE9EE",
  /** Người ấy (đối phương) — xanh mint */
  partner: "#3EC6B8",
  partnerDark: "#159e8f", // xanh teal đậm — accent/teal đậm theo spec mockup tham chiếu
  partnerSoft: "#D9F4F0",
  /** Chúng mình (việc chung của hai người) — xanh navy trầm */
  shared: "#2F4A67",
  sharedDark: "#223850",
  sharedSoft: "#E5EBF2",
} as const;

export const COLOR = {
  bg: "#fff6f3", // nền hồng rất nhạt theo spec mockup tham chiếu
  card: "#FFFFFF", // card trắng thuần
  primary: "#e14b78", // CTA chính — hồng rose theo spec mockup, chữ trắng đọc rõ
  tealDark: "#159e8f", // accent teal đậm (vai trò của Người ấy khi cần sắc đậm)
  primaryDark: "#C93A5B",
  primarySoft: ROLE.selfSoft,
  border: "#F3DCE0", // viền pastel rất nhẹ, thống nhất 1 mức
  text: "#3D3A44",
  textSoft: "#7A7484",
  textFaint: "#ABA3B3",
  track: "#F6EDEF", // nền thanh tiến trình
  success: "#3D9B6E",
  successSoft: "#E2F4E9",
  warning: "#D97706",
  warningSoft: "#FDF0DC",
  danger: "#C2413B",
  dangerSoft: "#FBE7E4",
  sun: "#E8A13A",
  water: "#4AA8D8",
} as const;

/* ---------- Spacing / hình khối (lưới 4/8) ---------- */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  screenX: 16, // padding ngang màn hình
  cardGap: 12, // khoảng cách giữa các card
  sectionGap: 20, // khoảng cách giữa các nhóm/section
} as const;

export const RADIUS = {
  card: 20,
  hero: 22, // bo góc khối hero ở Trang chủ theo spec mockup
  inner: 14,
  tile: 13, // bo góc ô thư theo spec mockup
  button: 16,
  pill: 999,
} as const;

export const TOUCH = { min: 44 } as const;

/* ---------- Thang chữ 4 cấp (line-height đi kèm) ---------- */
export const TYPE = {
  /** CHỈ dùng cho số ngày yêu (D-day) — nơi duy nhất trong app */
  display: { fontFamily: FONT.black, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: FONT.bold, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: FONT.regular, fontSize: 15.5, lineHeight: 22 },
  bodyStrong: { fontFamily: FONT.semibold, fontSize: 15.5, lineHeight: 22 },
  caption: { fontFamily: FONT.medium, fontSize: 12.5, lineHeight: 17 },
  captionStrong: { fontFamily: FONT.semibold, fontSize: 12.5, lineHeight: 17 },
} as const;

/** Bóng đổ duy nhất 1 mức, rất nhẹ (quy tắc 11) — dùng cho card nổi (hero, modal). */
export const SHADOW = {
  shadowColor: "#B4596F",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

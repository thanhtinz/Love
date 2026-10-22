import type { Metadata, Viewport } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import "./globals.css";
import { LoveProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";
import AppGate from "@/components/AppGate";
const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", weight: ["500", "600", "700", "800"] });
const quick = Quicksand({ subsets: ["latin", "vietnamese"], variable: "--font-quick", weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = {
  title: "Khu Vườn Tình Yêu — App cho couple",
  description: "Mỗi người một tài khoản, ghép cặp bằng mã mời — trồng cây tình yêu sống thật, thư tình rơi, Xu Tim và cửa hàng vườn, ghi chú, kỷ niệm, bucket list và câu hỏi mỗi ngày cho hai người.",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icons/icon-192", sizes: "192x192", type: "image/png" }, { url: "/icon.svg", type: "image/svg+xml" }], shortcut: "/icons/icon-192", apple: "/icons/apple-touch-icon" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vườn Tình Yêu" },
};
export const viewport: Viewport = { themeColor: "#f45383", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="vi"><body className={`${baloo.variable} ${quick.variable} font-body antialiased`}><AppGate><AuthProvider><LoveProvider>{children}</LoveProvider></AuthProvider></AppGate></body></html>);
}

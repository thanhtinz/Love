import type { Metadata } from "next";
import { Baloo_2, Quicksand } from "next/font/google";
import "./globals.css";
import { LoveProvider } from "@/lib/store";
const baloo = Baloo_2({ subsets: ["latin", "vietnamese"], variable: "--font-baloo", weight: ["500", "600", "700", "800"] });
const quick = Quicksand({ subsets: ["latin", "vietnamese"], variable: "--font-quick", weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Khu Vườn Tình Yêu 💖 — App cho couple", description: "Trồng cây tình yêu, thư tình rơi, ghi chú, bucket list và câu hỏi mỗi ngày cho hai người." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="vi"><body className={`${baloo.variable} ${quick.variable} font-body antialiased` }><LoveProvider>{children}</LoveProvider></body></html>);
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM4U HomeBuild",
  description: "Quản lý xây dựng nhà phố/biệt thự cho Chủ Đầu Tư",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

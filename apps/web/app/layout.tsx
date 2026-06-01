import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "六爻 · 纳甲占卜",
  description: "确定性起卦装卦 + AI 断卦。摇一卦,测一事。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

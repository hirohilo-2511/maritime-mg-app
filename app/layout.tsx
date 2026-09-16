import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maritime MG — 海事経営シミュレーション",
  description:
    "海事産業向け B2B 経営シミュレーションゲーム（Management Game）のプロトタイプ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

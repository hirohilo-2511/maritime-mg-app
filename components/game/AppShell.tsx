"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/game/Sidebar";
import { TopHeader } from "@/components/game/TopHeader";
import { TurnResultModal } from "@/components/game/TurnResultModal";
import { navItems, secondaryNavItems } from "@/lib/nav";

/**
 * ゲーム画面共通のレイアウト。
 * 左に幅固定・画面高さ固定のサイドバー、右にスクロール可能なメインコンテンツを配置する
 * 「左固定サイドバー + 右メインコンテンツ」構成。サイドバーは常に position: fixed で描画し、
 * モバイルでは画面外への transform で開閉する（display の出し分けに頼らない）。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const current = [...navItems, ...secondaryNavItems].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const title = pathname.startsWith("/final-report")
    ? "総合フィードバック"
    : (current?.label ?? "ダッシュボード");

  return (
    <div className="flex h-dvh overflow-hidden bg-navy-50">
      {/* サイドバー：常に fixed・画面高さいっぱい。モバイルでは transform で開閉する */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* モバイル：サイドバーの背後のオーバーレイ */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* メインカラム：サイドバー分の余白を確保し、このカラムだけが縦スクロールする */}
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto lg:pl-64">
        <TopHeader title={title} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="border-t border-navy-200/70 px-4 py-4 text-center text-[11px] text-navy-400 lg:px-8">
          Maritime MG プロトタイプ — 表示されているデータはすべてダミーです
        </footer>
      </div>

      {/* ターン終了時の決算モーダル */}
      <TurnResultModal />
    </div>
  );
}

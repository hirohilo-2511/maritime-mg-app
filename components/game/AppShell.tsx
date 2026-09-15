"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/game/Sidebar";
import { TopHeader } from "@/components/game/TopHeader";
import { GameProvider } from "@/components/game/GameProvider";
import { SettingsProvider } from "@/components/game/SettingsProvider";
import { TurnResultModal } from "@/components/game/TurnResultModal";
import { Icon } from "@/components/ui/Icon";
import { navItems, secondaryNavItems } from "@/lib/nav";

/**
 * ゲーム画面共通のレイアウト。
 * デスクトップでは固定サイドバー、モバイルではドロワーとして表示する。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const current = [...navItems, ...secondaryNavItems].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <SettingsProvider>
      <GameProvider>
        <div className="flex min-h-screen bg-navy-50">
          {/* デスクトップ：固定サイドバー */}
          <aside className="hidden w-64 shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:block">
            <Sidebar />
          </aside>

          {/* モバイル：ドロワー */}
          {mobileOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-navy-950/60"
                onClick={() => setMobileOpen(false)}
                aria-hidden
              />
              <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="メニューを閉じる"
                  className="absolute top-4 right-3 z-10 rounded-lg p-2 text-navy-300 hover:bg-white/10 hover:text-white"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          ) : null}

          {/* メインカラム */}
          <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
            <TopHeader
              title={current?.label ?? "ダッシュボード"}
              onOpenSidebar={() => setMobileOpen(true)}
            />
            <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
            <footer className="border-t border-navy-200/70 px-4 py-4 text-center text-[11px] text-navy-400 lg:px-8">
              Maritime MG プロトタイプ — 表示されているデータはすべてダミーです
            </footer>
          </div>

          {/* ターン終了時の決算モーダル */}
          <TurnResultModal />
        </div>
      </GameProvider>
    </SettingsProvider>
  );
}

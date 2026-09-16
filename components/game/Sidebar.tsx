"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { navItems, secondaryNavItems, type NavItem } from "@/lib/nav";
import { company } from "@/lib/mock-data";
import { countUnpurchasedAvailable } from "@/lib/research";
import type { GameState, TurnData } from "@/lib/types";

type NavBadge = { text: string; tone: "info" | "warning" };

/** ナビゲーション項目に出す「要対応」バッジを決める */
function badgeFor(
  item: NavItem,
  state: GameState,
  turnData: TurnData,
): NavBadge | null {
  if (item.showRequestCount) {
    return { text: String(turnData.requests.length), tone: "info" };
  }
  if (item.showBudgetStatus && !state.marketingCommitted) {
    return { text: "未確定", tone: "warning" };
  }
  if (item.showResearchCount) {
    const count = countUnpurchasedAvailable(
      state.researchPurchases,
      state.turn,
    );
    return count > 0 ? { text: String(count), tone: "info" } : null;
  }
  return null;
}

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: NavBadge | null;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-navy-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon
        name={item.icon}
        className={`h-5 w-5 shrink-0 ${active ? "text-sea-400" : "text-navy-400 group-hover:text-navy-200"}`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white tabular ${
            badge.tone === "warning" ? "bg-amber-500" : "bg-sea-500"
          }`}
        >
          {badge.text}
        </span>
      ) : null}
      {active ? (
        <span className="h-1.5 w-1.5 rounded-full bg-sea-400" aria-hidden />
      ) : null}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state, turnData } = useGame();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col bg-navy-900">
      {/* ブランド */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sea-500/15 text-sea-400 ring-1 ring-sea-500/30">
          <Icon name="anchor" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">Maritime MG</p>
          <p className="truncate text-[11px] text-navy-400">
            経営シミュレーション
          </p>
        </div>
      </div>

      {/* 自社情報 */}
      <div className="mx-4 mb-4 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
        <p className="text-[10px] font-semibold tracking-widest text-navy-400">
          自社
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">
          {company.name}
        </p>
        <p className="truncate text-[11px] text-navy-400">{company.segment}</p>
        <p className="mt-1.5 border-t border-white/5 pt-1.5 text-[11px] text-navy-300 tabular">
          {state.turn}年目 / 全{state.totalTurns}年
        </p>
      </div>

      {/* メインナビゲーション */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-navy-500">
          MENU
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            badge={badgeFor(item, state, turnData)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* フッター */}
      <div className="space-y-1 border-t border-white/5 px-3 py-3">
        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ))}
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Icon name="logout" className="h-5 w-5 text-navy-400" />
          ログアウト
        </Link>
      </div>
    </div>
  );
}

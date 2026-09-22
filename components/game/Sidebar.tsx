"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { navItems, secondaryNavItems, type NavItem } from "@/lib/nav";
import { company } from "@/lib/mock-data";
import { countUnpurchasedAvailable } from "@/lib/research";
import type { GameState, TurnData } from "@/lib/types";

/** 決算処理中に表示するスピナー */
function Spinner() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/** 「予算配分 → 提案作成 → ターン終了」の進行状況ガイド */
function TurnSteps({
  budgetCommitted,
  proposalDone,
}: {
  budgetCommitted: boolean;
  proposalDone: boolean;
}) {
  const steps = [
    { label: "予算配分", done: budgetCommitted, active: !budgetCommitted },
    {
      label: "顧客への提案作成",
      done: proposalDone,
      active: budgetCommitted && !proposalDone,
    },
    { label: "ターン終了", done: false, active: budgetCommitted && proposalDone },
  ];

  return (
    <div className="mx-4 mb-4 rounded-lg border border-white/5 bg-white/5 px-3 py-3">
      <p className="text-[10px] font-semibold tracking-widest text-navy-400">
        このターンの進行
      </p>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                step.done
                  ? "bg-emerald-500 text-white"
                  : step.active
                    ? "bg-sea-500 text-white"
                    : "bg-white/10 text-navy-500"
              }`}
            >
              {step.done ? <Icon name="check" className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={`text-[12px] ${
                step.done
                  ? "text-navy-200"
                  : step.active
                    ? "font-semibold text-white"
                    : "text-navy-500"
              }`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

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
  const {
    state,
    turnData,
    isAdvancing,
    isFinalTurn,
    advanceTurn,
    canEndTurn,
    hasProposalThisTurn,
  } = useGame();
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

      {/* このターンの進行ガイド */}
      {state.gameCompleted ? (
        <div className="mx-4 mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
          <p className="text-[10px] font-semibold tracking-widest text-emerald-300">
            ゲーム終了
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-navy-200">
            {state.totalTurns}年間のシミュレーションが完了しました
          </p>
        </div>
      ) : (
        <TurnSteps
          budgetCommitted={state.marketingCommitted}
          proposalDone={hasProposalThisTurn}
        />
      )}

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

      {/* ターンを終了する（最重要アクション） */}
      <div className="px-3 pt-2 pb-1">
        <Button
          size="lg"
          className="w-full"
          onClick={advanceTurn}
          disabled={
            isAdvancing || (isFinalTurn && !state.gameCompleted && !canEndTurn)
          }
          aria-busy={isAdvancing}
          title={
            state.gameCompleted
              ? "5年間の総合フィードバックを表示します"
              : !canEndTurn
                ? "予算配分の確定と、提案の作成（1件以上）が必要です"
                : isFinalTurn
                  ? "最終ターンを終了して総合フィードバックを表示します"
                  : `${state.turn}年目を終了して${state.turn + 1}年目に進みます`
          }
        >
          {isAdvancing ? (
            <>
              <Spinner />
              決算処理中…
            </>
          ) : state.gameCompleted ? (
            <>
              結果を見る
              <Icon name="arrowRight" className="h-4 w-4" />
            </>
          ) : isFinalTurn ? (
            <>
              最終ターンを終了する
              <Icon name="arrowRight" className="h-4 w-4" />
            </>
          ) : (
            <>
              ターンを終了する
              <Icon name="arrowRight" className="h-4 w-4" />
            </>
          )}
        </Button>
        {!state.gameCompleted && !canEndTurn ? (
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-navy-400">
            予算配分の確定 → 顧客への提案作成の順に完了すると終了できます
          </p>
        ) : null}
      </div>

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

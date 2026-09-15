"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatPill } from "@/components/game/StatPill";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";

/** 決算処理中に表示するスピナー */
function Spinner() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/** 信頼度スコアに応じてバーの色を切り替える */
function trustBarColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-sea-500";
  return "bg-rose-500";
}

export function TopHeader({
  title,
  onOpenSidebar,
}: {
  /** 現在のページ名（サイドバーの選択項目から決まる） */
  title: string;
  onOpenSidebar?: () => void;
}) {
  const { state, isFinalTurn, isAdvancing, advanceTurn } = useGame();
  const { money } = useMoney();

  return (
    <header className="sticky top-0 z-20 border-b border-navy-200/70 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* 左：画面タイトル */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="メニューを開く"
            className="rounded-lg p-2 text-navy-600 hover:bg-navy-100 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              MANAGEMENT GAME
            </p>
            <h1 className="text-lg font-bold text-navy-900">{title}</h1>
          </div>
        </div>

        {/* 右：ゲーム状況インジケーター */}
        <div className="flex flex-wrap items-stretch gap-2.5 sm:flex-nowrap">
          <StatPill
            icon="calendar"
            label="ターン"
            value={`${state.turn}年目`}
            unit={`/ 全${state.totalTurns}年`}
          />
          <StatPill
            icon="wallet"
            label="利用可能資金"
            value={money(state.availableFunds)}
          />
          <StatPill
            icon="shield"
            label="企業の信頼度スコア"
            value={`${state.trustScore}`}
            unit="/ 100"
          >
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-200"
              role="progressbar"
              aria-valuenow={state.trustScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="企業の信頼度スコア"
            >
              <div
                className={`h-full rounded-full ${trustBarColor(state.trustScore)}`}
                style={{ width: `${state.trustScore}%` }}
              />
            </div>
          </StatPill>

          <div className="flex items-center">
            <Button
              size="lg"
              onClick={advanceTurn}
              disabled={isAdvancing || isFinalTurn}
              aria-busy={isAdvancing}
              title={
                isFinalTurn
                  ? "最終ターンです"
                  : `${state.turn}年目を終了して${state.turn + 1}年目に進みます`
              }
              className="w-full sm:w-auto"
            >
              {isAdvancing ? (
                <>
                  <Spinner />
                  決算処理中…
                </>
              ) : isFinalTurn ? (
                "最終ターン"
              ) : (
                <>
                  ターンを終了
                  <Icon name="arrowRight" className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

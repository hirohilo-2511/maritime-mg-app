"use client";

import { useMemo } from "react";
import { ResearchReportCard } from "@/components/game/ResearchReportCard";
import { useGame } from "@/components/game/GameProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  isAvailable,
  researchCategories,
  researchReports,
  researchSpendInTurn,
  type ResearchCategory,
} from "@/lib/research";

const categoryOrder: ResearchCategory[] = [
  "demand",
  "competitor",
  "regulation",
];

export default function MarketResearchPage() {
  const { state, purchaseResearchReport, hasReport, spendable, isLocked } =
    useGame();
  const committedSpend = state.availableFunds - spendable;
  const { money } = useMoney();

  const purchasedTurnById = useMemo(
    () =>
      new Map(state.researchPurchases.map((p) => [p.reportId, p.turn] as const)),
    [state.researchPurchases],
  );

  const spentThisTurn = researchSpendInTurn(
    state.researchPurchases,
    state.turn,
  );
  const spentTotal = state.researchPurchases.reduce(
    (sum, p) => sum + p.cost,
    0,
  );
  const purchasedCount = state.researchPurchases.length;
  const progress = (purchasedCount / researchReports.length) * 100;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 調査サマリー */}
      <Card>
        <CardHeader
          title={`${state.turn}年目の市場調査`}
          description="レポートの購入費は即時に資金から差し引かれます"
          icon={<Icon name="research" className="h-5 w-5" />}
        />
        <CardBody>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                利用可能資金
              </p>
              <p className="tabular mt-1 text-xl leading-none font-bold text-navy-900">
                {money(state.availableFunds)}
              </p>
            </div>
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                今ターンの調査費
              </p>
              <p className="tabular mt-1 text-xl leading-none font-bold text-navy-900">
                {money(spentThisTurn)}
              </p>
              <p className="tabular mt-1 text-[11px] text-navy-400">
                累計 {money(spentTotal)}
              </p>
            </div>
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                購入済みレポート
              </p>
              <p className="tabular mt-1 flex items-baseline gap-1 text-xl leading-none font-bold text-navy-900">
                {purchasedCount}
                <span className="text-xs font-medium text-navy-400">
                  / {researchReports.length}
                </span>
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-200"
                role="progressbar"
                aria-valuenow={purchasedCount}
                aria-valuemin={0}
                aria-valuemax={researchReports.length}
                aria-label="購入済みレポート数"
              >
                <div
                  className="h-full rounded-full bg-sea-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-navy-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-500">
            調査結果はスコアに直接影響しません。マーケティング予算の配分先や、船主への提案方針を決めるための判断材料として使用します。
          </p>
        </CardBody>
      </Card>

      {/* カテゴリ別のレポート一覧 */}
      {categoryOrder.map((category) => {
        const meta = researchCategories[category];
        const reports = researchReports.filter((r) => r.category === category);
        const owned = reports.filter((r) => hasReport(r.id)).length;

        return (
          <section key={category}>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-white">
                <Icon name={meta.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-wide text-navy-900">
                  {meta.label}
                </h2>
                <p className="text-xs text-navy-400">{meta.description}</p>
              </div>
              <p className="tabular shrink-0 text-[11px] text-navy-400">
                {owned} / {reports.length} 購入済み
              </p>
            </div>

            <ul className="mt-3 grid gap-4 xl:grid-cols-2">
              {reports.map((report) => (
                <ResearchReportCard
                  key={report.id}
                  report={report}
                  purchased={hasReport(report.id)}
                  purchasedTurn={purchasedTurnById.get(report.id)}
                  available={isAvailable(report, state.turn)}
                  affordable={!isLocked && report.cost <= spendable}
                  unaffordableReason={
                    state.gameCompleted
                      ? "ゲームは終了しています"
                      : committedSpend > 0 && report.cost <= state.availableFunds
                        ? `確定済みのマーケティング予算 ${money(committedSpend)} を差し引くと、使える資金は ${money(Math.max(0, spendable))} です`
                        : `使える資金 ${money(Math.max(0, spendable))} に対して ${money(report.cost - Math.max(0, spendable))} 不足しています`
                  }
                  onPurchase={() =>
                    purchaseResearchReport(report.id, report.cost)
                  }
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

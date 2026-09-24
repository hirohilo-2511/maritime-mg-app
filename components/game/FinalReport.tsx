"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  ASSUMED_GROSS_MARGIN,
  metricLessons,
  type B2bMetrics,
} from "@/lib/b2bMetrics";
import {
  S_RANK_MIN_PRIMARY_HIT,
  buildFinalReport,
  type Grade,
} from "@/lib/finalReport";
import { company } from "@/lib/mock-data";
import { modeConfigs } from "@/lib/modes";
import type { GameMode } from "@/lib/types";

const gradeTone: Record<Grade, string> = {
  S: "bg-amber-400 text-navy-950",
  A: "bg-emerald-500 text-white",
  B: "bg-sea-500 text-white",
  C: "bg-navy-400 text-white",
  D: "bg-rose-600 text-white",
};

/** 最終ターン終了後に表示する総合フィードバック（リザルト）ダッシュボード */
export function FinalReport() {
  const { state, modeConfig, startGame } = useGame();
  const { money, moneySigned } = useMoney();
  const router = useRouter();

  const report = useMemo(() => buildFinalReport(state), [state]);

  const handleReplay = (mode: GameMode) => {
    startGame(mode);
    router.push("/dashboard");
  };
  const otherMode: GameMode = state.mode === "intro" ? "advanced" : "intro";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ヒーロー：総合評価 */}
      <Card>
        <div className="bg-navy-900 px-6 py-8 text-white sm:px-8">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            FINAL REPORT — {modeConfig.label} ·{" "}
            {report.bankrupt
              ? `${report.yearsPlayed}年目で倒産`
              : `${report.yearsPlayed}年間のシミュレーション終了`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <span
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl font-black shadow-lg ${gradeTone[report.grade]}`}
            >
              {report.grade}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl">
                {company.name} の総合評価
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-navy-200">
                {report.gradeTagline}
              </p>
            </div>
          </div>

          {/* 評価の詳細な理由：概要を邪魔しないようアコーディオンで開閉する */}
          <details className="group mt-4 max-w-2xl rounded-lg border border-white/10 bg-white/5 open:bg-white/10">
            <summary className="flex list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[12px] font-semibold text-navy-200 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Icon name="alert" className="h-3.5 w-3.5 text-sea-400" />
                なぜこの評価に？ 評価の理由を見る
              </span>
              <Icon
                name="arrowRight"
                className="h-3.5 w-3.5 shrink-0 text-navy-400 transition-transform group-open:rotate-90"
              />
            </summary>
            <p className="border-t border-white/10 px-3.5 py-3 text-[12px] leading-relaxed text-navy-200">
              {report.evaluationReason}
            </p>
          </details>

          {report.demoOperated ? (
            <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-amber-200">
              ※ プレイ中にファシリテーター操作（ターンの移動）が行われたため、履歴や指標が実際の進行と一致しない場合があります。
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-px bg-navy-100 sm:grid-cols-5">
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              最終資金
            </p>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">
              {money(report.finalFunds)}
            </p>
            <p
              className={`tabular mt-0.5 text-[11px] font-semibold ${
                report.fundsDelta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              初期資金比 {moneySigned(report.fundsDelta)}
            </p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              企業の信頼度スコア
            </p>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">
              {report.finalTrust}
              <span className="text-xs font-medium text-navy-400"> / 100</span>
            </p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              累計マーケティング投資
            </p>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">
              {money(report.totalMarketingSpend)}
            </p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              累計見込み引き合い
            </p>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">
              {report.totalLeads}
              <span className="text-xs font-medium text-navy-400">件</span>
            </p>
          </div>
          <div className="col-span-2 bg-white px-5 py-4 sm:col-span-1">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              第1優先的中率
            </p>
            <p className="tabular mt-1 text-lg font-bold text-navy-900">
              {Math.round(report.primaryHitRate * 100)}
              <span className="text-xs font-medium text-navy-400">%</span>
            </p>
            <p className="mt-0.5 text-[11px] text-navy-400">
              S評価には{Math.round(S_RANK_MIN_PRIMARY_HIT * 100)}%以上が必要
            </p>
          </div>
        </div>
      </Card>

      {/* 投資傾向の分析 */}
      <Card>
        <CardHeader
          title="投資傾向の分析"
          description={`${report.yearsPlayed}年間の予算配分から見えるプレイスタイル`}
          icon={<Icon name="trendUp" className="h-5 w-5" />}
          action={<Badge tone="info">{report.styleLabel}</Badge>}
        />
        <CardBody>
          <p className="text-[13px] leading-relaxed text-navy-600">
            {report.styleCommentary}
          </p>

          <div className="mt-4 space-y-2.5">
            {report.channelBreakdown.map(({ channel, amount, share }) => (
              <div key={channel.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-navy-700">
                    {channel.name}
                  </span>
                  <span className="tabular text-navy-400">
                    {money(amount)} · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-100">
                  <div
                    className="h-full rounded-full bg-sea-500"
                    style={{ width: `${Math.max(share * 100, amount > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {report.b2bMetrics ? (
        <B2bMetricsSection
          metrics={report.b2bMetrics}
          yearsPlayed={report.yearsPlayed}
        />
      ) : (
        <Card>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-navy-600">
              <span className="font-bold text-navy-900">
                {modeConfigs.advanced.label}
              </span>
              では顧客予算や受注条件が厳しくなり、最終レポートで ROI・CPA
              などの B2B マーケティング指標による投資対効果の評価が加わります。
            </p>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => handleReplay("advanced")}
            >
              {modeConfigs.advanced.label}に挑戦する
            </Button>
          </div>
        </Card>
      )}

      {/* If ストーリー */}
      <Card>
        <CardHeader
          title="もしも、あの時こうしていたら"
          description="別の選択肢を取っていた場合の可能性"
          icon={<Icon name="research" className="h-5 w-5" />}
        />
        <CardBody>
          <p className="rounded-lg bg-navy-50 px-4 py-3 text-[13px] leading-relaxed text-navy-700">
            {report.ifStory}
          </p>
        </CardBody>
      </Card>

      {/* 実業務へのヒント */}
      <Card>
        <CardHeader
          title="実業務へのヒント"
          description="このシミュレーションを、明日の仕事にどうつなげるか"
          icon={<Icon name="check" className="h-5 w-5" />}
        />
        <CardBody>
          <p className="flex items-start gap-2.5 rounded-lg border border-sea-200 bg-sea-50/60 px-4 py-3 text-[13px] leading-relaxed text-navy-700">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-sea-600" />
            {report.businessHint}
          </p>
        </CardBody>
      </Card>

      {/* アクション */}
      <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:justify-end">
        <Link href="/dashboard">
          <Button variant="secondary" size="lg" className="w-full sm:w-auto">
            ダッシュボードに戻る
          </Button>
        </Link>
        <Button
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => handleReplay(otherMode)}
        >
          {modeConfigs[otherMode].label}でプレイする
        </Button>
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => handleReplay(state.mode)}
        >
          {modeConfig.label}をもう一度プレイする
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const formatPct = (v: number | null, signed = false) =>
  v === null ? "—" : `${signed && v > 0 ? "+" : ""}${Math.round(v * 100)}%`;

/** 実践編のみ：ROI・CPA などの B2B 指標と、その意味を学ぶ解説 */
function B2bMetricsSection({
  metrics,
  yearsPlayed,
}: {
  metrics: B2bMetrics;
  yearsPlayed: number;
}) {
  const { money } = useMoney();
  const moneyOrDash = (v: number | null) => (v === null ? "—" : money(v));

  const tiles: {
    label: string;
    value: string;
    formula: string;
    tone?: "good" | "bad";
  }[] = [
    {
      label: "ROI（投資利益率）",
      value: formatPct(metrics.roi, true),
      formula: `（粗利 − 投資）÷ 投資　※粗利率 ${Math.round(
        ASSUMED_GROSS_MARGIN * 100,
      )}%`,
      tone:
        metrics.roi === null ? undefined : metrics.roi >= 0 ? "good" : "bad",
    },
    {
      label: "ROAS（投資対売上）",
      value: metrics.roas === null ? "—" : `${metrics.roas.toFixed(1)}倍`,
      formula: "受注額 ÷ 投資",
    },
    {
      label: "CPA（受注獲得単価）",
      value: moneyOrDash(metrics.cpa),
      formula: "投資 ÷ 受注件数",
    },
    {
      label: "CPL（引き合い獲得単価）",
      value: moneyOrDash(metrics.cpl),
      formula: "施策費 ÷ 見込み引き合い件数",
    },
    {
      label: "受注率",
      value: formatPct(metrics.winRate),
      formula: `受注 ${metrics.dealsWon}件 ÷ 提案 ${metrics.proposals}件`,
    },
    {
      label: "平均受注単価",
      value: moneyOrDash(metrics.avgDealSize),
      formula: "受注額 ÷ 受注件数",
    },
  ];

  const roiTone = (roi: number | null) =>
    roi === null
      ? "text-navy-400"
      : roi >= 0
        ? "text-emerald-600"
        : "text-rose-600";

  return (
    <Card>
      <CardHeader
        title="B2B マーケティング指標"
        description={`${yearsPlayed}年間の投資対効果を、実務で使われる KPI で振り返る`}
        icon={<Icon name="trendUp" className="h-5 w-5" />}
        action={<Badge tone="warning">実践編</Badge>}
      />
      <CardBody>
        <p className="text-[12px] leading-relaxed text-navy-500">
          投資合計{" "}
          <span className="tabular font-semibold text-navy-800">
            {money(metrics.totalInvestment)}
          </span>
          （施策費 {money(metrics.marketingSpend)} + 市場調査費{" "}
          {money(metrics.researchSpend)}）／ 受注額合計{" "}
          <span className="tabular font-semibold text-navy-800">
            {money(metrics.wonRevenue)}
          </span>
          （想定粗利 {money(metrics.grossProfit)}）
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-3"
            >
              <p className="text-[10px] font-semibold tracking-wider text-navy-400">
                {t.label}
              </p>
              <p
                className={`tabular mt-1 text-lg leading-none font-bold ${
                  t.tone === "good"
                    ? "text-emerald-600"
                    : t.tone === "bad"
                      ? "text-rose-600"
                      : "text-navy-900"
                }`}
              >
                {t.value}
              </p>
              <p className="mt-1.5 text-[10px] leading-snug text-navy-400">
                {t.formula}
              </p>
            </div>
          ))}
        </div>

        {/* 年度別の投資対効果 */}
        {metrics.byTurn.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-navy-100 text-[10px] tracking-wider text-navy-400">
                  <th className="py-2 pr-3 font-semibold">年度</th>
                  <th className="py-2 pr-3 text-right font-semibold">投資</th>
                  <th className="py-2 pr-3 text-right font-semibold">
                    引き合い
                  </th>
                  <th className="py-2 pr-3 text-right font-semibold">
                    受注 / 提案
                  </th>
                  <th className="py-2 pr-3 text-right font-semibold">受注額</th>
                  <th className="py-2 text-right font-semibold">ROI</th>
                </tr>
              </thead>
              <tbody className="tabular text-navy-700">
                {metrics.byTurn.map((t) => (
                  <tr key={t.turn} className="border-b border-navy-100/70">
                    <td className="py-2 pr-3 font-medium">{t.turn}年目</td>
                    <td className="py-2 pr-3 text-right">
                      {money(t.investment)}
                    </td>
                    <td className="py-2 pr-3 text-right">{t.leads}件</td>
                    <td className="py-2 pr-3 text-right">
                      {t.dealsWon} / {t.proposals}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {money(t.wonRevenue)}
                    </td>
                    <td
                      className={`py-2 text-right font-semibold ${roiTone(t.roi)}`}
                    >
                      {formatPct(t.roi, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* プレイ結果に応じた講評 */}
        <div className="mt-5">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            あなたの投資判断への講評
          </p>
          <ul className="mt-2 space-y-2">
            {metrics.insights.map((text) => (
              <li
                key={text}
                className="flex items-start gap-2.5 rounded-lg bg-navy-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-navy-700"
              >
                <Icon
                  name="alert"
                  className="mt-0.5 h-4 w-4 shrink-0 text-sea-600"
                />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* 教育用の解説 */}
        <div className="mt-5">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            解説：なぜ ROI などの指標で評価するのか
          </p>
          <div className="mt-2 space-y-2">
            {metricLessons.map((lesson, i) => (
              <details
                key={lesson.title}
                open={i === 0}
                className="group rounded-lg border border-navy-200/70 bg-white"
              >
                <summary className="flex list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-navy-800 [&::-webkit-details-marker]:hidden">
                  {lesson.title}
                  <Icon
                    name="arrowRight"
                    className="h-3.5 w-3.5 shrink-0 text-navy-400 transition-transform group-open:rotate-90"
                  />
                </summary>
                <p className="border-t border-navy-100 px-3.5 py-3 text-[12px] leading-relaxed text-navy-600">
                  {lesson.body}
                </p>
              </details>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

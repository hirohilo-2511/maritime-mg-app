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
import { buildFinalReport, type Grade } from "@/lib/finalReport";
import { company } from "@/lib/mock-data";

const gradeTone: Record<Grade, string> = {
  S: "bg-amber-400 text-navy-950",
  A: "bg-emerald-500 text-white",
  B: "bg-sea-500 text-white",
  C: "bg-navy-400 text-white",
};

/** 最終ターン終了後に表示する総合フィードバック（リザルト）ダッシュボード */
export function FinalReport() {
  const { state, resetGame } = useGame();
  const { money, moneySigned } = useMoney();
  const router = useRouter();

  const report = useMemo(() => buildFinalReport(state), [state]);

  const handleReplay = () => {
    resetGame();
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ヒーロー：総合評価 */}
      <Card>
        <div className="bg-navy-900 px-6 py-8 text-white sm:px-8">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            FINAL REPORT — {state.totalTurns}年間のシミュレーション終了
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
        </div>

        <div className="grid grid-cols-2 gap-px bg-navy-100 sm:grid-cols-4">
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
        </div>
      </Card>

      {/* 投資傾向の分析 */}
      <Card>
        <CardHeader
          title="投資傾向の分析"
          description="5年間の予算配分から見えるプレイスタイル"
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
        <Button size="lg" className="w-full sm:w-auto" onClick={handleReplay}>
          もう一度プレイする
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

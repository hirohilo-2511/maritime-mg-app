"use client";

import { FitChart } from "@/components/game/FitChart";
import { RelationshipMeter } from "@/components/game/RelationshipMeter";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PriorityBadges } from "@/components/game/PriorityBadges";
import { ProposalAction } from "@/components/game/ProposalAction";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import { getChannel } from "@/lib/marketing";
import { insightsForCustomer, reportsForCustomer } from "@/lib/research";
import {
  fitAxes,
  shortfallAxes,
  type Customer,
  type CustomerDeal,
  type DealStatus,
  type FitScores,
} from "@/lib/customers";
import { axisChannel } from "@/lib/synergy";
import type { ShipownerRequest } from "@/lib/types";

const dealStatus: Record<DealStatus, { label: string; tone: BadgeTone }> = {
  won: { label: "受注", tone: "positive" },
  lost: { label: "失注", tone: "negative" },
  declined: { label: "辞退", tone: "warning" },
  ignored: { label: "未回答", tone: "neutral" },
  expired: { label: "期限切れ", tone: "neutral" },
  pending: { label: "対応待ち", tone: "warning" },
};

export function CustomerDetail({
  customer,
  relationship,
  deals,
  capability,
  turn,
  activeRequest,
}: {
  customer: Customer;
  /** プレイ内容を反映した現在の関係性スコア */
  relationship: number;
  /** この船主との取引・提案履歴 */
  deals: CustomerDeal[];
  capability: FitScores;
  turn: number;
  /** 今ターン、この船主から出ている引き合い */
  activeRequest?: ShipownerRequest;
}) {
  const { money } = useMoney();
  const { state, modeConfig } = useGame();
  // 導入編：購入した市場調査のうち、この船主に関係する示唆
  const researchInsights = insightsForCustomer(state.researchPurchases, customer.id);
  const relatedReports = reportsForCustomer(customer.id);

  const shortfalls = shortfallAxes(customer.expectations, capability);
  const wonTotal = deals
    .filter((d) => d.status === "won")
    .reduce((sum, d) => sum + d.revenue, 0);
  const fleetTotal = customer.fleet.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-4">
      {/* カルテ見出し */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-navy-900">
                  {customer.name}
                </h2>
                {activeRequest ? (
                  <Badge tone="info">
                    <Icon name="alert" className="h-3 w-3" />
                    今ターン引き合いあり
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-navy-500">
                {customer.region} · {customer.segment} · 保有 {fleetTotal}隻
              </p>
            </div>
            <div className="w-full max-w-[13rem] shrink-0">
              <RelationshipMeter score={relationship} />
            </div>
          </div>

          {/* 保有船隊 */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {customer.fleet.map((f) => (
              <div
                key={f.type}
                className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5"
              >
                <p className="truncate text-[11px] font-semibold text-navy-500">
                  {f.type}
                </p>
                <p className="tabular mt-1 flex items-baseline gap-1 text-lg leading-none font-bold text-navy-900">
                  {f.count}
                  <span className="text-xs font-medium text-navy-400">隻</span>
                </p>
                <p className="tabular mt-1 text-[11px] text-navy-400">
                  平均船齢 {f.avgAge}年
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="truncate text-[11px] font-semibold text-navy-500">
                累計受注額
              </p>
              <p className="tabular mt-1 text-lg leading-none font-bold text-navy-900">
                {money(wonTotal)}
              </p>
              <p className="tabular mt-1 text-[11px] text-navy-400">
                {turn}年目までの実績
              </p>
            </div>
          </div>

          {/* 意思決定者 */}
          <div className="mt-2.5 rounded-lg border border-navy-200/70 px-3.5 py-3">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              意思決定者
            </p>
            <p className="mt-1 text-[13px] font-bold text-navy-900">
              {customer.decisionMaker.name}
              <span className="ml-2 text-[11px] font-medium text-navy-400">
                {customer.decisionMaker.role}
              </span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-navy-500">
              {customer.decisionMaker.note}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* 期待水準 vs 自社の提供力 */}
      <Card>
        <CardHeader
          title="期待水準と自社の提供力"
          description="ギャップの大きい軸が提案の弱点になる"
          icon={<Icon name="research" className="h-5 w-5" />}
          action={
            shortfalls.length > 0 ? (
              <Badge tone="negative">
                <Icon name="alert" className="h-3 w-3" />
                弱点 {shortfalls.length}軸
              </Badge>
            ) : (
              <Badge tone="positive">
                <Icon name="check" className="h-3 w-3" />
                全軸で充足
              </Badge>
            )
          }
        />
        <CardBody>
          <FitChart
            expectations={customer.expectations}
            capability={capability}
          />
          {shortfalls.length > 0 ? (
            <p className="mt-3 rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-navy-600">
              <span className="font-bold">提案方針:</span>{" "}
              {shortfalls
                .map((id) => fitAxes.find((a) => a.id === id)?.label)
                .join("・")}
              で期待を下回っています。この軸を訴求するなら、その裏付けになる施策（
              {shortfalls
                .map((id) => getChannel(axisChannel[id]).name)
                .join("・")}
              ）へ重点的に配分しましょう。難しければ、期待を上回っている軸で勝負する手もあります。
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* 導入編：市場調査で分かったこと（調査するとプロファイルが充実する） */}
      {modeConfig.researchInsightsInProfile ? (
        <Card>
          <CardHeader
            title="市場調査からの示唆"
            description="購入したレポートのうち、この船主に関係する内容"
            icon={<Icon name="research" className="h-5 w-5" />}
            action={
              <Badge tone={researchInsights.length > 0 ? "positive" : "neutral"}>
                {researchInsights.length}件
              </Badge>
            }
          />
          <CardBody>
            {researchInsights.length > 0 ? (
              <ul className="space-y-2">
                {researchInsights.map(({ report, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-navy-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />
                    <span>
                      {text}
                      <span className="block text-[11px] text-navy-400">
                        出典：{report.title}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {relatedReports.some(
              (r) => !state.researchPurchases.some((p) => p.reportId === r.id),
            ) ? (
              <p
                className={`rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-navy-600 ${
                  researchInsights.length > 0 ? "mt-3" : ""
                }`}
              >
                市場調査の
                {relatedReports
                  .filter(
                    (r) => !state.researchPurchases.some((p) => p.reportId === r.id),
                  )
                  .map((r) => `「${r.title}」`)
                  .join("")}
                を購入すると、この船主について分かることが増えます。
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* 今ターンの引き合い */}
      {activeRequest ? (
        <Card>
          <CardHeader
            title="今ターンの引き合い"
            description={`回答期限 ${activeRequest.deadline}`}
            icon={<Icon name="anchor" className="h-5 w-5" />}
          />
          <CardBody>
            <p className="text-[13px] font-bold text-navy-900">
              {activeRequest.vesselType}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-navy-500">
              {activeRequest.requirement}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="tabular text-[13px] font-bold text-navy-900">
                {money(activeRequest.budget)}
              </span>
              <span className="text-[11px] text-navy-400">想定予算 ·</span>
              <PriorityBadges
                owner={activeRequest.owner}
                priorities={activeRequest.priorities}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <ProposalAction request={activeRequest} />
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* 取引履歴（プレイヤーの提案結果） */}
      <Card>
        <CardHeader
          title="取引・提案履歴"
          description={`${deals.length}件 · あなたの提案結果`}
          icon={<Icon name="budget" className="h-5 w-5" />}
        />
        {deals.length === 0 ? (
          <CardBody>
            <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] text-navy-500">
              まだこの船主からの引き合いはありません。
            </p>
          </CardBody>
        ) : (
          <ul className="divide-y divide-navy-100">
            {[...deals].reverse().map((deal) => {
              const status = dealStatus[deal.status];
              const p = deal.proposal;
              return (
                <li
                  key={deal.requestId}
                  className="flex items-start justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-[11px] font-semibold text-navy-400">
                        {deal.turn}年目
                      </span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-navy-700">
                      {deal.title}
                    </p>
                    {p ? (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-navy-400">
                        訴求「{p.focusPriority}」（第{p.priorityRank + 1}優先）·
                        裏付け: {getChannel(p.requiredChannel).name} 全体の{" "}
                        {Math.round(p.channelShare * 100)}%
                        {p.won
                          ? p.priorityRank > 0
                            ? ` · 受注額は想定の${Math.round((p.revenue / p.requestBudget) * 100)}%`
                            : ""
                          : ` · あと ${money(p.shortfall)} で受注できた`}
                      </p>
                    ) : deal.status === "declined" ? (
                      <p className="mt-0.5 text-[11px] text-amber-600">
                        裏付けが足りないため、今期の提案を辞退しました。
                      </p>
                    ) : deal.status === "expired" ? (
                      <p className="mt-0.5 text-[11px] text-navy-400">
                        追加案件に回答しないまま期限が切れました（ペナルティはありません）。
                      </p>
                    ) : deal.status === "ignored" ? (
                      <p className="mt-0.5 text-[11px] text-rose-500">
                        回答しなかったため、関係性と信頼度が低下しました。
                      </p>
                    ) : null}
                  </div>
                  <p className="tabular shrink-0 text-right text-[13px] font-bold text-navy-900">
                    {deal.status === "won"
                      ? money(deal.revenue)
                      : money(deal.budget)}
                    <span className="block text-[10px] font-medium text-navy-400">
                      {deal.status === "won" ? "受注額" : "想定予算"}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

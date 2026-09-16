"use client";

import { FitChart } from "@/components/game/FitChart";
import { RelationshipMeter } from "@/components/game/RelationshipMeter";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  fitAxes,
  shortfallAxes,
  untilTurn,
  type Customer,
  type DealStatus,
  type FitScores,
} from "@/lib/customers";
import type { ShipownerRequest } from "@/lib/types";

const dealStatus: Record<DealStatus, { label: string; tone: BadgeTone }> = {
  won: { label: "受注", tone: "positive" },
  lost: { label: "失注", tone: "negative" },
  pending: { label: "進行中", tone: "warning" },
};

export function CustomerDetail({
  customer,
  capability,
  turn,
  activeRequest,
}: {
  customer: Customer;
  capability: FitScores;
  turn: number;
  /** 今ターン、この船主から出ている引き合い */
  activeRequest?: ShipownerRequest;
}) {
  const { money } = useMoney();
  const deals = untilTurn(customer.deals, turn);
  const logs = untilTurn(customer.logs, turn).reverse();
  const shortfalls = shortfallAxes(customer.expectations, capability);
  const wonTotal = deals
    .filter((d) => d.status === "won")
    .reduce((sum, d) => sum + d.amount, 0);
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
              <RelationshipMeter score={customer.relationship} />
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
              で期待を下回っています。他軸の強みで補うか、この軸への投資を検討してください。
            </p>
          ) : null}
        </CardBody>
      </Card>

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
              {activeRequest.priorities.map((p) => (
                <Badge key={p}>{p}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* 購買履歴 */}
        <Card>
          <CardHeader
            title="購買・商談履歴"
            description={`${deals.length}件`}
            icon={<Icon name="budget" className="h-5 w-5" />}
          />
          {deals.length === 0 ? (
            <CardBody>
              <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] text-navy-500">
                まだ取引履歴がありません。
              </p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-navy-100">
              {deals.map((deal, index) => {
                const status = dealStatus[deal.status];
                return (
                  <li
                    key={`${deal.turn}-${index}`}
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
                    </div>
                    <p className="tabular shrink-0 text-[13px] font-bold text-navy-900">
                      {money(deal.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 商談ログ */}
        <Card>
          <CardHeader
            title="商談ログ"
            description="新しい順"
            icon={<Icon name="book" className="h-5 w-5" />}
          />
          {logs.length === 0 ? (
            <CardBody>
              <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[12px] text-navy-500">
                まだ商談記録がありません。
              </p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-navy-100">
              {logs.map((log, index) => (
                <li key={`${log.turn}-${index}`} className="px-5 py-3">
                  <p className="tabular text-[11px] font-semibold text-navy-400">
                    {log.turn}年目 {log.quarter}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-navy-600">
                    {log.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

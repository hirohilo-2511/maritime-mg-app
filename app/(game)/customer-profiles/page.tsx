"use client";

import { useMemo, useState } from "react";
import { CustomerDetail } from "@/components/game/CustomerDetail";
import { RelationshipMeter } from "@/components/game/RelationshipMeter";
import { useGame } from "@/components/game/GameProvider";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import {
  currentRelationship,
  customers,
  ownCapability,
  shortfallAxes,
  untilTurn,
} from "@/lib/customers";

export default function CustomerProfilesPage() {
  const { state, turnData } = useGame();
  const [selectedId, setSelectedId] = useState(customers[0].id);

  const capability = useMemo(() => ownCapability(state), [state]);

  /** 今ターンに引き合いを出している船主（船主名で突合） */
  const requestByOwner = useMemo(
    () => new Map(turnData.requests.map((r) => [r.owner, r] as const)),
    [turnData.requests],
  );

  const selected =
    customers.find((c) => c.id === selectedId) ?? customers[0];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* 船主リスト */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-bold tracking-wide text-navy-900">
              船主カルテ
            </h2>
            <p className="tabular text-[11px] text-navy-400">
              {customers.length}社
            </p>
          </div>

          <ul className="mt-2 space-y-2">
            {customers.map((customer) => {
              const active = customer.id === selected.id;
              const request = requestByOwner.get(customer.name);
              const shortfalls = shortfallAxes(
                customer.expectations,
                capability,
              );
              const wonCount = untilTurn(customer.deals, state.turn).filter(
                (d) => d.status === "won",
              ).length;

              return (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(customer.id)}
                    aria-current={active ? "true" : undefined}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-navy-800 bg-white shadow-sm"
                        : "border-navy-200/70 bg-white/70 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-[13px] font-bold text-navy-900">
                        {customer.name}
                      </p>
                      {request ? (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sea-500"
                          title="今ターン引き合いあり"
                        />
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-navy-400">
                      {customer.region}
                    </p>

                    <div className="mt-2">
                      <RelationshipMeter
                        score={currentRelationship(customer, state)}
                        size="sm"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {wonCount > 0 ? (
                        <Badge tone="positive">
                          <Icon name="check" className="h-3 w-3" />
                          受注 {wonCount}件
                        </Badge>
                      ) : (
                        <Badge tone="neutral">受注なし</Badge>
                      )}
                      {shortfalls.length > 0 ? (
                        <Badge tone="warning">弱点 {shortfalls.length}軸</Badge>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 px-1 text-[11px] leading-relaxed text-navy-400">
            自社の提供力は全船主に共通で、「実績評価」は企業の信頼度スコア（
            {state.trustScore}）に連動します。
          </p>
        </div>

        {/* 選択中の船主の詳細 */}
        <CustomerDetail
          customer={selected}
          relationship={currentRelationship(selected, state)}
          capability={capability}
          turn={state.turn}
          activeRequest={requestByOwner.get(selected.name)}
        />
      </div>
    </div>
  );
}

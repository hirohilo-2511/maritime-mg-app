"use client";

import { MarketNewsCard } from "@/components/game/MarketNewsCard";
import { ShipownerRequestsCard } from "@/components/game/ShipownerRequestsCard";
import { useGame } from "@/components/game/GameProvider";
import { Badge } from "@/components/ui/Badge";
import { company } from "@/lib/mock-data";

export default function DashboardPage() {
  const { state, turnData, isFinalTurn } = useGame();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 今ターンの概要 */}
      <div className="rounded-xl border border-navy-200/70 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            {state.turn}年目の方針
          </p>
          {isFinalTurn ? (
            <Badge tone="warning">最終ターン</Badge>
          ) : (
            <Badge tone="neutral">
              残り {state.totalTurns - state.turn} ターン
            </Badge>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
          <span className="font-semibold text-navy-900">
            {state.playerName}
          </span>{" "}
          {company.playerRole} — {turnData.headline}
        </p>
      </div>

      {/* メインコンテンツ：2カラム（モバイルでは縦積み） */}
      <div className="grid gap-6 xl:grid-cols-2">
        <MarketNewsCard news={turnData.news} />
        <ShipownerRequestsCard requests={turnData.requests} />
      </div>
    </div>
  );
}

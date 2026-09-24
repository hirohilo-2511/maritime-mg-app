"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import type { ResearchReport } from "@/lib/research";

/** 購入後に表示する定量データのバー */
function DataBars({ report }: { report: ResearchReport }) {
  const max = Math.max(...report.data.map((d) => d.value), 1);

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold tracking-widest text-navy-400">
        {report.dataLabel}
      </p>
      <ul className="mt-2 space-y-2">
        {report.data.map((datum) => (
          <li key={datum.label}>
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span
                className={`truncate ${datum.own ? "font-bold text-navy-900" : "text-navy-600"}`}
              >
                {datum.label}
                {datum.own ? (
                  <span className="ml-1.5 text-[10px] font-semibold text-sea-600">
                    自社
                  </span>
                ) : null}
              </span>
              <span className="tabular shrink-0 font-bold text-navy-900">
                {datum.display}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className={`h-full rounded-full ${datum.own ? "bg-navy-800" : "bg-sea-500"}`}
                style={{ width: `${(datum.value / max) * 100}%` }}
              />
            </div>
            {datum.caption ? (
              <p className="mt-0.5 text-[11px] text-navy-400">
                {datum.caption}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResearchReportCard({
  report,
  purchased,
  purchasedTurn,
  available,
  affordable,
  unaffordableReason,
  onPurchase,
}: {
  report: ResearchReport;
  purchased: boolean;
  /** 購入したターン（未購入なら undefined） */
  purchasedTurn?: number;
  /** 現在のターンで購入可能か */
  available: boolean;
  /** 資金が足りているか（確定済み配分を差し引いた残額で判定） */
  affordable: boolean;
  /** 購入できない理由（ボタンの下に常時表示する） */
  unaffordableReason?: string;
  onPurchase: () => void;
}) {
  const { money } = useMoney();

  return (
    <li
      className={`rounded-xl border bg-white p-5 transition-colors ${
        purchased ? "border-navy-300" : "border-navy-200/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-navy-900">{report.title}</h3>
            {purchased ? (
              <Badge tone="positive">
                <Icon name="check" className="h-3 w-3" />
                購入済み
                {purchasedTurn ? ` · ${purchasedTurn}年目` : ""}
              </Badge>
            ) : available ? (
              <Badge tone="info">購入可能</Badge>
            ) : (
              <Badge tone="neutral">{report.availableFrom}年目以降</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-navy-400">{report.provider}</p>
        </div>
        {!purchased ? (
          <p className="tabular shrink-0 text-right text-base leading-none font-bold text-navy-900">
            {money(report.cost)}
          </p>
        ) : null}
      </div>

      {purchased ? (
        <>
          <DataBars report={report} />
          <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
            調査からの示唆
          </p>
          <ul className="mt-2 space-y-2">
            {report.insights.map((insight) => (
              <li
                key={insight}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed text-navy-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />
                {insight}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-navy-500">
            {report.teaser}
          </p>
          <div className="mt-3 rounded-lg bg-navy-50 px-3.5 py-2.5">
            <p className="flex items-center gap-2 text-[11px] text-navy-400">
              <Icon name="research" className="h-3.5 w-3.5" />
              購入すると、定量データ {report.data.length}項目と示唆{" "}
              {report.insights.length}件が閲覧できます
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="mt-3 w-full"
            disabled={!available || !affordable}
            onClick={onPurchase}
            title={
              !available
                ? `${report.availableFrom}年目以降に購入できます`
                : !affordable
                  ? unaffordableReason
                  : undefined
            }
          >
            {!available
              ? `${report.availableFrom}年目以降に公開`
              : !affordable
                ? "購入できません"
                : `${money(report.cost)} で購入する`}
          </Button>
          {/* 無効化したボタンのツールチップは端末によって表示されないため、理由を本文で示す */}
          {available && !affordable && unaffordableReason ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-600">
              <Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" />
              {unaffordableReason}
            </p>
          ) : null}
        </>
      )}
    </li>
  );
}

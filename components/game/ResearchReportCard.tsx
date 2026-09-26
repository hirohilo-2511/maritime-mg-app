"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import { customers } from "@/lib/customers";
import { reportCustomerIds, type ResearchReport } from "@/lib/research";

/** 船主の短い呼び名（例：「Setouchi Kisen 株式会社」→「Setouchi」） */
function shortName(customerId: string): string {
  return customers.find((c) => c.id === customerId)?.name.split(" ")[0] ?? customerId;
}

/** このレポートで何が分かるか（難易度によって、プロファイルの示唆か、重視順か） */
function ResearchBenefit({ report }: { report: ResearchReport }) {
  const { modeConfig } = useGame();
  const names = reportCustomerIds(report).map(shortName);
  if (names.length === 0) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-navy-600">
      <Icon name="customers" className="h-3.5 w-3.5 text-sea-600" />
      <span className="font-semibold">
        {modeConfig.hidePriorityOrderUntilResearched
          ? "重視順が分かる船主："
          : "顧客プロファイルに示唆が届く船主："}
      </span>
      {names.map((n) => (
        <Badge key={n} tone="info">
          {n}
        </Badge>
      ))}
      {modeConfig.researchWinTrustBonus > 0 ? (
        <span className="text-navy-400">
          （この船主から受注すると信頼度 +{modeConfig.researchWinTrustBonus}）
        </span>
      ) : null}
    </p>
  );
}

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
  expired = false,
  validUntil = null,
  price,
  purchasedTurn,
  available,
  affordable,
  unaffordableReason,
  onPurchase,
}: {
  report: ResearchReport;
  purchased: boolean;
  /** 購入済みだが有効期限が切れている（更新版を買い直せる） */
  expired?: boolean;
  /** 有効期限の最終年（期限なしなら null） */
  validUntil?: number | null;
  /** 今買う場合の値段（更新版は割引） */
  price: number;
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
            {purchased && expired ? (
              <Badge tone="warning">
                <Icon name="alert" className="h-3 w-3" />
                期限切れ（{validUntil}年目まで有効だった）
              </Badge>
            ) : purchased ? (
              <Badge tone="positive">
                <Icon name="check" className="h-3 w-3" />
                購入済み
                {purchasedTurn ? ` · ${purchasedTurn}年目` : ""}
                {validUntil ? ` · ${validUntil}年目まで有効` : ""}
              </Badge>
            ) : available ? (
              <Badge tone="info">購入可能</Badge>
            ) : (
              <Badge tone="neutral">{report.availableFrom}年目以降</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-navy-400">{report.provider}</p>
          <ResearchBenefit report={report} />
        </div>
        {!purchased || expired ? (
          <p className="tabular shrink-0 text-right text-base leading-none font-bold text-navy-900">
            {money(price)}
            {expired ? (
              <span className="block text-[10px] font-medium text-navy-400">
                更新版
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {purchased ? (
        <>
          <DataBars report={report} />
          <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
            調査からの示唆
          </p>
          {expired ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              情報が古くなったため、関係する船主の重視順は再び分からなくなりました。
            </p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {report.insights.map((insight) => (
              <li
                key={insight.text}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed text-navy-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />
                <span>
                  {insight.text}
                  {insight.customers.length > 0 ? (
                    <span className="ml-1.5 text-[11px] font-semibold text-sea-600">
                      → {insight.customers.map(shortName).join("・")}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {expired ? (
            <Button
              variant="secondary"
              size="md"
              className="mt-3 w-full"
              disabled={!affordable}
              onClick={onPurchase}
            >
              {affordable ? `更新版を ${money(price)} で購入する` : "購入できません"}
            </Button>
          ) : null}
          {expired && !affordable && unaffordableReason ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose-600">
              <Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" />
              {unaffordableReason}
            </p>
          ) : null}
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
                : `${money(price)} で購入する`}
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

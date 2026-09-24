"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";

/** 決算明細の 1 行 */
function Row({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-navy-900";
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[13px] text-navy-500">{label}</dt>
      <dd className={`tabular text-sm font-bold ${color}`}>{value}</dd>
    </div>
  );
}

/**
 * ターン終了時の決算結果モーダル。
 * GameProvider の turnResult が入っているあいだ表示される。
 */
export function TurnResultModal() {
  const { turnResult, dismissTurnResult } = useGame();
  const { money, moneySigned } = useMoney();
  const router = useRouter();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const bankrupt = turnResult?.bankrupt ?? false;

  // 倒産した場合は、モーダルを閉じると同時に最終レポートへ移動する
  const close = useCallback(() => {
    dismissTurnResult();
    if (bankrupt) router.push("/final-report");
  }, [bankrupt, dismissTurnResult, router]);

  // Escape で閉じる
  useEffect(() => {
    if (!turnResult) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    confirmRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [turnResult, close]);

  if (!turnResult) return null;

  const {
    fromTurn,
    toTurn,
    settlement,
    marketing,
    researchSpend,
    unansweredCount,
    unansweredPenalty,
    fundsBefore,
    fundsAfter,
    trustBefore,
    trustAfter,
  } = turnResult;
  const netIncome = settlement.revenue - settlement.expense - marketing.spend;
  // クランプ後の実際の変動量を表示する
  const trustDelta = trustAfter - trustBefore;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="turn-result-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* ヘッダー */}
        {bankrupt ? (
          <div className="bg-rose-700 px-6 py-5 text-white">
            <p className="text-[10px] font-semibold tracking-widest text-rose-200">
              BANKRUPTCY
            </p>
            <h2 id="turn-result-title" className="mt-1 text-xl font-bold">
              {fromTurn}年目の決算で倒産しました
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-rose-100">
              決算後の資金が {money(fundsAfter)}{" "}
              となり、事業を継続できなくなりました。ここでゲームは終了です。
            </p>
          </div>
        ) : (
          <div className="bg-navy-900 px-6 py-5 text-white">
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              TURN SETTLEMENT
            </p>
            <h2 id="turn-result-title" className="mt-1 text-xl font-bold">
              {fromTurn}年目の決算
            </h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-navy-300">
              {fromTurn}年目
              <Icon name="arrowRight" className="h-4 w-4 text-sea-400" />
              <span className="font-semibold text-white">{toTurn}年目</span>
              に進みました
            </p>
          </div>
        )}

        {/* 決算明細 */}
        <div className="px-6 py-4">
          <dl className="divide-y divide-navy-100">
            <Row
              label="売上・入金"
              value={moneySigned(settlement.revenue)}
              tone="positive"
            />
            <Row
              label="固定費・製造原価"
              value={moneySigned(-settlement.expense)}
              tone="negative"
            />
            <Row
              label="マーケティング投資"
              value={moneySigned(-marketing.spend)}
              tone={marketing.spend > 0 ? "negative" : "neutral"}
            />
            <Row
              label="当期損益"
              value={moneySigned(netIncome)}
              tone={netIncome >= 0 ? "positive" : "negative"}
            />
          </dl>

          {unansweredCount > 0 ? (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[12px] leading-relaxed text-rose-700">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              船主の要求 {unansweredCount}件に回答しなかったため、信頼度{" "}
              {unansweredPenalty} と関係性の悪化が生じました。
            </p>
          ) : null}

          {researchSpend > 0 ? (
            <p className="mt-1 text-[11px] text-navy-400">
              ※ 市場調査費 {money(researchSpend)}{" "}
              は購入時に支出済みのため、上記には含まれていません。
            </p>
          ) : null}

          {/* 変動後のステータス */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                利用可能資金
              </p>
              <p className="tabular mt-1 text-lg leading-none font-bold text-navy-900">
                {money(fundsAfter)}
              </p>
              <p className="tabular mt-1 text-[11px] text-navy-400">
                前ターン {money(fundsBefore)}
              </p>
            </div>
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                信頼度スコア
              </p>
              <p className="tabular mt-1 flex items-baseline gap-1.5 text-lg leading-none font-bold text-navy-900">
                {trustAfter}
                <span
                  className={`text-xs font-bold ${
                    trustDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {trustDelta >= 0 ? "+" : ""}
                  {trustDelta}
                </span>
              </p>
              <p className="tabular mt-1 text-[11px] text-navy-400">
                前ターン {trustBefore} / 100
              </p>
            </div>
          </div>

          {/* マーケティング投資の成果 */}
          <div className="mt-4 rounded-lg border border-navy-200/70 px-3.5 py-2.5">
            {marketing.spend > 0 ? (
              <p className="text-[13px] text-navy-600">
                マーケティング投資{" "}
                <span className="tabular font-bold text-navy-900">
                  {money(marketing.spend)}
                </span>{" "}
                により、見込み引き合い{" "}
                <span className="tabular font-bold text-navy-900">
                  {marketing.leads}件
                </span>
                を獲得しました。
              </p>
            ) : (
              <p className="flex items-start gap-2 text-[13px] text-amber-700">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                今ターンはマーケティング投資を見送りました（$0 で確定）。
              </p>
            )}
          </div>

          {/* ハイライト */}
          <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
            主な出来事
          </p>
          <ul className="mt-2 space-y-2">
            {settlement.highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed text-navy-600"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sea-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-navy-100 px-6 py-4">
          <Button
            ref={confirmRef}
            size="lg"
            className="w-full"
            onClick={close}
          >
            {bankrupt ? "最終レポートを見る" : `${toTurn}年目を開始する`}
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

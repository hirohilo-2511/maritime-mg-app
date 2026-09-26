"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import { loanInterest } from "@/lib/loans";
import { DISTRESSED_LOAN_RATE, LOAN_RATE_TABLE, type EmergencyLoanConfig } from "@/lib/modes";
import type { PendingInsolvency } from "@/lib/types";

/** 金利の表示（0.1% 単位） */
const ratePct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/** 金利表の信頼度の範囲ラベル */
function trustRange(index: number): string {
  const row = LOAN_RATE_TABLE[index];
  const upper = index > 0 ? LOAN_RATE_TABLE[index - 1].minTrust - 1 : 100;
  return row.minTrust === 0 ? `${upper}以下` : `${row.minTrust}〜${upper}`;
}

/**
 * 決算で資金が不足したときの「緊急経営判断」。
 * 融資を受けて事業を続けるか、自主倒産するかを選ばせる（融資を受けられない場合は倒産のみ）。
 */
export function EmergencyDecision({
  pending,
  loanConfig,
  totalTurns,
  onAccept,
  onDecline,
}: {
  pending: PendingInsolvency;
  loanConfig: EmergencyLoanConfig;
  totalTurns: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { money } = useMoney();
  // 自主倒産は取り消せないため、もう一度確認する
  const [confirming, setConfirming] = useState(false);
  const { offer } = pending;

  if (!offer) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-[13px] leading-relaxed text-rose-700">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          {pending.denial === "countLimit"
            ? `緊急融資はすでに上限の${loanConfig.maxLoans}回まで受けているため、これ以上の融資は受けられません。`
            : `不足額 ${money(pending.deficit)} が残りの借入枠を超えるため、融資を受けられません（借入の上限は累計 ${money(loanConfig.creditLimit)}）。`}
        </p>
        <Button size="lg" className="w-full" onClick={onDecline}>
          倒産を受け入れて終了する
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const interest = loanInterest(offer);
  // この融資の利息を払う年数：翌年の決算から最終年の締めまで
  const interestYears = Math.max(0, totalTurns - pending.turn);
  const activeRow = LOAN_RATE_TABLE.findIndex((r) => r.rate === offer.baseRate);

  return (
    <div className="space-y-4">
      {/* 融資条件 */}
      <div className="rounded-lg border border-navy-200/70">
        <p className="border-b border-navy-100 px-3.5 py-2 text-[10px] font-semibold tracking-widest text-navy-400">
          緊急融資の条件（{offer.number}回目 / 最大{loanConfig.maxLoans}回）
        </p>
        <dl className="divide-y divide-navy-100 px-3.5 text-[13px]">
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-navy-500">融資額</dt>
            <dd className="tabular text-right font-bold text-navy-900">
              {money(offer.principal)}
              <span className="block text-[11px] font-normal text-navy-400">
                不足額 {money(offer.deficit)} + 運転資金 {money(offer.workingCapital)}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-navy-500">年利</dt>
            <dd className="tabular text-right font-bold text-navy-900">
              {ratePct(offer.rate)}
              {offer.penaltyRate > 0 ? (
                <span className="block text-[11px] font-normal text-navy-400">
                  信頼度による {ratePct(offer.baseRate)} + 2回目の上乗せ {ratePct(offer.penaltyRate)}
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-navy-500">毎年の利息</dt>
            <dd className="tabular text-right font-bold text-rose-600">
              {money(interest)}
              <span className="block text-[11px] font-normal text-navy-400">
                最終年までの {interestYears}年で計 {money(interest * interestYears)}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-navy-500">返済</dt>
            <dd className="text-right font-bold text-navy-900">最終年に元本を一括返済</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-navy-500">信頼度</dt>
            <dd className="tabular text-right font-bold text-rose-600">
              {offer.trustPenalty}
              <span className="block text-[11px] font-normal text-navy-400">
                資金繰りの悪化に対する市場・顧客の懸念
              </span>
            </dd>
          </div>
        </dl>
        {offer.workingCapitalReduced ? (
          <p className="border-t border-navy-100 px-3.5 py-2 text-[11px] leading-relaxed text-amber-700">
            借入枠（累計 {money(loanConfig.creditLimit)}）の残りに合わせ、運転資金は通常の{" "}
            {money(loanConfig.workingCapital)} から減額されています。
          </p>
        ) : null}
      </div>

      {/* 金利表：信頼度が高いほど低金利 */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-navy-400">
          信頼度と金利（現在の信頼度 {offer.trustAtBorrow}）
        </p>
        <ul className="mt-1.5 grid grid-cols-5 gap-1 text-center text-[11px]">
          {LOAN_RATE_TABLE.map((row, i) => (
            <li
              key={row.minTrust}
              className={`rounded-md px-1 py-1.5 ${
                i === activeRow
                  ? "bg-navy-800 font-bold text-white"
                  : "bg-navy-50 text-navy-500"
              }`}
            >
              <span className="block">{trustRange(i)}</span>
              <span className="tabular block font-bold">{ratePct(row.rate)}</span>
            </li>
          ))}
        </ul>
        {offer.rate >= DISTRESSED_LOAN_RATE ? (
          <p className="mt-2 text-[11px] leading-relaxed text-rose-700">
            年利 {ratePct(offer.rate)} は、信用力を失った企業に向けた最高水準の金利です。利息がさらに資金繰りを圧迫する点に注意してください。
          </p>
        ) : null}
      </div>

      {confirming ? (
        <div className="space-y-2 rounded-lg bg-rose-50 px-3.5 py-3">
          <p className="text-[13px] leading-relaxed text-rose-700">
            融資を受けずに、この年で事業を終了します。評価は D となり、元には戻せません。よろしいですか？
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              戻る
            </Button>
            {/* Button の配色（紺）と衝突させないため、危険操作の赤いボタンは直接書く */}
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-rose-700 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:bg-rose-800"
            >
              自主倒産する
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button size="lg" className="flex-1" onClick={onAccept}>
            融資を受けて{pending.turn + 1}年目へ
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="secondary" className="flex-1" onClick={() => setConfirming(true)}>
            自主倒産する
          </Button>
        </div>
      )}
    </div>
  );
}

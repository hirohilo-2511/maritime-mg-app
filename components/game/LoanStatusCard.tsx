"use client";

import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import { Icon } from "@/components/ui/Icon";

/** 金利の表示（0.1% 単位） */
const ratePct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/**
 * 緊急融資を受けているときの財務状況（ダッシュボード用）。
 * 借入がなければ何も表示しない。
 */
export function LoanStatusCard() {
  const { state, isFinalTurn, debt, nextInterest, creditLeft, loansLeft } =
    useGame();
  const { money } = useMoney();
  if (debt <= 0) return null;

  const netFunds = state.availableFunds - debt;
  const active = state.loans.filter((l) => l.repaidTurn === null);
  const items = [
    { label: "利用可能資金", value: money(state.availableFunds) },
    { label: "借入残高", value: money(debt), tone: "text-rose-600" },
    {
      label: "返済後の資金（見込み）",
      value: money(netFunds),
      tone: netFunds < 0 ? "text-rose-600" : undefined,
    },
    {
      label: isFinalTurn ? "今年の締めで払う利息" : "次の決算で払う利息",
      value: money(nextInterest),
      tone: "text-rose-600",
    },
  ];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-amber-800">
        <Icon name="alert" className="h-3.5 w-3.5" />
        緊急融資の返済状況
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-amber-200/70 bg-white px-3.5 py-2.5"
          >
            <dt className="text-[10px] font-semibold tracking-widest text-navy-400">
              {item.label}
            </dt>
            <dd
              className={`tabular mt-1 text-lg leading-none font-bold ${item.tone ?? "text-navy-900"}`}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-[12px] leading-relaxed text-navy-600">
        {active
          .map(
            (l) =>
              `${l.turn}年目：${money(l.principal)}（年利 ${ratePct(l.rate)}）`,
          )
          .join(" / ")}
        。元本は最終年に一括で返済し、最終評価は返済後の資金で判定します。残りの融資枠は{" "}
        {loansLeft}回・{money(creditLeft)}です。
      </p>
    </div>
  );
}

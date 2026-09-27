"use client";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  RELATIONSHIP_KEEP_SPEND,
  baseRevenue,
  capacityCap,
  companySizeInfo,
  fixedCost,
  marketIndex,
  overflowOf,
  overseasOptions,
  productionCapacity,
  repairOptions,
  synergyRuleAt,
} from "@/lib/continuation";
import { shareLabel } from "@/lib/synergy";

/** 継続プレイ（6〜10年目）の会社と市場の状況 */
export function ContinuationStatusCard() {
  const { state } = useGame();
  const { money } = useMoney();
  const cont = state.continuation;
  if (!cont || state.turn < 6) return null;

  const turn = state.turn;
  const index = marketIndex[turn] ?? 1;
  const capacity = productionCapacity(cont, turn);
  const rule = synergyRuleAt(state);
  const size = companySizeInfo[cont.size];
  const recession = turn <= 8;
  const overflow = overflowOf(state);

  const tiles = [
    {
      label: "市況指数",
      value: `${Math.round(index * 100)}%`,
      note: index < 1 ? "不況：売上と受注額が縮む" : index > 1 ? "好況" : "平常",
      tone: index < 1 ? "text-rose-600" : "text-emerald-600",
    },
    {
      label: "生産能力",
      value: `${Math.round(capacity * 100)}%`,
      note: turn === 6 ? "工場停止（4か月）" : capacity > 1 ? "設備・拠点で上乗せ" : capacity < 1 ? "設備の再停止" : "通常",
      tone: capacity < 1 ? "text-rose-600" : "text-navy-900",
    },
    {
      label: "今年の本業の見込み",
      value: money(baseRevenue(cont, turn) - fixedCost(cont, turn)),
      note: `売上 ${money(baseRevenue(cont, turn))} − 固定費 ${money(fixedCost(cont, turn))}`,
      tone:
        baseRevenue(cont, turn) - fixedCost(cont, turn) >= 0
          ? "text-emerald-600"
          : "text-rose-600",
    },
    {
      label: "訴求ライン",
      value: shareLabel(rule.minShare),
      note:
        rule.channelMinShare?.expo !== undefined
          ? "価格（展示会）の訴求は3分の1"
          : recession
            ? "競合の値下げで厳しい"
            : "通常",
      tone: rule.minShare > 0.25 ? "text-rose-600" : "text-navy-900",
    },
  ];

  return (
    <div className="rounded-xl border border-navy-200/70 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold tracking-widest text-navy-400">
          第2部（6〜10年目）の状況
        </p>
        <Badge tone="info">企業規模：{size.label}</Badge>
        <Badge>基準資金 {money(cont.baseFunds)}</Badge>
        {cont.repair ? <Badge>{repairOptions[cont.repair].label}</Badge> : null}
        {cont.costCut ? <Badge tone="warning">経費削減中（〜8年目）</Badge> : null}
        {cont.overseas ? (
          <Badge tone={cont.overseas === "none" ? "neutral" : "positive"}>
            {cont.overseas === "none" ? "海外進出なし" : `進出先：${overseasOptions[cont.overseas].label}`}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5"
          >
            <p className="text-[10px] font-semibold tracking-widest text-navy-400">
              {t.label}
            </p>
            <p className={`tabular mt-1 text-lg leading-none font-bold ${t.tone}`}>
              {t.value}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-navy-400">{t.note}</p>
          </div>
        ))}
      </div>

      <ul className="mt-3 space-y-1 text-[12px] leading-relaxed text-navy-600">
        {turn === 6 ? (
          <li className="flex items-start gap-1.5">
            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            この年に受けられる注文は合計 {money(capacityCap(cont))} まで
            {overflow.amount > 0
              ? `（いま ${money(overflow.amount)} 超過。年末に扱いを決めます）`
              : ""}
            。
          </li>
        ) : null}
        {recession ? (
          <li className="flex items-start gap-1.5">
            <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            不況の間は、営業訪問に {money(RELATIONSHIP_KEEP_SPEND)}{" "}
            以上投じないと、すべての既存船主との関係性が 5 下がります（関係維持ライン）。
          </li>
        ) : null}
        {cont.overseas && cont.overseas !== "none" ? (
          <li className="flex items-start gap-1.5">
            <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            進出先の案件は、現地パートナーに {money(100_000)} 以上投じていないと受注できません。
          </li>
        ) : null}
        {size.loanRateDiscount > 0 ? (
          <li className="text-[11px] text-navy-400">
            規模のメリット：固定費は基準資金の {Math.round(size.fixedCostRate * 100)}%・融資の金利 −
            {Math.round(size.loanRateDiscount * 100)}ポイント
          </li>
        ) : null}
      </ul>
    </div>
  );
}

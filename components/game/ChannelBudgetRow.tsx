"use client";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import { BUDGET_STEP, type MarketingChannel } from "@/lib/marketing";
import type { ChannelEffect } from "@/lib/types";

/** チャネル 1 つの予算スライダーと見込み効果 */
export function ChannelBudgetRow({
  channel,
  amount,
  effect,
  onChange,
}: {
  channel: MarketingChannel;
  amount: number;
  effect: ChannelEffect;
  onChange: (amount: number) => void;
}) {
  const { money } = useMoney();
  const ratio = channel.max > 0 ? (amount / channel.max) * 100 : 0;

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            amount > 0 ? "bg-navy-800 text-white" : "bg-navy-100 text-navy-400"
          }`}
        >
          <Icon name={channel.icon} className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-sm font-bold text-navy-900">{channel.name}</h3>
            <p className="tabular text-base leading-none font-bold text-navy-900">
              {money(amount)}
            </p>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-navy-500">
            {channel.description}
          </p>

          {/* スライダー */}
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={channel.max}
              step={BUDGET_STEP}
              value={amount}
              onChange={(e) => onChange(Number(e.target.value))}
              aria-label={`${channel.name}への配分額`}
              aria-valuetext={money(amount)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-navy-200 accent-navy-800"
              style={{
                background: `linear-gradient(to right, var(--color-navy-700) ${ratio}%, var(--color-navy-200) ${ratio}%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-navy-400 tabular">
              <span>$0</span>
              <span>上限 {money(channel.max)}</span>
            </div>
          </div>

          {/* セグメントと見込み効果 */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {channel.segments.map((segment) => (
              <Badge key={segment}>{segment}</Badge>
            ))}
            {amount > 0 ? (
              <>
                <Badge tone="info">見込み引き合い {effect.leads}件</Badge>
                <Badge tone="positive">信頼度 +{effect.trustDelta}</Badge>
              </>
            ) : (
              <span className="text-[11px] text-navy-400">未配分</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

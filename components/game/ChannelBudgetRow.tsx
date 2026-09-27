"use client";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import { fitAxes } from "@/lib/customers";
import { BUDGET_STEP, type MarketingChannel } from "@/lib/marketing";
import {
  axisForChannel,
  prioritiesForChannel,
  type BackingStatus,
} from "@/lib/synergy";
import type { ChannelEffect } from "@/lib/types";

/** ヒントに並べる重視項目の数（多すぎると答えの一覧になるため絞る） */
const HINT_PRIORITIES = 3;

/** チャネル 1 つの予算スライダーと見込み効果 */
export function ChannelBudgetRow({
  channel,
  amount,
  effect,
  share,
  status,
  minSpend,
  disabled = false,
  onChange,
  shareText = "4分の1",
  note,
}: {
  channel: MarketingChannel;
  amount: number;
  effect: ChannelEffect;
  /** 配分全体に占める割合（0–1） */
  share: number;
  /** 訴求ラインへの到達状況 */
  status: BackingStatus;
  /** 訴求に必要な最低投資額（0 = 条件なし） */
  minSpend: number;
  /** 提案済み・ゲーム終了後など、配分を変更できない状態 */
  disabled?: boolean;
  onChange: (amount: number) => void;
  /** 訴求ラインの配分比の読み方（「4分の1」「3分の1」） */
  shareText?: string;
  /** 施策の下に添える注意（関係維持ラインなど） */
  note?: string;
}) {
  const { money } = useMoney();
  const ratio = channel.max > 0 ? (amount / channel.max) * 100 : 0;
  const axisLabel =
    fitAxes.find((a) => a.id === axisForChannel(channel.id))?.label ?? "";
  const hints = prioritiesForChannel(channel.id);
  // 現地パートナーは訴求ポイントの裏付けではなく、進出先の案件の必須条件
  const partner = channel.overseasOnly === true;
  // 他の配分をそのままにしたとき、訴求ラインに届く位置（上限を超える場合は表示しない）
  const lineReachable = status.lineAmount <= channel.max;
  const linePos = (status.lineAmount / channel.max) * 100;

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
          {/* どの要求の裏付けになるかのヒント */}
          {partner ? (
            <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700">
              <Icon name="check" className="h-3 w-3" />
              <span className="font-semibold">進出先の案件の必須条件</span>
              <span className="text-navy-500">
                （{money(status.lineAmount)} 以上。訴求ポイントの裏付けは別の施策で）
              </span>
            </p>
          ) : (
            <p
              className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-sea-500/10 px-2 py-0.5 text-[11px] text-sea-600"
              title={`裏付けになる重視項目：${hints.join("・")}`}
            >
              <Icon name="check" className="h-3 w-3" />
              <span className="font-semibold">{axisLabel}の裏付け</span>
              <span className="text-navy-500">
                （{hints.slice(0, HINT_PRIORITIES).join("・")}
                {hints.length > HINT_PRIORITIES ? " など" : ""}）
              </span>
            </p>
          )}
          {note ? (
            <p className="mt-1 text-[11px] leading-relaxed font-semibold text-amber-700">
              {note}
            </p>
          ) : null}

          {/* スライダー */}
          <div className="mt-3">
            <div className="relative">
              <input
                type="range"
                min={0}
                max={channel.max}
                step={BUDGET_STEP}
                value={amount}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label={`${channel.name}への配分額`}
                aria-valuetext={money(amount)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-navy-200 accent-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: `linear-gradient(to right, var(--color-navy-700) ${ratio}%, var(--color-navy-200) ${ratio}%)`,
                }}
              />
              {/* 訴求ラインの目印 */}
              {lineReachable && !disabled ? (
                <span
                  className="pointer-events-none absolute -top-1 h-4 w-0.5 rounded bg-emerald-500"
                  style={{ left: `${linePos}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-navy-400 tabular">
              <span>$0</span>
              {lineReachable && !disabled ? (
                <span className="text-emerald-600">
                  {partner ? "必須ライン" : "訴求ライン"} {money(status.lineAmount)}
                </span>
              ) : null}
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
                <Badge tone={status.qualifies ? "positive" : "warning"}>
                  {status.qualifies ? (
                    <Icon name="check" className="h-3 w-3" />
                  ) : (
                    <Icon name="alert" className="h-3 w-3" />
                  )}
                  {partner
                    ? status.qualifies
                      ? "進出先の案件に提案できる"
                      : `あと ${money(status.needed)} で進出先の案件に提案できる`
                    : status.qualifies
                      ? `全体の${Math.round(share * 100)}% · 訴求ライン到達`
                      : status.reason === "underinvested"
                        ? `${money(minSpend)} 未満のため裏付けにならない（あと ${money(status.needed)}）`
                        : lineReachable
                          ? `全体の${Math.round(share * 100)}% · ${shareText}に未達（あと ${money(status.needed)}、または他を減らす）`
                          : `全体の${Math.round(share * 100)}% · 他の施策を減らさないと${shareText}に届かない`}
                </Badge>
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

"use client";

import { useMemo } from "react";
import { ChannelBudgetRow } from "@/components/game/ChannelBudgetRow";
import { MarketingRoiCard } from "@/components/game/MarketingRoiCard";
import { useGame } from "@/components/game/GameProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  BUDGET_STEP,
  MAX_TRUST_GAIN_PER_TURN,
  emptyPlan,
  evenSplit,
  marketingChannels,
  simulateMarketing,
} from "@/lib/marketing";
import { backingStatus, channelShare } from "@/lib/synergy";
import type { MarketingChannelId } from "@/lib/types";

/** 「均等配分」プリセットで使う、利用可能資金に対する比率 */
const PRESET_RATIO = 0.3;

export default function MarketingBudgetPage() {
  const {
    state,
    modeConfig,
    isFinalTurn,
    isPlanLocked,
    hasProposalThisTurn,
    updateMarketingPlan,
    commitMarketingPlan,
    skipMarketing,
    debt,
    nextInterest,
  } = useGame();
  const { money } = useMoney();

  const plan = state.marketingPlan;
  const outcome = useMemo(() => simulateMarketing(plan), [plan]);
  const statuses = useMemo(() => {
    const rule = {
      minShare: modeConfig.minSynergyShare,
      minSpend: modeConfig.minSynergySpend,
    };
    return Object.fromEntries(
      marketingChannels.map((c) => [c.id, backingStatus(plan, c.id, rule)]),
    ) as Record<MarketingChannelId, ReturnType<typeof backingStatus>>;
  }, [plan, modeConfig]);
  // 訴求ラインに届いている施策がひとつもない（このままではどの提案も受注できない）
  const noBacking = !marketingChannels.some((c) => statuses[c.id].qualifies);
  const ruleText = `配分全体の4分の1（${Math.round(
    modeConfig.minSynergyShare * 100,
  )}%）以上${
    modeConfig.minSynergySpend > 0
      ? `かつ ${money(modeConfig.minSynergySpend)} 以上`
      : ""
  }`;

  const budget = Math.max(0, state.availableFunds);
  const remaining = state.availableFunds - outcome.spend;
  const overBudget = remaining < 0;
  const usageRatio =
    budget > 0 ? Math.min(100, (outcome.spend / budget) * 100) : 0;
  // $0（投資見送り）でも確定できる。資金が尽きかけていても必ずターンを進められるようにするため
  const canCommit = !overBudget && !state.marketingCommitted && !isPlanLocked;
  // 最小刻み（$10,000）すら配分できない資金状態
  const cannotAfford = state.availableFunds < BUDGET_STEP;

  const setAmount = (id: MarketingChannelId, amount: number) =>
    updateMarketingPlan({ ...plan, [id]: amount });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 予算サマリー */}
      <Card>
        <CardHeader
          title={`${state.turn}年目のマーケティング予算`}
          description="配分を確定すると、ターン終了時に資金から差し引かれます"
          icon={<Icon name="budget" className="h-5 w-5" />}
          action={
            state.marketingCommitted ? (
              <Badge tone="positive">
                <Icon name="check" className="h-3 w-3" />
                確定済み
              </Badge>
            ) : (
              <Badge tone="warning">
                <Icon name="alert" className="h-3 w-3" />
                未確定
              </Badge>
            )
          }
        />
        <CardBody>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                利用可能資金
              </p>
              <p className="tabular mt-1 text-xl leading-none font-bold text-navy-900">
                {money(state.availableFunds)}
              </p>
            </div>
            <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                配分合計
              </p>
              <p className="tabular mt-1 text-xl leading-none font-bold text-navy-900">
                {money(outcome.spend)}
              </p>
            </div>
            <div
              className={`rounded-lg border px-3.5 py-2.5 ${
                overBudget
                  ? "border-rose-200 bg-rose-50"
                  : "border-navy-200/70 bg-navy-50/60"
              }`}
            >
              <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                配分後の残額
              </p>
              <p
                className={`tabular mt-1 text-xl leading-none font-bold ${
                  overBudget ? "text-rose-600" : "text-navy-900"
                }`}
              >
                {money(remaining)}
              </p>
            </div>
          </div>

          {/* 使用率バー */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[11px] text-navy-400">
              <span>資金に対する投資比率</span>
              <span className="tabular">{Math.round(usageRatio)}%</span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-navy-200"
              role="progressbar"
              aria-valuenow={Math.round(usageRatio)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="資金に対する投資比率"
            >
              <div
                className={`h-full rounded-full ${overBudget ? "bg-rose-500" : "bg-navy-700"}`}
                style={{ width: `${usageRatio}%` }}
              />
            </div>
          </div>

          {overBudget ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              配分合計が利用可能資金を{money(Math.abs(remaining))}
              超えています。確定するには配分を減らしてください。
            </p>
          ) : null}

          {/* 緊急融資の利息・返済は予算の上限には含めず、判断はプレイヤーに任せる */}
          {debt > 0 && !state.gameCompleted ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {isFinalTurn
                ? `今年の締めで、緊急融資の利息 ${money(nextInterest)} と元本 ${money(debt)} を一括で支払います。返済後の資金がマイナスになると債務超過（D 評価）です。`
                : `次の決算で、緊急融資の利息 ${money(nextInterest)} が差し引かれます（借入残高 ${money(debt)}）。配分後の残額が少ないと、再び資金不足になるおそれがあります。`}
            </p>
          ) : null}

          {cannotAfford && !state.gameCompleted ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              利用可能資金が最小配分単位（{money(BUDGET_STEP)}
              ）に届かないため、今期は投資できません。「投資を見送る」で $0
              のまま確定し、ターンを進めてください。
            </p>
          ) : null}

          {hasProposalThisTurn && !state.gameCompleted ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-navy-50 px-3.5 py-2.5 text-[13px] text-navy-600">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
              今ターンはすでに船主へ提案したため、配分は確定内容で固定されています（提案の根拠になった配分を後から変えることはできません）。
            </p>
          ) : null}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* チャネル別配分 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="チャネル別の配分"
              description={`投資額は ${money(BUDGET_STEP)} 刻み。${ruleText}を投じた施策が、提案の裏付け（訴求ライン）になります。どの要求の裏付けになるかは、各施策の水色のタグを参考にしてください`}
              icon={<Icon name="megaphone" className="h-5 w-5" />}
              action={
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPlanLocked}
                    onClick={() =>
                      updateMarketingPlan(evenSplit(budget * PRESET_RATIO))
                    }
                    title={`資金の${PRESET_RATIO * 100}%を全チャネルへ均等配分します`}
                  >
                    均等配分
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPlanLocked}
                    onClick={() => updateMarketingPlan(emptyPlan())}
                  >
                    クリア
                  </Button>
                </div>
              }
            />
            <ul className="divide-y divide-navy-100">
              {marketingChannels.map((channel) => (
                <ChannelBudgetRow
                  key={channel.id}
                  channel={channel}
                  amount={plan[channel.id]}
                  effect={outcome.byChannel[channel.id]}
                  share={channelShare(plan, channel.id)}
                  status={statuses[channel.id]}
                  minSpend={modeConfig.minSynergySpend}
                  disabled={isPlanLocked}
                  onChange={(amount) => setAmount(channel.id, amount)}
                />
              ))}
            </ul>
          </Card>
        </div>

        {/* シミュレーション結果 */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Card>
            <CardHeader
              title="効果シミュレーション"
              description="この配分で見込まれる成果"
              icon={<Icon name="research" className="h-5 w-5" />}
            />
            <CardBody>
              <div className="rounded-lg bg-navy-900 px-4 py-3.5 text-white">
                <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                  見込み引き合い件数
                </p>
                <p className="tabular mt-1 flex items-baseline gap-1.5 text-3xl leading-none font-bold">
                  {outcome.leads}
                  <span className="text-sm font-medium text-navy-300">件</span>
                </p>
              </div>

              <dl className="mt-3 divide-y divide-navy-100">
                <div className="flex items-baseline justify-between py-2">
                  <dt className="text-[13px] text-navy-500">信頼度への寄与</dt>
                  <dd className="tabular text-sm font-bold text-emerald-600">
                    +{outcome.trustDelta}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-2">
                  <dt className="text-[13px] text-navy-500">1件あたりコスト</dt>
                  <dd className="tabular text-sm font-bold text-navy-900">
                    {outcome.costPerLead !== null
                      ? money(outcome.costPerLead)
                      : "—"}
                  </dd>
                </div>
              </dl>

              {outcome.trustDelta >= MAX_TRUST_GAIN_PER_TURN ? (
                <p className="mt-1 text-[11px] text-navy-400">
                  ※ マーケティングによる信頼度の上昇は 1ターンあたり +
                  {MAX_TRUST_GAIN_PER_TURN} が上限です。
                </p>
              ) : null}

              {/* チャネル別の内訳 */}
              {outcome.spend > 0 ? (
                <>
                  <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
                    配分内訳
                  </p>
                  <ul className="mt-2 space-y-2">
                    {marketingChannels
                      .filter((channel) => plan[channel.id] > 0)
                      .map((channel) => {
                        const share = (plan[channel.id] / outcome.spend) * 100;
                        return (
                          <li key={channel.id}>
                            <div className="flex items-baseline justify-between gap-2 text-[12px]">
                              <span className="truncate text-navy-600">
                                {channel.name}
                              </span>
                              <span className="tabular shrink-0 text-navy-400">
                                {Math.round(share)}% ·{" "}
                                {outcome.byChannel[channel.id].leads}件
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                              <div
                                className="h-full rounded-full bg-sea-500"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </>
              ) : null}
            </CardBody>

            {/* 確定 */}
            <div className="border-t border-navy-100 px-5 py-4">
              {/* 確定前に、どの提案も受注できない配分であることを知らせる（初見での失注確定を防ぐ） */}
              {noBacking && !state.marketingCommitted && !isPlanLocked ? (
                <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {outcome.spend === 0
                      ? "投資を見送ると、今年の提案はすべて受注できません。"
                      : "この配分では、どの提案も受注条件を満たせません。"}
                    少なくとも1つの施策に、{ruleText}の投資が必要です。
                    勝ち目のない要求は、提案画面で「辞退」を選べます。
                  </span>
                </p>
              ) : null}
              <Button
                size="lg"
                className="w-full"
                disabled={!canCommit}
                onClick={commitMarketingPlan}
              >
                {state.marketingCommitted ? (
                  <>
                    <Icon name="check" className="h-4 w-4" />
                    確定済み
                  </>
                ) : overBudget ? (
                  "予算超過"
                ) : outcome.spend === 0 ? (
                  "投資を見送って確定する（$0）"
                ) : (
                  "この配分で確定する"
                )}
              </Button>
              {!state.marketingCommitted &&
              outcome.spend > 0 &&
              !isPlanLocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={skipMarketing}
                >
                  今期は投資を見送る（$0で確定）
                </Button>
              ) : null}
              <p className="mt-2 text-[11px] leading-relaxed text-navy-400">
                {state.gameCompleted
                  ? "ゲームは終了しています。"
                  : state.marketingCommitted
                    ? isFinalTurn
                      ? "最終ターンの投資もターン終了時に資金から差し引かれ、最終評価に反映されます。"
                      : hasProposalThisTurn
                        ? "ターン終了時に実行されます。提案済みのため配分は変更できません。"
                        : "ターン終了時に実行されます。スライダーを動かすと未確定に戻ります。"
                    : "配分を確定すると、提案の作成とターン終了ができるようになります。"}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ROI レポート */}
      <MarketingRoiCard history={state.marketingHistory} />
    </div>
  );
}

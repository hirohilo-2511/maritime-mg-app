"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import { displayedPriorities, fitAxes } from "@/lib/customers";
import type { ProposalResolution } from "@/lib/game";
import { getChannel } from "@/lib/marketing";
import { synergyRuleFor } from "@/lib/modes";
import { evaluateSynergy, priorityRewardRate } from "@/lib/synergy";
import type { ShipownerRequest } from "@/lib/types";

/**
 * 船主要求 1 件に対する提案作成モーダル。
 * 重視される要素から訴求ポイントを選ばせ、今ターンの投資チャネルとの
 * シナジー（相性）で受注可否が劇的に決まる結果をその場で見せる。
 */
export function ProposalModal({
  request,
  onClose,
}: {
  request: ShipownerRequest;
  onClose: () => void;
}) {
  const { state, completeProposal, declineProposal, modeConfig } = useGame();
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const { money, moneySigned } = useMoney();
  // 重視順が分からない場合（実践編で未調査）は順不同で並べ、最初の選択肢からも第1優先を悟らせない
  const shown = displayedPriorities(state, request.owner, request.priorities);
  const [focus, setFocus] = useState<string>(shown.items[0] ?? "");
  const [result, setResult] = useState<ProposalResolution | null>(null);
  // 辞退は取り消せないため、もう一度確認する
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  // 予算配分は確定済みのため、各訴求ポイントに裏付けがあるかはこの時点で決まっている
  const backing = request.priorities.map((p) =>
    evaluateSynergy(p, request.priorities, state.marketingPlan, synergyRuleFor(state.mode)),
  );
  // 実践編では、提案前に勝ち負けが分かる表示は出さない
  const showBacking = modeConfig.showProposalBacking;
  const anyBacked = backing.some((b) => b.won);
  const selected = backing[request.priorities.indexOf(focus)];

  const handleDecline = () => {
    declineProposal(request.id);
    onClose();
  };
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    confirmRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    const resolution = completeProposal(request.id, focus);
    if (resolution) setResult(resolution);
    else onClose();
  };

  if (result) {
    const { outcome, synergy, trustDelta, revenue, researchBonus } = result;
    const won = outcome === "won";
    const axisLabel =
      fitAxes.find((a) => a.id === synergy.axis)?.label ?? synergy.axis;
    const requiredChannelName = getChannel(synergy.requiredChannel).name;
    const primary = synergy.priorityRank === 0;

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div
          className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="proposal-result-title"
          className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        >
          <div
            className={`px-6 py-7 text-center text-white ${
              won ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <Icon
              name={won ? "check" : "alert"}
              className="mx-auto h-9 w-9"
            />
            <h2 id="proposal-result-title" className="mt-2 text-xl font-bold">
              {won
                ? primary
                  ? "第1優先を射抜いた！満額受注"
                  : `受注（第${synergy.priorityRank + 1}優先への訴求）`
                : synergy.reason === "underinvested"
                  ? "投資不足：提案の裏付けが弱い"
                  : "裏付け不足：対応する施策への配分が薄い"}
            </h2>
            <p className="mt-1 text-sm text-white/90">{request.owner}</p>
          </div>

          <div className="px-6 py-5">
            {won ? (
              <div className="space-y-2 text-[13px] leading-relaxed text-navy-700">
                <p>
                  訴求ポイント「{focus}」（{axisLabel}
                  ）には
                  <span className="font-bold text-navy-900">
                    {requiredChannelName}
                  </span>
                  への投資が効きます。配分全体の{" "}
                  <span className="tabular font-bold text-navy-900">
                    {pct(synergy.requiredChannelShare)}
                  </span>
                  （条件は4分の1以上）という裏付けがあったため、
                  {request.owner} は発注を決定しました。
                </p>
                {!primary ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    ただし {request.owner} が最も重視していたのは「
                    {request.priorities[0]}」でした。第
                    {synergy.priorityRank + 1}
                    優先への訴求だったため、受注額は想定予算の
                    {pct(synergy.rewardRate)}（{money(revenue)}
                    ）に留まりました。
                  </p>
                ) : null}
                {researchBonus > 0 ? (
                  <p className="rounded-lg bg-sea-500/10 px-3 py-2 text-[12px] text-sea-600">
                    市場調査で {request.owner}{" "}
                    の事情を理解していたことが伝わり、信頼度が +{researchBonus}{" "}
                    上乗せされました。
                  </p>
                ) : null}
              </div>
            ) : synergy.reason === "underinvested" ? (
              <p className="text-[13px] leading-relaxed text-navy-700">
                訴求ポイント「{focus}」（{axisLabel}）と
                <span className="font-bold text-navy-900">
                  {requiredChannelName}
                </span>
                への投資の狙いは合っていましたが、投資額
                <span className="tabular font-bold text-navy-900">
                  {money(synergy.requiredChannelSpend)}
                </span>
                は{modeConfig.label}の受注条件
                <span className="tabular font-bold text-navy-900">
                  {money(synergy.minSpend)}
                </span>
                に届きませんでした。あと {money(synergy.shortfall)}{" "}
                投じていれば受注できました。本気度の伝わらない提案では、厳しい船主は動きません。
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed text-navy-700">
                訴求ポイント「{focus}」（{axisLabel}
                ）の裏付けになるのは
                <span className="font-bold text-navy-900">
                  {requiredChannelName}
                </span>
                への投資ですが、配分全体に占める割合は{" "}
                <span className="tabular font-bold text-navy-900">
                  {pct(synergy.requiredChannelShare)}
                </span>
                で、受注条件の4分の1（{pct(synergy.minShare)}）に届きませんでした
                {synergy.requiredChannelSpend > 0
                  ? "。"
                  : "（今ターンは未配分）。"}
                あと {money(synergy.shortfall)}{" "}
                を配分していれば受注できました。
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                  受注インパクト
                </p>
                <p
                  className={`tabular mt-1 text-lg leading-none font-bold ${
                    won ? "text-emerald-600" : "text-navy-400"
                  }`}
                >
                  {won ? moneySigned(revenue) : money(0)}
                </p>
              </div>
              <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold tracking-widest text-navy-400">
                  信頼度スコア
                </p>
                <p
                  className={`tabular mt-1 text-lg leading-none font-bold ${
                    won ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {trustDelta > 0 ? `+${trustDelta}` : trustDelta}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-navy-100 px-6 py-4">
            <Button size="lg" className="w-full" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="bg-navy-900 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            PROPOSAL
          </p>
          <h2 id="proposal-modal-title" className="mt-1 text-xl font-bold">
            {request.owner} への提案
          </h2>
          <p className="mt-1 text-sm text-navy-300">{request.vesselType}</p>
        </div>

        <div className="px-6 py-4">
          <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-navy-600">
            {request.requirement}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="tabular text-[13px] font-bold text-navy-900">
              {money(request.budget)}
            </span>
            <span className="text-[11px] text-navy-400">想定予算</span>
          </div>

          <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
            提案の訴求ポイント
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-navy-500">
            重視される要素のうち、最も強く訴求するポイントを選んでください。
            裏付けになる施策へ、今年の配分全体の4分の1（
            {pct(modeConfig.minSynergyShare)}）以上を投じていれば受注できます。
            {shown.ordered
              ? "上にある要素ほど船主が重視しており、第1優先に応えると満額、それ以外は受注額が目減りします。"
              : "この船主の重視順はまだ分かりません（順不同で表示）。第1優先に応えると満額、それ以外は受注額が目減りします。関係する市場調査を買うと重視順が分かります。"}
          </p>
          {modeConfig.minSynergySpend > 0 && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {modeConfig.label}：対応チャネルへの投資が
              {money(modeConfig.minSynergySpend)}
              未満の場合、配分全体の4分の1を超えていても失注します（失注時の信頼度{" "}
              {modeConfig.loseTrustDelta}）。
            </p>
          )}
          {showBacking && !anyBacked ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              今年の配分では、この船主のどの重視項目にも裏付けがありません。無理に提案すると失注（信頼度{" "}
              {modeConfig.loseTrustDelta}）、今期は辞退すれば信頼度{" "}
              {modeConfig.declineTrustDelta} で済みます。
            </p>
          ) : null}
          <div className="mt-2.5 space-y-2">
            {shown.items.map((p) => {
              const rank = request.priorities.indexOf(p);
              return (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                  focus === p
                    ? "border-navy-800 bg-navy-50"
                    : "border-navy-200/70 hover:bg-navy-50/60"
                }`}
              >
                <input
                  type="radio"
                  name="proposal-focus"
                  value={p}
                  checked={focus === p}
                  onChange={() => setFocus(p)}
                  className="h-4 w-4 accent-navy-800"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-navy-800">{p}</span>
                  {showBacking ? (
                    <span
                      className={`block text-[11px] ${
                        backing[rank].won ? "text-emerald-600" : "text-navy-400"
                      }`}
                    >
                      裏付け：{getChannel(backing[rank].requiredChannel).name}
                      {backing[rank].won ? "（到達）" : "（不足）"}
                    </span>
                  ) : null}
                </span>
                {shown.ordered ? (
                  <Badge
                    tone={rank === 0 ? "info" : "neutral"}
                    className="ml-auto"
                  >
                    第{rank + 1}優先 · 受注額{" "}
                    {pct(priorityRewardRate(rank))}
                  </Badge>
                ) : (
                  <Badge className="ml-auto">重視順は不明</Badge>
                )}
              </label>
              );
            })}
          </div>
        </div>

        {confirmingDecline ? (
          <div className="border-t border-navy-100 bg-amber-50 px-6 py-4">
            <p className="text-[13px] leading-relaxed text-amber-800">
              {request.owner} への提案を今期は辞退します。受注はできず、信頼度{" "}
              {modeConfig.declineTrustDelta}・関係性が少し下がります（失注の{" "}
              {modeConfig.loseTrustDelta}、未回答の {modeConfig.ignoreTrustDelta}{" "}
              より傷は浅く済みます）。よろしいですか？
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmingDecline(false)}
              >
                戻る
              </Button>
              <Button className="flex-1" onClick={handleDecline}>
                辞退を確定する
              </Button>
            </div>
          </div>
        ) : null}

        {showBacking && !confirmingDecline && selected && !selected.won ? (
          <p className="mx-6 mb-3 text-[11px] leading-relaxed text-rose-600">
            この訴求は裏付けが足りないため失注します（信頼度{" "}
            {modeConfig.loseTrustDelta}）。勝ち目がなければ「辞退」も選べます。
          </p>
        ) : null}

        <div
          className={`flex flex-wrap gap-3 border-t border-navy-100 px-6 py-4 ${
            confirmingDecline ? "hidden" : ""
          }`}
        >
          <Button variant="secondary" size="lg" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setConfirmingDecline(true)}
          >
            今期は辞退する
          </Button>
          <Button
            ref={confirmRef}
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!focus}
          >
            この内容で提案を確定する
            <Icon name="check" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

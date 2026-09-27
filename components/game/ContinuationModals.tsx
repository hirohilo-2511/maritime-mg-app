"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import {
  capacityCap,
  companySizeInfo,
  costCutVoices,
  overflowOf,
  overflowOptions,
  overseasCost,
  overseasOptions,
  recoveryNotice,
  repairOptions,
  shareOfBase,
} from "@/lib/continuation";
import type {
  OverflowChoice,
  OverseasChoice,
  RepairChoice,
} from "@/lib/types";

/** 継続プレイの判断用モーダルの外枠（閉じるボタンはなく、選ぶまで進めない） */
function DecisionFrame({
  eyebrow,
  title,
  lead,
  tone = "navy",
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  tone?: "navy" | "rose" | "amber";
  children: ReactNode;
  footer: ReactNode;
}) {
  const header =
    tone === "rose"
      ? "bg-rose-700"
      : tone === "amber"
        ? "bg-amber-600"
        : "bg-navy-900";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="continuation-decision-title"
        className="relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className={`${header} px-6 py-5 text-white`}>
          <p className="text-[10px] font-semibold tracking-widest text-white/70">
            {eyebrow}
          </p>
          <h2 id="continuation-decision-title" className="mt-1 text-xl font-bold">
            {title}
          </h2>
          <div className="mt-1.5 text-sm leading-relaxed text-white/90">{lead}</div>
        </div>
        <div className="space-y-5 px-6 py-5">{children}</div>
        <div className="border-t border-navy-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

/** 選択肢 1 つ（ラジオボタン風のカード） */
function OptionCard({
  selected,
  disabled = false,
  onSelect,
  title,
  badge,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-navy-800 bg-navy-50 ring-1 ring-navy-800"
          : "border-navy-200/80 hover:bg-navy-50/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
              selected ? "border-navy-800 bg-navy-800" : "border-navy-300"
            }`}
            aria-hidden
          >
            {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
          </span>
          {title}
        </span>
        {badge}
      </div>
      <div className="mt-1.5 pl-6 text-[12px] leading-relaxed text-navy-600">
        {children}
      </div>
    </button>
  );
}

/** 6年目：危機発生と、年初の2つの判断 */
function CrisisDecision() {
  const { state, chooseRepair, chooseCostCut } = useGame();
  const { money } = useMoney();
  const cont = state.continuation!;
  const [repair, setRepair] = useState<RepairChoice | null>(cont.repair);
  const [cut, setCut] = useState<boolean | null>(cont.costCut);
  const size = companySizeInfo[cont.size];

  const confirm = () => {
    if (repair && cont.repair === null) chooseRepair(repair);
    if (cut !== null && cont.costCut === null) chooseCostCut(cut);
  };

  return (
    <DecisionFrame
      eyebrow="6年目 — 二重の危機"
      tone="rose"
      title="主力工場が止まり、舶用市場は大不況に"
      lead={
        <>
          年の初めに主力工場の主要設備が故障し、<b>4か月の操業停止</b>
          。同じ時期に舶用市場が<b>大不況</b>
          に入りました。取引先や市場の不安から、信頼度が {Math.abs(size.crisisTrustDelta)}{" "}
          下がっています。
        </>
      }
      footer={
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            disabled={repair === null || cut === null}
            onClick={confirm}
          >
            この判断で6年目を始める
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-navy-400">
            決めた内容は変えられません。修理の費用はすぐに資金から支払います。
          </p>
        </div>
      }
    >
      {/* 会社の状況 */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            基準資金（6年目の開始時）
          </p>
          <p className="tabular mt-1 text-lg font-bold text-navy-900">
            {money(cont.baseFunds)}
          </p>
        </div>
        <div className="rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5 sm:col-span-2">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            企業規模
          </p>
          <p className="mt-1 text-sm font-bold text-navy-900">
            あなたの会社は【{size.label}】です
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-navy-500">
            規模のメリット：固定費は基準資金の {Math.round(size.fixedCostRate * 100)}%
            {size.loanRateDiscount > 0
              ? `／危機のときに信頼を失いにくい（${size.crisisTrustDelta}）／融資の金利 −${Math.round(size.loanRateDiscount * 100)}ポイント`
              : "（大手ほど固定費の割合が小さく、危機で信頼を失いにくく、融資の金利も低くなります）"}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 rounded-lg bg-rose-50 px-4 py-3 text-[12px] leading-relaxed text-rose-800">
        <li>・この年の生産能力は3分の2。本業の売上は市況指数 60% と合わせて大きく落ちます（固定費は減りません）。</li>
        <li>
          ・この年に受けられる注文は合計 {money(capacityCap(cont))} まで。超えた分は、年末に扱いを決めます。
        </li>
        <li>・競合の値下げで、受注に必要な配分が「全体の3分の1以上」に上がります（6〜8年目）。</li>
        <li>
          ・不況の間（6〜8年目）は、営業訪問に {money(50_000)}{" "}
          以上投じないと、すべての既存船主との関係性が毎年 5 下がります。
        </li>
      </ul>

      <section>
        <h3 className="text-sm font-bold text-navy-900">判断①　工場をどう直すか</h3>
        <div className="mt-2 grid gap-2">
          {(Object.keys(repairOptions) as RepairChoice[]).map((id) => (
            <OptionCard
              key={id}
              selected={repair === id}
              onSelect={() => setRepair(id)}
              title={repairOptions[id].label}
              badge={
                <Badge tone="warning">
                  費用 {money(shareOfBase(cont, repairOptions[id].costRate))}
                </Badge>
              }
            >
              {repairOptions[id].summary}
            </OptionCard>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-navy-900">判断②　経費を削るか</h3>
        <div className="mt-2 grid gap-2">
          <OptionCard
            selected={cut === false}
            onSelect={() => setCut(false)}
            title="削らない"
          >
            固定費はそのまま。人員と体制を保ちます。
          </OptionCard>
          <OptionCard
            selected={cut === true}
            onSelect={() => setCut(true)}
            title="経費を削る（出張・採用・保守人員を絞る）"
            badge={<Badge tone="positive">6〜8年目の固定費 −15%</Badge>}
          >
            【経費を削る】6〜8年目の固定費が15%減ります。ただし、保守・サービスの担当者も減らすことになります。景気が戻ったときに、顧客対応が追いつかなくなるおそれがあります。
          </OptionCard>
        </div>
      </section>
    </DecisionFrame>
  );
}

/** 7年目：海外進出先の選択 */
function OverseasDecision() {
  const { state, chooseOverseas } = useGame();
  const { money } = useMoney();
  const cont = state.continuation!;
  const [choice, setChoice] = useState<OverseasChoice | null>(null);
  const order: OverseasChoice[] = ["india", "vietnam", "china", "none"];

  return (
    <DecisionFrame
      eyebrow="7年目 — 不況の底"
      title="海外に活路を求めるか"
      lead={
        <>
          不況が続き、国内と既存の船主だけでは受注が足りません。進出先を1つ選んでください（あとから変えられません）。進出すると、施策に「現地パートナー」が加わり、進出先の案件は現地パートナーに{" "}
          {money(100_000)} 以上投じていないと受注できません。
        </>
      }
      footer={
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            disabled={choice === null}
            onClick={() => choice && chooseOverseas(choice)}
          >
            {choice === null
              ? "進出先を選んでください"
              : choice === "none"
                ? "進出せずに7年目を始める"
                : `${overseasOptions[choice].label}に進出して7年目を始める`}
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
          <p className="text-center text-[11px] text-navy-400">
            進出の費用はすぐに資金から支払います（利用可能資金 {money(state.availableFunds)}）。
          </p>
        </div>
      }
    >
      <div className="grid gap-2">
        {order.map((id) => {
          const option = overseasOptions[id];
          const cost = overseasCost(cont, id);
          const short = cost > state.availableFunds;
          return (
            <OptionCard
              key={id}
              selected={choice === id}
              disabled={short}
              onSelect={() => setChoice(id)}
              title={`${option.label}：${option.tagline}`}
              badge={
                <Badge tone={cost > 0 ? "warning" : "neutral"}>
                  {cost > 0 ? `費用 ${money(cost)}` : "費用なし"}
                </Badge>
              }
            >
              <ul className="space-y-0.5">
                {option.points.map((p) => (
                  <li key={p}>・{p}</li>
                ))}
              </ul>
              {short ? (
                <p className="mt-1 font-semibold text-rose-600">
                  資金が足りないため選べません。
                </p>
              ) : null}
            </OptionCard>
          );
        })}
      </div>
    </DecisionFrame>
  );
}

/** 9年目の年初：回復期の優先案件のお知らせ */
function RecoveryNoticeModal() {
  const { state, dismissNotice } = useGame();
  const { money } = useMoney();
  const notice = recoveryNotice(state);
  if (!notice) return null;
  const blocked = notice.blockedByCostCut;

  return (
    <DecisionFrame
      eyebrow="9年目 — 回復"
      tone={blocked ? "amber" : "navy"}
      title={
        blocked
          ? "回復期の優先案件は届きませんでした"
          : notice.delivered.length > 0
            ? `${notice.delivered.length}社から回復期の優先案件が届きました`
            : "回復期の優先案件は届きませんでした"
      }
      lead="景気が戻り、船主各社が発注を再開しました。"
      footer={
        <Button size="lg" className="w-full" onClick={() => dismissNotice(9)}>
          9年目を始める
          <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      }
    >
      {blocked ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-navy-700">
          <p>
            しかし、6年目の経費削減で保守・サービスの担当者を減らしたことは、船主の間で知られていました。「発注しても、故障したときにすぐ来てもらえるのか」という不安から、関係の深い船主も今回は他社に声をかけています。
          </p>
          {notice.voiceOwner && costCutVoices[notice.voiceOwner] ? (
            <p className="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3.5 py-2.5 text-amber-900">
              {costCutVoices[notice.voiceOwner]}
            </p>
          ) : null}
          {notice.missedOwners.length > 0 ? (
            <p className="text-[12px] text-navy-500">
              ※ 経費を削っていなければ、関係性70以上の {notice.missedOwners.length}
              社から優先案件（合計 {money(notice.missedAmount)}）が届いていました。
            </p>
          ) : (
            <p className="text-[12px] text-navy-500">
              ※ 関係性70以上を保てた既存船主はいなかったため、経費を削っていなくても優先案件は届きませんでした。
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-[13px] leading-relaxed text-navy-700">
          {notice.delivered.length > 0 ? (
            <p>
              不況の間も関係を保ってきた{" "}
              <b>{notice.delivered.join("・")}</b>{" "}
              から、優先して声がかかりました。ダッシュボードの「回復期の優先案件」に提案できます（回答しなくてもペナルティはありません）。
            </p>
          ) : (
            <p>
              関係性70以上を保てた既存船主がいなかったため、優先して声をかけてくれる相手はいませんでした。
            </p>
          )}
        </div>
      )}
      {notice.belowOwners.length > 0 ? (
        <p className="text-[12px] leading-relaxed text-navy-500">
          関係性が70に届かなかった {notice.belowOwners.join("・")}{" "}
          からは、優先案件は届きませんでした。
        </p>
      ) : null}
    </DecisionFrame>
  );
}

/** 6年目の年末：生産能力の枠を超えた受注の扱い */
function OverflowDecision() {
  const { state, chooseOverflow, cancelOverflow } = useGame();
  const { money } = useMoney();
  const cont = state.continuation!;
  const { amount, owners } = overflowOf(state);
  const [choice, setChoice] = useState<OverflowChoice | null>(null);

  return (
    <DecisionFrame
      eyebrow="6年目の年末 — 判断③"
      tone="amber"
      title={`作りきれない注文が ${money(amount)} あります`}
      lead={
        <>
          工場の停止で、この年に作れるのは受注額 {money(capacityCap(cont))}{" "}
          分までです。{owners.join("・")} から受けた注文のうち、枠を超えた分をどうするか決めてから、6年目を締めます。
        </>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="lg" onClick={cancelOverflow}>
            戻る
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={choice === null}
            onClick={() => choice && chooseOverflow(choice)}
          >
            この扱いで6年目を締める
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-2">
        {(Object.keys(overflowOptions) as OverflowChoice[]).map((id) => (
          <OptionCard
            key={id}
            selected={choice === id}
            onSelect={() => setChoice(id)}
            title={overflowOptions[id].label}
          >
            {overflowOptions[id].summary}
          </OptionCard>
        ))}
      </div>
    </DecisionFrame>
  );
}

/** 継続プレイの判断・お知らせ（該当するときだけ表示） */
export function ContinuationModals() {
  const { state, decision, overflowPrompt, turnResult } = useGame();
  if (!state.continuation) return null;
  if (overflowPrompt) return <OverflowDecision />;
  // 決算の結果を確認してから、次の年の判断に進む
  if (turnResult) return null;
  if (decision === "crisis") return <CrisisDecision />;
  if (decision === "overseas") return <OverseasDecision />;
  if (decision === "recoveryNotice") return <RecoveryNoticeModal />;
  return null;
}

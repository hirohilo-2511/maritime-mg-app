import { ASSUMED_GROSS_MARGIN } from "./b2bMetrics";
import { getChannel } from "./marketing";
import { DISTRESSED_LOAN_RATE } from "./modes";
import {
  RELATIONSHIP_KEEP_SPEND,
  baseRevenue,
  fixedCost,
  loanConfigFor,
  overseasOptions,
  recoveryNotice,
  repairOptions,
  scenarioTurn,
  synergyRuleAt,
} from "./continuation";
import { planAmount } from "./marketing";
import {
  additionalSpendNeeded,
  channelForPriority,
  priorityRewardRate,
  shareLabel,
} from "./synergy";
import { findExtraRequest } from "./extraRequests";
import type { GameState, MarketingPlan, ProposalRecord } from "./types";

/**
 * 実践編の最終レポートに載せる「年次レビュー」。
 * 年ごとの締めの記録（turnLog）と提案の記録（proposalLog）から、
 * その年に何が効き、何を取りこぼしたのかを具体的な金額つきで説明する。
 */

export type YearVerdict = "excellent" | "good" | "mixed" | "poor";

export type YearReview = {
  turn: number;
  verdict: YearVerdict;
  verdictLabel: string;
  fundsStart: number;
  fundsEnd: number;
  trustStart: number;
  trustEnd: number;
  /** マーケティング + 市場調査 */
  investment: number;
  wonRevenue: number;
  /** その年に届いた要求の想定予算の合計（すべて第1優先で満額受注した場合の上限） */
  potentialRevenue: number;
  /** 取りこぼした額（上限 − 受注額） */
  opportunityLoss: number;
  /** 粗利ベースの ROI（投資 0 の年は null） */
  roi: number | null;
  /** 良かった点 */
  goods: string[];
  /** 改善すべき点（機会損失・効果の薄い投資など） */
  bads: string[];
  /** 教育的な注記（高金利での借入など） */
  notes: string[];
  /** この年の締めで緊急融資を受けたか */
  borrowed: boolean;
  bankrupt: boolean;
};

const usd = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
/** 金利の表示（0.1% 単位） */
const ratePct = (v: number) => `${Math.round(v * 1000) / 10}%`;

const verdictLabels: Record<YearVerdict, string> = {
  excellent: "好調",
  good: "おおむね良好",
  mixed: "課題あり",
  poor: "要改善",
};

/** その年に実行された配分（記録がなければ空） */
function planOf(state: GameState, turn: number): MarketingPlan | null {
  return state.marketingHistory.find((h) => h.turn === turn)?.plan ?? null;
}

/** 失注・目減りした提案の「こうすれば満額だった」説明 */
function describeMiss(
  p: ProposalRecord,
  primary: string,
  plan: MarketingPlan | null,
  state: GameState,
): string {
  const primaryChannel = channelForPriority(primary);
  const primaryName = getChannel(primaryChannel).name;
  const rule = synergyRuleAt(state, p.turn);
  const needed = plan
    ? additionalSpendNeeded(
        plan,
        primaryChannel,
        rule.channelMinShare?.[primaryChannel] ?? rule.minShare,
        rule.minSpend,
      )
    : 0;
  const route =
    needed > 0
      ? `第1優先「${primary}」の裏付けになる${primaryName}へあと${usd(needed)}配分していれば`
      : `第1優先「${primary}」で訴求していれば`;
  return `${route}、満額${usd(p.requestBudget)}の受注を狙えました。`;
}

export function buildYearlyReview(state: GameState, fromTurn = 1): YearReview[] {
  return state.turnLog.filter((log) => log.turn >= fromTurn).map((log) => {
    const turn = log.turn;
    // 本案件（と別枠の要求）に、その年に届いた追加案件を加える
    const data = scenarioTurn(state, turn);
    const requests = [
      ...data.requests,
      ...(data.sideRequests ?? []),
      ...(log.extraRequestIds ?? []).flatMap((id) => {
        const found = findExtraRequest(state, id);
        return found ? [found.request] : [];
      }),
    ];
    const proposals = state.proposalLog.filter((p) => p.turn === turn);
    const plan = planOf(state, turn);
    const goods: string[] = [];
    const bads: string[] = [];

    for (const req of requests) {
      const p = proposals.find((x) => x.requestId === req.id);
      const primary = req.priorities[0];

      if (!p && state.dealOutcomes[req.id] === "declined" && req.declineOnly) {
        bads.push(
          `${req.owner}（想定予算 ${usd(req.budget)}）の海外造船所向けの要求は、現地に拠点がないため辞退するしかありませんでした。`,
        );
        continue;
      }
      if (!p && state.dealOutcomes[req.id] === "declined") {
        const channelName = getChannel(channelForPriority(primary)).name;
        bads.push(
          `${req.owner}（想定予算 ${usd(req.budget)}）は、裏付けとなる投資がなく提案を辞退しました。無理な提案で信用を落とすことは避けられましたが、第1優先「${primary}」の裏付けになる${channelName}へ配分していれば受注を狙えました。`,
        );
        continue;
      }
      if (!p && req.extra) {
        bads.push(
          `${req.owner}からの追加案件（想定予算 ${usd(req.budget)}）に回答しないまま、期限が切れました。前年の引き合いから生まれた商談機会を活かせていません。`,
        );
        continue;
      }
      if (!p) {
        bads.push(
          `${req.owner}（想定予算 ${usd(req.budget)}）の要求に回答しませんでした。案件をまるごと逃したうえ、信頼度と関係性も低下しています。`,
        );
        continue;
      }

      const channelName = getChannel(p.requiredChannel).name;
      if (p.won && p.priorityRank === 0) {
        goods.push(
          `${req.extra ? `${req.owner}（追加案件）` : req.owner}：第1優先「${p.focusPriority}」に${channelName}（配分全体の${pct(
            p.channelShare,
          )}）で応え、満額${usd(p.revenue)}を受注しました。`,
        );
      } else if (p.won) {
        const lost = p.requestBudget - p.revenue;
        bads.push(
          `${req.extra ? `${req.owner}（追加案件）` : req.owner}：第${p.priorityRank + 1}優先「${p.focusPriority}」での受注となり、受注額は${pct(
            priorityRewardRate(p.priorityRank),
          )}（${usd(lost)}の取りこぼし）。${describeMiss(p, primary, plan, state)}`,
        );
      } else {
        const rule = synergyRuleAt(state, turn);
        const why =
          p.reason === "noPartner"
            ? "現地パートナーへの投資が足りず"
            : p.reason === "underinvested"
              ? `${channelName}への投資${usd(p.channelSpend)}が最低条件${usd(
                  rule.minSpend,
                )}に届かず`
              : `${channelName}が配分全体の${pct(p.channelShare)}で、条件の${shareLabel(
                  rule.channelMinShare?.[p.requiredChannel] ?? rule.minShare,
                )}（${pct(rule.channelMinShare?.[p.requiredChannel] ?? rule.minShare)}）に届かず`;
        bads.push(
          `${req.extra ? `${req.owner}（追加案件）` : req.owner}：「${p.focusPriority}」で提案したものの、${why}失注しました（あと${usd(
            p.shortfall,
          )}で受注できた計算です）。`,
        );
      }
    }

    // どの受注の裏付けにもならなかった投資
    if (plan && log.marketingSpend > 0) {
      const used = new Set<keyof MarketingPlan>(
        proposals.filter((p) => p.won).map((p) => p.requiredChannel),
      );
      // 継続プレイ：不況の年の営業訪問は関係維持に、現地パートナーは進出先の受注に使われている
      if (state.continuation && turn >= 6) {
        if (turn <= 8 && planAmount(plan, "fieldSales") >= RELATIONSHIP_KEEP_SPEND) {
          used.add("fieldSales");
        }
        const partnerWin = proposals.some(
          (p) => p.won && requests.find((r) => r.id === p.requestId)?.requiresLocalPartner,
        );
        if (partnerWin) used.add("localPartner");
      }
      const idle = (Object.keys(plan) as (keyof MarketingPlan)[]).filter(
        (id) => plan[id] > 0 && !used.has(id),
      );
      if (idle.length > 0) {
        const total = idle.reduce((sum, id) => sum + plan[id], 0);
        bads.push(
          `${idle.map((id) => getChannel(id).name).join("・")}への計${usd(
            total,
          )}は、どの受注の裏付けにもなりませんでした（信頼度・引き合いへの効果のみ）。`,
        );
      }
    } else if (log.marketingSpend === 0 && requests.length > 0) {
      bads.push("マーケティング投資を見送ったため、提案に裏付けを持たせられませんでした。");
    }

    // 継続プレイの年：危機への判断・進出先・関係維持の振り返り
    const cont = state.continuation;
    if (cont && turn >= 6) {
      const lines = continuationLines(state, turn, plan);
      goods.push(...lines.goods);
      bads.push(...lines.bads);
    }

    const investment = log.marketingSpend + log.researchSpend;
    const roi =
      investment > 0
        ? (log.wonRevenue * ASSUMED_GROSS_MARGIN - investment) / investment
        : null;
    if (roi !== null && roi >= 1) {
      goods.push(
        `投資${usd(investment)}に対し粗利ベースの ROI は${pct(roi)}。少ない投資で大きな受注につなげた効率の良い年でした。`,
      );
    } else if (roi !== null && roi < 0) {
      bads.push(
        `投資${usd(investment)}に対し受注の粗利が下回り、ROI は${pct(roi)}でした。`,
      );
    }
    if (log.researchSpend > 0) {
      if (log.wonRevenue > 0 && !log.bankrupt) {
        goods.push(
          `市場調査に${usd(log.researchSpend)}を投じ、判断材料を補強しました。`,
        );
      } else {
        bads.push(
          `市場調査に${usd(log.researchSpend)}を投じましたが、この年の受注には結びつかず、手元資金を圧迫しました。`,
        );
      }
    }

    const notes: string[] = [];
    if (log.interestExpense > 0) {
      bads.push(
        `緊急融資の利息${usd(log.interestExpense)}を支払い、利益を圧迫しました。`,
      );
    }
    if (log.repayment > 0 && !log.bankrupt) {
      goods.push(`借入元本${usd(log.repayment)}を一括返済し、完済しました。`);
    }

    // 決算の不足を何で賄えなかったか（融資・倒産の説明に使う）
    const shortfallCause = `固定費${usd(log.settlementExpense)}・マーケティング${usd(
      log.marketingSpend,
    )}${log.interestExpense > 0 ? `・利息${usd(log.interestExpense)}` : ""}に対し、売上${usd(
      log.settlementRevenue,
    )}と受注${usd(log.wonRevenue)}で賄えませんでした`;

    if (log.loan) {
      const { loan } = log;
      bads.push(
        `この年の決算で${usd(loan.deficit)}の資金が不足し（${shortfallCause}）、${
          loan.number
        }回目の緊急融資${usd(loan.principal)}（うち運転資金${usd(
          loan.workingCapital,
        )}）を年利${ratePct(loan.rate)}で借り入れました${
          loan.penaltyRate > 0
            ? `（信頼度${loan.trustAtBorrow}による${ratePct(loan.baseRate)}に、2回目の上乗せ${ratePct(
                loan.penaltyRate,
              )}を加算）`
            : `（信頼度${loan.trustAtBorrow}による金利）`
        }。資金繰りの悪化で信頼度も${
          loanConfigFor(state).trustPenalty
        }下がっています。`,
      );
      if (loan.rate >= DISTRESSED_LOAN_RATE) {
        notes.push(
          `年利${ratePct(loan.rate)}での借入は、実質的に破綻状態での延命措置です。信用力が落ちた企業にはこれほどの高金利でしか資金が集まらず、利息の支払いがさらに経営を圧迫する悪循環に陥りやすくなります。`,
        );
      }
    } else if (log.bankrupt && log.repayment > 0) {
      bads.push(
        `最終年に借入元本${usd(log.repayment)}を返済した結果、資金が${usd(
          log.fundsEnd,
        )}となり、債務超過で終了しました。`,
      );
    } else if (log.bankrupt) {
      const decision =
        log.insolvency === "declined"
          ? "緊急融資を受けずに自主倒産を選びました"
          : log.insolvency === "denied"
            ? log.loanDenial === "countLimit"
              ? "緊急融資の回数上限に達しており、倒産しました"
              : "残りの借入枠で不足額を賄えず、倒産しました"
            : "倒産しました";
      bads.push(
        `この年の決算で資金が${usd(log.fundsEnd)}となり、${decision}（${shortfallCause}）。`,
      );
    }

    const potentialRevenue = requests.reduce((sum, r) => sum + r.budget, 0);
    const capture =
      potentialRevenue > 0 ? log.wonRevenue / potentialRevenue : 1;
    const verdict: YearVerdict =
      log.bankrupt || log.loan
      ? "poor"
      : capture >= 0.9
        ? "excellent"
        : capture >= 0.6
          ? "good"
          : capture >= 0.3
            ? "mixed"
            : "poor";

    return {
      turn,
      verdict,
      verdictLabel: verdictLabels[verdict],
      fundsStart: log.fundsStart,
      fundsEnd: log.fundsEnd,
      trustStart: log.trustStart,
      trustEnd: log.trustEnd,
      investment,
      wonRevenue: log.wonRevenue,
      potentialRevenue,
      opportunityLoss: Math.max(0, potentialRevenue - log.wonRevenue),
      roi,
      goods,
      bads,
      notes,
      borrowed: log.loan !== null,
      bankrupt: log.bankrupt,
    };
  });
}

/** 継続プレイの年ならではの振り返り（設計書 9-3） */
function continuationLines(
  state: GameState,
  turn: number,
  plan: MarketingPlan | null,
): { goods: string[]; bads: string[] } {
  const cont = state.continuation!;
  const goods: string[] = [];
  const bads: string[] = [];

  if (turn === 6) {
    if (cont.repair) {
      const cost = cont.specialSpend[6] ?? 0;
      (cont.repair === "renew" ? goods : bads).push(
        cont.repair === "renew"
          ? `工場は設備を新しくする判断をしました（${usd(cost)}）。7年目以降の生産能力が上がり、回復期の売上を底上げしました。`
          : `工場は応急修理で費用を${usd(cost)}に抑えました。${repairOptions.patch.summary}という代償があります。`,
      );
    }
    if (cont.costCut) {
      const saved = [6, 7, 8].reduce(
        (sum, t) => sum + fixedCost({ ...cont, costCut: false }, t) - fixedCost(cont, t),
        0,
      );
      const notice = recoveryNotice(state);
      const missed = notice?.missedAmount ?? 0;
      bads.push(
        `経費削減で、3年間の固定費を合計${usd(saved)}抑えました。一方で、サポート体制の縮小が船主に伝わり、9年目の優先案件（合計${usd(missed)}）を逃しました。${
          saved >= missed
            ? "今回は削減が資金を守る結果になりました。"
            : "目先の節約が、回復期の稼ぎを削る結果になりました。"
        }`,
      );
    }
    const overflow = cont.overflow;
    if (overflow) {
      if (overflow.choice === "delay") {
        goods.push(
          `生産能力を超えた受注${usd(overflow.amount)}は、正直に伝えて納期を延ばしてもらいました。信頼の傷を最小限に抑えています。`,
        );
      } else if (overflow.choice === "silent") {
        bads.push(
          `生産能力を超えた受注${usd(overflow.amount)}を黙って引き受けたため、7年目に${overflow.owners.join("・")}との関係性が15下がりました。`,
        );
      } else {
        bads.push(
          `生産能力を超えた受注${usd(overflow.amount)}は他社の工場に作ってもらい、受注額の4割を手放しました。`,
        );
      }
    }
  }

  if (turn === 7 && cont.overseas) {
    if (cont.overseas === "none") {
      const declined = [8, 9, 10].filter((t) => t <= state.turn).length;
      const lost = [9, 10]
        .filter((t) => t <= state.turn)
        .reduce(
          (sum, t) => sum + baseRevenue({ ...cont, overseas: "india" }, t) - baseRevenue(cont, t),
          0,
        );
      bads.push(
        `海外に進出しなかったため、進出費用はかからず、規制などのリスクもありませんでした。一方で、海外造船所向けの要求${declined}件を辞退するしかなく、9・10年目は国内縮小で本業の売上が合計${usd(lost)}減りました。`,
      );
    } else {
      goods.push(
        `${overseasOptions[cont.overseas].label}への進出を決め、${usd(
          cont.specialSpend[7] ?? 0,
        )}を投じました（${overseasOptions[cont.overseas].tagline}）。`,
      );
    }
  }

  if (turn <= 8 && plan) {
    if (planAmount(plan, "fieldSales") >= RELATIONSHIP_KEEP_SPEND) {
      goods.push("不況の中でも営業訪問を続け、既存船主との関係を保ちました。");
    } else {
      bads.push(
        `営業訪問（${usd(RELATIONSHIP_KEEP_SPEND)}以上）がなく、不況で発注を絞る船主との関係性が一律に5下がりました。`,
      );
    }
  }

  if (turn === 9) {
    const delivered = cont.recoveryOwners ?? [];
    if (delivered.length > 0) {
      goods.push(
        `不況の間も関係を保ったため、${delivered.join("・")}から回復期の優先案件が届きました。`,
      );
    }
    if (cont.overseas === "china" && (cont.chinaLoss ?? 0) > 0) {
      const prepared = state.researchPurchases.some(
        (p) => p.reportId === "r-os-china" && p.turn <= 8,
      );
      (prepared ? goods : bads).push(
        prepared
          ? `中国の規制リスク調査で前もって備えていたため、規制の変更による損失は${usd(cont.chinaLoss ?? 0)}に抑えられました。`
          : `中国の規制の変更で${usd(cont.chinaLoss ?? 0)}を回収できませんでした。中国の規制リスク調査を8年目までに買っていれば、損失は半分で済みました。`,
      );
    }
  }

  return { goods, bads };
}

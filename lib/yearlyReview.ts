import { ASSUMED_GROSS_MARGIN } from "./b2bMetrics";
import { getChannel } from "./marketing";
import {
  DISTRESSED_LOAN_RATE,
  getModeConfig,
  getScenarioTurn,
  synergyRuleFor,
} from "./modes";
import {
  additionalSpendNeeded,
  channelForPriority,
  priorityRewardRate,
} from "./synergy";
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
  const rule = synergyRuleFor(state.mode);
  const needed = plan
    ? additionalSpendNeeded(plan, primaryChannel, rule.minShare, rule.minSpend)
    : 0;
  const route =
    needed > 0
      ? `第1優先「${primary}」の裏付けになる${primaryName}へあと${usd(needed)}配分していれば`
      : `第1優先「${primary}」で訴求していれば`;
  return `${route}、満額${usd(p.requestBudget)}の受注を狙えました。`;
}

export function buildYearlyReview(state: GameState): YearReview[] {
  return state.turnLog.map((log) => {
    const turn = log.turn;
    const requests = getScenarioTurn(turn, state.mode).requests;
    const proposals = state.proposalLog.filter((p) => p.turn === turn);
    const plan = planOf(state, turn);
    const goods: string[] = [];
    const bads: string[] = [];

    for (const req of requests) {
      const p = proposals.find((x) => x.requestId === req.id);
      const primary = req.priorities[0];

      if (!p && state.dealOutcomes[req.id] === "declined") {
        const channelName = getChannel(channelForPriority(primary)).name;
        bads.push(
          `${req.owner}（想定予算 ${usd(req.budget)}）は、裏付けとなる投資がなく提案を辞退しました。無理な提案で信用を落とすことは避けられましたが、第1優先「${primary}」の裏付けになる${channelName}へ配分していれば受注を狙えました。`,
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
          `${req.owner}：第1優先「${p.focusPriority}」に${channelName}（配分全体の${pct(
            p.channelShare,
          )}）で応え、満額${usd(p.revenue)}を受注しました。`,
        );
      } else if (p.won) {
        const lost = p.requestBudget - p.revenue;
        bads.push(
          `${req.owner}：第${p.priorityRank + 1}優先「${p.focusPriority}」での受注となり、受注額は${pct(
            priorityRewardRate(p.priorityRank),
          )}（${usd(lost)}の取りこぼし）。${describeMiss(p, primary, plan, state)}`,
        );
      } else {
        const why =
          p.reason === "underinvested"
            ? `${channelName}への投資${usd(p.channelSpend)}が最低条件${usd(
                synergyRuleFor(state.mode).minSpend,
              )}に届かず`
            : `${channelName}が配分全体の${pct(p.channelShare)}で、条件の4分の1（${pct(
                synergyRuleFor(state.mode).minShare,
              )}）に届かず`;
        bads.push(
          `${req.owner}：「${p.focusPriority}」で提案したものの、${why}失注しました（あと${usd(
            p.shortfall,
          )}で受注できた計算です）。`,
        );
      }
    }

    // どの受注の裏付けにもならなかった投資
    if (plan && log.marketingSpend > 0) {
      const used = new Set(
        proposals.filter((p) => p.won).map((p) => p.requiredChannel),
      );
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
          getModeConfig(state.mode).emergencyLoan.trustPenalty
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

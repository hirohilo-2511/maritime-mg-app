import { getModeConfig, loanBaseRate } from "./modes";
import type { GameState, LoanRecord, PendingInsolvency } from "./types";

/**
 * 緊急融資の計算。
 * 借入残高・利息は loans から都度計算し、GameState に二重に持たない。
 */

/** 未返済の融資 */
export function activeLoans(state: GameState): LoanRecord[] {
  return state.loans.filter((l) => l.repaidTurn === null);
}

/** 借入残高（未返済の元本の合計） */
export function outstandingDebt(state: GameState): number {
  return activeLoans(state).reduce((sum, l) => sum + l.principal, 0);
}

/** 融資 1 件の年間利息（$1,000 単位に丸める） */
export function loanInterest(loan: Pick<LoanRecord, "principal" | "rate">): number {
  return Math.round((loan.principal * loan.rate) / 1_000) * 1_000;
}

/** 次の決算（最終年は締め）で支払う利息の合計 */
export function annualInterest(state: GameState): number {
  return activeLoans(state).reduce((sum, l) => sum + loanInterest(l), 0);
}

/** 残りの借入枠 */
export function remainingCredit(state: GameState): number {
  const { creditLimit } = getModeConfig(state.mode).emergencyLoan;
  return Math.max(0, creditLimit - outstandingDebt(state));
}

/** 残りの融資回数 */
export function remainingLoanCount(state: GameState): number {
  const { maxLoans } = getModeConfig(state.mode).emergencyLoan;
  return Math.max(0, maxLoans - state.loans.length);
}

/**
 * 決算で資金が不足したときの緊急経営判断の内容を作る。
 * - 回数上限に達している、または不足額が残りの借入枠を超える場合は融資を受けられない
 * - 不足額は必ず補填し、運転資金は残りの借入枠に収まるよう減額する
 * - 金利は決算後（融資ペナルティ適用前）の信頼度で決め、2回目以降は上乗せする
 *
 * @param state 決算を反映した状態（資金がマイナス）
 */
export function buildInsolvency(state: GameState): PendingInsolvency {
  const cfg = getModeConfig(state.mode).emergencyLoan;
  const deficit = -state.availableFunds;
  const base = { turn: state.turn, deficit };

  if (state.loans.length >= cfg.maxLoans) {
    return { ...base, offer: null, denial: "countLimit" };
  }
  const room = remainingCredit(state);
  if (deficit > room) {
    return { ...base, offer: null, denial: "creditLimit" };
  }

  const number = state.loans.length + 1;
  const workingCapital = Math.min(cfg.workingCapital, room - deficit);
  const baseRate = loanBaseRate(state.trustScore);
  const penaltyRate = number > 1 ? cfg.repeatLoanPenaltyRate : 0;
  return {
    ...base,
    offer: {
      number,
      principal: deficit + workingCapital,
      deficit,
      workingCapital,
      baseRate,
      penaltyRate,
      // 浮動小数の誤差（0.11 + 0.05 など）を避けるため 0.1% 単位に丸める
      rate: Math.round((baseRate + penaltyRate) * 1_000) / 1_000,
      trustAtBorrow: state.trustScore,
      workingCapitalReduced: workingCapital < cfg.workingCapital,
      trustPenalty: cfg.trustPenalty,
    },
    denial: null,
  };
}

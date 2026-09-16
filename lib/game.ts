import { getTurnData } from "./mock-data";
import { emptyPlan, simulateMarketing } from "./marketing";
import { researchSpendInTurn } from "./research";
import type { GameState, MarketingOutcome, TurnSettlement } from "./types";

/** 信頼度スコアを 0–100 に収める */
export function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export type AdvanceResult = {
  /** 次ターン開始時の状態 */
  state: GameState;
  /** 適用された決算（進行できなかった場合は null） */
  settlement: TurnSettlement | null;
  /** 実行されたマーケティング投資の結果 */
  marketing: MarketingOutcome;
  /**
   * 終了したターン中に支出した市場調査費。
   * 購入時に即時支出しているため、決算では参考表示のみに使う。
   */
  researchSpend: number;
  /** 実際にターンが進んだか */
  advanced: boolean;
};

/**
 * 市場調査レポートを購入した状態を返す純粋関数。
 * 二重購入と資金不足の場合は状態を変更しない。
 */
export function purchaseResearch(
  state: GameState,
  reportId: string,
  cost: number,
): GameState {
  const owned = state.researchPurchases.some((p) => p.reportId === reportId);
  if (owned || cost > state.availableFunds) return state;

  return {
    ...state,
    availableFunds: state.availableFunds - cost,
    researchPurchases: [
      ...state.researchPurchases,
      { reportId, turn: state.turn, cost },
    ],
  };
}

/**
 * ターンを終了して次のターンへ進める純粋関数。
 * - 次ターンのデータに定義された決算（売上・固定費・信頼度）を適用する
 * - 確定済みのマーケティング予算を支出として差し引き、その効果を加える
 */
export function advanceGameState(state: GameState): AdvanceResult {
  // 確定していない配分は実行されない
  const executedPlan = state.marketingCommitted
    ? state.marketingPlan
    : emptyPlan();
  const marketing = simulateMarketing(executedPlan);
  // 調査費は購入時に支出済みなので、ここでは集計のみ
  const researchSpend = researchSpendInTurn(
    state.researchPurchases,
    state.turn,
  );

  // 最終ターンではこれ以上進めない
  if (state.turn >= state.totalTurns) {
    return {
      state,
      settlement: null,
      marketing,
      researchSpend,
      advanced: false,
    };
  }

  const toTurn = state.turn + 1;
  const settlement = getTurnData(toTurn).settlement;

  const revenue = settlement?.revenue ?? 0;
  const expense = settlement?.expense ?? 0;
  const trustDelta = settlement?.trustDelta ?? 0;

  return {
    state: {
      ...state,
      turn: toTurn,
      availableFunds:
        state.availableFunds + revenue - expense - marketing.spend,
      trustScore: clampTrust(
        state.trustScore + trustDelta + marketing.trustDelta,
      ),
      // 配分は次ターンの検討材料として引き継ぐが、確定状態はリセットする
      marketingCommitted: false,
      marketingHistory: [
        ...state.marketingHistory,
        {
          turn: state.turn,
          plan: executedPlan,
          spend: marketing.spend,
          leads: marketing.leads,
          trustDelta: marketing.trustDelta,
          revenue,
        },
      ],
    },
    settlement,
    marketing,
    researchSpend,
    advanced: true,
  };
}

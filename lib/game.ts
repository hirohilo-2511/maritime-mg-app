import { emptyPlan, simulateMarketing } from "./marketing";
import { getModeConfig, getScenarioTurn } from "./modes";
import { researchSpendInTurn } from "./research";
import { evaluateSynergy, type SynergyResult } from "./synergy";
import type { DealOutcome, GameState, MarketingOutcome, TurnSettlement } from "./types";

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
 * - 次ターンのデータに定義された決算（売上・固定費・信頼度）を、難易度の補正込みで適用する
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
  const settlement = getScenarioTurn(toTurn, state.mode).settlement;

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
      // 提案の完了状態は新しいターンの要求に対して再度行う必要がある
      proposalsCompleted: [],
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

export type FinalizeResult = {
  /** 最終ターン終了後の状態（gameCompleted: true） */
  state: GameState;
  /** 最終ターンで実行されたマーケティング投資の結果 */
  marketing: MarketingOutcome;
};

/**
 * 最終ターンを締めくくり、ゲームを完了状態にする純粋関数。
 * 次ターンのデータは存在しないため、決算（売上・固定費）は発生させず、
 * 確定済みのマーケティング予算の効果のみを反映する。
 */
export function finalizeGame(state: GameState): FinalizeResult {
  const executedPlan = state.marketingCommitted
    ? state.marketingPlan
    : emptyPlan();
  const marketing = simulateMarketing(executedPlan);

  return {
    state: {
      ...state,
      availableFunds: state.availableFunds - marketing.spend,
      trustScore: clampTrust(state.trustScore + marketing.trustDelta),
      marketingCommitted: false,
      proposalsCompleted: [],
      marketingHistory: [
        ...state.marketingHistory,
        {
          turn: state.turn,
          plan: executedPlan,
          spend: marketing.spend,
          leads: marketing.leads,
          trustDelta: marketing.trustDelta,
          revenue: 0,
        },
      ],
      gameCompleted: true,
    },
    marketing,
  };
}

export type ProposalResolution = {
  /** 提案・シナジー判定後の状態 */
  state: GameState;
  /** 受注できたか */
  outcome: DealOutcome;
  /** シナジー判定の詳細（結果画面での説明表示に使う） */
  synergy: SynergyResult;
  /** 受注による入金額（失注時は 0） */
  revenue: number;
  /** 信頼度スコアの変動（難易度によって異なる） */
  trustDelta: number;
};

/**
 * 船主要求への提案を確定し、シナジー判定に基づいて受注可否を決める純粋関数。
 * すでに提案済みの要求に対しては状態を変更しない。
 */
export function resolveProposal(
  state: GameState,
  requestId: string,
  focusPriority: string,
): ProposalResolution | null {
  if (state.proposalsCompleted.includes(requestId)) return null;

  const request = getScenarioTurn(state.turn, state.mode).requests.find(
    (r) => r.id === requestId,
  );
  if (!request) return null;

  const cfg = getModeConfig(state.mode);
  const synergy = evaluateSynergy(
    focusPriority,
    state.marketingPlan,
    cfg.minSynergySpend,
  );
  const outcome: DealOutcome = synergy.won ? "won" : "lost";
  const trustDelta = synergy.won ? cfg.winTrustDelta : cfg.loseTrustDelta;

  return {
    state: {
      ...state,
      proposalsCompleted: [...state.proposalsCompleted, requestId],
      dealOutcomes: { ...state.dealOutcomes, [requestId]: outcome },
      availableFunds:
        state.availableFunds + (synergy.won ? request.budget : 0),
      trustScore: clampTrust(state.trustScore + trustDelta),
    },
    outcome,
    synergy,
    revenue: synergy.won ? request.budget : 0,
    trustDelta,
  };
}

import { emptyPlan, planTotal, simulateMarketing } from "./marketing";
import { getModeConfig, getScenarioTurn, synergyRuleFor } from "./modes";
import { researchSpendInTurn } from "./research";
import { evaluateSynergy, type SynergyResult } from "./synergy";
import type {
  DealOutcome,
  GameState,
  MarketingOutcome,
  ShipownerRequest,
  TurnSettlement,
} from "./types";

/** 信頼度スコアを 0–100 に収める */
export function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** 船主との関係性の変動量（顧客データの初期値に加算する） */
export const RELATIONSHIP_WIN_DELTA = 8;
export const RELATIONSHIP_LOSE_DELTA = -4;
export const RELATIONSHIP_IGNORE_DELTA = -12;

function addRelationship(
  deltas: Record<string, number>,
  owner: string,
  delta: number,
): Record<string, number> {
  return { ...deltas, [owner]: (deltas[owner] ?? 0) + delta };
}

/** その船主要求に回答（提案）済みか。ターン移動後も二重提案を防ぐため提案結果で判定する */
export function isAnswered(state: GameState, requestId: string): boolean {
  return requestId in state.dealOutcomes;
}

/** 現在のターンで、まだ回答していない船主要求 */
export function unansweredRequests(state: GameState): ShipownerRequest[] {
  return getScenarioTurn(state.turn, state.mode).requests.filter(
    (r) => !isAnswered(state, r.id),
  );
}

/** 未回答の要求に対して、ターン終了時に科される信頼度ペナルティの合計 */
export function unansweredPenalty(state: GameState): number {
  return (
    unansweredRequests(state).length *
    getModeConfig(state.mode).ignoreTrustDelta
  );
}

/**
 * 市場調査などに今すぐ使える資金。
 * 確定済みのマーケティング配分はターン終了時に必ず支出されるため、その分を差し引く。
 */
export function spendableFunds(state: GameState): number {
  const committed = state.marketingCommitted
    ? planTotal(state.marketingPlan)
    : 0;
  return state.availableFunds - committed;
}

/** 今ターン、船主への提案を 1 件以上行ったか（行った後は配分を変更できない） */
export function hasProposedThisTurn(state: GameState): boolean {
  return state.proposalsCompleted.length > 0;
}

/**
 * ターンを終了できるか。
 * 予算配分（$0 = 投資見送りも可）を確定していれば、どんな資金状態でも終了できる。
 * 未回答の要求はペナルティ付きで見送れる。
 */
export function canEndTurn(state: GameState): boolean {
  return !state.gameCompleted && state.marketingCommitted;
}

export type AdvanceResult = {
  /** 次ターン開始時の状態（倒産した場合はゲーム完了状態） */
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
  /** 未回答だった船主要求の件数 */
  unansweredCount: number;
  /** 未回答による信頼度ペナルティの合計 */
  unansweredPenalty: number;
  /** 決算の結果、倒産したか */
  bankrupt: boolean;
  /** 実際にターンが進んだ（または倒産で終了した）か */
  advanced: boolean;
};

/**
 * 市場調査レポートを購入した状態を返す純粋関数。
 * 二重購入・資金不足（確定済み配分を差し引いた残額で判定）・ゲーム終了後は状態を変更しない。
 */
export function purchaseResearch(
  state: GameState,
  reportId: string,
  cost: number,
): GameState {
  if (state.gameCompleted) return state;
  const owned = state.researchPurchases.some((p) => p.reportId === reportId);
  if (owned || cost > spendableFunds(state)) return state;

  return {
    ...state,
    availableFunds: state.availableFunds - cost,
    researchPurchases: [
      ...state.researchPurchases,
      { reportId, turn: state.turn, cost },
    ],
  };
}

/** ターン終了時の共通処理：確定済み配分の実行と、未回答要求へのペナルティ */
function closeTurn(state: GameState) {
  // 確定していない配分は実行されない
  const executedPlan = state.marketingCommitted
    ? state.marketingPlan
    : emptyPlan();
  const marketing = simulateMarketing(executedPlan);
  const researchSpend = researchSpendInTurn(
    state.researchPurchases,
    state.turn,
  );

  const unanswered = unansweredRequests(state);
  const penalty = unansweredPenalty(state);
  let relationshipDeltas = state.relationshipDeltas;
  for (const r of unanswered) {
    relationshipDeltas = addRelationship(
      relationshipDeltas,
      r.owner,
      RELATIONSHIP_IGNORE_DELTA,
    );
  }

  return {
    executedPlan,
    marketing,
    researchSpend,
    unanswered,
    penalty,
    relationshipDeltas,
  };
}

/**
 * ターンを終了して次のターンへ進める純粋関数。
 * - 次ターンのデータに定義された決算（売上・固定費・信頼度）を、難易度の補正込みで適用する
 * - 確定済みのマーケティング予算を支出として差し引き、その効果を加える
 * - 未回答の船主要求には信頼度・関係性のペナルティを科す
 * - 決算後の資金がマイナスになった場合は倒産としてゲームを終了する
 */
export function advanceGameState(state: GameState): AdvanceResult {
  const closing = closeTurn(state);
  const { executedPlan, marketing, researchSpend } = closing;

  // 最終ターン・終了済みのゲームではこれ以上進めない
  if (state.gameCompleted || state.turn >= state.totalTurns) {
    return {
      state,
      settlement: null,
      marketing,
      researchSpend,
      unansweredCount: closing.unanswered.length,
      unansweredPenalty: closing.penalty,
      bankrupt: false,
      advanced: false,
    };
  }

  const toTurn = state.turn + 1;
  const settlement = getScenarioTurn(toTurn, state.mode).settlement;

  const revenue = settlement?.revenue ?? 0;
  const expense = settlement?.expense ?? 0;
  const trustDelta = settlement?.trustDelta ?? 0;

  const funds = state.availableFunds + revenue - expense - marketing.spend;
  const bankrupt = funds < 0;

  const closed: GameState = {
    ...state,
    availableFunds: funds,
    trustScore: clampTrust(
      state.trustScore + trustDelta + marketing.trustDelta + closing.penalty,
    ),
    relationshipDeltas: closing.relationshipDeltas,
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
  };

  return {
    state: bankrupt
      ? // 倒産：ターンは進めず、その年を最後の年としてゲームを終了する
        {
          ...closed,
          marketingCommitted: false,
          bankrupt: true,
          gameCompleted: true,
        }
      : {
          ...closed,
          turn: toTurn,
          // 配分は次ターンの検討材料として引き継ぐが、確定状態はリセットする
          marketingCommitted: false,
          // 提案の完了状態は新しいターンの要求に対して再度行う必要がある
          proposalsCompleted: [],
        },
    settlement,
    marketing,
    researchSpend,
    unansweredCount: closing.unanswered.length,
    unansweredPenalty: closing.penalty,
    bankrupt,
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
 * 確定済みのマーケティング予算の効果と、未回答要求へのペナルティのみを反映する。
 * 終了後に同じ要求へ再提案できないよう、提案の完了状態は保持する。
 */
export function finalizeGame(state: GameState): FinalizeResult {
  const closing = closeTurn(state);
  const { executedPlan, marketing } = closing;
  if (state.gameCompleted) return { state, marketing };

  const funds = state.availableFunds - marketing.spend;

  return {
    state: {
      ...state,
      availableFunds: funds,
      trustScore: clampTrust(
        state.trustScore + marketing.trustDelta + closing.penalty,
      ),
      relationshipDeltas: closing.relationshipDeltas,
      marketingCommitted: false,
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
      bankrupt: funds < 0,
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
 * 予算配分が未確定の場合、すでに提案済みの要求、ゲーム終了後は null を返す。
 */
export function resolveProposal(
  state: GameState,
  requestId: string,
  focusPriority: string,
): ProposalResolution | null {
  if (state.gameCompleted || !state.marketingCommitted) return null;
  if (isAnswered(state, requestId)) return null;

  const request = getScenarioTurn(state.turn, state.mode).requests.find(
    (r) => r.id === requestId,
  );
  if (!request) return null;

  const cfg = getModeConfig(state.mode);
  const synergy = evaluateSynergy(
    focusPriority,
    request.priorities,
    state.marketingPlan,
    synergyRuleFor(state.mode),
  );
  const outcome: DealOutcome = synergy.won ? "won" : "lost";
  // 受注額と信頼度の上昇は、船主の重視順位に応じて目減りする
  const trustDelta = synergy.won
    ? Math.round(cfg.winTrustDelta * synergy.rewardRate)
    : cfg.loseTrustDelta;
  const revenue = synergy.won
    ? Math.round(request.budget * synergy.rewardRate)
    : 0;

  return {
    state: {
      ...state,
      proposalsCompleted: [...state.proposalsCompleted, requestId],
      dealOutcomes: { ...state.dealOutcomes, [requestId]: outcome },
      proposalLog: [
        ...state.proposalLog,
        {
          turn: state.turn,
          requestId,
          owner: request.owner,
          requestBudget: request.budget,
          focusPriority,
          priorityRank: synergy.priorityRank,
          requiredChannel: synergy.requiredChannel,
          channelSpend: synergy.requiredChannelSpend,
          channelShare: synergy.requiredChannelShare,
          reason: synergy.reason,
          won: synergy.won,
          revenue,
          trustDelta,
          shortfall: synergy.shortfall,
        },
      ],
      availableFunds: state.availableFunds + revenue,
      trustScore: clampTrust(state.trustScore + trustDelta),
      relationshipDeltas: addRelationship(
        state.relationshipDeltas,
        request.owner,
        synergy.won ? RELATIONSHIP_WIN_DELTA : RELATIONSHIP_LOSE_DELTA,
      ),
    },
    outcome,
    synergy,
    revenue,
    trustDelta,
  };
}

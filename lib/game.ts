import { isCustomerResearched } from "./customers";
import {
  annualInterest,
  buildInsolvency,
  outstandingDebt,
} from "./loans";
import { emptyPlan, planTotal, simulateMarketing } from "./marketing";
import { getModeConfig, getScenarioTurn, synergyRuleFor } from "./modes";
import { researchSpendInTurn } from "./research";
import { evaluateSynergy, type SynergyResult } from "./synergy";
import type {
  DealOutcome,
  GameState,
  LoanRecord,
  MarketingOutcome,
  PendingInsolvency,
  ShipownerRequest,
  TurnRecord,
  TurnSettlement,
} from "./types";

/** 信頼度スコアを 0–100 に収める */
export function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** 船主との関係性の変動量（顧客データの初期値に加算する） */
export const RELATIONSHIP_WIN_DELTA = 8;
export const RELATIONSHIP_LOSE_DELTA = -4;
export const RELATIONSHIP_DECLINE_DELTA = -4;
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
  return (
    !state.gameCompleted && !state.pendingInsolvency && state.marketingCommitted
  );
}

/** プレイ内容を変更する操作（提案・購入など）を受け付けない状態か（終了後・緊急経営判断の待機中） */
export function isPlayLocked(state: GameState): boolean {
  return state.gameCompleted || state.pendingInsolvency !== null;
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
  /** この決算で支払った緊急融資の利息 */
  interest: number;
  /**
   * 決算の結果、資金が不足した場合の緊急経営判断の内容（不足しなければ null）。
   * この場合ターンは進まず、acceptEmergencyLoan / declareBankruptcy で決着させる。
   */
  insolvency: PendingInsolvency | null;
  /** 決算が反映されたか（資金不足で判断待ちになった場合も true） */
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
  if (isPlayLocked(state)) return state;
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

/**
 * その年の年初の資金・信頼度。前年の締めの記録から引き継ぐ（1年目は難易度の初期値）。
 * ターン移動（デモ操作）後は実際の値と一致しない場合がある。
 */
function yearStart(state: GameState): { funds: number; trust: number } {
  const prev = state.turnLog.at(-1);
  if (prev && prev.turn === state.turn - 1) {
    return { funds: prev.fundsEnd, trust: prev.trustEnd };
  }
  const cfg = getModeConfig(state.mode);
  return state.turn === 1
    ? { funds: cfg.initialFunds, trust: cfg.initialTrust }
    : { funds: state.availableFunds, trust: state.trustScore };
}

/** 年の締めの記録を作る */
function turnRecord(
  state: GameState,
  closing: ReturnType<typeof closeTurn>,
  settlement: TurnSettlement | null,
  fundsEnd: number,
  trustEnd: number,
  finance: {
    interestExpense: number;
    repayment: number;
    debtEnd: number;
    bankrupt: boolean;
  },
): TurnRecord {
  const start = yearStart(state);
  return {
    turn: state.turn,
    fundsStart: start.funds,
    trustStart: start.trust,
    fundsEnd,
    trustEnd,
    wonRevenue: state.proposalLog
      .filter((p) => p.turn === state.turn)
      .reduce((sum, p) => sum + p.revenue, 0),
    settlementRevenue: settlement?.revenue ?? 0,
    settlementExpense: settlement?.expense ?? 0,
    settlementTrust: settlement?.trustDelta ?? 0,
    marketingSpend: closing.marketing.spend,
    marketingTrust: closing.marketing.trustDelta,
    researchSpend: closing.researchSpend,
    unansweredRequestIds: closing.unanswered.map((r) => r.id),
    declinedRequestIds: getScenarioTurn(state.turn, state.mode)
      .requests.filter((r) => state.dealOutcomes[r.id] === "declined")
      .map((r) => r.id),
    unansweredPenalty: closing.penalty,
    interestExpense: finance.interestExpense,
    repayment: finance.repayment,
    loan: null,
    debtEnd: finance.debtEnd,
    insolvency: null,
    loanDenial: null,
    bankrupt: finance.bankrupt,
  };
}

/** 直近の年の記録を書き換える（緊急経営判断の結果を反映する） */
function patchLastRecord(
  state: GameState,
  patch: Partial<TurnRecord>,
): TurnRecord[] {
  return state.turnLog.map((log, i) =>
    i === state.turnLog.length - 1 ? { ...log, ...patch } : log,
  );
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
 * - 緊急融資を受けている場合は、その利息を支払う
 * - 決算後の資金がマイナスになった場合は、ターンを進めずに緊急経営判断（融資 / 自主倒産）の待機状態にする
 */
export function advanceGameState(state: GameState): AdvanceResult {
  const closing = closeTurn(state);
  const { executedPlan, marketing, researchSpend } = closing;

  // 最終ターン・終了済み・判断待ちのゲームではこれ以上進めない
  if (isPlayLocked(state) || state.turn >= state.totalTurns) {
    return {
      state,
      settlement: null,
      marketing,
      researchSpend,
      unansweredCount: closing.unanswered.length,
      unansweredPenalty: closing.penalty,
      interest: 0,
      insolvency: null,
      advanced: false,
    };
  }

  const toTurn = state.turn + 1;
  const settlement = getScenarioTurn(toTurn, state.mode).settlement;

  const revenue = settlement?.revenue ?? 0;
  const expense = settlement?.expense ?? 0;
  const trustDelta = settlement?.trustDelta ?? 0;

  const interest = annualInterest(state);
  const funds =
    state.availableFunds + revenue - expense - marketing.spend - interest;
  const trust = clampTrust(
    state.trustScore + trustDelta + marketing.trustDelta + closing.penalty,
  );

  const closed: GameState = {
    ...state,
    availableFunds: funds,
    trustScore: trust,
    relationshipDeltas: closing.relationshipDeltas,
    turnLog: [
      ...state.turnLog,
      turnRecord(state, closing, settlement, funds, trust, {
        interestExpense: interest,
        repayment: 0,
        debtEnd: outstandingDebt(state),
        bankrupt: false,
      }),
    ],
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

  const insolvency = funds < 0 ? buildInsolvency(closed) : null;

  return {
    state: insolvency
      ? // 資金不足：ターンは進めず、緊急経営判断を待つ
        {
          ...closed,
          marketingCommitted: false,
          pendingInsolvency: insolvency,
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
    interest,
    insolvency,
    advanced: true,
  };
}

/**
 * 緊急融資を受けて次の年へ進む純粋関数。
 * 不足額 + 運転資金を資金に注入し、信頼度を下げ、融資を記録する。
 * 判断待ちでない場合・融資を受けられない場合は状態を変更しない。
 */
export function acceptEmergencyLoan(state: GameState): GameState {
  const pending = state.pendingInsolvency;
  if (!pending?.offer || state.gameCompleted || pending.turn !== state.turn) {
    return state;
  }
  const { offer } = pending;
  const loan: LoanRecord = {
    turn: pending.turn,
    number: offer.number,
    principal: offer.principal,
    deficit: offer.deficit,
    workingCapital: offer.workingCapital,
    baseRate: offer.baseRate,
    penaltyRate: offer.penaltyRate,
    rate: offer.rate,
    trustAtBorrow: offer.trustAtBorrow,
    repaidTurn: null,
  };
  const funds = state.availableFunds + offer.principal;
  const trust = clampTrust(state.trustScore + offer.trustPenalty);
  const loans = [...state.loans, loan];

  return {
    ...state,
    availableFunds: funds,
    trustScore: trust,
    loans,
    pendingInsolvency: null,
    // 翌年の年初は融資後の資金・信頼度から始まる
    turnLog: patchLastRecord(state, {
      fundsEnd: funds,
      trustEnd: trust,
      loan,
      debtEnd: outstandingDebt({ ...state, loans }),
      insolvency: "loan",
    }),
    turn: state.turn + 1,
    marketingCommitted: false,
    proposalsCompleted: [],
  };
}

/**
 * 融資を受けずに（または受けられずに）倒産としてゲームを終了する純粋関数。
 * 従来の倒産と同じく、ターンは進めずその年を最後の年とする。
 * 判断待ちでない場合は状態を変更しない。
 */
export function declareBankruptcy(state: GameState): GameState {
  const pending = state.pendingInsolvency;
  if (!pending || state.gameCompleted || pending.turn !== state.turn) {
    return state;
  }
  const endReason = pending.offer ? "declined" : "denied";
  return {
    ...state,
    pendingInsolvency: null,
    bankrupt: true,
    gameCompleted: true,
    endReason,
    turnLog: patchLastRecord(state, {
      insolvency: endReason,
      loanDenial: pending.denial,
      bankrupt: true,
    }),
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
 * 緊急融資を受けている場合は、最終年の利息と元本を一括で支払う。
 * 返済後の資金がマイナスなら債務超過（D 評価）として終了する（次の年がないため融資の判断はない）。
 * 終了後に同じ要求へ再提案できないよう、提案の完了状態は保持する。
 */
export function finalizeGame(state: GameState): FinalizeResult {
  const closing = closeTurn(state);
  const { executedPlan, marketing } = closing;
  if (isPlayLocked(state)) return { state, marketing };

  const interest = annualInterest(state);
  const repayment = outstandingDebt(state);
  const funds = state.availableFunds - marketing.spend - interest - repayment;
  const insolvent = funds < 0;
  const trust = clampTrust(
    state.trustScore + marketing.trustDelta + closing.penalty,
  );

  return {
    state: {
      ...state,
      availableFunds: funds,
      trustScore: trust,
      relationshipDeltas: closing.relationshipDeltas,
      turnLog: [
        ...state.turnLog,
        turnRecord(state, closing, null, funds, trust, {
          interestExpense: interest,
          repayment,
          debtEnd: 0,
          bankrupt: insolvent,
        }),
      ],
      loans: state.loans.map((l) =>
        l.repaidTurn === null ? { ...l, repaidTurn: state.turn } : l,
      ),
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
      bankrupt: insolvent,
      endReason: insolvent ? "insolvent" : "completed",
      gameCompleted: true,
    },
    marketing,
  };
}

/**
 * 船主要求への提案を、今期は辞退する純粋関数。
 * 受注額はゼロ・信頼度と関係性は少し下がるが、未回答（無視）や裏付けのない提案（失注）より傷は浅い。
 * 提案と同じく予算配分の確定が前提。ゲーム終了後・判断待ち・回答済みの要求では状態を変更しない。
 * 配分の組み替えを妨げないよう、提案済み（proposalsCompleted）には含めない。
 */
export function declineRequest(state: GameState, requestId: string): GameState {
  if (isPlayLocked(state) || !state.marketingCommitted) return state;
  if (isAnswered(state, requestId)) return state;
  const request = getScenarioTurn(state.turn, state.mode).requests.find(
    (r) => r.id === requestId,
  );
  if (!request) return state;

  return {
    ...state,
    dealOutcomes: { ...state.dealOutcomes, [requestId]: "declined" },
    trustScore: clampTrust(
      state.trustScore + getModeConfig(state.mode).declineTrustDelta,
    ),
    relationshipDeltas: addRelationship(
      state.relationshipDeltas,
      request.owner,
      RELATIONSHIP_DECLINE_DELTA,
    ),
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
  /** 信頼度スコアの変動（難易度によって異なる。市場調査の上乗せ込み） */
  trustDelta: number;
  /** 市場調査で船主を理解していたことによる信頼度の上乗せ（受注時のみ） */
  researchBonus: number;
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
  if (isPlayLocked(state) || !state.marketingCommitted) return null;
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
  // 関係する市場調査を購入済みの船主から受注すると、顧客理解が伝わり信頼度が上乗せされる
  const researchBonus =
    synergy.won && isCustomerResearched(state, request.owner)
      ? cfg.researchWinTrustBonus
      : 0;
  const trustDelta = synergy.won
    ? Math.round(cfg.winTrustDelta * synergy.rewardRate) + researchBonus
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
    researchBonus,
  };
}

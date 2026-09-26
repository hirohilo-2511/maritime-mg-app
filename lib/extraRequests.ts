import { extraRequests } from "./mock-data";
import { getModeConfig, getScenarioTurn, scaleAmount } from "./modes";
import type { GameMode, GameState, ShipownerRequest } from "./types";

/**
 * 実践編の追加案件。
 * 前年のマーケティングで得た見込み引き合い件数が基準に届くと、翌年に小規模な案件が届く
 * （「今年まいた種が来年の商談になる」）。
 */

/** 見込み引き合い件数から、翌年に届く追加案件の件数 */
export function extraRequestCount(mode: GameMode, leads: number): number {
  return getModeConfig(mode).extraRequestLeadThresholds.filter((t) => leads >= t)
    .length;
}

/** 追加案件の想定予算を難易度で補正する */
function scaled(request: ShipownerRequest, mode: GameMode): ShipownerRequest {
  return {
    ...request,
    budget: scaleAmount(request.budget, getModeConfig(mode).requestBudgetRate),
  };
}

/** 指定した年に届いている追加案件（前年の見込み引き合い件数で決まる） */
export function extraRequestsFor(
  state: GameState,
  turn: number = state.turn,
): ShipownerRequest[] {
  const leads =
    state.marketingHistory.find((h) => h.turn === turn - 1)?.leads ?? 0;
  const count = extraRequestCount(state.mode, leads);
  return (extraRequests[turn] ?? [])
    .slice(0, count)
    .map((r) => scaled(r, state.mode));
}

/** 指定した年の船主要求（本案件 + 追加案件） */
export function requestsForTurn(
  state: GameState,
  turn: number = state.turn,
): ShipownerRequest[] {
  return [
    ...getScenarioTurn(turn, state.mode).requests,
    ...extraRequestsFor(state, turn),
  ];
}

/** 追加案件の ID から案件を引く（難易度の補正込み。B2B 指標などの集計用） */
export function findExtraRequest(
  mode: GameMode,
  requestId: string,
): { turn: number; request: ShipownerRequest } | null {
  for (const [turn, list] of Object.entries(extraRequests)) {
    const r = list.find((x) => x.id === requestId);
    if (r) return { turn: Number(turn), request: scaled(r, mode) };
  }
  return null;
}

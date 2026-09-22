"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getTurnData, initialGameState, turns } from "@/lib/mock-data";
import { advanceGameState, purchaseResearch } from "@/lib/game";
import type {
  GameState,
  MarketingOutcome,
  MarketingPlan,
  TurnData,
  TurnSettlement,
} from "@/lib/types";

/** ターン終了処理の結果（決算モーダルの表示に使う） */
export type TurnResult = {
  /** 終了したターン */
  fromTurn: number;
  /** 開始したターン */
  toTurn: number;
  settlement: TurnSettlement;
  /** 実行されたマーケティング投資の結果 */
  marketing: MarketingOutcome;
  /** 終了したターン中に支出した市場調査費（参考表示） */
  researchSpend: number;
  fundsBefore: number;
  fundsAfter: number;
  trustBefore: number;
  trustAfter: number;
};

type GameContextValue = {
  state: GameState;
  /** 現在のターンのニュース・船主要求 */
  turnData: TurnData;
  /** 最終ターンに到達しているか */
  isFinalTurn: boolean;
  /** 決算処理中（擬似的な非同期処理）か */
  isAdvancing: boolean;
  /** ターンを終了して次のターンへ進める */
  advanceTurn: () => void;
  /** 直近のターン終了結果。未確認のあいだモーダルを表示する */
  turnResult: TurnResult | null;
  /** 決算モーダルを閉じる */
  dismissTurnResult: () => void;
  /** セッションの総ターン数を変更する（現在のターンより小さくはできない） */
  setTotalTurns: (totalTurns: number) => void;
  /** 参加チームを追加する */
  addTeam: (name: string) => void;
  /** 参加チームを削除する */
  removeTeam: (index: number) => void;
  /** 決算を行わずにターンだけ移動する（ファシリテーター・デモ用） */
  jumpToTurn: (turn: number) => void;
  /** マーケティング予算の配分を更新する（確定状態は解除される） */
  updateMarketingPlan: (plan: MarketingPlan) => void;
  /** 現在の配分を確定する（ターン終了時に実行される） */
  commitMarketingPlan: () => void;
  /** 市場調査レポートを購入する（費用は即時に資金から差し引かれる） */
  purchaseResearchReport: (reportId: string, cost: number) => void;
  /** レポートを購入済みか */
  hasReport: (reportId: string) => boolean;
  /** ゲームを1年目からやり直す */
  resetGame: () => void;
  /** 船主要求への提案作成を完了する */
  completeProposal: (requestId: string) => void;
  /** その船主要求への提案が完了済みか */
  isProposalCompleted: (requestId: string) => boolean;
  /** 今ターンの船主要求のうち、1件以上の提案が完了しているか */
  hasProposalThisTurn: boolean;
  /** 顧客への提案を作成できるか（マーケティング予算の確定が前提） */
  canCreateProposal: boolean;
  /** ターンを終了できるか（予算配分の確定 → 提案作成の完了、の順を満たしているか） */
  canEndTurn: boolean;
};

const GameContext = createContext<GameContextValue | null>(null);

/** 決算処理の擬似的な所要時間（ms） */
const SETTLEMENT_DELAY_MS = 700;

/** ターンデータが用意されている上限 */
export const MAX_TURNS = turns.length;

/** セッションに登録できるチーム数の上限 */
export const MAX_TEAMS = 8;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialGameState);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // アンマウント時に進行中のタイマーを破棄する
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isFinalTurn = state.turn >= state.totalTurns;

  const advanceTurn = useCallback(() => {
    if (isAdvancing || isFinalTurn) return;

    setIsAdvancing(true);
    // 擬似的な非同期処理。将来的にはサーバー側のターン決算 API に置き換える
    timerRef.current = setTimeout(() => {
      const {
        state: next,
        settlement,
        marketing,
        researchSpend,
        advanced,
      } = advanceGameState(state);

      if (advanced) {
        setState(next);

        if (settlement) {
          setTurnResult({
            fromTurn: state.turn,
            toTurn: next.turn,
            settlement,
            marketing,
            researchSpend,
            fundsBefore: state.availableFunds,
            fundsAfter: next.availableFunds,
            trustBefore: state.trustScore,
            trustAfter: next.trustScore,
          });
        }
      }

      setIsAdvancing(false);
      timerRef.current = null;
    }, SETTLEMENT_DELAY_MS);
  }, [isAdvancing, isFinalTurn, state]);

  const setTotalTurns = useCallback((totalTurns: number) => {
    setState((prev) => ({
      ...prev,
      // 進行済みのターンより短くはできず、データがある範囲に収める
      totalTurns: Math.max(prev.turn, Math.min(totalTurns, MAX_TURNS)),
    }));
  }, []);

  const addTeam = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) =>
      prev.teams.includes(trimmed) || prev.teams.length >= MAX_TEAMS
        ? prev
        : { ...prev, teams: [...prev.teams, trimmed] },
    );
  }, []);

  const removeTeam = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index),
    }));
  }, []);

  const jumpToTurn = useCallback((turn: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsAdvancing(false);
    setTurnResult(null);
    setState((prev) => ({
      ...prev,
      turn: Math.max(1, Math.min(turn, prev.totalTurns)),
    }));
  }, []);

  const updateMarketingPlan = useCallback((plan: MarketingPlan) => {
    setState((prev) => ({
      ...prev,
      marketingPlan: plan,
      marketingCommitted: false,
    }));
  }, []);

  const commitMarketingPlan = useCallback(() => {
    setState((prev) => ({ ...prev, marketingCommitted: true }));
  }, []);

  const purchaseResearchReport = useCallback(
    (reportId: string, cost: number) => {
      // 二重購入・資金不足の判定は purchaseResearch 側で行う
      setState((prev) => purchaseResearch(prev, reportId, cost));
    },
    [],
  );

  const resetGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsAdvancing(false);
    setTurnResult(null);
    setState(initialGameState);
  }, []);

  const completeProposal = useCallback((requestId: string) => {
    setState((prev) =>
      prev.proposalsCompleted.includes(requestId)
        ? prev
        : {
            ...prev,
            proposalsCompleted: [...prev.proposalsCompleted, requestId],
          },
    );
  }, []);

  const turnData = getTurnData(state.turn);
  const hasProposalThisTurn = turnData.requests.some((r) =>
    state.proposalsCompleted.includes(r.id),
  );
  const canCreateProposal = state.marketingCommitted;
  const canEndTurn = canCreateProposal && hasProposalThisTurn;

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      turnData,
      isFinalTurn,
      isAdvancing,
      advanceTurn,
      turnResult,
      dismissTurnResult: () => setTurnResult(null),
      setTotalTurns,
      addTeam,
      removeTeam,
      jumpToTurn,
      updateMarketingPlan,
      commitMarketingPlan,
      purchaseResearchReport,
      hasReport: (reportId: string) =>
        state.researchPurchases.some((p) => p.reportId === reportId),
      resetGame,
      completeProposal,
      isProposalCompleted: (requestId: string) =>
        state.proposalsCompleted.includes(requestId),
      hasProposalThisTurn,
      canCreateProposal,
      canEndTurn,
    }),
    [
      state,
      turnData,
      isFinalTurn,
      isAdvancing,
      advanceTurn,
      turnResult,
      setTotalTurns,
      addTeam,
      removeTeam,
      jumpToTurn,
      updateMarketingPlan,
      commitMarketingPlan,
      purchaseResearchReport,
      resetGame,
      completeProposal,
      hasProposalThisTurn,
      canCreateProposal,
      canEndTurn,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** ゲーム状態を参照する。GameProvider の内側でのみ使用可。 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame は GameProvider の内側で使用してください");
  }
  return ctx;
}

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
import { useRouter } from "next/navigation";
import { initialGameState, turns } from "@/lib/mock-data";
import {
  createInitialGameState,
  getModeConfig,
  getScenarioTurn,
  type ModeConfig,
} from "@/lib/modes";
import {
  advanceGameState,
  finalizeGame,
  purchaseResearch,
  resolveProposal,
  type ProposalResolution,
} from "@/lib/game";
import type {
  DealOutcome,
  GameMode,
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
  /** 選択中の難易度の設定 */
  modeConfig: ModeConfig;
  /** 現在のターンのニュース・船主要求（難易度の補正込み） */
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
  /** 同じ難易度のまま、ゲームを1年目からやり直す（プレイヤー名は引き継ぐ） */
  resetGame: () => void;
  /**
   * 難易度を選んで新しいゲームを開始する（ログイン画面・リザルト画面から）。
   * プレイヤー名を省略した場合は現在の名前を引き継ぐ。
   */
  startGame: (mode: GameMode, playerName?: string) => void;
  /** プレイヤー名を設定する（ログイン画面で入力） */
  setPlayerName: (name: string) => void;
  /**
   * 船主要求への提案を確定する。選んだ訴求ポイントと今ターンの投資チャネルの
   * シナジーで受注可否が決まる。すでに提案済みの場合は null を返す。
   */
  completeProposal: (
    requestId: string,
    focusPriority: string,
  ) => ProposalResolution | null;
  /** その船主要求への提案が完了済みか */
  isProposalCompleted: (requestId: string) => boolean;
  /** その船主要求の提案結果（未提案なら null） */
  dealOutcome: (requestId: string) => DealOutcome | null;
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
  const router = useRouter();
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
    if (isAdvancing) return;

    // 最終ターンをすでに終えている場合は、フィードバック画面を開くだけ
    if (isFinalTurn && state.gameCompleted) {
      router.push("/final-report");
      return;
    }

    setIsAdvancing(true);
    // 擬似的な非同期処理。将来的にはサーバー側のターン決算 API に置き換える
    timerRef.current = setTimeout(() => {
      // 最終ターン：次ターンへは進めないため、ゲームを完了状態にしてフィードバック画面へ
      if (isFinalTurn) {
        const { state: next } = finalizeGame(state);
        setState(next);
        setIsAdvancing(false);
        timerRef.current = null;
        router.push("/final-report");
        return;
      }

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
  }, [isAdvancing, isFinalTurn, state, router]);

  const setTotalTurns = useCallback((totalTurns: number) => {
    setState((prev) => ({
      ...prev,
      // 進行済みのターンより短くはできず、データがある範囲に収める
      totalTurns: Math.max(prev.turn, Math.min(totalTurns, MAX_TURNS)),
      // 総ターン数が変わるため、完了済みフラグはいったん解除する
      gameCompleted: false,
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
      // ターン移動により最終ターンの完了状態は無効化する
      gameCompleted: false,
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

  const startGame = useCallback((mode: GameMode, playerName?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsAdvancing(false);
    setTurnResult(null);
    setState((prev) =>
      createInitialGameState(mode, {
        playerName: playerName?.trim() || prev.playerName,
      }),
    );
  }, []);

  const resetGame = useCallback(
    () => startGame(state.mode),
    [startGame, state.mode],
  );

  const setPlayerName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, playerName: trimmed }));
  }, []);

  const completeProposal = useCallback(
    (requestId: string, focusPriority: string) => {
      const resolution = resolveProposal(state, requestId, focusPriority);
      if (resolution) setState(resolution.state);
      return resolution;
    },
    [state],
  );

  const modeConfig = getModeConfig(state.mode);
  const turnData = useMemo(
    () => getScenarioTurn(state.turn, state.mode),
    [state.turn, state.mode],
  );
  const hasProposalThisTurn = turnData.requests.some((r) =>
    state.proposalsCompleted.includes(r.id),
  );
  const canCreateProposal = state.marketingCommitted;
  const canEndTurn = canCreateProposal && hasProposalThisTurn;

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      modeConfig,
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
      startGame,
      setPlayerName,
      completeProposal,
      isProposalCompleted: (requestId: string) =>
        state.proposalsCompleted.includes(requestId),
      dealOutcome: (requestId: string) => state.dealOutcomes[requestId] ?? null,
      hasProposalThisTurn,
      canCreateProposal,
      canEndTurn,
    }),
    [
      state,
      modeConfig,
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
      startGame,
      setPlayerName,
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

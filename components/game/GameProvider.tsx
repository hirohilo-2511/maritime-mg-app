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
  acceptEmergencyLoan as acceptLoanFor,
  advanceGameState,
  canEditPlan,
  canEndTurn as canEndTurnFor,
  declareBankruptcy as declareBankruptcyFor,
  declineRequest,
  finalizeGame,
  isAnswered,
  isPlayLocked,
  purchaseResearch,
  resolveProposal,
  spendableFunds,
  unansweredPenalty,
  unansweredRequests,
  type ProposalResolution,
} from "@/lib/game";
import {
  annualInterest,
  outstandingDebt,
  remainingCredit,
  remainingLoanCount,
} from "@/lib/loans";
import { requestsForTurn } from "@/lib/extraRequests";
import { emptyPlan } from "@/lib/marketing";
import type {
  DealOutcome,
  EndReason,
  GameMode,
  GameState,
  LoanRecord,
  MarketingOutcome,
  MarketingPlan,
  PendingInsolvency,
  ShipownerRequest,
  TurnData,
  TurnSettlement,
} from "@/lib/types";

/** ターン終了処理の結果（決算モーダルの表示に使う） */
export type TurnResult = {
  /** 終了したターン */
  fromTurn: number;
  /** 開始したターン（判断待ち・倒産した場合は fromTurn のまま） */
  toTurn: number;
  settlement: TurnSettlement;
  /** 実行されたマーケティング投資の結果 */
  marketing: MarketingOutcome;
  /** 終了したターン中に支出した市場調査費（参考表示） */
  researchSpend: number;
  /** 未回答のまま見送った船主要求の件数 */
  unansweredCount: number;
  /** 未回答による信頼度ペナルティ */
  unansweredPenalty: number;
  /** この決算で支払った緊急融資の利息 */
  interest: number;
  /** 資金不足で緊急経営判断を待っている場合の内容（決着したら null） */
  insolvency: PendingInsolvency | null;
  /** この決算の後に受けた緊急融資 */
  loan: LoanRecord | null;
  /** この決算の後に倒産で終了したか */
  bankrupt: boolean;
  /** 倒産した場合の終わり方 */
  endReason: EndReason | null;
  fundsBefore: number;
  fundsAfter: number;
  trustBefore: number;
  trustAfter: number;
};

type GameContextValue = {
  state: GameState;
  /** 選択中の難易度の設定 */
  modeConfig: ModeConfig;
  /** 現在のターンのニュース・船主要求（難易度の補正・追加案件込み） */
  turnData: TurnData;
  /** 最終ターンに到達しているか */
  isFinalTurn: boolean;
  /** 決算処理中（擬似的な非同期処理）か */
  isAdvancing: boolean;
  /** 状態を変更する操作を受け付けない状態か（決算処理中・ゲーム終了後） */
  isLocked: boolean;
  /** ターンを終了して次のターンへ進める（ゲーム終了後は結果画面を開く） */
  advanceTurn: () => void;
  /** 直近のターン終了結果。未確認のあいだモーダルを表示する */
  turnResult: TurnResult | null;
  /** 決算モーダルを閉じる（緊急経営判断の待機中は閉じない） */
  dismissTurnResult: () => void;
  /** 緊急融資を受けて次の年へ進む */
  acceptEmergencyLoan: () => void;
  /** 融資を受けずに（受けられずに）倒産でゲームを終了する */
  declareBankruptcy: () => void;
  /** 借入残高 */
  debt: number;
  /** 次の決算（最終年は締め）で支払う利息 */
  nextInterest: number;
  /** 残りの借入枠 */
  creditLeft: number;
  /** 残りの融資回数 */
  loansLeft: number;
  /** セッションの総ターン数を変更する（現在のターンより小さくはできない・終了後は不可） */
  setTotalTurns: (totalTurns: number) => void;
  /** 参加チームを追加する */
  addTeam: (name: string) => void;
  /** 参加チームを削除する */
  removeTeam: (index: number) => void;
  /** 決算を行わずにターンだけ移動する（ファシリテーター・デモ用） */
  jumpToTurn: (turn: number) => void;
  /** マーケティング予算の配分を更新する（確定後は変更できない） */
  updateMarketingPlan: (plan: MarketingPlan) => void;
  /** 現在の配分を確定する（ターン終了時に実行される） */
  commitMarketingPlan: () => void;
  /** 今ターンは投資を見送る（配分 $0 で確定する） */
  skipMarketing: () => void;
  /** 配分を変更できない状態か（今年は確定済み・決算処理中・終了後・緊急経営判断の待機中） */
  isPlanLocked: boolean;
  /** 市場調査レポートを購入する（費用は即時に資金から差し引かれる） */
  purchaseResearchReport: (reportId: string, cost: number) => void;
  /** レポートを購入済みか */
  hasReport: (reportId: string) => boolean;
  /** 市場調査などに今すぐ使える資金（確定済み配分を差し引いた額） */
  spendable: number;
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
   * シナジーで受注可否が決まる。提案できない場合は null を返す。
   */
  completeProposal: (
    requestId: string,
    focusPriority: string,
  ) => ProposalResolution | null;
  /** 裏付けがないため、その船主要求への提案を今期は辞退する */
  declineProposal: (requestId: string) => void;
  /** その船主要求への提案が完了済みか */
  isProposalCompleted: (requestId: string) => boolean;
  /** その船主要求の提案結果（未提案なら null） */
  dealOutcome: (requestId: string) => DealOutcome | null;
  /** 今ターンの船主要求のうち、1件以上の提案が完了しているか */
  hasProposalThisTurn: boolean;
  /** 今ターンの未回答の船主要求 */
  unanswered: ShipownerRequest[];
  /** 未回答のままターンを終えた場合の信頼度ペナルティ */
  unansweredPenalty: number;
  /** 顧客への提案を作成できるか（マーケティング予算の確定が前提） */
  canCreateProposal: boolean;
  /** ターンを終了できるか（予算配分の確定が前提。未回答はペナルティ付きで可） */
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
  // 決算処理中かどうかを、setState の更新関数の中からも同期的に参照するための ref
  const advancingRef = useRef(false);
  // 決算処理のタイマー内で、クリック時点ではなく最新の状態を使うための ref
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // アンマウント時に進行中のタイマーを破棄する
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stopAdvancing = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    advancingRef.current = false;
    setIsAdvancing(false);
  }, []);

  /**
   * プレイ内容を変更する操作の共通ガード。
   * 決算処理中・緊急経営判断の待機中・ゲーム終了後は状態を変更しない（終了後の再提案・購入などを防ぐ）。
   */
  const updatePlayState = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) =>
        advancingRef.current || isPlayLocked(prev) ? prev : updater(prev),
      );
    },
    [],
  );

  const isFinalTurn = state.turn >= state.totalTurns;

  const advanceTurn = useCallback(() => {
    if (advancingRef.current) return;

    // 終了済み（最終ターン完了・倒産）の場合は、フィードバック画面を開くだけ
    if (state.gameCompleted) {
      router.push("/final-report");
      return;
    }
    if (!canEndTurnFor(state)) return;

    advancingRef.current = true;
    setIsAdvancing(true);
    // 擬似的な非同期処理。将来的にはサーバー側のターン決算 API に置き換える
    timerRef.current = setTimeout(() => {
      const current = stateRef.current;
      timerRef.current = null;

      // 最終ターン：次ターンへは進めないため、ゲームを完了状態にしてフィードバック画面へ
      if (current.turn >= current.totalTurns) {
        const { state: next } = finalizeGame(current);
        setState(next);
        advancingRef.current = false;
        setIsAdvancing(false);
        router.push("/final-report");
        return;
      }

      const result = advanceGameState(current);
      if (result.advanced) {
        setState(result.state);
        if (result.settlement) {
          setTurnResult({
            fromTurn: current.turn,
            toTurn: result.state.turn,
            settlement: result.settlement,
            marketing: result.marketing,
            researchSpend: result.researchSpend,
            unansweredCount: result.unansweredCount,
            unansweredPenalty: result.unansweredPenalty,
            interest: result.interest,
            insolvency: result.insolvency,
            loan: null,
            bankrupt: false,
            endReason: null,
            fundsBefore: current.availableFunds,
            fundsAfter: result.state.availableFunds,
            trustBefore: current.trustScore,
            trustAfter: result.state.trustScore,
          });
        }
      }

      advancingRef.current = false;
      setIsAdvancing(false);
    }, SETTLEMENT_DELAY_MS);
  }, [state, router]);

  const acceptEmergencyLoan = useCallback(() => {
    if (advancingRef.current) return;
    const current = stateRef.current;
    const next = acceptLoanFor(current);
    // 判断待ちでない・融資を受けられない場合（連打の 2 回目など）は何もしない
    if (next === current) return;
    stateRef.current = next;
    setState(next);
    setTurnResult((prev) =>
      prev && {
        ...prev,
        toTurn: next.turn,
        insolvency: null,
        loan: next.loans.at(-1) ?? null,
        fundsAfter: next.availableFunds,
        trustAfter: next.trustScore,
      },
    );
  }, []);

  const declareBankruptcy = useCallback(() => {
    if (advancingRef.current) return;
    const current = stateRef.current;
    const next = declareBankruptcyFor(current);
    if (next === current) return;
    stateRef.current = next;
    setState(next);
    setTurnResult((prev) =>
      prev && {
        ...prev,
        insolvency: null,
        bankrupt: true,
        endReason: next.endReason,
      },
    );
  }, []);

  const dismissTurnResult = useCallback(() => {
    // 緊急経営判断は、融資か倒産かを選ぶまで閉じられない
    if (stateRef.current.pendingInsolvency) return;
    setTurnResult(null);
  }, []);

  const setTotalTurns = useCallback(
    (totalTurns: number) => {
      updatePlayState((prev) => ({
        ...prev,
        // 進行済みのターンより短くはできず、データがある範囲に収める
        totalTurns: Math.max(prev.turn, Math.min(totalTurns, MAX_TURNS)),
      }));
    },
    [updatePlayState],
  );

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

  const jumpToTurn = useCallback(
    (turn: number) => {
      stopAdvancing();
      setTurnResult(null);
      setState((prev) => {
        const target = Math.max(1, Math.min(turn, prev.totalTurns));
        if (target === prev.turn && !prev.gameCompleted) return prev;
        return {
          ...prev,
          turn: target,
          // ターン移動により、そのターンの進行状況と完了状態は無効化する
          marketingCommitted: false,
          proposalsCompleted: [],
          gameCompleted: false,
          bankrupt: false,
          endReason: null,
          // 判断待ちは取り消す。借入は資金と同じく引き継ぐ
          pendingInsolvency: null,
          demoOperated: true,
        };
      });
    },
    [stopAdvancing],
  );

  // 配分は確定するまで自由に変えられるが、確定したらその年は変更できない
  const updateMarketingPlan = useCallback(
    (plan: MarketingPlan) => {
      updatePlayState((prev) =>
        canEditPlan(prev) ? { ...prev, marketingPlan: plan } : prev,
      );
    },
    [updatePlayState],
  );

  const commitMarketingPlan = useCallback(() => {
    updatePlayState((prev) =>
      canEditPlan(prev) ? { ...prev, marketingCommitted: true } : prev,
    );
  }, [updatePlayState]);

  const skipMarketing = useCallback(() => {
    updatePlayState((prev) =>
      canEditPlan(prev)
        ? { ...prev, marketingPlan: emptyPlan(), marketingCommitted: true }
        : prev,
    );
  }, [updatePlayState]);

  const purchaseResearchReport = useCallback(
    (reportId: string, cost: number) => {
      // 二重購入・資金不足・終了後の判定は purchaseResearch 側で行う
      updatePlayState((prev) => purchaseResearch(prev, reportId, cost));
    },
    [updatePlayState],
  );

  const startGame = useCallback(
    (mode: GameMode, playerName?: string) => {
      stopAdvancing();
      setTurnResult(null);
      setState((prev) =>
        createInitialGameState(mode, {
          playerName: playerName?.trim() || prev.playerName,
        }),
      );
    },
    [stopAdvancing],
  );

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
      if (advancingRef.current) return null;
      const resolution = resolveProposal(
        stateRef.current,
        requestId,
        focusPriority,
      );
      if (resolution) {
        stateRef.current = resolution.state;
        setState(resolution.state);
      }
      return resolution;
    },
    [],
  );

  const declineProposal = useCallback((requestId: string) => {
    if (advancingRef.current) return;
    const current = stateRef.current;
    const next = declineRequest(current, requestId);
    if (next === current) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const modeConfig = getModeConfig(state.mode);
  // 本案件に、前年の見込み引き合いで届いた追加案件（実践編）を加える
  const turnData = useMemo(
    () => ({
      ...getScenarioTurn(state.turn, state.mode),
      requests: requestsForTurn(state),
    }),
    [state],
  );
  const isLocked = isAdvancing || isPlayLocked(state);
  const hasProposalThisTurn = turnData.requests.some((r) =>
    state.proposalsCompleted.includes(r.id),
  );
  const unanswered = useMemo(() => unansweredRequests(state), [state]);
  const penalty = unansweredPenalty(state);
  const canCreateProposal = state.marketingCommitted && !isLocked;
  const canEndTurn = canEndTurnFor(state) && !isAdvancing;
  const isPlanLocked = isAdvancing || !canEditPlan(state);
  const spendable = spendableFunds(state);
  const debt = outstandingDebt(state);
  const nextInterest = annualInterest(state);
  const creditLeft = remainingCredit(state);
  const loansLeft = remainingLoanCount(state);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      modeConfig,
      turnData,
      isFinalTurn,
      isAdvancing,
      isLocked,
      advanceTurn,
      turnResult,
      dismissTurnResult,
      acceptEmergencyLoan,
      declareBankruptcy,
      debt,
      nextInterest,
      creditLeft,
      loansLeft,
      setTotalTurns,
      addTeam,
      removeTeam,
      jumpToTurn,
      updateMarketingPlan,
      commitMarketingPlan,
      skipMarketing,
      isPlanLocked,
      purchaseResearchReport,
      hasReport: (reportId: string) =>
        state.researchPurchases.some((p) => p.reportId === reportId),
      spendable,
      resetGame,
      startGame,
      setPlayerName,
      completeProposal,
      declineProposal,
      isProposalCompleted: (requestId: string) => isAnswered(state, requestId),
      dealOutcome: (requestId: string) => state.dealOutcomes[requestId] ?? null,
      hasProposalThisTurn,
      unanswered,
      unansweredPenalty: penalty,
      canCreateProposal,
      canEndTurn,
    }),
    [
      state,
      modeConfig,
      turnData,
      isFinalTurn,
      isAdvancing,
      isLocked,
      advanceTurn,
      turnResult,
      dismissTurnResult,
      acceptEmergencyLoan,
      declareBankruptcy,
      debt,
      nextInterest,
      creditLeft,
      loansLeft,
      setTotalTurns,
      addTeam,
      removeTeam,
      jumpToTurn,
      updateMarketingPlan,
      commitMarketingPlan,
      skipMarketing,
      isPlanLocked,
      purchaseResearchReport,
      spendable,
      resetGame,
      startGame,
      setPlayerName,
      completeProposal,
      declineProposal,
      hasProposalThisTurn,
      unanswered,
      penalty,
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

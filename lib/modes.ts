import { getTurnData, initialGameState, turns } from "./mock-data";
import type { GameMode, GameState, TurnData } from "./types";

/**
 * 難易度（シナリオ）ごとの設定。
 * 「導入編」は従来のデータそのまま、「実践編」は同じ5年間のシナリオを
 * 厳しい市況・顧客予算・提案条件に補正して遊ぶ。
 */
export type ModeConfig = {
  id: GameMode;
  label: string;
  /** 選択画面・バッジ用の英字ラベル */
  tag: string;
  description: string;
  /** 選択画面に並べる主な違い */
  highlights: string[];
  /** 開始時の資金（USD） */
  initialFunds: number;
  /** 開始時の信頼度スコア */
  initialTrust: number;
  /** 船主要求の想定予算（受注額）の倍率 */
  requestBudgetRate: number;
  /** 決算で計上される売上の倍率 */
  settlementRevenueRate: number;
  /** 決算で計上される固定費の倍率 */
  settlementExpenseRate: number;
  /** 受注時の信頼度変動 */
  winTrustDelta: number;
  /** 失注時の信頼度変動 */
  loseTrustDelta: number;
  /**
   * 受注に必要な「訴求ポイントに対応するチャネル」への最低投資額（USD）。
   * 0 の場合は最大投資チャネルと一致するだけで受注できる。
   */
  minSynergySpend: number;
  /** 最終レポートで B2B 指標（ROI・CPA など）を表示するか */
  showAdvancedMetrics: boolean;
};

export const modeConfigs: Record<GameMode, ModeConfig> = {
  intro: {
    id: "intro",
    label: "導入編",
    tag: "INTRODUCTORY",
    description:
      "ゲームの流れと、投資チャネルと顧客ニーズの関係を学ぶための標準シナリオです。",
    highlights: [
      "初期資金 $500,000 / 信頼度 50",
      "船主の想定予算は標準水準",
      "最大投資チャネルが訴求ポイントに合えば受注",
    ],
    initialFunds: initialGameState.availableFunds,
    initialTrust: initialGameState.trustScore,
    requestBudgetRate: 1,
    settlementRevenueRate: 1,
    settlementExpenseRate: 1,
    winTrustDelta: 8,
    loseTrustDelta: -8,
    minSynergySpend: 0,
    showAdvancedMetrics: false,
  },
  advanced: {
    id: "advanced",
    label: "実践編",
    tag: "ADVANCED",
    description:
      "競合の値下げ圧力と市況悪化を織り込んだ上級シナリオ。投資対効果（ROI・CPA）まで問われます。",
    highlights: [
      "初期資金 $400,000 / 信頼度 40",
      "船主の想定予算 −30%、決算の売上 −30%・固定費 +20%",
      "受注には対応チャネルへ $100,000 以上の投資が必要",
      "失注時の信頼度ペナルティ −12",
      "最終レポートで ROI・CPA などの B2B 指標を評価",
    ],
    initialFunds: 400_000,
    initialTrust: 40,
    requestBudgetRate: 0.7,
    settlementRevenueRate: 0.7,
    settlementExpenseRate: 1.2,
    winTrustDelta: 6,
    loseTrustDelta: -12,
    minSynergySpend: 100_000,
    showAdvancedMetrics: true,
  },
};

export const gameModes: GameMode[] = ["intro", "advanced"];

export function getModeConfig(mode: GameMode): ModeConfig {
  return modeConfigs[mode];
}

/** 金額に倍率をかけ、$10,000 単位に丸める（表示上きりの良い値にするため） */
function scaleAmount(amount: number, rate: number): number {
  if (rate === 1) return amount;
  return Math.round((amount * rate) / 10_000) * 10_000;
}

/**
 * 指定ターンのデータを、難易度に応じて補正して返す。
 * 導入編ではターンデータをそのまま返す。
 */
export function getScenarioTurn(turn: number, mode: GameMode): TurnData {
  const base = getTurnData(turn);
  const cfg = getModeConfig(mode);
  if (mode === "intro") return base;

  return {
    ...base,
    requests: base.requests.map((r) => ({
      ...r,
      budget: scaleAmount(r.budget, cfg.requestBudgetRate),
    })),
    settlement: base.settlement && {
      ...base.settlement,
      revenue: scaleAmount(base.settlement.revenue, cfg.settlementRevenueRate),
      expense: scaleAmount(base.settlement.expense, cfg.settlementExpenseRate),
      highlights: [
        ...base.settlement.highlights,
        `${cfg.label}補正：市況悪化により売上 ×${cfg.settlementRevenueRate}・固定費 ×${cfg.settlementExpenseRate}`,
      ],
    },
  };
}

/** 難易度に応じて補正したシナリオ全ターン分のデータ */
export function scenarioTurns(mode: GameMode): TurnData[] {
  return turns.map((t) => getScenarioTurn(t.turn, mode));
}

/**
 * 指定した難易度でゲームを開始するときの状態を作る。
 * プレイヤー名や参加チームなど、プレイ内容と無関係な設定は引き継げる。
 */
export function createInitialGameState(
  mode: GameMode,
  carryOver: Partial<Pick<GameState, "playerName" | "teams" | "totalTurns">> = {},
): GameState {
  const cfg = getModeConfig(mode);
  return {
    ...initialGameState,
    ...carryOver,
    mode,
    availableFunds: cfg.initialFunds,
    trustScore: cfg.initialTrust,
  };
}

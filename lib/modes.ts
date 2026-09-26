import { getTurnData, initialGameState, turns } from "./mock-data";
import type { SynergyRule } from "./synergy";
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
   * 提案を辞退した場合の信頼度変動。
   * 「無視（未回答）＜ 裏付けのない提案（失注）＜ 誠実な辞退」の順に傷が浅い。
   */
  declineTrustDelta: number;
  /**
   * 船主の要求に回答しないままターンを終えた場合の信頼度変動（1件あたり）。
   * 顧客を無視するほうが「負ける提案」より悪い、という B2B の原則に合わせ、
   * 失注時より重くしている。
   */
  ignoreTrustDelta: number;
  /**
   * 受注に必要な「訴求ポイントに対応するチャネル」の配分比（0–1）。
   * 均等配分（5チャネル × 20%）では届かない水準にしている。
   */
  minSynergyShare: number;
  /**
   * 受注に必要な「訴求ポイントに対応するチャネル」への最低投資額（USD）。
   * 0 の場合は配分比の条件のみ。
   */
  minSynergySpend: number;
  /** 最終レポートで B2B 指標（ROI・CPA など）を表示するか */
  showAdvancedMetrics: boolean;
  /**
   * 提案画面で、各訴求ポイントの裏付けになる施策と、訴求ラインに届いているかを見せるか。
   * 実践編では見せず、予算配分の段階で自分で見極めさせる。
   */
  showProposalBacking: boolean;
  /** 予算画面に「均等配分」ボタン（全施策へ均等に配る見本）を出すか。実践編では自分で考えさせる */
  showEvenSplitPreset: boolean;
  /** 市場調査の示唆を、関係する船主の顧客プロファイルに表示するか */
  researchInsightsInProfile: boolean;
  /**
   * 船主の重視項目の「順番」を、関係する市場調査を購入するまで隠すか。
   * 隠している間は順不同で表示し、第1優先がどれかは分からない。
   */
  hidePriorityOrderUntilResearched: boolean;
  /** 関係する市場調査を購入済みの船主から受注したときの、信頼度の上乗せ */
  researchWinTrustBonus: number;
  /**
   * 市場調査で分かった重視順が有効な年数（購入年を含む）。null = 期限なし。
   * 期限が切れたレポートは、更新版として買い直せる。
   */
  researchValidYears: number | null;
  /** 更新版の値段（元の値段に対する割合） */
  researchRenewalRate: number;
  /**
   * 前年の見込み引き合い件数が、この基準に届くたびに翌年の追加案件が 1 件届く。
   * 空配列 = 追加案件なし。
   */
  extraRequestLeadThresholds: number[];
  /** 決算で資金がマイナスになったときの緊急融資の条件 */
  emergencyLoan: EmergencyLoanConfig;
};

export type EmergencyLoanConfig = {
  /** 不足額に上乗せする、翌年のマーケティング活動資金（USD） */
  workingCapital: number;
  /** 累計借入の上限（USD）。初期資金と同額 */
  creditLimit: number;
  /** 融資を受けられる回数の上限 */
  maxLoans: number;
  /** 2回目以降の融資に上乗せする金利（0–1） */
  repeatLoanPenaltyRate: number;
  /** 融資を受けたときの信頼度の変動（資金繰り悪化への市場・顧客の懸念） */
  trustPenalty: number;
};

/**
 * 緊急融資の金利表（信頼度が高いほど低金利）。上から順に判定する。
 * 2回目以降はここに repeatLoanPenaltyRate が上乗せされる。
 */
export const LOAN_RATE_TABLE: { minTrust: number; rate: number }[] = [
  { minTrust: 80, rate: 0.05 },
  { minTrust: 60, rate: 0.08 },
  { minTrust: 40, rate: 0.11 },
  { minTrust: 30, rate: 0.15 },
  { minTrust: 0, rate: 0.18 },
];

/** 信頼度で決まる融資の基本金利 */
export function loanBaseRate(trust: number): number {
  return (
    LOAN_RATE_TABLE.find((row) => trust >= row.minTrust)?.rate ??
    LOAN_RATE_TABLE[LOAN_RATE_TABLE.length - 1].rate
  );
}

/**
 * この金利以上での借入は、年次レビューで「実質的に破綻状態での延命措置」と注記する
 * （金利表の上限。2回目の上乗せ後もこれ以上になる）
 */
export const DISTRESSED_LOAN_RATE = 0.18;

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
      "訴求ポイントに対応する施策へ、配分全体の4分の1（25%）以上を投じれば受注",
      "第1優先に応えると満額、第2・第3優先は受注額80%・60%",
    ],
    initialFunds: initialGameState.availableFunds,
    initialTrust: initialGameState.trustScore,
    requestBudgetRate: 1,
    settlementRevenueRate: 1,
    settlementExpenseRate: 1,
    winTrustDelta: 8,
    loseTrustDelta: -8,
    declineTrustDelta: -4,
    ignoreTrustDelta: -10,
    minSynergyShare: 0.25,
    minSynergySpend: 0,
    showAdvancedMetrics: false,
    showProposalBacking: true,
    showEvenSplitPreset: true,
    researchInsightsInProfile: true,
    hidePriorityOrderUntilResearched: false,
    researchWinTrustBonus: 0,
    researchValidYears: null,
    researchRenewalRate: 1,
    extraRequestLeadThresholds: [],
    emergencyLoan: {
      workingCapital: 100_000,
      creditLimit: initialGameState.availableFunds,
      maxLoans: 2,
      repeatLoanPenaltyRate: 0.05,
      trustPenalty: -5,
    },
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
      "受注には対応する施策へ、配分全体の4分の1（25%）以上かつ $100,000 以上の投資が必要",
      "失注時の信頼度ペナルティ −12（辞退は −6、未回答は −15）",
      "決算で資金が不足すると、緊急融資（最大2回・信頼度で金利が決まる）か自主倒産かを判断",
      "船主の重視順は、関係する市場調査を買うまで分からない（有効期間2年・更新版は半額。調査済みの船主から受注すると信頼度 +2）",
      "前年の見込み引き合いが20件・35件に届くと、翌年に追加案件が届く",
      "最終レポートで ROI・CPA などの B2B 指標と年次レビューを評価",
    ],
    initialFunds: 400_000,
    initialTrust: 40,
    requestBudgetRate: 0.7,
    settlementRevenueRate: 0.7,
    settlementExpenseRate: 1.2,
    winTrustDelta: 6,
    loseTrustDelta: -12,
    declineTrustDelta: -6,
    ignoreTrustDelta: -15,
    minSynergyShare: 0.25,
    minSynergySpend: 100_000,
    showAdvancedMetrics: true,
    showProposalBacking: false,
    showEvenSplitPreset: false,
    researchInsightsInProfile: false,
    hidePriorityOrderUntilResearched: true,
    researchWinTrustBonus: 2,
    researchValidYears: 2,
    researchRenewalRate: 0.5,
    extraRequestLeadThresholds: [20, 35],
    emergencyLoan: {
      workingCapital: 200_000,
      creditLimit: 400_000,
      maxLoans: 2,
      repeatLoanPenaltyRate: 0.05,
      trustPenalty: -5,
    },
  },
};

export const gameModes: GameMode[] = ["intro", "advanced"];

export function getModeConfig(mode: GameMode): ModeConfig {
  return modeConfigs[mode];
}

/** 難易度ごとの受注条件（シナジー判定のルール） */
export function synergyRuleFor(mode: GameMode): SynergyRule {
  const cfg = getModeConfig(mode);
  return { minShare: cfg.minSynergyShare, minSpend: cfg.minSynergySpend };
}

/** 金額に倍率をかけ、$10,000 単位に丸める（表示上きりの良い値にするため） */
export function scaleAmount(amount: number, rate: number): number {
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

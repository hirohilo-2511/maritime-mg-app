import { BUDGET_STEP, marketingChannels, planTotal } from "./marketing";
import type { FitAxisId } from "./customers";
import type { MarketingChannelId, MarketingPlan } from "./types";

/**
 * 提案の「シナジー」評価ロジック。
 *
 * 船主が重視する要素（評価軸）に対応するチャネルへ、配分全体の一定割合以上を
 * 投じていれば「提案に裏付けがある」とみなして受注する。
 * - 閾値は配分比（例：25%）。均等配分（5チャネル × 20%）では届かないため、
 *   「薄く広く」では勝てないが、2〜3チャネルに絞れば複数の顧客に同時に応えられる。
 * - 重視順位による報酬差：船主の第1優先に応えた提案は満額、第2・第3優先は
 *   受注額・信頼度の上昇が目減りする。要求を読まずに固定配分で勝ち続けるより、
 *   毎年の要求に合わせて配分を組み替えるほうが報われる。
 */

/** 船主要求の priorities（自由記述の日本語）を評価軸へ正規化する対応表 */
const priorityAxisMap: Record<string, FitAxisId> = {
  燃費性能: "fuel",
  規制適合: "fuel",
  技術力: "fuel",
  開発力: "fuel",
  共同開発体制: "fuel",
  納期: "delivery",
  保証条件: "support",
  サポート体制: "support",
  保守契約: "support",
  "24時間サポート": "support",
  サポート拠点: "support",
  価格: "price",
  初期投資額: "price",
  ライフサイクルコスト: "price",
  実績: "record",
  船隊一括対応: "record",
  標準化対応: "record",
};

/** 未知の priority 文言は「実績評価」寄りとして扱う（フォールバック） */
export function axisForPriority(priority: string): FitAxisId {
  return priorityAxisMap[priority] ?? "record";
}

/**
 * 評価軸ごとに最も相性の良いマーケティングチャネル（ゲームデザイン上の対応）。
 * - price（価格競争力）    → expo：大手意思決定層と直接交渉できる場
 * - support（サポート体制）→ fieldSales：継続的な訪問・関係構築
 * - fuel（燃費・技術力）   → seminar：技術説明会での訴求
 * - record（実績）        → tradePress：業界内での評判・認知
 * - delivery（納期）      → digital：スピード感のある低摩擦な接点
 */
export const axisChannel: Record<FitAxisId, MarketingChannelId> = {
  price: "expo",
  support: "fieldSales",
  fuel: "seminar",
  record: "tradePress",
  delivery: "digital",
};

/** 訴求ポイントに対応するチャネル */
export function channelForPriority(priority: string): MarketingChannelId {
  return axisChannel[axisForPriority(priority)];
}

/**
 * 重視順位ごとの報酬率（受注額・信頼度上昇にかける倍率）。
 * 船主要求の priorities は重要な順に並んでいる。
 */
export const PRIORITY_REWARD_RATES = [1, 0.8, 0.6] as const;

export function priorityRewardRate(rank: number): number {
  if (rank < 0) return PRIORITY_REWARD_RATES[PRIORITY_REWARD_RATES.length - 1];
  return PRIORITY_REWARD_RATES[
    Math.min(rank, PRIORITY_REWARD_RATES.length - 1)
  ];
}

/** 配分全体に占めるチャネルの割合（0–1）。配分が 0 の場合は 0 */
export function channelShare(
  plan: MarketingPlan,
  channel: MarketingChannelId,
): number {
  const total = planTotal(plan);
  return total > 0 ? plan[channel] / total : 0;
}

/** 配分比が閾値以上か（浮動小数の誤差を避けるため整数で比較する） */
function meetsShare(
  plan: MarketingPlan,
  channel: MarketingChannelId,
  minShare: number,
): boolean {
  const amount = plan[channel];
  if (amount <= 0) return false;
  return amount * 1000 >= planTotal(plan) * Math.round(minShare * 1000);
}

/**
 * 受注条件を満たすために、そのチャネルへ追加で必要な投資額（刻み単位に切り上げ）。
 * 追加分は配分全体にも加わる前提で計算する：(s + x) / (T + x) ≥ q かつ s + x ≥ minSpend
 */
export function additionalSpendNeeded(
  plan: MarketingPlan,
  channel: MarketingChannelId,
  minShare: number,
  minSpend: number,
): number {
  const s = plan[channel];
  const total = planTotal(plan);
  const byShare =
    minShare >= 1 ? Infinity : Math.max(0, (minShare * total - s) / (1 - minShare));
  const bySpend = Math.max(0, minSpend - s);
  let x = Math.max(byShare, bySpend);
  // 配分が 0 のチャネルは、少なくとも 1 刻みは必要
  if (s + x <= 0) x = BUDGET_STEP;
  return Math.ceil(x / BUDGET_STEP - 1e-9) * BUDGET_STEP;
}

export type SynergyRule = {
  /** 受注に必要な、対応チャネルの配分比（0–1） */
  minShare: number;
  /** 受注に必要な、対応チャネルへの最低投資額（USD。0 = 条件なし） */
  minSpend: number;
};

export type SynergyResult = {
  /** 提案で選んだ訴求ポイントに対応する評価軸 */
  axis: FitAxisId;
  /** その評価軸に対応するチャネル */
  requiredChannel: MarketingChannelId;
  /** 対応チャネルへの投資額 */
  requiredChannelSpend: number;
  /** 対応チャネルの配分比（0–1） */
  requiredChannelShare: number;
  /** 受注に必要な配分比 */
  minShare: number;
  /** 受注に必要な対応チャネルへの最低投資額（難易度で変わる。0 = 条件なし） */
  minSpend: number;
  /** 訴求ポイントが船主の重視項目の何番目か（0 = 第1優先。重視項目にない場合は -1） */
  priorityRank: number;
  /** 受注時の報酬率（重視順位で決まる） */
  rewardRate: number;
  /** 受注条件を満たすのに追加で必要だった投資額（受注時は 0） */
  shortfall: number;
  /**
   * 判定理由。
   * - match：配分比・投資額の条件を満たした
   * - lowShare：対応チャネルの配分比が閾値に届かない（訴求の裏付けが弱い）
   * - underinvested：配分比は足りているが、投資額が最低条件に届かない（実践編）
   */
  reason: "match" | "lowShare" | "underinvested";
  /** 受注できたか */
  won: boolean;
};

/**
 * 提案内容（訴求ポイント）と今ターンの投資配分から、シナジーの結果を判定する。
 */
export function evaluateSynergy(
  focusPriority: string,
  priorities: string[],
  plan: MarketingPlan,
  rule: SynergyRule,
): SynergyResult {
  const axis = axisForPriority(focusPriority);
  const requiredChannel = axisChannel[axis];
  const requiredChannelSpend = plan[requiredChannel];
  const priorityRank = priorities.indexOf(focusPriority);

  const reason = !meetsShare(plan, requiredChannel, rule.minShare)
    ? "lowShare"
    : requiredChannelSpend < rule.minSpend
      ? "underinvested"
      : "match";
  const won = reason === "match";

  return {
    axis,
    requiredChannel,
    requiredChannelSpend,
    requiredChannelShare: channelShare(plan, requiredChannel),
    minShare: rule.minShare,
    minSpend: rule.minSpend,
    priorityRank,
    rewardRate: priorityRewardRate(priorityRank),
    shortfall: won
      ? 0
      : additionalSpendNeeded(plan, requiredChannel, rule.minShare, rule.minSpend),
    reason,
    won,
  };
}

/** 配分の中で受注条件を満たしているチャネル（予算画面の表示用） */
export function qualifyingChannels(
  plan: MarketingPlan,
  rule: SynergyRule,
): MarketingChannelId[] {
  return marketingChannels
    .map((c) => c.id)
    .filter(
      (id) => meetsShare(plan, id, rule.minShare) && plan[id] >= rule.minSpend,
    );
}

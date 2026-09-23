import { marketingChannels } from "./marketing";
import type { FitAxisId } from "./customers";
import type { MarketingChannelId, MarketingPlan } from "./types";

/**
 * 提案の「シナジー」評価ロジック。
 *
 * ゲームバランス上の意図的な調整：単に予算を積めば成果が出る単調なモデルをやめ、
 * 船主が重視する要素（評価軸）と、プレイヤーが最も多く投資したチャネルが
 * 噛み合っているかどうかで受注可否をオーバーに決める。
 * - ドンピシャ（要求する軸に対応するチャネルが「今ターンの最大投資チャネル」と一致）→ 即受注
 * - 的外れ（一致しない）→ どれだけ他チャネルに大金を投じていても即失注
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

/** 受注時に企業の信頼度スコアへ与える影響 */
export const SYNERGY_WIN_TRUST_DELTA = 8;
/** 失注（ミスマッチ）時に企業の信頼度スコアへ与える影響 */
export const SYNERGY_LOSE_TRUST_DELTA = -8;

/** 配分の中でもっとも投資額が大きいチャネルを返す（全チャネル 0 の場合は null） */
export function topInvestedChannel(plan: MarketingPlan): MarketingChannelId | null {
  let best: MarketingChannelId | null = null;
  let bestAmount = 0;
  for (const channel of marketingChannels) {
    const amount = plan[channel.id];
    if (amount > bestAmount) {
      bestAmount = amount;
      best = channel.id;
    }
  }
  return best;
}

export type SynergyResult = {
  /** 提案で選んだ訴求ポイントに対応する評価軸 */
  axis: FitAxisId;
  /** その評価軸にとって「ドンピシャ」なチャネル */
  requiredChannel: MarketingChannelId;
  /** 今ターン、実際にもっとも投資したチャネル */
  topChannel: MarketingChannelId | null;
  /** ドンピシャなチャネルへの投資額 */
  requiredChannelSpend: number;
  /** 受注できたか */
  won: boolean;
};

/** 提案内容（訴求ポイント）と今ターンの投資配分から、シナジーの結果を判定する */
export function evaluateSynergy(
  focusPriority: string,
  plan: MarketingPlan,
): SynergyResult {
  const axis = axisForPriority(focusPriority);
  const requiredChannel = axisChannel[axis];
  const topChannel = topInvestedChannel(plan);
  const requiredChannelSpend = plan[requiredChannel];

  return {
    axis,
    requiredChannel,
    topChannel,
    requiredChannelSpend,
    won: topChannel !== null && topChannel === requiredChannel,
  };
}

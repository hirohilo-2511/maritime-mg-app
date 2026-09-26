import type { IconName } from "@/components/ui/Icon";
import type {
  ChannelEffect,
  MarketingChannelId,
  MarketingOutcome,
  MarketingPlan,
} from "./types";

export type MarketingChannel = {
  id: MarketingChannelId;
  name: string;
  description: string;
  icon: IconName;
  /** 1チャネルに配分できる上限（USD） */
  max: number;
  /** 見込み引き合いの獲得効率（1ユニットあたりの件数） */
  leadEfficiency: number;
  /** 信頼度スコアへの寄与（1ユニットあたり） */
  trustWeight: number;
  /** 主に接点を持てるセグメント */
  segments: string[];
};

/** スライダーの刻み（USD） */
export const BUDGET_STEP = 10_000;

/** 効果計算の基準単位（USD）。この額で 1 ユニット分の効果になる */
const EFFECT_UNIT = 50_000;

/** 1ターンにマーケティングで得られる信頼度の上限 */
export const MAX_TRUST_GAIN_PER_TURN = 6;

export const marketingChannels: MarketingChannel[] = [
  {
    id: "expo",
    name: "国際海事展示会",
    description:
      "Posidonia / SMM などへの出展。大手船主の決裁者と価格・条件を直接詰められるが、費用は大きい。",
    icon: "megaphone",
    max: 400_000,
    leadEfficiency: 6,
    trustWeight: 1.2,
    segments: ["大手船主", "欧州", "アジア"],
  },
  {
    id: "fieldSales",
    name: "営業員の増員・訪問",
    description:
      "既存顧客のフォローと新規開拓。継続訪問で保守・サポート体制への安心感を示せるが、成果が出るまで時間がかかる。",
    icon: "customers",
    max: 300_000,
    leadEfficiency: 5,
    trustWeight: 1.2,
    segments: ["既存顧客", "国内", "中小船主"],
  },
  {
    id: "seminar",
    name: "技術セミナー",
    description:
      "規制対応をテーマにした技術説明会。件数は伸びにくいが、技術力の評価が大きく上がる。",
    icon: "presentation",
    max: 250_000,
    leadEfficiency: 3,
    trustWeight: 2,
    segments: ["技術部門", "管理会社"],
  },
  {
    id: "tradePress",
    name: "業界誌広告",
    description:
      "Maritime Daily などへの継続出稿。納入実績を業界に広く示せるが、引き合いへの転換率は低め。",
    icon: "book",
    max: 200_000,
    leadEfficiency: 4,
    trustWeight: 0.6,
    segments: ["業界全体"],
  },
  {
    id: "digital",
    name: "デジタル / オンライン",
    description:
      "検索広告とウェビナー、問い合わせへの即応。納期やスピード感を示せ、低コストで件数も稼げるが、大型案件の信頼獲得には繋がりにくい。",
    icon: "globe",
    max: 150_000,
    leadEfficiency: 7,
    trustWeight: 0.3,
    segments: ["新興船主", "全地域"],
  },
];

export function getChannel(id: MarketingChannelId): MarketingChannel {
  const channel = marketingChannels.find((c) => c.id === id);
  if (!channel) throw new Error(`未知のマーケティングチャネル: ${id}`);
  return channel;
}

/** 全チャネル 0 の配分を作る */
export function emptyPlan(): MarketingPlan {
  return marketingChannels.reduce((plan, channel) => {
    plan[channel.id] = 0;
    return plan;
  }, {} as MarketingPlan);
}

/** 配分合計（USD） */
export function planTotal(plan: MarketingPlan): number {
  return marketingChannels.reduce((sum, channel) => sum + plan[channel.id], 0);
}

/**
 * チャネル単体の見込み効果。
 * 投資額の平方根に比例させることで収穫逓減を表現し、
 * 1チャネルへの集中よりも配分の妙が効くようにしている。
 */
export function simulateChannel(
  channel: MarketingChannel,
  amount: number,
): ChannelEffect {
  if (amount <= 0) return { leads: 0, trustDelta: 0 };
  const units = Math.sqrt(amount / EFFECT_UNIT);
  return {
    leads: Math.round(channel.leadEfficiency * units),
    trustDelta: Math.round(channel.trustWeight * units),
  };
}

/** 配分全体の見込み効果 */
export function simulateMarketing(plan: MarketingPlan): MarketingOutcome {
  const byChannel = {} as Record<MarketingChannelId, ChannelEffect>;
  let leads = 0;
  let rawTrust = 0;

  for (const channel of marketingChannels) {
    const effect = simulateChannel(channel, plan[channel.id]);
    byChannel[channel.id] = effect;
    leads += effect.leads;
    rawTrust += effect.trustDelta;
  }

  const spend = planTotal(plan);

  return {
    spend,
    leads,
    // 1ターンあたりの信頼度上昇には上限を設ける
    trustDelta: Math.min(rawTrust, MAX_TRUST_GAIN_PER_TURN),
    costPerLead: leads > 0 ? Math.round(spend / leads) : null,
    byChannel,
  };
}

/**
 * 指定予算を全チャネルへ均等配分する（刻みと上限を考慮）。
 * 上限で余った分は他チャネルへ回さず切り捨てる簡易版。
 */
export function evenSplit(budget: number): MarketingPlan {
  const per =
    Math.floor(budget / marketingChannels.length / BUDGET_STEP) * BUDGET_STEP;
  return marketingChannels.reduce((plan, channel) => {
    plan[channel.id] = Math.min(Math.max(per, 0), channel.max);
    return plan;
  }, {} as MarketingPlan);
}

/** 投資額に対する売上倍率（ROI）。投資が 0 の場合は null */
export function calcRoi(revenue: number, spend: number): number | null {
  if (spend <= 0) return null;
  return revenue / spend;
}

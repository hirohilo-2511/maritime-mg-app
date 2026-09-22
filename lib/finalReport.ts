import { turns, initialGameState } from "./mock-data";
import { marketingChannels, type MarketingChannel } from "./marketing";
import type { GameState, MarketingChannelId } from "./types";

export type Grade = "S" | "A" | "B" | "C";

export type ChannelBreakdown = {
  channel: MarketingChannel;
  amount: number;
  /** 総マーケティング投資額に対する比率（0–1） */
  share: number;
};

export type FinalReportData = {
  grade: Grade;
  gradeTagline: string;
  finalFunds: number;
  fundsDelta: number;
  finalTrust: number;
  totalLeads: number;
  totalMarketingSpend: number;
  channelBreakdown: ChannelBreakdown[];
  styleLabel: string;
  styleCommentary: string;
  ifStory: string;
  businessHint: string;
};

/**
 * 総合評価（S/A/B/C）を判定する。
 * プロトタイプ用の簡易ロジック：資金の伸び（初期資金比）と信頼度スコアを
 * 1つの指標に合成し、しきい値で 4 段階に分ける。
 */
function gradeFor(finalFunds: number, finalTrust: number): Grade {
  const fundsScore = (finalFunds / initialGameState.availableFunds) * 20;
  const composite = fundsScore + finalTrust;

  if (composite >= 170) return "S";
  if (composite >= 140) return "A";
  if (composite >= 100) return "B";
  return "C";
}

const gradeTaglines: Record<Grade, string> = {
  S: "業界内でも突出した経営判断でした。市場の変化を先読みし、投資と受注確度を高い水準で両立させています。",
  A: "堅実かつ機動力のある経営でした。資金・信頼度ともにバランス良く伸ばせています。",
  B: "平均的な経営判断でした。基礎は固められていますが、投資判断でさらに伸ばせる余地があります。",
  C: "厳しい5年間でした。資金・信頼度のいずれか、あるいは両方が伸び悩む結果になっています。",
};

const styleCopy: Record<
  MarketingChannelId,
  { label: string; describe: (sharePct: number) => string }
> = {
  expo: {
    label: "大手船主開拓型",
    describe: (p) =>
      `マーケティング投資の${p}%を国際海事展示会に集中させ、大手船主の意思決定層との直接接点づくりを優先しました。`,
  },
  fieldSales: {
    label: "既存顧客深耕型",
    describe: (p) =>
      `マーケティング投資の${p}%を営業員の増員・訪問に振り向け、既存顧客との関係を粘り強く深める戦略でした。`,
  },
  seminar: {
    label: "技術訴求型",
    describe: (p) =>
      `マーケティング投資の${p}%を技術セミナーに投じ、件数よりも信頼度・技術力の訴求を重視する堅実な戦略でした。`,
  },
  tradePress: {
    label: "認知拡大型",
    describe: (p) =>
      `マーケティング投資の${p}%を業界誌広告に配分し、業界全体への継続的な認知獲得を優先しました。`,
  },
  digital: {
    label: "短期受注重視型",
    describe: (p) =>
      `マーケティング投資の${p}%をデジタル施策に配分し、低コストで引き合い件数を稼ぐ短期成果重視の戦略でした。`,
  },
};

function buildStyle(
  channelBreakdown: ChannelBreakdown[],
  finalTrust: number,
): { label: string; commentary: string } {
  const totalSpend = channelBreakdown.reduce((sum, c) => sum + c.amount, 0);

  if (totalSpend === 0) {
    return {
      label: "予算未活用型",
      commentary:
        "5年間を通じてマーケティング予算をほとんど確定しませんでした。守りの経営でしたが、引き合い拡大や信頼度向上の機会を逃した可能性があります。",
    };
  }

  const top = [...channelBreakdown].sort((a, b) => b.amount - a.amount)[0];
  const sharePct = Math.round(top.share * 100);
  const copy = styleCopy[top.channel.id];
  const fitCommentary =
    finalTrust >= 70
      ? "この方針は最終的な信頼度スコアの高さにも表れており、規制強化が続く市場環境と相性の良い投資判断だったと言えます。"
      : "一方で信頼度スコアは伸び悩んでおり、技術訴求や既存顧客フォローとのバランスを見直す余地がありました。";

  return {
    label: copy.label,
    commentary: `${copy.describe(sharePct)}${fitCommentary}`,
  };
}

function buildIfStory(state: GameState): string {
  const history = state.marketingHistory;
  if (history.length === 0) {
    return "マーケティング予算を一度も確定しなかったため、投資による『もしも』を語る材料がありません。次にプレイする際は、まず1年目の予算配分から着手してみてください。";
  }

  // 技術セミナーへの投資がもっとも手薄だったターンを探す
  const weakest = [...history].sort(
    (a, b) => a.plan.seminar - b.plan.seminar,
  )[0];
  const turnData = turns.find((t) => t.turn === weakest.turn);
  const bigRequest = turnData?.requests
    .filter((r) => r.priorities.length > 0)
    .sort((a, b) => b.budget - a.budget)[0];

  if (!bigRequest) {
    return "投資配分に大きな偏りは見られませんでした。次のプレイでは、あえて1つのチャネルに集中投資してみると違う展開が見えるかもしれません。";
  }

  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

  return `もし${weakest.turn}年目に技術セミナーへの投資をもう一段強化していれば、${bigRequest.owner}（想定予算 ${usd(
    bigRequest.budget,
  )}）が重視していた「${bigRequest.priorities[0]}」の訴求力が高まり、あの案件の受注確度をさらに引き上げられたかもしれません。`;
}

const businessHints = [
  "このシミュレーションで得た『船主ごとに重視するポイントが異なる』という視点を、実際の担当顧客の要件整理にどう活かしますか？",
  "限られた予算をチャネルに配分する判断は、実務の販促・広告予算の配分とも重なります。今回の投資配分の反省点を、来期の予算計画にどう反映しますか？",
  "顧客の『隠れた要件』を見抜くには、表面的な要求だけでなく背景にある事情を読む必要があります。次に顧客と対話する際、どんな質問でそれを引き出しますか？",
];

function buildBusinessHint(state: GameState): string {
  // 決定論的だが、プレイ内容（信頼度スコア）によってヒントを変える
  const index = state.trustScore % businessHints.length;
  return businessHints[index];
}

/** 最終ターン終了後の状態から、総合フィードバック画面のデータを組み立てる */
export function buildFinalReport(state: GameState): FinalReportData {
  const totalMarketingSpend = state.marketingHistory.reduce(
    (sum, h) => sum + h.spend,
    0,
  );
  const totalLeads = state.marketingHistory.reduce(
    (sum, h) => sum + h.leads,
    0,
  );

  const channelBreakdown: ChannelBreakdown[] = marketingChannels.map(
    (channel) => {
      const amount = state.marketingHistory.reduce(
        (sum, h) => sum + h.plan[channel.id],
        0,
      );
      return { channel, amount, share: 0 };
    },
  );
  const totalChannelSpend = channelBreakdown.reduce(
    (sum, c) => sum + c.amount,
    0,
  );
  for (const c of channelBreakdown) {
    c.share = totalChannelSpend > 0 ? c.amount / totalChannelSpend : 0;
  }

  const grade = gradeFor(state.availableFunds, state.trustScore);
  const style = buildStyle(channelBreakdown, state.trustScore);

  return {
    grade,
    gradeTagline: gradeTaglines[grade],
    finalFunds: state.availableFunds,
    fundsDelta: state.availableFunds - initialGameState.availableFunds,
    finalTrust: state.trustScore,
    totalLeads,
    totalMarketingSpend,
    channelBreakdown: channelBreakdown.sort((a, b) => b.amount - a.amount),
    styleLabel: style.label,
    styleCommentary: style.commentary,
    ifStory: buildIfStory(state),
    businessHint: buildBusinessHint(state),
  };
}

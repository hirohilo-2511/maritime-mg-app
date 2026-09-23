import { buildB2bMetrics, type B2bMetrics } from "./b2bMetrics";
import { marketingChannels, type MarketingChannel } from "./marketing";
import { getModeConfig, getScenarioTurn } from "./modes";
import type { GameMode, GameState, MarketingChannelId } from "./types";

export type Grade = "S" | "A" | "B" | "C";

export type ChannelBreakdown = {
  channel: MarketingChannel;
  amount: number;
  /** 総マーケティング投資額に対する比率（0–1） */
  share: number;
};

export type FinalReportData = {
  mode: GameMode;
  grade: Grade;
  gradeTagline: string;
  /** なぜその評価になったのか（財務と信頼度のバランス）を説明する詳細テキスト */
  evaluationReason: string;
  finalFunds: number;
  /** 開始時の資金（難易度によって異なる） */
  initialFunds: number;
  fundsDelta: number;
  finalTrust: number;
  totalLeads: number;
  totalMarketingSpend: number;
  channelBreakdown: ChannelBreakdown[];
  styleLabel: string;
  styleCommentary: string;
  ifStory: string;
  businessHint: string;
  /** 実践編のみ：ROI・CPA などの B2B マーケティング指標 */
  b2bMetrics: B2bMetrics | null;
};

/**
 * S 評価の条件。資金と信頼度を合成した指標ではなく、両方を個別に満たす必要がある。
 * （合成指標だと資金が大きく伸びるだけで S に届いてしまうため）
 */
export const S_RANK_MIN_TRUST = 95;
export const S_RANK_MIN_FUNDS_RATIO = 1.3;

/** S 評価の条件を満たしているか */
function meetsSRank(fundsRatio: number, finalTrust: number): boolean {
  return (
    finalTrust >= S_RANK_MIN_TRUST && fundsRatio >= S_RANK_MIN_FUNDS_RATIO
  );
}

/**
 * 総合評価（S/A/B/C）を判定する。
 * - S：信頼度 95 以上 かつ 最終資金が初期資金の 130% 以上（両方必須）
 * - A〜C：資金の伸び（初期資金比）と信頼度スコアを合成した指標のしきい値で判定
 * 合成指標がどれだけ高くても、S の条件を満たさなければ A に留まる。
 * 受注額がそのまま資金に入るため資金は数十倍まで伸びうる。資金だけで
 * 信頼度の低さを補えないよう、合成に使う資金比は FUNDS_RATIO_CAP で頭打ちにする
 * （A には信頼度 80 以上、B には 40 以上が実質的に必要になる）。
 */
const FUNDS_RATIO_CAP = 3;

function gradeFor(fundsRatio: number, finalTrust: number): Grade {
  if (meetsSRank(fundsRatio, finalTrust)) return "S";

  const composite = Math.min(fundsRatio, FUNDS_RATIO_CAP) * 20 + finalTrust;
  if (composite >= 140) return "A";
  if (composite >= 100) return "B";
  return "C";
}

const gradeTaglines: Record<Grade, string> = {
  S: "業界内でも突出した経営判断でした。顧客からほぼ全幅の信頼を得たうえで、財務も大きく伸ばしています。",
  A: "堅実かつ機動力のある経営でした。資金・信頼度ともにバランス良く伸ばせています。",
  B: "平均的な経営判断でした。基礎は固められていますが、投資判断でさらに伸ばせる余地があります。",
  C: "厳しい5年間でした。資金・信頼度のいずれか、あるいは両方が伸び悩む結果になっています。",
};

type PerformanceTier = "excellent" | "good" | "flat" | "poor";

/** 資金の伸び（初期資金比）を 4 段階に分類する */
function fundsTier(ratio: number): PerformanceTier {
  if (ratio >= 3) return "excellent";
  if (ratio >= 1.5) return "good";
  if (ratio >= 0.8) return "flat";
  return "poor";
}

/** 信頼度スコアを 4 段階に分類する */
function trustTier(trust: number): PerformanceTier {
  if (trust >= 85) return "excellent";
  if (trust >= 65) return "good";
  if (trust >= 40) return "flat";
  return "poor";
}

const isStrong = (tier: PerformanceTier) =>
  tier === "excellent" || tier === "good";

/**
 * 「なぜその評価になったのか」を説明する詳細テキストを生成する。
 * 総合評価は財務（最終資金）と信頼度（顧客満足）の合成指標だが、
 * 画面上ではその内訳が見えないため、片方だけが極端に高い／低い場合に
 * ギャップを明示する（例：信頼度は満点でも財務が悪化していれば B 評価、など）。
 */
function buildEvaluationReason(
  grade: Grade,
  ratio: number,
  finalTrust: number,
): string {
  const fundsPct = Math.round(ratio * 100);
  const fTier = fundsTier(ratio);
  const tTier = trustTier(finalTrust);

  const trustPhrase: Record<PerformanceTier, string> = {
    excellent: `信頼度スコアは${finalTrust}点と非常に高い水準です`,
    good: `信頼度スコアは${finalTrust}点と良好な水準です`,
    flat: `信頼度スコアは${finalTrust}点と平均的な水準です`,
    poor: `信頼度スコアは${finalTrust}点と低調な水準です`,
  };
  const fundsPhrase: Record<PerformanceTier, string> = {
    excellent: `一方、最終資金は初期資金比${fundsPct}%まで大きく伸び、投資は十分に回収できています`,
    good: `一方、最終資金は初期資金比${fundsPct}%まで着実に増加しました`,
    flat: `一方、最終資金は初期資金比${fundsPct}%とほぼ横ばいで、投資額に見合った増加には至っていません`,
    poor: `一方、最終資金は初期資金比${fundsPct}%まで落ち込み、投資額に対して利益が伴っていません`,
  };

  let verdict: string;
  if (isStrong(tTier) && !isStrong(fTier)) {
    verdict = `信頼度は高い一方で財務状況が悪化しているため、総合評価は${grade}に留まっています。`;
  } else if (isStrong(fTier) && !isStrong(tTier)) {
    verdict = `資金面は好調な一方で顧客からの信頼が伴っていないため、総合評価は${grade}に留まっています。`;
  } else if (isStrong(tTier) && isStrong(fTier)) {
    verdict = `財務・信頼度の両面で高い成果を上げられたため、総合評価は${grade}となりました。`;
  } else {
    verdict = `財務・信頼度のいずれも伸び悩んだ結果、総合評価は${grade}となりました。`;
  }

  return `${trustPhrase[tTier]}。${fundsPhrase[fTier]}。${verdict}${sRankNote(
    grade,
    ratio,
    finalTrust,
  )}`;
}

/** S 評価に届かなかった場合に、何が足りなかったのかを具体的に示す */
function sRankNote(grade: Grade, ratio: number, finalTrust: number): string {
  if (grade === "S") {
    return `S評価の条件（信頼度${S_RANK_MIN_TRUST}以上 かつ 最終資金が初期資金比${Math.round(
      S_RANK_MIN_FUNDS_RATIO * 100,
    )}%以上）をどちらも満たしました。`;
  }

  const gaps: string[] = [];
  if (finalTrust < S_RANK_MIN_TRUST) {
    gaps.push(`信頼度があと${S_RANK_MIN_TRUST - finalTrust}点`);
  }
  if (ratio < S_RANK_MIN_FUNDS_RATIO) {
    gaps.push(
      `最終資金があと初期資金比${Math.ceil(
        (S_RANK_MIN_FUNDS_RATIO - ratio) * 100,
      )}ポイント`,
    );
  }
  return `なお、S評価には信頼度${S_RANK_MIN_TRUST}以上 かつ 最終資金が初期資金比${Math.round(
    S_RANK_MIN_FUNDS_RATIO * 100,
  )}%以上の両方が必要です（今回は${gaps.join("、")}不足）。`;
}

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
  const turnData = getScenarioTurn(weakest.turn, state.mode);
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

  const cfg = getModeConfig(state.mode);
  const fundsRatio = state.availableFunds / cfg.initialFunds;
  const grade = gradeFor(fundsRatio, state.trustScore);
  const style = buildStyle(channelBreakdown, state.trustScore);

  return {
    mode: state.mode,
    grade,
    gradeTagline: gradeTaglines[grade],
    evaluationReason: buildEvaluationReason(
      grade,
      fundsRatio,
      state.trustScore,
    ),
    finalFunds: state.availableFunds,
    initialFunds: cfg.initialFunds,
    fundsDelta: state.availableFunds - cfg.initialFunds,
    finalTrust: state.trustScore,
    totalLeads,
    totalMarketingSpend,
    channelBreakdown: channelBreakdown.sort((a, b) => b.amount - a.amount),
    styleLabel: style.label,
    styleCommentary: style.commentary,
    ifStory: buildIfStory(state),
    businessHint: buildBusinessHint(state),
    b2bMetrics: cfg.showAdvancedMetrics ? buildB2bMetrics(state) : null,
  };
}

import { scenarioTurns } from "./modes";
import type { GameState } from "./types";

/**
 * 実践編の最終レポートで評価する B2B マーケティング指標。
 *
 * ゲーム内の「受注額」は船主の想定予算（売上高）であり利益ではないため、
 * ROI は想定粗利率をかけた粗利ベースで算出する。
 * 「マーケティング投資」には各チャネルへの施策費に加え、市場調査費も含める。
 */

/** 想定粗利率（船舶用機器メーカーの一般的な水準を仮定） */
export const ASSUMED_GROSS_MARGIN = 0.3;

export type TurnMetrics = {
  turn: number;
  /** 施策費 + 市場調査費 */
  investment: number;
  leads: number;
  proposals: number;
  dealsWon: number;
  wonRevenue: number;
  /** 粗利ベース ROI（投資 0 の場合は null） */
  roi: number | null;
};

export type B2bMetrics = {
  marketingSpend: number;
  researchSpend: number;
  /** 施策費 + 市場調査費 */
  totalInvestment: number;
  leads: number;
  proposals: number;
  dealsWon: number;
  /** 受注額の合計（売上高） */
  wonRevenue: number;
  /** 受注による粗利（受注額 × 想定粗利率） */
  grossProfit: number;
  /** ROI =（粗利 − 投資）÷ 投資 */
  roi: number | null;
  /** ROAS = 受注額 ÷ 投資 */
  roas: number | null;
  /** CPA = 投資 ÷ 受注件数 */
  cpa: number | null;
  /** CPL = 施策費 ÷ 見込み引き合い件数 */
  cpl: number | null;
  /** 受注率 = 受注件数 ÷ 提案件数 */
  winRate: number | null;
  /** 平均受注単価 */
  avgDealSize: number | null;
  byTurn: TurnMetrics[];
  /** プレイ結果に応じた講評 */
  insights: string[];
};

const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

function roiOf(revenue: number, investment: number): number | null {
  if (investment <= 0) return null;
  return (revenue * ASSUMED_GROSS_MARGIN - investment) / investment;
}

export function buildB2bMetrics(state: GameState): B2bMetrics {
  // 提案結果（要求 ID）を、どのターンのいくらの案件だったかに引き当てる
  const requestIndex = new Map(
    scenarioTurns(state.mode).flatMap((t) =>
      t.requests.map((r) => [r.id, { turn: t.turn, budget: r.budget }] as const),
    ),
  );
  const deals = Object.entries(state.dealOutcomes).flatMap(([id, outcome]) => {
    const req = requestIndex.get(id);
    return req ? [{ ...req, won: outcome === "won" }] : [];
  });

  const turnsPlayed = Array.from(
    new Set([
      ...state.marketingHistory.map((h) => h.turn),
      ...state.researchPurchases.map((p) => p.turn),
      ...deals.map((d) => d.turn),
    ]),
  ).sort((a, b) => a - b);

  const byTurn: TurnMetrics[] = turnsPlayed.map((turn) => {
    const history = state.marketingHistory.filter((h) => h.turn === turn);
    const research = state.researchPurchases.filter((p) => p.turn === turn);
    const turnDeals = deals.filter((d) => d.turn === turn);
    const won = turnDeals.filter((d) => d.won);
    const investment =
      history.reduce((sum, h) => sum + h.spend, 0) +
      research.reduce((sum, p) => sum + p.cost, 0);
    const wonRevenue = won.reduce((sum, d) => sum + d.budget, 0);
    return {
      turn,
      investment,
      leads: history.reduce((sum, h) => sum + h.leads, 0),
      proposals: turnDeals.length,
      dealsWon: won.length,
      wonRevenue,
      roi: roiOf(wonRevenue, investment),
    };
  });

  const marketingSpend = state.marketingHistory.reduce(
    (sum, h) => sum + h.spend,
    0,
  );
  const researchSpend = state.researchPurchases.reduce(
    (sum, p) => sum + p.cost,
    0,
  );
  const totalInvestment = marketingSpend + researchSpend;
  const leads = state.marketingHistory.reduce((sum, h) => sum + h.leads, 0);
  const proposals = deals.length;
  const dealsWon = deals.filter((d) => d.won).length;
  const wonRevenue = deals
    .filter((d) => d.won)
    .reduce((sum, d) => sum + d.budget, 0);

  const metrics: Omit<B2bMetrics, "insights"> = {
    marketingSpend,
    researchSpend,
    totalInvestment,
    leads,
    proposals,
    dealsWon,
    wonRevenue,
    grossProfit: Math.round(wonRevenue * ASSUMED_GROSS_MARGIN),
    roi: roiOf(wonRevenue, totalInvestment),
    roas: ratio(wonRevenue, totalInvestment),
    cpa: dealsWon > 0 ? Math.round(totalInvestment / dealsWon) : null,
    cpl: leads > 0 ? Math.round(marketingSpend / leads) : null,
    winRate: ratio(dealsWon, proposals),
    avgDealSize: dealsWon > 0 ? Math.round(wonRevenue / dealsWon) : null,
    byTurn,
  };

  return { ...metrics, insights: buildInsights(metrics) };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 指標の組み合わせから、プレイヤーの投資判断に対する講評を作る */
function buildInsights(m: Omit<B2bMetrics, "insights">): string[] {
  if (m.totalInvestment === 0) {
    return [
      "マーケティング投資が0のため ROI・CPA を算出できませんでした。投資しなければ損失は出ませんが、受注機会そのものを生み出せません。次のプレイでは少額からでも投資し、その回収効率を測ってみてください。",
    ];
  }

  const insights: string[] = [];

  if (m.roi === null || m.roi < 0) {
    insights.push(
      `粗利ベースの ROI は${m.roi === null ? "算出不能" : pct(m.roi)}で、投資を回収できていません。受注額（売上）が投資額を上回っていても、粗利で見ると赤字になり得る点に注意が必要です。`,
    );
  } else if (m.roi < 1) {
    insights.push(
      `粗利ベースの ROI は${pct(m.roi)}で、投資は回収できていますが改善の余地があります。受注につながらなかったターンの投資を見直すと効率が上がります。`,
    );
  } else {
    insights.push(
      `粗利ベースの ROI は${pct(m.roi)}と、投資1ドルあたり${(m.roi + 1).toFixed(1)}ドルの粗利を生んでいます。投資先の選択が受注に直結していました。`,
    );
  }

  if (m.winRate !== null) {
    insights.push(
      m.winRate >= 0.7
        ? `受注率は${pct(m.winRate)}と高く、顧客の重視項目と投資チャネルが噛み合っていました。`
        : `受注率は${pct(m.winRate)}に留まりました。失注した提案にかけたコストもすべて CPA に上乗せされるため、「当たる提案」に絞ることが CPA 改善の近道です。`,
    );
  }

  if (m.cpl !== null && m.cpa !== null && m.leads > 0 && m.dealsWon > 0) {
    const leadsPerDeal = m.leads / m.dealsWon;
    insights.push(
      `引き合い${m.leads}件に対して受注は${m.dealsWon}件（約${leadsPerDeal.toFixed(1)}件の引き合いで1件受注）。CPL が安くても受注に転換しなければ CPA は下がりません。件数よりも「質」を見る視点が重要です。`,
    );
  }

  const bestTurn = m.byTurn
    .filter((t) => t.roi !== null)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0];
  const worstTurn = m.byTurn
    .filter((t) => t.roi !== null)
    .sort((a, b) => (a.roi ?? 0) - (b.roi ?? 0))[0];
  if (bestTurn && worstTurn && bestTurn.turn !== worstTurn.turn) {
    insights.push(
      `年度別では${bestTurn.turn}年目の ROI がもっとも高く、${worstTurn.turn}年目がもっとも低くなりました。同じ金額を投じても、市況と顧客ニーズに合うかどうかで回収効率は大きく変わります。`,
    );
  }

  return insights;
}

/** 教育用の解説テキスト：なぜマーケティングで ROI などの指標を評価すべきか */
export const metricLessons: { title: string; body: string }[] = [
  {
    title: "なぜマーケティングで ROI を評価するのか",
    body: "マーケティング費は「使えば成果が出る経費」ではなく、回収を前提とした投資です。ROI（Return on Investment）で投資額に対するリターンを測ることで、施策同士を同じ物差しで比較し、限られた予算を最も効果の高いチャネルへ再配分できます。経営層や財務部門に予算の妥当性を説明する共通言語にもなります。",
  },
  {
    title: "売上ではなく「粗利」で見る",
    body: "受注額（売上）÷ 投資額は ROAS と呼ばれ、ROI とは別物です。原価を差し引いた粗利で見なければ、売上は立っても会社にお金が残らない施策を見逃してしまいます。本レポートでは想定粗利率 30% を用いて ROI を算出しています。",
  },
  {
    title: "CPA と CPL の違い",
    body: "CPL（Cost Per Lead）は引き合い1件の獲得コスト、CPA（Cost Per Acquisition）は受注1件の獲得コストです。B2B では引き合いから受注までの転換率が低く、CPL が安いチャネルが CPA でも優秀とは限りません。平均受注単価と CPA を比べ、1件の受注で投資を回収できているかを確認しましょう。",
  },
  {
    title: "B2B ならではの注意点",
    body: "海事産業のような B2B 取引は商談期間が長く、今年の投資が翌年以降の受注として返ってくることも珍しくありません。単年度の ROI だけで施策を打ち切らず、複数年の累計や、継続受注・保守契約を含めた顧客生涯価値（LTV）の視点で評価することが重要です。",
  },
];

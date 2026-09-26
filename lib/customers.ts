import { getModeConfig, getScenarioTurn } from "./modes";
import { researchedCustomerIds } from "./research";
import type { GameState, ProposalRecord } from "./types";

/** 評価軸（期待水準と提供力を同じ 0–100 スケールで比較する） */
export type FitAxisId = "price" | "delivery" | "fuel" | "support" | "record";

export const fitAxes: { id: FitAxisId; label: string; note: string }[] = [
  { id: "price", label: "価格競争力", note: "見積価格と値引き余地" },
  { id: "delivery", label: "納期", note: "納期の短さと確約度" },
  { id: "fuel", label: "燃費・技術", note: "燃費・排出性能と、規制対応の技術力" },
  { id: "support", label: "サポート体制", note: "拠点・保守対応の手厚さ" },
  { id: "record", label: "実績評価", note: "同種案件の納入実績と評判" },
];

export type FitScores = Record<FitAxisId, number>;

export type Customer = {
  id: string;
  /** ターンデータの船主名と一致させる（引き合いの突合に使用） */
  name: string;
  region: string;
  segment: string;
  /** 関係性スコア（0–100） */
  relationship: number;
  fleet: { type: string; count: number; avgAge: number }[];
  decisionMaker: { name: string; role: string; note: string };
  /** 船主が求める水準 */
  expectations: FitScores;
};

/**
 * 自社の提供力（全船主に共通）。
 * 「実績評価」は企業の信頼度スコアに連動させる。
 */
export function ownCapability(state: GameState): FitScores {
  return {
    price: 65,
    delivery: 80,
    fuel: 85,
    support: 60,
    record: state.trustScore,
  };
}

export const customers: Customer[] = [
  {
    id: "setouchi",
    name: "Setouchi Kisen 株式会社",
    region: "日本 / 今治",
    segment: "内航船主",
    relationship: 72,
    fleet: [
      { type: "内航コンテナ船", count: 9, avgAge: 12 },
      { type: "内航タンカー", count: 3, avgAge: 15 },
    ],
    decisionMaker: {
      name: "田中 誠一",
      role: "専務取締役",
      note: "国内サポート体制と納入実績を最重視。稟議を通さず即断できる決裁権を持つ。",
    },
    expectations: {
      price: 70,
      delivery: 65,
      fuel: 50,
      support: 95,
      record: 75,
    },
  },
  {
    id: "pacific",
    name: "Pacific Ocean Lines",
    region: "シンガポール",
    segment: "外航船主（ばら積み・コンテナ）",
    relationship: 55,
    fleet: [
      { type: "ばら積み船", count: 24, avgAge: 9 },
      { type: "コンテナ船", count: 8, avgAge: 6 },
    ],
    decisionMaker: {
      name: "Mr. Lim Wei Chen",
      role: "技術購買部長",
      note: "価格と燃費のバランスを重視。最終決裁は本社承認が必要で、意思決定に時間がかかる。",
    },
    expectations: {
      price: 85,
      delivery: 70,
      fuel: 90,
      support: 45,
      record: 60,
    },
  },
  {
    id: "nordic",
    name: "Nordic Tanker AS",
    region: "ノルウェー",
    segment: "外航船主（タンカー）",
    relationship: 48,
    fleet: [
      { type: "プロダクトタンカー", count: 12, avgAge: 11 },
      { type: "ケミカルタンカー", count: 5, avgAge: 8 },
    ],
    decisionMaker: {
      name: "Ms. Ingrid Solberg",
      role: "技術本部長",
      note: "規制適合は前提条件。補助金を活用した初期投資の圧縮を重視し、申請支援まで含めた提案を高く評価する。",
    },
    expectations: {
      price: 55,
      delivery: 60,
      fuel: 75,
      support: 70,
      record: 80,
    },
  },
  {
    id: "aegean",
    name: "Aegean Bulk Carriers",
    region: "ギリシャ / ピレウス",
    segment: "外航船主（ばら積み）",
    relationship: 40,
    fleet: [
      { type: "ハンディマックス", count: 18, avgAge: 13 },
      { type: "スープラマックス", count: 6, avgAge: 7 },
    ],
    decisionMaker: {
      name: "Mr. Nikos Papadakis",
      role: "Fleet Director",
      note: "船隊全体での改善効果を数値で求める。価格交渉は業界内でも厳しいと評判。",
    },
    expectations: {
      price: 80,
      delivery: 55,
      fuel: 85,
      support: 50,
      record: 90,
    },
  },
  {
    id: "gulf",
    name: "Gulf Energy Shipping",
    region: "UAE / ドバイ",
    segment: "外航船主（VLCC）",
    relationship: 35,
    fleet: [
      { type: "VLCC", count: 14, avgAge: 8 },
      { type: "スエズマックス", count: 6, avgAge: 10 },
    ],
    decisionMaker: {
      name: "Mr. Khalid Al-Mansoori",
      role: "Group CTO",
      note: "中東域内の24時間サポート拠点の有無が選定条件。技術力を最重視する。",
    },
    expectations: {
      price: 60,
      delivery: 75,
      fuel: 80,
      support: 95,
      record: 85,
    },
  },
];

/**
 * プレイ内容を反映した関係性スコア（0–100）。
 * 顧客データの初期値に、受注・失注・未回答による変動を加算する。
 */
export function currentRelationship(
  customer: Customer,
  state: GameState,
): number {
  const delta = state.relationshipDeltas[customer.name] ?? 0;
  return Math.max(0, Math.min(100, customer.relationship + delta));
}

/** 船主名（ターンデータの owner）から顧客データを引く */
export function customerByName(name: string): Customer | undefined {
  return customers.find((c) => c.name === name);
}

/** その船主について、関係する市場調査を購入済みか */
export function isCustomerResearched(state: GameState, ownerName: string): boolean {
  const customer = customerByName(ownerName);
  return customer
    ? researchedCustomerIds(state.researchPurchases).has(customer.id)
    : false;
}

/**
 * その船主の重視項目の順番（第1優先がどれか）が見えるか。
 * 実践編では、関係する市場調査を購入するまで見えない。
 */
export function isPriorityOrderKnown(state: GameState, ownerName: string): boolean {
  return (
    !getModeConfig(state.mode).hidePriorityOrderUntilResearched ||
    isCustomerResearched(state, ownerName)
  );
}

/**
 * 画面に並べる重視項目。順番が見えない場合は、重視順が伝わらないよう五十音順（順不同）にする。
 */
export function displayedPriorities(
  state: GameState,
  ownerName: string,
  priorities: string[],
): { items: string[]; ordered: boolean } {
  const ordered = isPriorityOrderKnown(state, ownerName);
  return {
    items: ordered
      ? priorities
      : [...priorities].sort((a, b) => a.localeCompare(b, "ja")),
    ordered,
  };
}

/** 期待水準と提供力の差（プラス = 期待を上回る） */
export function fitGap(
  expectations: FitScores,
  capability: FitScores,
  axis: FitAxisId,
): number {
  return capability[axis] - expectations[axis];
}

/** 不足している軸（ギャップが -10 以下）を返す */
export function shortfallAxes(
  expectations: FitScores,
  capability: FitScores,
): FitAxisId[] {
  return fitAxes
    .map((axis) => axis.id)
    .filter((id) => fitGap(expectations, capability, id) <= -10);
}

export type DealStatus = "won" | "lost" | "declined" | "ignored" | "pending";

/** 船主との取引履歴 1 件（プレイヤーの提案結果から組み立てる） */
export type CustomerDeal = {
  turn: number;
  requestId: string;
  title: string;
  /** 想定予算 */
  budget: number;
  /** 受注額（受注時のみ） */
  revenue: number;
  status: DealStatus;
  /** 提案した場合の記録 */
  proposal: ProposalRecord | null;
};

/**
 * その船主から届いた要求と、プレイヤーの対応結果を年順に返す。
 * - 提案済み → 受注 / 失注
 * - 辞退した → 辞退
 * - 過去の年で未提案 → 未回答
 * - 今年で未提案 → 対応待ち（ゲーム終了後は未回答）
 */
export function customerDeals(
  customer: Customer,
  state: GameState,
): CustomerDeal[] {
  const deals: CustomerDeal[] = [];
  for (let turn = 1; turn <= state.turn; turn++) {
    for (const r of getScenarioTurn(turn, state.mode).requests) {
      if (r.owner !== customer.name) continue;
      const proposal =
        state.proposalLog.find((p) => p.requestId === r.id) ?? null;
      const status: DealStatus = proposal
        ? proposal.won
          ? "won"
          : "lost"
        : state.dealOutcomes[r.id] === "declined"
          ? "declined"
          : turn < state.turn || state.gameCompleted
          ? "ignored"
          : "pending";
      deals.push({
        turn,
        requestId: r.id,
        title: `${r.vesselType} — ${r.requirement}`,
        budget: r.budget,
        revenue: proposal?.revenue ?? 0,
        status,
        proposal,
      });
    }
  }
  return deals;
}

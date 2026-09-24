import type { GameState } from "./types";

/** 評価軸（期待水準と提供力を同じ 0–100 スケールで比較する） */
export type FitAxisId = "price" | "delivery" | "fuel" | "support" | "record";

export const fitAxes: { id: FitAxisId; label: string; note: string }[] = [
  { id: "price", label: "価格競争力", note: "見積価格と値引き余地" },
  { id: "delivery", label: "納期", note: "納期の短さと確約度" },
  { id: "fuel", label: "燃費性能", note: "燃費・排出性能の水準" },
  { id: "support", label: "サポート体制", note: "拠点・保守対応の手厚さ" },
  { id: "record", label: "実績評価", note: "同種案件の納入実績と評判" },
];

export type FitScores = Record<FitAxisId, number>;

export type DealStatus = "won" | "lost" | "pending";

/** 商談・購買履歴 1 件 */
export type Deal = {
  /** 発生したターン */
  turn: number;
  title: string;
  amount: number;
  status: DealStatus;
};

/** 商談ログ 1 件 */
export type MeetingLog = {
  turn: number;
  quarter: string;
  summary: string;
};

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
  deals: Deal[];
  logs: MeetingLog[];
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
    deals: [
      {
        turn: 1,
        title: "内航コンテナ船 749GT × 4隻 機関室モニタリング",
        amount: 320_000,
        status: "won",
      },
      {
        turn: 2,
        title: "姉妹船 2隻への追加導入",
        amount: 180_000,
        status: "won",
      },
    ],
    logs: [
      {
        turn: 1,
        quarter: "Q1",
        summary:
          "省人化のニーズをヒアリング。国内保守拠点からの2時間以内到着を条件に提示。",
      },
      {
        turn: 1,
        quarter: "Q3",
        summary: "初号船の納入完了。機関長からの操作性評価が高く、追加導入の打診あり。",
      },
      {
        turn: 2,
        quarter: "Q2",
        summary: "姉妹船2隻の追加受注。グループ標準採用の検討に入る意向を確認。",
      },
    ],
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
    deals: [
      {
        turn: 1,
        title: "ばら積み船 82,000DWT × 3隻 主機補機パッケージ",
        amount: 1_200_000,
        status: "pending",
      },
      {
        turn: 3,
        title: "同案件 — 欧州系A社に決定",
        amount: 1_050_000,
        status: "lost",
      },
      {
        turn: 4,
        title: "コンテナ船 8,000TEU × 2隻",
        amount: 1_350_000,
        status: "pending",
      },
    ],
    logs: [
      {
        turn: 1,
        quarter: "Q2",
        summary: "初回技術提案。CII 格付 B 以上の達成見込みを提示し好評価。",
      },
      {
        turn: 2,
        quarter: "Q2",
        summary:
          "競合A社の15%値下げを受け、ライフサイクルコスト比較資料を再提出。",
      },
      {
        turn: 3,
        quarter: "Q1",
        summary: "価格差を埋めきれず失注。関係維持のため四半期ごとの訪問を継続。",
      },
      {
        turn: 4,
        quarter: "Q2",
        summary: "競合の納期遅延を理由に再打診。納期確約が決め手になる見込み。",
      },
    ],
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
      note: "規制適合を最優先。補助金申請の支援まで含めた提案を高く評価する。",
    },
    expectations: {
      price: 55,
      delivery: 60,
      fuel: 75,
      support: 70,
      record: 80,
    },
    deals: [
      {
        turn: 1,
        title: "スクラバー換装 + 排出量モニタリング機器",
        amount: 780_000,
        status: "pending",
      },
      {
        turn: 5,
        title: "アンモニア燃料船 45,000DWT × 3隻 共同開発",
        amount: 2_600_000,
        status: "pending",
      },
    ],
    logs: [
      {
        turn: 1,
        quarter: "Q3",
        summary: "EU ETS 対応の要件を確認。計測精度の第三者認証の有無を質問された。",
      },
      {
        turn: 3,
        quarter: "Q2",
        summary:
          "ノルウェーの補助金（上限25%）の申請代行を提案。価格以外の評価点として認識された。",
      },
      {
        turn: 5,
        quarter: "Q1",
        summary: "次世代燃料プロジェクトの共同開発パートナー候補として打診を受ける。",
      },
    ],
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
    deals: [
      {
        turn: 2,
        title: "ハンディマックス 38,000DWT × 6隻 レトロフィット",
        amount: 1_450_000,
        status: "pending",
      },
      {
        turn: 3,
        title: "第1期 4隻分",
        amount: 720_000,
        status: "won",
      },
      {
        turn: 4,
        title: "第2期 4隻分 + 長期メンテナンス契約",
        amount: 960_000,
        status: "won",
      },
    ],
    logs: [
      {
        turn: 2,
        quarter: "Q1",
        summary:
          "船隊18隻の CII 格付シミュレーションを提出。改善幅の根拠データを追加要求された。",
      },
      {
        turn: 3,
        quarter: "Q2",
        summary: "第1期として4隻分を受注。残り4隻は実績を見て判断する方針。",
      },
      {
        turn: 4,
        quarter: "Q1",
        summary: "第1期の改善実績が予測値を上回り、第2期と保守契約をまとめて締結。",
      },
    ],
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
    deals: [
      {
        turn: 3,
        title: "VLCC 300,000DWT × 2隻 排出量モニタリング一式",
        amount: 1_800_000,
        status: "pending",
      },
      {
        turn: 5,
        title: "同案件 — 受注",
        amount: 1_800_000,
        status: "won",
      },
      {
        turn: 5,
        title: "追加 4隻 + グループ標準採用の検討",
        amount: 3_400_000,
        status: "pending",
      },
    ],
    logs: [
      {
        turn: 3,
        quarter: "Q4",
        summary: "新造VLCC向けに提案。中東拠点の設置計画の提示が最終選考の条件に。",
      },
      {
        turn: 4,
        quarter: "Q2",
        summary: "ドバイでのサポート拠点開設計画を提示。最終選考に残る。",
      },
      {
        turn: 5,
        quarter: "Q1",
        summary: "初回2隻を受注。グループ全体への標準採用の検討が始まる。",
      },
    ],
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

/** 現在のターンまでに発生した商談・ログに絞る */
export function untilTurn<T extends { turn: number }>(
  items: T[],
  turn: number,
): T[] {
  return items.filter((item) => item.turn <= turn);
}

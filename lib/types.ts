/** ゲーム内で使用する型定義（バックエンド実装前の暫定スキーマ） */

/** ヘッダーに表示するゲームの進行状況 */
export type GameState = {
  /** 現在のターン（年） */
  turn: number;
  /** 想定される総ターン数 */
  totalTurns: number;
  /** 利用可能資金（USD） */
  availableFunds: number;
  /** 企業の信頼度スコア（0–100） */
  trustScore: number;
  /** 今ターンのマーケティング予算配分 */
  marketingPlan: MarketingPlan;
  /** 配分を確定済みか（確定済みの配分のみターン終了時に実行される） */
  marketingCommitted: boolean;
  /** 過去ターンのマーケティング投資実績 */
  marketingHistory: MarketingRecord[];
  /** 購入済みの市場調査レポート */
  researchPurchases: ResearchPurchase[];
  /** セッションに参加しているチーム名 */
  teams: string[];
};

/** 市場調査レポートの購入記録 */
export type ResearchPurchase = {
  reportId: string;
  /** 購入したターン */
  turn: number;
  /** 支払った額（USD） */
  cost: number;
};

/** マーケティングチャネルの識別子 */
export type MarketingChannelId =
  | "expo"
  | "tradePress"
  | "seminar"
  | "fieldSales"
  | "digital";

/** チャネルごとの予算配分（USD） */
export type MarketingPlan = Record<MarketingChannelId, number>;

/** チャネル 1 つの見込み効果 */
export type ChannelEffect = {
  /** 見込み引き合い件数 */
  leads: number;
  /** 信頼度スコアへの寄与 */
  trustDelta: number;
};

/** 予算配分全体の見込み効果 */
export type MarketingOutcome = {
  /** 配分合計（USD） */
  spend: number;
  /** 見込み引き合い件数の合計 */
  leads: number;
  /** 信頼度スコアへの寄与（上限適用後） */
  trustDelta: number;
  /** 1件あたりの獲得コスト（引き合いが0件の場合は null） */
  costPerLead: number | null;
  byChannel: Record<MarketingChannelId, ChannelEffect>;
};

/** 過去ターンのマーケティング実績（ROI レポート用） */
export type MarketingRecord = {
  turn: number;
  plan: MarketingPlan;
  /** 実際に投じた額 */
  spend: number;
  /** 獲得した見込み引き合い件数 */
  leads: number;
  /** 信頼度スコアへの寄与 */
  trustDelta: number;
  /** 同ターンの決算で計上された売上（ROI 算定に使用） */
  revenue: number;
};

export type NewsImpact = "positive" | "negative" | "neutral";

/** マーケットニュース 1 件 */
export type MarketNews = {
  id: string;
  /** 発信元（IMO、業界紙など） */
  source: string;
  category: string;
  headline: string;
  summary: string;
  /** 自社への影響の方向性 */
  impact: NewsImpact;
  /** 表示用の日付ラベル */
  date: string;
};

export type RequestStatus = "new" | "in_review" | "negotiating";

/** 船主からの引き合い（要求）1 件 */
export type ShipownerRequest = {
  id: string;
  /** 船主（顧客企業）名 */
  owner: string;
  /** 船主の所在地 */
  region: string;
  /** 対象船種 */
  vesselType: string;
  /** 要求の概要 */
  requirement: string;
  /** 想定予算（USD） */
  budget: number;
  /** 回答期限 */
  deadline: string;
  status: RequestStatus;
  /** この案件が自社に求める優先要素 */
  priorities: string[];
};

/** ターン終了時に確定する決算結果 */
export type TurnSettlement = {
  /** 受注・売上による入金（USD） */
  revenue: number;
  /** 固定費・販促費などの支出（USD） */
  expense: number;
  /** 信頼度スコアの変動 */
  trustDelta: number;
  /** 決算のハイライト（プレイヤーへの説明文） */
  highlights: string[];
};

/** 1 ターン分のゲームデータ */
export type TurnData = {
  turn: number;
  /** 今ターンの状況説明（ダッシュボード上部に表示） */
  headline: string;
  news: MarketNews[];
  requests: ShipownerRequest[];
  /**
   * このターンに入るときに適用される前ターンの決算。
   * 1年目は開始時点なので null。
   */
  settlement: TurnSettlement | null;
};

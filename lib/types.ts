/** ゲーム内で使用する型定義（バックエンド実装前の暫定スキーマ） */

/** 難易度（シナリオ）。導入編 = intro / 実践編 = advanced */
export type GameMode = "intro" | "advanced";

/** ヘッダーに表示するゲームの進行状況 */
export type GameState = {
  /** 選択中の難易度（開始時に選択し、プレイ中は変わらない） */
  mode: GameMode;
  /** プレイヤー名（ログイン画面で入力） */
  playerName: string;
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
  /** 今ターン中に提案を完了した船主要求の ID */
  proposalsCompleted: string[];
  /** 提案の結果（船主要求 ID → 受注 / 失注）。チャネルとの相性で決まる */
  dealOutcomes: Record<string, DealOutcome>;
  /** 提案の詳細な記録（年次レビュー・評価に使う） */
  proposalLog: ProposalRecord[];
  /** 年ごとの収支・信頼度の記録（ターン終了時に追加。年次レビューに使う） */
  turnLog: TurnRecord[];
  /** 最終ターンを終了し、総合フィードバック画面を表示できる状態か */
  gameCompleted: boolean;
  /**
   * 倒産（D 評価）でゲームが終了したか。
   * 自主倒産・融資を受けられずに倒産・最終年の債務超過のいずれか（内訳は endReason）
   */
  bankrupt: boolean;
  /** ゲームの終わり方（プレイ中は null） */
  endReason: EndReason | null;
  /** 緊急融資の記録（返済済みのものも残す） */
  loans: LoanRecord[];
  /**
   * 決算で資金がマイナスになり、緊急経営判断（融資 / 自主倒産）を待っている状態。
   * 入っているあいだは、判断以外の操作を受け付けない。
   */
  pendingInsolvency: PendingInsolvency | null;
  /**
   * 船主ごとの関係性スコアの変動（船主名 → 変動量）。
   * 顧客データの初期値に加算して表示する。受注・失注・未回答で変わる。
   */
  relationshipDeltas: Record<string, number>;
  /** ファシリテーター操作（ターン移動）が行われたか。履歴の整合性の注記に使う */
  demoOperated: boolean;
  /** セッションに参加しているチーム名 */
  teams: string[];
};

/**
 * ゲームの終わり方。
 * completed = 最終年まで完走 / declined = 融資を受けずに自主倒産 /
 * denied = 融資の回数・枠を使い切り倒産 / insolvent = 最終年の返済後に債務超過
 */
export type EndReason = "completed" | "declined" | "denied" | "insolvent";

/** 緊急融資を受けられない理由。countLimit = 回数上限 / creditLimit = 借入枠の不足 */
export type LoanDenial = "countLimit" | "creditLimit";

/** 緊急融資 1 件の記録。金利は借入時に固定する */
export type LoanRecord = {
  /** 資金不足になった決算の年（この年の締めで借り入れた） */
  turn: number;
  /** 何回目の融資か（1 始まり） */
  number: number;
  /** 元本（= 不足額 + 運転資金） */
  principal: number;
  /** 決算で不足した額（補填分） */
  deficit: number;
  /** 翌年のために上乗せした運転資金 */
  workingCapital: number;
  /** 信頼度で決まる金利（0–1） */
  baseRate: number;
  /** 2回目以降の上乗せ金利（0–1） */
  penaltyRate: number;
  /** 適用金利（baseRate + penaltyRate） */
  rate: number;
  /** 金利を決めたときの信頼度（融資によるペナルティ適用前） */
  trustAtBorrow: number;
  /** 返済した年（未返済なら null） */
  repaidTurn: number | null;
};

/** 緊急経営判断で提示する融資条件 */
export type LoanOffer = Omit<LoanRecord, "turn" | "repaidTurn"> & {
  /** 借入枠が足りず、運転資金を満額より減らしたか */
  workingCapitalReduced: boolean;
  /** 融資を受けた場合の信頼度の変動 */
  trustPenalty: number;
};

/** 緊急経営判断を待っている状態 */
export type PendingInsolvency = {
  /** 資金不足になった決算の年 */
  turn: number;
  /** 不足額（正の値） */
  deficit: number;
  /** 融資の提示条件（受けられない場合は null） */
  offer: LoanOffer | null;
  /** 融資を受けられない理由（受けられる場合は null） */
  denial: LoanDenial | null;
};

/** 資金不足になった年に、どう対応したか */
export type InsolvencyResolution = "loan" | "declined" | "denied";

/**
 * 船主要求への回答結果。
 * won / lost は提案した結果（重視ポイントと投資チャネルの相性で決まる）、
 * declined は裏付けがないため今期は提案を辞退したことを表す。
 */
export type DealOutcome = "won" | "lost" | "declined";

/** 1 年分（1 ターン）の締めの記録 */
export type TurnRecord = {
  turn: number;
  /** 年初の資金・信頼度 */
  fundsStart: number;
  trustStart: number;
  /** 決算後（最終年はマーケティング支出後）の資金・信頼度 */
  fundsEnd: number;
  trustEnd: number;
  /** この年の提案で得た受注額の合計 */
  wonRevenue: number;
  /** 決算（最終年・倒産時以外は翌年の期初に計上される前年分） */
  settlementRevenue: number;
  settlementExpense: number;
  settlementTrust: number;
  marketingSpend: number;
  marketingTrust: number;
  researchSpend: number;
  /** 回答しなかった船主要求 */
  unansweredRequestIds: string[];
  /** 辞退した船主要求 */
  declinedRequestIds: string[];
  /** この年に届いた追加案件（前年の見込み引き合いによる） */
  extraRequestIds: string[];
  unansweredPenalty: number;
  /** この年に支払った緊急融資の利息 */
  interestExpense: number;
  /** 最終年に一括返済した元本（最終年以外は 0） */
  repayment: number;
  /** この年の締めで受けた緊急融資（受けていなければ null） */
  loan: LoanRecord | null;
  /** 年末の借入残高 */
  debtEnd: number;
  /** 決算で資金が不足したときの対応（不足しなかった年・判断待ちは null） */
  insolvency: InsolvencyResolution | null;
  /** 融資を受けられなかった理由（insolvency が denied のときのみ） */
  loanDenial: LoanDenial | null;
  /** この年で倒産（D 評価）となったか */
  bankrupt: boolean;
};

/** 提案 1 件の記録。判定に使った配分の状況も残し、振り返りで理由を説明できるようにする */
export type ProposalRecord = {
  turn: number;
  requestId: string;
  owner: string;
  /** 船主の想定予算（難易度補正後） */
  requestBudget: number;
  /** 選んだ訴求ポイント */
  focusPriority: string;
  /** 訴求ポイントの重視順位（0 = 第1優先） */
  priorityRank: number;
  /** 訴求ポイントに対応するチャネル */
  requiredChannel: MarketingChannelId;
  /** そのチャネルへの投資額と配分比 */
  channelSpend: number;
  channelShare: number;
  reason: "match" | "lowShare" | "underinvested";
  won: boolean;
  /** 受注額（失注時は 0） */
  revenue: number;
  /** 信頼度の変動 */
  trustDelta: number;
  /** 受注に追加で必要だった投資額（受注時は 0） */
  shortfall: number;
  /** 追加案件への提案か */
  extra?: boolean;
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
  /**
   * 前年の見込み引き合いから生まれた追加案件か（実践編）。
   * 回答しなくてもペナルティはなく（期限切れ）、第1優先的中率の計算にも含めない。
   */
  extra?: boolean;
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

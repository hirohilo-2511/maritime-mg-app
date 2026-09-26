import { emptyPlan } from "./marketing";
import type { GameState, ShipownerRequest, TurnData } from "./types";

/**
 * プロトタイプ用のダミーデータ。
 * 将来的には API / DB から取得する想定なので、UI からはこのモジュール経由でのみ参照する。
 */

/** プレイヤー（自社）情報 */
export const company = {
  name: "Nihon Marine Solutions",
  segment: "船舶用機器メーカー",
  /** ログイン画面で入力しなかった場合のデフォルト表示名 */
  playerName: "山田 太郎",
  playerRole: "経営企画部長",
};

/** ゲーム開始時（1年目）の状態 */
export const initialGameState: GameState = {
  mode: "intro",
  playerName: company.playerName,
  turn: 1,
  totalTurns: 5,
  availableFunds: 500_000,
  trustScore: 50,
  marketingPlan: emptyPlan(),
  marketingCommitted: false,
  marketingHistory: [],
  researchPurchases: [],
  proposalsCompleted: [],
  dealOutcomes: {},
  proposalLog: [],
  turnLog: [],
  gameCompleted: false,
  bankrupt: false,
  endReason: null,
  loans: [],
  pendingInsolvency: null,
  relationshipDeltas: {},
  demoOperated: false,
  teams: ["Nihon Marine Solutions（自社）", "Team Orion", "Team Delta"],
};

/** ターンごとのマーケットニュースと船主の要求 */
export const turns: TurnData[] = [
  {
    turn: 1,
    headline:
      "市場の動向を確認し、マーケティング予算の配分と船主への提案方針を決定してください。",
    settlement: null,
    news: [
      {
        id: "news-1-1",
        source: "IMO",
        category: "環境規制",
        headline: "IMOが新たな環境規制を発表",
        summary:
          "2027年より EEXI / CII の基準値が段階的に引き上げられる見通し。既存船の改造需要と、低燃費機器への切り替え需要が同時に高まると予想されます。",
        impact: "positive",
        date: "1年目 Q1",
      },
      {
        id: "news-1-2",
        source: "Clarksons Research",
        category: "市況",
        headline: "ばら積み船の新造発注が前年比18%増",
        summary:
          "アジア圏の造船所は2028年まで船台がほぼ埋まりつつあります。早期の商談着手が受注確度を左右する局面です。",
        impact: "positive",
        date: "1年目 Q1",
      },
      {
        id: "news-1-3",
        source: "業界紙 Maritime Daily",
        category: "競合動向",
        headline: "欧州系の競合がアジア支社を新設",
        summary:
          "価格競争力を武器にシンガポールへ進出。同一セグメントでの受注競合が想定されるため、技術サポート面での差別化が鍵となります。",
        impact: "negative",
        date: "1年目 Q1",
      },
      {
        id: "news-1-4",
        source: "Ministry of Transport",
        category: "補助金",
        headline: "脱炭素関連設備への補助金枠が拡大",
        summary:
          "アンモニア・メタノール燃料対応機器の開発費に対し、最大30%の補助が受けられる制度が公示されました。",
        impact: "neutral",
        date: "1年目 Q1",
      },
    ],
    requests: [
      {
        id: "req-1-1",
        owner: "Pacific Ocean Lines",
        region: "シンガポール",
        vesselType: "ばら積み船 82,000 DWT × 3隻",
        requirement:
          "新造船向けの主機補機パッケージ。CII 格付 B 以上の達成が前提の新造計画。",
        budget: 1_200_000,
        deadline: "1年目 Q2",
        status: "new",
        priorities: ["納期", "燃費性能", "保証条件"],
      },
      {
        id: "req-1-2",
        owner: "Nordic Tanker AS",
        region: "ノルウェー",
        vesselType: "プロダクトタンカー 50,000 DWT × 2隻",
        requirement:
          "既存船のスクラバー換装と、EU ETS 対応の排出量モニタリング機器の導入検討。",
        budget: 780_000,
        deadline: "1年目 Q3",
        status: "in_review",
        priorities: ["初期投資額", "規制適合"],
      },
      {
        id: "req-1-3",
        owner: "Setouchi Kisen 株式会社",
        region: "日本 / 今治",
        vesselType: "内航コンテナ船 749 GT × 4隻",
        requirement:
          "省人化を目的とした機関室モニタリングシステムの導入検討。",
        budget: 320_000,
        deadline: "1年目 Q2",
        status: "negotiating",
        priorities: ["サポート体制", "価格", "実績"],
      },
    ],
  },
  {
    turn: 2,
    headline:
      "初年度の受注が売上として計上されました。規制対応需要が本格化する一方、競合の価格攻勢も始まっています。",
    settlement: {
      revenue: 420_000,
      expense: 260_000,
      trustDelta: 6,
      highlights: [
        "既存顧客向けの保守・部品販売が売上を下支え",
        "納期遵守により国内船主からの評価が上昇（信頼度 +6）",
      ],
    },
    news: [
      {
        id: "news-2-1",
        source: "IMO",
        category: "環境規制",
        headline: "CII 格付の公表義務化が前倒しで決定",
        summary:
          "格付 D 以下の船舶には改善計画の提出が求められます。既存船向けの改造・計測機器需要が一気に前倒しで発生する見込みです。",
        impact: "positive",
        date: "2年目 Q1",
      },
      {
        id: "news-2-2",
        source: "Clarksons Research",
        category: "市況",
        headline: "傭船料の下落でばら積み船主の設備投資が慎重化",
        summary:
          "スポット運賃の軟化を受け、一部船主が新造発注を先送り。提案時は初期投資の回収期間を明示する必要があります。",
        impact: "negative",
        date: "2年目 Q1",
      },
      {
        id: "news-2-3",
        source: "業界紙 Maritime Daily",
        category: "競合動向",
        headline: "競合A社が主機補機パッケージを15%値下げ",
        summary:
          "シンガポール市場でのシェア獲得を狙った戦略的な価格設定。価格以外の価値訴求が求められる局面です。",
        impact: "negative",
        date: "2年目 Q2",
      },
      {
        id: "news-2-4",
        source: "Port of Rotterdam",
        category: "インフラ",
        headline: "メタノール燃料の供給拠点が欧州3港に拡大",
        summary:
          "代替燃料対応機器の実用性が高まりました。欧州船主への提案で訴求材料になります。",
        impact: "positive",
        date: "2年目 Q2",
      },
    ],
    requests: [
      {
        id: "req-2-1",
        owner: "Pacific Ocean Lines",
        region: "シンガポール",
        vesselType: "ばら積み船 82,000 DWT × 3隻",
        requirement:
          "継続案件。競合各社の動きを受け、提案内容の見直しを求められている。",
        budget: 1_050_000,
        deadline: "2年目 Q2",
        status: "negotiating",
        priorities: ["価格", "燃費性能", "ライフサイクルコスト"],
      },
      {
        id: "req-2-2",
        owner: "Aegean Bulk Carriers",
        region: "ギリシャ / ピレウス",
        vesselType: "ハンディマックス 38,000 DWT × 6隻",
        requirement:
          "ばら積み船隊のレトロフィット案件。複数隻をまとめて検討している。",
        budget: 1_450_000,
        deadline: "2年目 Q3",
        status: "new",
        priorities: ["規制適合", "船隊一括対応", "実績"],
      },
      {
        id: "req-2-3",
        owner: "Setouchi Kisen 株式会社",
        region: "日本 / 今治",
        vesselType: "内航コンテナ船 749 GT × 2隻（追加）",
        requirement:
          "初年度に納入した設備が好評のため、姉妹船2隻への追加導入を検討。",
        budget: 180_000,
        deadline: "2年目 Q2",
        status: "new",
        priorities: ["サポート体制", "納期"],
      },
    ],
  },
  {
    turn: 3,
    headline:
      "船隊一括案件の獲得が中期の収益を左右します。開発投資の回収局面に入りました。",
    settlement: {
      revenue: 980_000,
      expense: 610_000,
      trustDelta: 4,
      highlights: [
        "既存船隊のレトロフィット・部品需要が堅調に推移",
        "競合の値下げ攻勢により、業界全体で価格競争が激化",
        "既存顧客からの追加発注により継続率が改善（信頼度 +4）",
      ],
    },
    news: [
      {
        id: "news-3-1",
        source: "EU Commission",
        category: "環境規制",
        headline: "EU ETS の対象が中小型船まで段階的に拡大",
        summary:
          "排出量の計測・報告体制の構築需要が拡大。モニタリング機器とサービス契約の抱き合わせ提案が有効です。",
        impact: "positive",
        date: "3年目 Q1",
      },
      {
        id: "news-3-2",
        source: "業界紙 Maritime Daily",
        category: "競合動向",
        headline: "競合A社が納期遅延で複数案件を失注",
        summary:
          "急激な受注拡大により supply chain が逼迫。確実な納期を示せる事業者に商談が流れています。",
        impact: "positive",
        date: "3年目 Q2",
      },
      {
        id: "news-3-3",
        source: "Clarksons Research",
        category: "市況",
        headline: "タンカー市況が回復、改造需要が上向き",
        summary:
          "運賃上昇により船主の投資余力が回復。高付加価値機器の提案が通りやすい環境です。",
        impact: "positive",
        date: "3年目 Q2",
      },
    ],
    requests: [
      {
        id: "req-3-1",
        owner: "Aegean Bulk Carriers",
        region: "ギリシャ / ピレウス",
        vesselType: "ハンディマックス 38,000 DWT × 4隻（第2期）",
        requirement:
          "第1期に続く、残り4隻分の発注の検討。",
        budget: 960_000,
        deadline: "3年目 Q3",
        status: "negotiating",
        priorities: ["実績", "保守契約", "価格"],
      },
      {
        id: "req-3-2",
        owner: "Gulf Energy Shipping",
        region: "UAE / ドバイ",
        vesselType: "VLCC 300,000 DWT × 2隻",
        requirement:
          "新造 VLCC 向けの排出量モニタリングと燃料効率管理システム一式。",
        budget: 1_800_000,
        deadline: "3年目 Q4",
        status: "new",
        priorities: ["技術力", "規制適合", "24時間サポート"],
      },
    ],
  },
  {
    turn: 4,
    headline:
      "大型案件の納入フェーズです。サポート体制への投資が信頼度を左右します。",
    settlement: {
      revenue: 1_240_000,
      expense: 880_000,
      trustDelta: 5,
      highlights: [
        "長期保守契約の更新が進み、安定収益が拡大",
        "納期遵守率の向上により業界内の評価が上昇（信頼度 +5）",
      ],
    },
    news: [
      {
        id: "news-4-1",
        source: "IMO",
        category: "環境規制",
        headline: "2030年目標に向けた中間レビューを開始",
        summary:
          "さらなる規制強化が議論されており、代替燃料対応機器の開発投資が中長期的に有利に働きます。",
        impact: "positive",
        date: "4年目 Q1",
      },
      {
        id: "news-4-2",
        source: "業界紙 Maritime Daily",
        category: "人材",
        headline: "技術サービス人材の獲得競争が激化",
        summary:
          "サポート要員の人件費が上昇。サポート体制の維持コストを見込んだ予算計画が必要です。",
        impact: "negative",
        date: "4年目 Q2",
      },
    ],
    requests: [
      {
        id: "req-4-1",
        owner: "Gulf Energy Shipping",
        region: "UAE / ドバイ",
        vesselType: "VLCC 300,000 DWT × 2隻",
        requirement:
          "最終選考。中東域での長期運用を見据えた総合提案を求められている。",
        budget: 1_800_000,
        deadline: "4年目 Q2",
        status: "negotiating",
        priorities: ["サポート拠点", "技術力", "価格"],
      },
      {
        id: "req-4-2",
        owner: "Pacific Ocean Lines",
        region: "シンガポール",
        vesselType: "コンテナ船 8,000 TEU × 2隻",
        requirement:
          "前回失注した案件の再打診。競合側の状況が変わり、選定をやり直している。",
        budget: 1_350_000,
        deadline: "4年目 Q3",
        status: "new",
        priorities: ["納期", "実績", "燃費性能"],
      },
    ],
  },
  {
    turn: 5,
    headline:
      "最終ターンです。ここまでの投資判断が最終スコアとして集計されます。",
    settlement: {
      revenue: 2_150_000,
      expense: 1_420_000,
      trustDelta: 8,
      highlights: [
        "アフターサービス事業の拡大により売上が増加",
        "中東サポート拠点の開設費用を計上（$420,000）",
        "環境規制対応の実績が評価され業界プレゼンスが向上（信頼度 +8）",
      ],
    },
    news: [
      {
        id: "news-5-1",
        source: "Clarksons Research",
        category: "市況",
        headline: "代替燃料船の発注比率が新造船の過半に到達",
        summary:
          "早期に代替燃料対応へ投資した事業者が優位に立つ市場構造が定着しました。",
        impact: "positive",
        date: "5年目 Q1",
      },
      {
        id: "news-5-2",
        source: "業界紙 Maritime Daily",
        category: "競合動向",
        headline: "業界再編が進行、中堅メーカーの統合が相次ぐ",
        summary:
          "規模の拡大か専門領域への集中か、次期中期計画での方針決定が求められます。",
        impact: "neutral",
        date: "5年目 Q2",
      },
    ],
    requests: [
      {
        id: "req-5-1",
        owner: "Gulf Energy Shipping",
        region: "UAE / ドバイ",
        vesselType: "VLCC 300,000 DWT × 4隻（追加）",
        requirement:
          "追加4隻分の発注の検討。",
        budget: 3_400_000,
        deadline: "5年目 Q3",
        status: "negotiating",
        priorities: ["実績", "標準化対応", "サポート体制"],
      },
      {
        id: "req-5-2",
        owner: "Nordic Tanker AS",
        region: "ノルウェー",
        vesselType: "アンモニア燃料船 45,000 DWT × 3隻",
        requirement:
          "次世代燃料対応の新造プロジェクト。",
        budget: 2_600_000,
        deadline: "5年目 Q4",
        status: "new",
        priorities: ["開発力", "共同開発体制", "規制適合"],
      },
    ],
  },
];

/** 指定ターンのデータを取得する（範囲外の場合は最終ターンのデータを返す） */
export function getTurnData(turn: number): TurnData {
  return turns.find((t) => t.turn === turn) ?? turns[turns.length - 1];
}

/**
 * 実践編の追加案件（前年の見込み引き合い件数に応じて届く）。
 * 前年の引き合いが 1 つ目の基準に届くと先頭の 1 件、2 つ目の基準にも届くと 2 件とも届く。
 * 想定予算は導入編の単位で、難易度の補正（実践編 ×0.7）がかかる。
 * 同じ年の本案件とは別の船主にしている（顧客プロファイルで 1 船主 1 件に保つため）。
 */
export const extraRequests: Record<number, ShipownerRequest[]> = {
  2: [
    {
      id: "x2-nordic",
      owner: "Nordic Tanker AS",
      region: "ノルウェー",
      vesselType: "プロダクトタンカー × 2隻",
      requirement: "既存タンカーへの燃料流量計の追加設置。",
      budget: 300_000,
      deadline: "2年目 Q3",
      status: "new",
      priorities: ["納期", "価格"],
      extra: true,
    },
    {
      id: "x2-gulf",
      owner: "Gulf Energy Shipping",
      region: "UAE / ドバイ",
      vesselType: "VLCC × 1隻",
      requirement: "中東拠点での予備品パッケージの試験導入。",
      budget: 250_000,
      deadline: "2年目 Q4",
      status: "new",
      priorities: ["サポート体制", "実績"],
      extra: true,
    },
  ],
  3: [
    {
      id: "x3-setouchi",
      owner: "Setouchi Kisen 株式会社",
      region: "日本 / 今治",
      vesselType: "内航タンカー × 1隻",
      requirement: "機関室モニタリングシステムの追加導入。",
      budget: 200_000,
      deadline: "3年目 Q3",
      status: "new",
      priorities: ["サポート体制", "価格"],
      extra: true,
    },
    {
      id: "x3-pacific",
      owner: "Pacific Ocean Lines",
      region: "シンガポール",
      vesselType: "コンテナ船 × 2隻",
      requirement: "既存システムへの排出量レポート機能の追加。",
      budget: 350_000,
      deadline: "3年目 Q4",
      status: "new",
      priorities: ["燃費性能", "納期"],
      extra: true,
    },
  ],
  4: [
    {
      id: "x4-nordic",
      owner: "Nordic Tanker AS",
      region: "ノルウェー",
      vesselType: "ケミカルタンカー × 2隻",
      requirement: "EU ETS の排出量報告を支援するサービス契約。",
      budget: 400_000,
      deadline: "4年目 Q3",
      status: "new",
      priorities: ["規制適合", "保守契約"],
      extra: true,
    },
    {
      id: "x4-aegean",
      owner: "Aegean Bulk Carriers",
      region: "ギリシャ / ピレウス",
      vesselType: "ばら積み船 × 2隻",
      requirement: "姉妹船への燃費改善キットの追加導入。",
      budget: 450_000,
      deadline: "4年目 Q4",
      status: "new",
      priorities: ["価格", "燃費性能"],
      extra: true,
    },
  ],
  5: [
    {
      id: "x5-setouchi",
      owner: "Setouchi Kisen 株式会社",
      region: "日本 / 今治",
      vesselType: "内航コンテナ船 × 3隻",
      requirement: "グループ会社への標準採用に向けた試験導入。",
      budget: 350_000,
      deadline: "5年目 Q3",
      status: "new",
      priorities: ["実績", "サポート体制"],
      extra: true,
    },
    {
      id: "x5-pacific",
      owner: "Pacific Ocean Lines",
      region: "シンガポール",
      vesselType: "新造コンテナ船 × 2隻",
      requirement: "新造コンテナ船への追加発注の検討。",
      budget: 600_000,
      deadline: "5年目 Q4",
      status: "new",
      priorities: ["納期", "実績"],
      extra: true,
    },
  ],
};

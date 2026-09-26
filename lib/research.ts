import type { IconName } from "@/components/ui/Icon";
import type { ResearchPurchase } from "./types";

export type ResearchCategory = "demand" | "competitor" | "regulation";

/** レポート内で表示する定量データ 1 行 */
export type ResearchDatum = {
  label: string;
  /** バー描画に使う数値 */
  value: number;
  /** 表示用の文字列 */
  display: string;
  caption?: string;
  /** 自社の値かどうか（強調表示に使う） */
  own?: boolean;
};

export type ResearchReport = {
  id: string;
  category: ResearchCategory;
  title: string;
  /** 調査会社・情報源 */
  provider: string;
  /** 購入前に見える概要 */
  teaser: string;
  /** 購入費用（USD、即時支出） */
  cost: number;
  /** このターン以降に購入できる */
  availableFrom: number;
  /** データの読み方 */
  dataLabel: string;
  data: ResearchDatum[];
  /** 購入後に見える示唆 */
  insights: ResearchInsight[];
};

/** レポートの示唆 1 件。関係する船主がいれば、その船主の理解につながる */
export type ResearchInsight = {
  text: string;
  /** 関係する船主の ID（customers.ts）。業界全般の示唆は空 */
  customers: string[];
};

export const researchCategories: Record<
  ResearchCategory,
  { label: string; description: string; icon: IconName }
> = {
  demand: {
    label: "需要見通し",
    description: "船種・航路別の需要動向",
    icon: "trendUp",
  },
  competitor: {
    label: "競合分析",
    description: "価格帯と受注シェアの推定",
    icon: "customers",
  },
  regulation: {
    label: "規制動向",
    description: "IMO / 各国当局のスカウティング",
    icon: "shield",
  },
};

export const researchReports: ResearchReport[] = [
  {
    id: "r-demand-vessel",
    category: "demand",
    title: "船種別需要見通し（3年）",
    provider: "Clarksons Research",
    teaser:
      "ばら積み船・タンカー・コンテナ船・内航船の3年先までの需要指数と、セグメントごとの購買特性。",
    cost: 60_000,
    availableFrom: 1,
    dataLabel: "需要指数（前年 = 100）",
    data: [
      {
        label: "ばら積み船",
        value: 128,
        display: "128",
        caption: "レトロフィット需要が牽引",
      },
      {
        label: "タンカー",
        value: 112,
        display: "112",
        caption: "市況回復で投資余力あり",
      },
      {
        label: "内航船",
        value: 104,
        display: "104",
        caption: "省人化ニーズが継続",
      },
      {
        label: "コンテナ船",
        value: 96,
        display: "96",
        caption: "新造発注は一時的に鈍化",
      },
    ],
    insights: [
      {
        text: "ハンディマックス帯のレトロフィット需要は2〜3年目に集中する見込み。早期の技術提案が有効。",
        customers: ["aegean"],
      },
      {
        text: "内航セグメントは価格弾力性が低く、サポート体制を重視する傾向が強い。",
        customers: ["setouchi"],
      },
      {
        text: "コンテナ船は4年目以降に再加速の予測。今は深追いせず関係維持に留めるのが妥当。",
        customers: ["pacific"],
      },
    ],
  },
  {
    id: "r-demand-route",
    category: "demand",
    title: "主要航路別の設備投資動向",
    provider: "Clarksons Research",
    teaser:
      "航路ごとの設備投資額の伸びと、船主の所在地域別の意思決定スピードの比較。",
    cost: 45_000,
    availableFrom: 2,
    dataLabel: "設備投資の伸び（指数）",
    data: [
      { label: "欧州 – アジア", value: 134, display: "134" },
      { label: "中東 – アジア", value: 121, display: "121" },
      { label: "大西洋", value: 98, display: "98" },
      { label: "日本域内", value: 92, display: "92" },
    ],
    insights: [
      {
        text: "欧州船主は EU ETS 対応を理由に投資判断が速い。規制適合を軸にした提案が通りやすい。",
        customers: ["nordic", "aegean"],
      },
      {
        text: "中東の大型船主は長期サポート体制を重視。拠点設置の有無が選定条件になりやすい。",
        customers: ["gulf"],
      },
      {
        text: "域内（日本）は伸びが鈍いが、既存顧客の追加発注による積み上げが期待できる。",
        customers: ["setouchi"],
      },
    ],
  },
  {
    id: "r-comp-price",
    category: "competitor",
    title: "競合の価格帯推定",
    provider: "自社営業部 / 業界ヒアリング",
    teaser:
      "主要競合3社の見積価格帯を自社比の指数で推定。値引き交渉の落としどころが見える。",
    cost: 80_000,
    availableFrom: 1,
    dataLabel: "価格指数（自社 = 100）",
    data: [
      {
        label: "欧州系 A社",
        value: 85,
        display: "85",
        caption: "アジア市場でシェア獲得を狙った戦略価格",
      },
      { label: "アジア系 B社", value: 97, display: "97" },
      { label: "自社", value: 100, display: "100", own: true },
      {
        label: "欧州系 C社",
        value: 108,
        display: "108",
        caption: "高付加価値路線",
      },
    ],
    insights: [
      {
        text: "A社は主機補機パッケージで自社比15%安。ただし受注過多で納期遅延リスクを抱えている。",
        customers: ["pacific"],
      },
      {
        text: "価格の単純比較を避け、燃費とメンテナンス費を含むライフサイクルコストで比較させる提案が有効。",
        customers: ["pacific"],
      },
      {
        text: "自社の価格は中位。値引きよりも保証条件・納期確約での差別化が費用対効果が高い。",
        customers: ["pacific"],
      },
    ],
  },
  {
    id: "r-comp-share",
    category: "competitor",
    title: "セグメント別受注シェア推定",
    provider: "Maritime Daily 調査部",
    teaser:
      "自社と競合の受注シェア推定値。どのセグメントで攻めるべきかの判断材料。",
    cost: 65_000,
    availableFrom: 2,
    dataLabel: "推定受注シェア",
    data: [
      { label: "欧州系 A社", value: 31, display: "31%" },
      { label: "その他", value: 29, display: "29%" },
      { label: "アジア系 B社", value: 22, display: "22%" },
      { label: "自社", value: 18, display: "18%", own: true },
    ],
    insights: [
      {
        text: "自社シェアは18%。内航セグメントに限れば34%で首位のため、ここを足場に外航へ展開するのが定石。",
        customers: ["setouchi"],
      },
      {
        text: "A社のシェアはばら積み船に偏っており、タンカー・特殊船では相対的に手薄。",
        customers: ["nordic", "gulf"],
      },
      {
        text: "技術セミナー経由の商談は競合との比較検討に入る前に接点を持てるため、シェア逆転の起点になりやすい。",
        customers: [],
      },
    ],
  },
  {
    id: "r-reg-imo",
    category: "regulation",
    title: "IMO 規制スケジュールの先読み",
    provider: "規制コンサルタント",
    teaser:
      "審議中の規制案について、発効時期と成立確度を推定。需要の前倒し・後ろ倒しを予測できる。",
    cost: 70_000,
    availableFrom: 1,
    dataLabel: "成立確度",
    data: [
      {
        label: "EEXI / CII 基準の引き上げ",
        value: 90,
        display: "90%",
        caption: "2027年発効の見込み",
      },
      {
        label: "EU ETS の中小型船への拡大",
        value: 75,
        display: "75%",
        caption: "3年目に公示",
      },
      {
        label: "アンモニア燃料の安全規格",
        value: 40,
        display: "40%",
        caption: "5年目以降",
      },
    ],
    insights: [
      {
        text: "CII 基準の引き上げはほぼ確定。計測・モニタリング機器の需要は2年目から立ち上がる。",
        customers: ["aegean", "pacific"],
      },
      {
        text: "EU ETS 拡大は3年目に公示される確度が高い。欧州船主への先行提案が効く。",
        customers: ["nordic"],
      },
      {
        text: "アンモニア燃料は確度が低く、今期の重点投資には向かない。動向監視に留めるのが妥当。",
        customers: [],
      },
    ],
  },
  {
    id: "r-reg-subsidy",
    category: "regulation",
    title: "各国の補助金・優遇制度一覧",
    provider: "自社渉外部",
    teaser:
      "主要国の脱炭素関連補助金の適用条件と上限額。提案時の実質負担額を下げられる。",
    cost: 40_000,
    availableFrom: 1,
    dataLabel: "補助率の上限",
    data: [
      { label: "日本（国土交通省）", value: 30, display: "30%" },
      { label: "ノルウェー", value: 25, display: "25%" },
      { label: "シンガポール", value: 20, display: "20%" },
      { label: "EU（加盟国平均）", value: 18, display: "18%" },
    ],
    insights: [
      {
        text: "日本の制度は開発費にも適用可能。内航案件では実質負担を3割下げた見積を提示できる。",
        customers: ["setouchi"],
      },
      {
        text: "ノルウェー船主向けは申請代行までセットで提案すると、価格以外の評価点になる。",
        customers: ["nordic"],
      },
      {
        text: "補助金の申請期限は各国とも年度単位。ターン後半の提案では間に合わない場合がある。",
        customers: [],
      },
    ],
  },
  {
    id: "r-reg-next",
    category: "regulation",
    title: "次期中期規制の動向スカウティング",
    provider: "規制コンサルタント",
    teaser:
      "2030年目標に向けた中間レビューの論点整理。代替燃料への投資判断に直結する情報。",
    cost: 95_000,
    availableFrom: 3,
    dataLabel: "議論の進捗",
    data: [
      { label: "燃料規制の段階強化", value: 80, display: "80%" },
      { label: "排出量取引の国際統合", value: 55, display: "55%" },
      { label: "船齢制限の導入", value: 25, display: "25%" },
    ],
    insights: [
      {
        text: "燃料規制の段階強化は議論が先行。メタノール対応機器への投資は4年目までに判断したい。",
        customers: ["nordic"],
      },
      {
        text: "排出量取引の国際統合が進めば、モニタリング機器の需要は全地域に広がる。",
        customers: ["gulf"],
      },
      {
        text: "船齢制限は反対が強く実現性は低い。解撤前提の提案は避けるべき。",
        customers: [],
      },
    ],
  },
];

export function getReport(id: string): ResearchReport | undefined {
  return researchReports.find((r) => r.id === id);
}

/** 指定ターンで購入可能か（購入済みかどうかは別途判定） */
export function isAvailable(report: ResearchReport, turn: number): boolean {
  return turn >= report.availableFrom;
}

/** 指定ターンに購入されたレポートの合計額 */
export function researchSpendInTurn(
  purchases: ResearchPurchase[],
  turn: number,
): number {
  return purchases
    .filter((p) => p.turn === turn)
    .reduce((sum, p) => sum + p.cost, 0);
}

/** 購入可能かつ未購入のレポート件数（サイドバーのバッジ用） */
export function countUnpurchasedAvailable(
  purchases: ResearchPurchase[],
  turn: number,
): number {
  const owned = new Set(purchases.map((p) => p.reportId));
  return researchReports.filter(
    (r) => isAvailable(r, turn) && !owned.has(r.id),
  ).length;
}

/** レポートに関係する船主の ID（示唆から集計） */
export function reportCustomerIds(report: ResearchReport): string[] {
  return Array.from(new Set(report.insights.flatMap((i) => i.customers)));
}

/** その船主に関係するレポート */
export function reportsForCustomer(customerId: string): ResearchReport[] {
  return researchReports.filter((r) => reportCustomerIds(r).includes(customerId));
}

/** 購入済みのレポートから、その船主に関係する示唆を集める */
export function insightsForCustomer(
  purchases: ResearchPurchase[],
  customerId: string,
): { report: ResearchReport; text: string }[] {
  const owned = new Set(purchases.map((p) => p.reportId));
  return researchReports
    .filter((r) => owned.has(r.id))
    .flatMap((report) =>
      report.insights
        .filter((i) => i.customers.includes(customerId))
        .map((i) => ({ report, text: i.text })),
    );
}

/** 関係するレポートを 1 つ以上購入済みの船主の ID */
export function researchedCustomerIds(purchases: ResearchPurchase[]): Set<string> {
  const owned = new Set(purchases.map((p) => p.reportId));
  return new Set(
    researchReports
      .filter((r) => owned.has(r.id))
      .flatMap((r) => reportCustomerIds(r)),
  );
}

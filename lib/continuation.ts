import { baseCustomers, currentRelationship } from "./customers";
import { LOCAL_PARTNER_MIN_SPEND, planAmount } from "./marketing";
import { getModeConfig, getScenarioTurn, synergyRuleFor, type EmergencyLoanConfig } from "./modes";
import type { SynergyRule } from "./synergy";
import type {
  CompanySize,
  Continuation,
  GameState,
  MarketNews,
  MarketingPlan,
  OverflowChoice,
  OverseasChoice,
  PartOneSummary,
  RepairChoice,
  ShipownerRequest,
  TurnData,
  TurnSettlement,
} from "./types";

/**
 * 実践編の継続プレイ（第2部 6〜10年目）。
 * 6年目の初めに工場停止と大不況が同時に起き、そこから立て直す5年間。
 * 金額の多くは「基準資金 K（6年目の開始時の資金）」に対する割合で決まる
 * （設計書：docs/design/continuation_6-10_design.md）。
 */

export const CONTINUATION_START_TURN = 6;
export const CONTINUATION_END_TURN = 10;

/** 受注 1 件あたりの受注額の下限（施策の $100,000 に見合う額を保証する） */
export const MIN_DEAL_AMOUNT = 250_000;
/** 不況の年に関係性の低下を防ぐ「関係維持ライン」（営業訪問への投資額） */
export const RELATIONSHIP_KEEP_SPEND = 50_000;
/** 不況の年（6〜8年目）に、すべての既存船主の関係性が下がる量 */
export const RECESSION_RELATIONSHIP_DELTA = -5;
/** 9年目の「回復期の優先案件」が届く関係性の基準 */
export const RECOVERY_RELATIONSHIP_MIN = 70;
/** 回復期の優先案件の最大件数 */
export const RECOVERY_MAX_DEALS = 3;

/** 市況指数（本業の売上と本案件の受注額にかける） */
export const marketIndex: Record<number, number> = {
  6: 0.6,
  7: 0.5,
  8: 0.7,
  9: 0.9,
  10: 1.1,
};

/** 本業の売上（市況指数 100% のとき）の割合 */
const BASE_REVENUE_RATE = 0.35;
/** 6年目の生産能力の枠（受注額の合計の上限）の割合 */
const CAPACITY_CAP_RATE = 0.15;

export const repairOptions: Record<
  RepairChoice,
  { label: string; costRate: number; summary: string }
> = {
  patch: {
    label: "応急修理",
    costRate: 0.15,
    summary: "費用は小さいが、9年目に再び2か月止まる（生産能力 6分の5）",
  },
  renew: {
    label: "設備を新しくする",
    costRate: 0.3,
    summary: "費用は大きいが、7年目以降の生産能力が 110%（本業の売上 ×1.1）",
  },
};

export const overflowOptions: Record<
  OverflowChoice,
  { label: string; summary: string }
> = {
  outsource: {
    label: "他社の工場に作ってもらう",
    summary: "超えた分の受注額は 60% だけ入る。信頼度・関係性は変わらない",
  },
  delay: {
    label: "正直に伝えて納期を延ばしてもらう",
    summary: "超えた分は翌年（7年目の決算）に全額入る。信頼度 −3、その船主の関係性 −5",
  },
  silent: {
    label: "黙って受けて遅れる",
    summary: "この年に全額入るが、7年目の初めに遅れが発覚し、信頼度 −10、その船主の関係性 −15",
  },
};

export const overseasOptions: Record<
  OverseasChoice,
  { label: string; costRate: number; tagline: string; points: string[] }
> = {
  india: {
    label: "インド",
    costRate: 0.2,
    tagline: "時間はかかるが、当たれば最大",
    points: [
      "造船の規模はまだ小さいが、国が造船業の強化を急いでいる。価格に厳しく、現地調達を求められやすい",
      "8年目に造船所から小さな試験発注、9年目に2件。10年目に国の支援を受けた大型の新造計画",
      "大型計画は、8・9年目にインドで1件以上受注していないと声がかからない",
    ],
  },
  vietnam: {
    label: "ベトナム",
    costRate: 0.25,
    tagline: "守りの進出。生産拠点を分ける",
    points: [
      "韓国系の大型造船所があり、日本の製造業の工場も多い。人件費が安い",
      "第2工場を立ち上げる。8年目から固定費 −10%、9年目から生産能力 +10%",
      "応急修理を選んでいても、9年目の再停止をベトナム工場で帳消しにできる。新しい顧客は少なめ",
    ],
  },
  china: {
    label: "中国",
    costRate: 0.15,
    tagline: "早く大きく取れるが、急に失うこともある",
    points: [
      "世界最大の造船国で、チャンスは最も大きい。地元メーカーとの値下げ競争が激しい",
      "8年目に大口の案件が2件。9年目は取引の規制の運用が変わる",
      "価格の訴求が中心。取引の規制が変わるリスクもある",
    ],
  },
  none: {
    label: "進出しない",
    costRate: 0,
    tagline: "今年は安全だが、じわじわ細る",
    points: [
      "費用はかからない。ただし国内の造船は縮小が続いており、景気が戻っても国内向けの売上は少しずつ減る見通し",
      "海外の造船所で建造する船向けの要求には、現地で対応できない",
    ],
  },
};

export const companySizeInfo: Record<
  CompanySize,
  {
    label: string;
    fixedCostRate: number;
    crisisTrustDelta: number;
    loanRateDiscount: number;
  }
> = {
  mid: { label: "中堅", fixedCostRate: 0.35, crisisTrustDelta: -10, loanRateDiscount: 0 },
  large: { label: "大手", fixedCostRate: 0.33, crisisTrustDelta: -7, loanRateDiscount: 0.01 },
  major: { label: "業界大手", fixedCostRate: 0.31, crisisTrustDelta: -5, loanRateDiscount: 0.02 },
};

/** 基準資金から企業規模を決める（$300万未満 / $800万未満 / それ以上） */
export function companySizeFor(baseFunds: number): CompanySize {
  if (baseFunds < 3_000_000) return "mid";
  if (baseFunds < 8_000_000) return "large";
  return "major";
}

/** $10,000 単位に丸める */
function roundAmount(amount: number): number {
  return Math.round(amount / 10_000) * 10_000;
}

/** 基準資金に対する割合の金額（$10,000 単位） */
export function shareOfBase(cont: Continuation, rate: number): number {
  return roundAmount(cont.baseFunds * rate);
}

/** 受注額（基準資金 × 割合 × 市況指数。下限 $250,000） */
function dealAmount(cont: Continuation, rate: number, index = 1): number {
  return Math.max(MIN_DEAL_AMOUNT, roundAmount(cont.baseFunds * rate * index));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// ---------------------------------------------------------------------------
// 状態の判定
// ---------------------------------------------------------------------------

/** 継続プレイ（第2部）の年か */
export function isContinuationTurn(state: GameState, turn = state.turn): boolean {
  return state.continuation !== null && turn >= CONTINUATION_START_TURN;
}

/**
 * 継続プレイに進めるか。
 * 実践編を5年目まで完走し、融資の返済後の最終資金が初期資金を上回っていること。
 */
export function canContinue(state: GameState): boolean {
  return (
    state.mode === "advanced" &&
    state.continuation === null &&
    state.gameCompleted &&
    !state.bankrupt &&
    state.endReason === "completed" &&
    state.turn === CONTINUATION_START_TURN - 1 &&
    !state.demoOperated &&
    state.availableFunds > getModeConfig(state.mode).initialFunds
  );
}

/** 5年目を完走したが、赤字のため継続できない（案内だけ出す） */
export function continuationLockedByDeficit(state: GameState): boolean {
  return (
    state.mode === "advanced" &&
    state.continuation === null &&
    state.gameCompleted &&
    state.turn === CONTINUATION_START_TURN - 1 &&
    !canContinue(state) &&
    !state.demoOperated
  );
}

export type PendingDecision = "crisis" | "overseas" | "recoveryNotice";

/**
 * 年初に済ませる必要がある判断（済むまで予算を確定できない）。
 * 6年目：工場の直し方と経費削減 / 7年目：進出先 / 9年目：回復期のお知らせの確認
 */
export function pendingDecision(state: GameState): PendingDecision | null {
  const cont = state.continuation;
  if (!cont || state.gameCompleted || state.pendingInsolvency) return null;
  if (state.turn === 6 && (cont.repair === null || cont.costCut === null)) {
    return "crisis";
  }
  if (state.turn === 7 && cont.overseas === null) return "overseas";
  if (state.turn === 9 && cont.keptOwners !== null && !cont.noticesSeen.includes(9)) {
    return "recoveryNotice";
  }
  return null;
}

// ---------------------------------------------------------------------------
// 第2部の開始と、年初・年末の判断
// ---------------------------------------------------------------------------

/**
 * 5年目を完走した状態から、第2部（6年目）を始める。
 * 資金はそのまま基準資金になり、危機の発生で信頼度が企業規模に応じて下がる。
 */
export function startContinuation(state: GameState, partOne: PartOneSummary): GameState {
  if (!canContinue(state)) return state;
  const size = companySizeFor(state.availableFunds);
  return {
    ...state,
    turn: CONTINUATION_START_TURN,
    totalTurns: CONTINUATION_END_TURN,
    gameCompleted: false,
    endReason: null,
    marketingCommitted: false,
    proposalsCompleted: [],
    trustScore: clampScore(state.trustScore + companySizeInfo[size].crisisTrustDelta),
    continuation: {
      baseFunds: state.availableFunds,
      size,
      trustAtStart: state.trustScore,
      partOne,
      repair: null,
      costCut: null,
      overflow: null,
      overseas: null,
      specialSpend: {},
      keptOwners: null,
      recoveryOwners: null,
      indiaBigDeal: null,
      chinaLoss: null,
      noticesSeen: [],
    },
  };
}

function addSpecialSpend(cont: Continuation, turn: number, amount: number) {
  return { ...cont.specialSpend, [turn]: (cont.specialSpend[turn] ?? 0) + amount };
}

/** 6年目の判断①：工場の直し方を決め、費用をすぐに支払う */
export function chooseRepair(state: GameState, choice: RepairChoice): GameState {
  const cont = state.continuation;
  if (!cont || state.turn !== 6 || cont.repair !== null || state.gameCompleted) return state;
  const cost = shareOfBase(cont, repairOptions[choice].costRate);
  return {
    ...state,
    availableFunds: state.availableFunds - cost,
    continuation: { ...cont, repair: choice, specialSpend: addSpecialSpend(cont, 6, cost) },
  };
}

/** 6年目の判断②：経費を削るか */
export function chooseCostCut(state: GameState, cut: boolean): GameState {
  const cont = state.continuation;
  if (!cont || state.turn !== 6 || cont.costCut !== null || state.gameCompleted) return state;
  return { ...state, continuation: { ...cont, costCut: cut } };
}

/** 7年目：進出先を決め、費用をすぐに支払う（資金が足りない進出先は選べない） */
export function chooseOverseas(state: GameState, choice: OverseasChoice): GameState {
  const cont = state.continuation;
  if (!cont || state.turn !== 7 || cont.overseas !== null || state.gameCompleted) return state;
  const cost = overseasCost(cont, choice);
  if (cost > 0 && cost > state.availableFunds) return state;
  return {
    ...state,
    availableFunds: state.availableFunds - cost,
    continuation: { ...cont, overseas: choice, specialSpend: addSpecialSpend(cont, 7, cost) },
  };
}

export function overseasCost(cont: Continuation, choice: OverseasChoice): number {
  return shareOfBase(cont, overseasOptions[choice].costRate);
}

/** 年初のお知らせを確認済みにする */
export function dismissNotice(state: GameState, turn: number): GameState {
  const cont = state.continuation;
  if (!cont || cont.noticesSeen.includes(turn)) return state;
  return { ...state, continuation: { ...cont, noticesSeen: [...cont.noticesSeen, turn] } };
}

/** 6年目の生産能力の枠（この年の受注額の合計の上限） */
export function capacityCap(cont: Continuation): number {
  return Math.max(MIN_DEAL_AMOUNT, shareOfBase(cont, CAPACITY_CAP_RATE));
}

/**
 * 受注したときに、今すぐ入金される額と、生産能力の枠を超えて保留になる額。
 * 枠があるのは継続プレイの6年目だけ。
 */
export function splitByCapacity(
  state: GameState,
  revenue: number,
): { now: number; held: number } {
  const cont = state.continuation;
  if (!cont || state.turn !== 6 || revenue <= 0) return { now: revenue, held: 0 };
  const wonSoFar = state.proposalLog
    .filter((p) => p.turn === 6)
    .reduce((sum, p) => sum + p.revenue, 0);
  const room = Math.max(0, capacityCap(cont) - wonSoFar);
  const now = Math.min(revenue, room);
  return { now, held: revenue - now };
}

/** 6年目に生産能力の枠を超えた受注額の合計と、その船主 */
export function overflowOf(state: GameState): { amount: number; owners: string[] } {
  const held = state.proposalLog.filter((p) => p.turn === 6 && (p.held ?? 0) > 0);
  return {
    amount: held.reduce((sum, p) => sum + (p.held ?? 0), 0),
    owners: Array.from(new Set(held.map((p) => p.owner))),
  };
}

/** 6年目の年末に「作りきれない分」の判断が必要か */
export function needsOverflowChoice(state: GameState): boolean {
  const cont = state.continuation;
  return (
    cont !== null &&
    state.turn === 6 &&
    !state.gameCompleted &&
    cont.overflow === null &&
    overflowOf(state).amount > 0
  );
}

/** 6年目の判断③：作りきれない分をどう扱うか（年末、決算の前に選ぶ） */
export function chooseOverflow(state: GameState, choice: OverflowChoice): GameState {
  const cont = state.continuation;
  if (!cont || !needsOverflowChoice(state)) return state;
  const { amount, owners } = overflowOf(state);
  let trust = state.trustScore;
  let deltas = state.relationshipDeltas;
  if (choice === "delay") {
    trust = clampScore(trust - 3);
    for (const owner of owners) deltas = { ...deltas, [owner]: (deltas[owner] ?? 0) - 5 };
  }
  return {
    ...state,
    trustScore: trust,
    relationshipDeltas: deltas,
    continuation: { ...cont, overflow: { choice, amount, owners } },
  };
}

// ---------------------------------------------------------------------------
// 受注条件・施策
// ---------------------------------------------------------------------------

/**
 * その年の受注条件。
 * 不況の6〜8年目は訴求ラインが3分の1に上がる。
 * 海外に進出しなかった場合、9・10年目も「価格」の訴求（展示会）は3分の1のまま。
 */
export function synergyRuleAt(state: GameState, turn = state.turn): SynergyRule {
  const base = synergyRuleFor(state.mode);
  const cont = state.continuation;
  if (!cont || turn < CONTINUATION_START_TURN) return base;
  if (turn <= 8) return { ...base, minShare: 1 / 3 };
  return cont.overseas === "none"
    ? { ...base, channelMinShare: { expo: 1 / 3 } }
    : base;
}

/** 現地パートナーの施策を使えるか（海外に進出している） */
export function hasLocalPartner(state: GameState): boolean {
  const o = state.continuation?.overseas;
  return o === "india" || o === "vietnam" || o === "china";
}

/** 進出先の案件の受注に必要な現地パートナーへの投資が足りているか */
export function meetsLocalPartner(plan: MarketingPlan): boolean {
  return planAmount(plan, "localPartner") >= LOCAL_PARTNER_MIN_SPEND;
}

/** 継続プレイの緊急融資の条件（枠は基準資金の50%と $40万の大きいほう） */
export function loanConfigFor(state: GameState): EmergencyLoanConfig {
  const base = getModeConfig(state.mode).emergencyLoan;
  const cont = state.continuation;
  if (!cont) return base;
  return {
    ...base,
    creditLimit: Math.max(base.creditLimit, shareOfBase(cont, 0.5)),
    workingCapital: Math.max(base.workingCapital, shareOfBase(cont, 0.05)),
  };
}

/** 企業規模による融資金利の引き下げ */
export function loanRateDiscount(state: GameState): number {
  const cont = state.continuation;
  return cont ? companySizeInfo[cont.size].loanRateDiscount : 0;
}

/** 融資の回数を数える対象（第2部では第2部で受けた融資だけ） */
export function loansInScope(state: GameState) {
  return state.continuation
    ? state.loans.filter((l) => l.turn >= CONTINUATION_START_TURN)
    : state.loans;
}

// ---------------------------------------------------------------------------
// 画面表示用の状況
// ---------------------------------------------------------------------------

/** その年の生産能力（本業の売上にかける倍率） */
export function productionCapacity(cont: Continuation, turn: number): number {
  let capacity = 1;
  if (turn === 6) capacity = 2 / 3;
  if (turn === 9 && cont.repair === "patch" && cont.overseas !== "vietnam") capacity = 5 / 6;
  if (cont.repair === "renew" && turn >= 7) capacity *= 1.1;
  if (cont.overseas === "vietnam" && turn >= 9) capacity *= 1.1;
  return capacity;
}

/** 国内市場の縮小（進出しなかった場合の本業の売上の倍率） */
function domesticRate(cont: Continuation, turn: number): number {
  if (cont.overseas !== "none") return 1;
  if (turn === 9) return 0.9;
  if (turn === 10) return 0.8;
  return 1;
}

/** 固定費（その年） */
export function fixedCost(cont: Continuation, turn: number): number {
  let rate = companySizeInfo[cont.size].fixedCostRate;
  if (cont.costCut && turn <= 8) rate *= 0.85;
  if (cont.overseas === "vietnam" && turn >= 8) rate *= 0.9;
  return shareOfBase(cont, rate);
}

/** 本業の売上（その年） */
export function baseRevenue(cont: Continuation, turn: number): number {
  return shareOfBase(
    cont,
    BASE_REVENUE_RATE *
      (marketIndex[turn] ?? 1) *
      productionCapacity(cont, turn) *
      domesticRate(cont, turn),
  );
}

// ---------------------------------------------------------------------------
// シナリオ（ニュース・要求）
// ---------------------------------------------------------------------------

type RequestTemplate = Omit<ShipownerRequest, "budget" | "id"> & {
  id: string;
  rate: number;
  /** 市況指数をかけるか（進出先の案件・海外造船所向けはかけない） */
  indexed: boolean;
};

const mainTemplates: Record<number, RequestTemplate[]> = {
  6: [
    {
      id: "c6-1",
      owner: "Aegean Bulk Carriers",
      region: "ギリシャ / ピレウス",
      vesselType: "ばら積み船 38,000 DWT × 5隻",
      requirement: "運賃の急落を受け、既存船の運航コストを下げる改造を急ぎたい。手元資金は絞っている。",
      deadline: "6年目 Q2",
      status: "negotiating",
      priorities: ["初期投資額", "燃費性能", "納期"],
      rate: 0.15,
      indexed: true,
    },
    {
      id: "c6-2",
      owner: "Setouchi Kisen 株式会社",
      region: "日本 / 今治",
      vesselType: "内航コンテナ船 749 GT × 3隻",
      requirement: "荷動きの減少で船を止めている間に、機器の点検と部品交換を済ませておきたい。",
      deadline: "6年目 Q3",
      status: "new",
      priorities: ["サポート体制", "価格", "実績"],
      rate: 0.15,
      indexed: true,
    },
  ],
  7: [
    {
      id: "c7-1",
      owner: "Nordic Tanker AS",
      region: "ノルウェー",
      vesselType: "プロダクトタンカー 50,000 DWT × 2隻",
      requirement: "先送りしていた排出量の計測機器。規制の期限が迫り、最低限の構成で導入したい。",
      deadline: "7年目 Q2",
      status: "in_review",
      priorities: ["規制適合", "価格", "納期"],
      rate: 0.1,
      indexed: true,
    },
    {
      id: "c7-2",
      owner: "Gulf Energy Shipping",
      region: "UAE / ドバイ",
      vesselType: "VLCC 300,000 DWT × 2隻（係船中）",
      requirement: "係船している船の保守契約の見直し。支払いは抑えつつ、再稼働の際にすぐ動ける体制を求めている。",
      deadline: "7年目 Q3",
      status: "negotiating",
      priorities: ["価格", "保守契約", "実績"],
      rate: 0.12,
      indexed: true,
    },
  ],
  8: [
    {
      id: "c8-1",
      owner: "Pacific Ocean Lines",
      region: "シンガポール",
      vesselType: "コンテナ船 × 3隻",
      requirement: "古い船の解体で船の余りが解消し始めたため、既存船の延命改造を再開する。",
      deadline: "8年目 Q2",
      status: "new",
      priorities: ["ライフサイクルコスト", "燃費性能", "納期"],
      rate: 0.1,
      indexed: true,
    },
    {
      id: "c8-2",
      owner: "Setouchi Kisen 株式会社",
      region: "日本 / 今治",
      vesselType: "内航タンカー × 2隻",
      requirement: "船員の人手不足への対応として、機関室の遠隔監視を追加したい。",
      deadline: "8年目 Q3",
      status: "negotiating",
      priorities: ["実績", "サポート体制", "価格"],
      rate: 0.12,
      indexed: true,
    },
    {
      id: "c8-3",
      owner: "Nordic Tanker AS",
      region: "ノルウェー",
      vesselType: "ケミカルタンカー × 3隻",
      requirement: "新しい燃料への切り替えを見据えた、燃料供給系の改造の検討。",
      deadline: "8年目 Q4",
      status: "in_review",
      priorities: ["技術力", "規制適合", "保守契約"],
      rate: 0.12,
      indexed: true,
    },
  ],
  9: [
    {
      id: "c9-1",
      owner: "Gulf Energy Shipping",
      region: "UAE / ドバイ",
      vesselType: "VLCC 300,000 DWT × 3隻",
      requirement: "係船から再稼働させる船の、主機まわりの一括更新。",
      deadline: "9年目 Q2",
      status: "negotiating",
      priorities: ["納期", "サポート拠点", "価格"],
      rate: 0.1,
      indexed: true,
    },
    {
      id: "c9-2",
      owner: "Aegean Bulk Carriers",
      region: "ギリシャ / ピレウス",
      vesselType: "ばら積み船 × 6隻",
      requirement: "船隊を入れ替えるにあたり、新しい船の標準仕様を選びたい。",
      deadline: "9年目 Q3",
      status: "new",
      priorities: ["標準化対応", "価格", "燃費性能"],
      rate: 0.12,
      indexed: true,
    },
    {
      id: "c9-3",
      owner: "Nordic Tanker AS",
      region: "ノルウェー",
      vesselType: "LNG 燃料タンカー × 2隻（新造）",
      requirement: "新燃料船の新造計画。燃料供給系の設計段階から加わってくれる相手を探している。",
      deadline: "9年目 Q4",
      status: "in_review",
      priorities: ["開発力", "共同開発体制", "実績"],
      rate: 0.12,
      indexed: true,
    },
  ],
  10: [
    {
      id: "c10-1",
      owner: "Pacific Ocean Lines",
      region: "シンガポール",
      vesselType: "新燃料コンテナ船 × 4隻（新造）",
      requirement: "発注が急増している新燃料船の、主機補機パッケージ。",
      deadline: "10年目 Q2",
      status: "negotiating",
      priorities: ["燃費性能", "納期", "実績"],
      rate: 0.1,
      indexed: true,
    },
    {
      id: "c10-2",
      owner: "Setouchi Kisen 株式会社",
      region: "日本 / 今治",
      vesselType: "内航船 × 5隻（代替建造）",
      requirement: "古くなった船の代わりに造る船への、機関室システムの一括導入。",
      deadline: "10年目 Q3",
      status: "new",
      priorities: ["サポート体制", "実績", "納期"],
      rate: 0.12,
      indexed: true,
    },
    {
      id: "c10-3",
      owner: "Gulf Energy Shipping",
      region: "UAE / ドバイ",
      vesselType: "VLCC × 2隻（新造）",
      requirement: "船隊の入れ替えに合わせた新造船への機器の導入。既存船との共通化も検討している。",
      deadline: "10年目 Q4",
      status: "in_review",
      priorities: ["船隊一括対応", "サポート体制", "価格"],
      rate: 0.12,
      indexed: true,
    },
  ],
};

/** 前年の見込み引き合いから生まれる追加案件（第2部） */
const extraTemplates: Record<number, RequestTemplate[]> = {
  6: [
    { id: "cx6-nordic", owner: "Nordic Tanker AS", region: "ノルウェー", vesselType: "プロダクトタンカー × 1隻", requirement: "故障した計測機器の交換。", deadline: "6年目 Q3", status: "new", priorities: ["価格", "納期"], extra: true, rate: 0.04, indexed: true },
    { id: "cx6-pacific", owner: "Pacific Ocean Lines", region: "シンガポール", vesselType: "コンテナ船 × 2隻", requirement: "減速運航に合わせた機関の調整。", deadline: "6年目 Q4", status: "new", priorities: ["燃費性能", "価格"], extra: true, rate: 0.04, indexed: true },
  ],
  7: [
    { id: "cx7-setouchi", owner: "Setouchi Kisen 株式会社", region: "日本 / 今治", vesselType: "内航コンテナ船 × 1隻", requirement: "予備品の買い置き。", deadline: "7年目 Q3", status: "new", priorities: ["サポート体制", "価格"], extra: true, rate: 0.04, indexed: true },
    { id: "cx7-pacific", owner: "Pacific Ocean Lines", region: "シンガポール", vesselType: "コンテナ船 × 1隻", requirement: "急ぎの部品交換。", deadline: "7年目 Q4", status: "new", priorities: ["納期", "実績"], extra: true, rate: 0.04, indexed: true },
  ],
  8: [
    { id: "cx8-gulf", owner: "Gulf Energy Shipping", region: "UAE / ドバイ", vesselType: "VLCC × 1隻", requirement: "再稼働に向けた点検契約。", deadline: "8年目 Q3", status: "new", priorities: ["保守契約", "価格"], extra: true, rate: 0.04, indexed: true },
    { id: "cx8-setouchi", owner: "Setouchi Kisen 株式会社", region: "日本 / 今治", vesselType: "内航船 × 2隻", requirement: "監視システムの追加。", deadline: "8年目 Q4", status: "new", priorities: ["価格", "納期"], extra: true, rate: 0.04, indexed: true },
  ],
  9: [
    { id: "cx9-setouchi", owner: "Setouchi Kisen 株式会社", region: "日本 / 今治", vesselType: "内航タンカー × 2隻", requirement: "監視システムのグループ会社への展開。", deadline: "9年目 Q3", status: "new", priorities: ["実績", "納期"], extra: true, rate: 0.04, indexed: true },
    { id: "cx9-pacific", owner: "Pacific Ocean Lines", region: "シンガポール", vesselType: "コンテナ船 × 2隻", requirement: "燃費改善キットの追加。", deadline: "9年目 Q4", status: "new", priorities: ["燃費性能", "保守契約"], extra: true, rate: 0.04, indexed: true },
  ],
  10: [
    { id: "cx10-nordic", owner: "Nordic Tanker AS", region: "ノルウェー", vesselType: "ケミカルタンカー × 2隻", requirement: "排出量報告の機器の更新。", deadline: "10年目 Q3", status: "new", priorities: ["規制適合", "納期"], extra: true, rate: 0.04, indexed: true },
    { id: "cx10-aegean", owner: "Aegean Bulk Carriers", region: "ギリシャ / ピレウス", vesselType: "ばら積み船 × 2隻", requirement: "姉妹船への同じ機器の追加。", deadline: "10年目 Q4", status: "new", priorities: ["実績", "価格"], extra: true, rate: 0.04, indexed: true },
  ],
};

/** 海外の造船所で建造する船向けの要求（全員に届く。その国に進出していれば提案できる） */
const yardTemplates: Record<number, RequestTemplate & { country: Exclude<OverseasChoice, "none"> }> = {
  8: {
    id: "cy8-aegean",
    owner: "Aegean Bulk Carriers",
    region: "ギリシャ / ピレウス",
    vesselType: "ばら積み船 × 4隻（中国の造船所で新造）",
    requirement: "中国の造船所に発注した新しい船への機器の納入と、現地での据え付け。",
    deadline: "8年目 Q3",
    status: "new",
    priorities: ["価格", "納期", "実績"],
    rate: 0.08,
    indexed: false,
    country: "china",
  },
  9: {
    id: "cy9-pacific",
    owner: "Pacific Ocean Lines",
    region: "シンガポール",
    vesselType: "コンテナ船 × 3隻（インドの造船所で新造）",
    requirement: "インドの造船所で建造する新しい船への機器の納入と、現地での試運転の立ち会い。",
    deadline: "9年目 Q3",
    status: "new",
    priorities: ["納期", "価格", "サポート体制"],
    rate: 0.08,
    indexed: false,
    country: "india",
  },
  10: {
    id: "cy10-gulf",
    owner: "Gulf Energy Shipping",
    region: "UAE / ドバイ",
    vesselType: "プロダクトタンカー × 3隻（ベトナムの造船所で新造）",
    requirement: "ベトナムの造船所で建造する新しい船への機器の納入と、現地の保守拠点の用意。",
    deadline: "10年目 Q3",
    status: "new",
    priorities: ["サポート拠点", "納期", "価格"],
    rate: 0.08,
    indexed: false,
    country: "vietnam",
  },
};

const countryLabel: Record<Exclude<OverseasChoice, "none">, string> = {
  india: "インド",
  vietnam: "ベトナム",
  china: "中国",
};

/** 進出先の案件（進出した国のものだけ届く） */
function overseasTemplates(cont: Continuation, turn: number): RequestTemplate[] {
  switch (cont.overseas) {
    case "india": {
      const arabian = { owner: "Arabian Sea Shipbuilding", region: "インド / グジャラート" };
      const konkan = { owner: "Konkan Coastal Lines", region: "インド / ムンバイ" };
      if (turn === 8) {
        return [{ id: "os-in-8-1", ...arabian, vesselType: "沿岸タンカー × 1隻（新造）", requirement: "外国メーカーの機器を初めて採用する試験発注。", deadline: "8年目 Q3", status: "new", priorities: ["価格", "実績", "納期"], rate: 0.05, indexed: false }];
      }
      if (turn === 9) {
        return [
          { id: "os-in-9-1", ...konkan, vesselType: "沿岸コンテナ船 × 3隻", requirement: "国内航路の拡大に合わせた既存船の機器の更新。", deadline: "9年目 Q2", status: "new", priorities: ["価格", "納期", "サポート体制"], rate: 0.08, indexed: false },
          { id: "os-in-9-2", ...arabian, vesselType: "沿岸タンカー × 3隻（新造）", requirement: "試験発注の結果を踏まえた、同型船への本採用の検討。", deadline: "9年目 Q3", status: "negotiating", priorities: ["価格", "実績", "納期"], rate: 0.08, indexed: false },
        ];
      }
      if (turn === 10 && cont.indiaBigDeal) {
        return [{ id: "os-in-10-1", ...arabian, vesselType: "大型ばら積み船 × 8隻（国の支援による新造計画）", requirement: "国の造船支援策を受けた大型の新造計画。現地で作る部品の比率を高めることが求められている。", deadline: "10年目 Q3", status: "negotiating", priorities: ["価格", "実績", "納期"], rate: 0.2, indexed: false }];
      }
      return [];
    }
    case "vietnam": {
      const saigon = { owner: "Saigon Coastal Shipyard", region: "ベトナム / バリア・ブンタウ" };
      const byTurn: Record<number, Pick<ShipownerRequest, "vesselType" | "requirement" | "priorities">> = {
        8: { vesselType: "近海コンテナ船 × 2隻（新造）", requirement: "第2工場で作る機器の初めての採用検討。", priorities: ["納期", "価格", "実績"] },
        9: { vesselType: "プロダクトタンカー × 2隻（新造）", requirement: "建造中の船への機器の追加発注。", priorities: ["納期", "実績", "価格"] },
        10: { vesselType: "ばら積み船 × 3隻（新造）", requirement: "次の建造計画での標準採用の検討。", priorities: ["価格", "納期", "実績"] },
      };
      const t = byTurn[turn];
      return t ? [{ id: `os-vn-${turn}-1`, ...saigon, ...t, deadline: `${turn}年目 Q3`, status: "new", rate: 0.06, indexed: false }] : [];
    }
    case "china": {
      const yangtze = { owner: "Yangtze Delta Shipbuilding", region: "中国 / 江蘇" };
      const east = { owner: "East China Bulk Lines", region: "中国 / 上海" };
      if (turn === 8) {
        return [
          { id: "os-cn-8-1", ...yangtze, vesselType: "ばら積み船 × 10隻（連続建造）", requirement: "連続建造する船への機器の一括発注。地元メーカーとの競合になっている。", deadline: "8年目 Q2", status: "negotiating", priorities: ["価格", "納期", "技術力"], rate: 0.15, indexed: false },
          { id: "os-cn-8-2", ...east, vesselType: "ばら積み船 × 6隻", requirement: "既存船の燃費改善の改造。", deadline: "8年目 Q3", status: "new", priorities: ["価格", "燃費性能", "実績"], rate: 0.15, indexed: false },
        ];
      }
      if (turn === 10) {
        return [{ id: "os-cn-10-1", ...yangtze, vesselType: "コンテナ船 × 4隻（新造）", requirement: "規制の変更が落ち着いた後の、取引の再開。", deadline: "10年目 Q3", status: "in_review", priorities: ["価格", "納期", "技術力"], rate: 0.1, indexed: false }];
      }
      return [];
    }
    default:
      return [];
  }
}

/** 回復期の優先案件の内容（船主ごと） */
const recoveryTemplates: Record<string, Pick<ShipownerRequest, "vesselType" | "requirement" | "priorities">> = {
  "Setouchi Kisen 株式会社": { vesselType: "内航コンテナ船 × 4隻", requirement: "景気の回復に合わせて止めていた船を動かす。まずは付き合いの長い相手に相談したい。", priorities: ["サポート体制", "実績", "納期"] },
  "Pacific Ocean Lines": { vesselType: "コンテナ船 × 3隻", requirement: "運賃の回復で再開する改造工事。不況の間も連絡を絶やさなかった相手に声をかけた。", priorities: ["納期", "燃費性能", "実績"] },
  "Nordic Tanker AS": { vesselType: "プロダクトタンカー × 3隻", requirement: "先送りしていた設備更新の再開。", priorities: ["規制適合", "保守契約", "納期"] },
  "Aegean Bulk Carriers": { vesselType: "ばら積み船 × 4隻", requirement: "回復期の運航再開に向けた機器の点検と更新。", priorities: ["実績", "価格", "燃費性能"] },
  "Gulf Energy Shipping": { vesselType: "VLCC × 2隻", requirement: "再稼働する船の保守体制の立ち上げ。", priorities: ["サポート拠点", "実績", "納期"] },
};

function build(cont: Continuation, turn: number, t: RequestTemplate): ShipownerRequest {
  const { rate, indexed, ...rest } = t;
  return {
    ...rest,
    budget: dealAmount(cont, rate, indexed ? (marketIndex[turn] ?? 1) : 1),
  };
}

/** 海外の造船所向けの要求（進出していれば提案できる） */
function yardRequest(cont: Continuation, turn: number): ShipownerRequest | null {
  const t = yardTemplates[turn];
  if (!t) return null;
  const { country, ...template } = t;
  const entered = cont.overseas === country;
  return {
    ...build(cont, turn, template),
    tag: `海外造船所向け（${countryLabel[country]}）`,
    overseas: true,
    ...(entered
      ? { requiresLocalPartner: true }
      : {
          declineOnly: `${countryLabel[country]}に拠点がないため、現地での納入・据え付けに対応できません。辞退するしかありません。`,
        }),
  };
}

const headlines: Record<number, string> = {
  6: "主力工場の設備故障と、舶用市場の大不況が同時にやってきました。まずは会社を守る判断を。",
  7: "不況の底です。国内と既存の船主だけでは受注が足りません。海外に活路を求めるかを決めてください。",
  8: "市況に回復の兆しが見え始めました。不況の間の手の打ち方が、ここから効いてきます。",
  9: "景気が戻り、発注が再開しました。関係を保ってきた船主からの声が、回復の追い風になります。",
  10: "総決算の年です。危機から立て直した5年間の成果を、数字で示しましょう。",
};

const newsByTurn: Record<number, MarketNews[]> = {
  6: [
    { id: "cn-6-1", source: "社内報告", category: "事業継続", headline: "主力工場の主要設備が故障、4か月の操業停止へ", summary: "修理か設備の入れ替えが必要です。この年の生産能力は3分の2に落ち、受けられる注文の量にも上限ができます。", impact: "negative", date: "6年目 Q1" },
    { id: "cn-6-2", source: "Clarksons Research", category: "市況", headline: "運賃の指数が半年で4割下落", summary: "世界的な荷動きの減少で運賃が急落。船主各社は設備投資を絞り、値下げを求める声が強まっています。", impact: "negative", date: "6年目 Q1" },
    { id: "cn-6-3", source: "業界紙 Maritime Daily", category: "市況", headline: "新造船の発注が前年比で半減", summary: "発注の先送りが相次いでいます。競合各社は値下げで受注を確保しようとしており、提案の裏付けにはこれまで以上の力の入れようが求められます。", impact: "negative", date: "6年目 Q2" },
  ],
  7: [
    { id: "cn-7-1", source: "業界紙 Maritime Daily", category: "市況", headline: "中堅造船所の経営破綻が相次ぐ", summary: "不況の長期化で、資金力のない造船所から撤退が始まっています。取引先の選別も進んでいます。", impact: "negative", date: "7年目 Q1" },
    { id: "cn-7-2", source: "各国政府発表", category: "海外", headline: "インド政府が造船業の支援策を拡充", summary: "国内での造船を増やすため、造船所への支援を広げる方針。外国メーカーには現地での生産や調達が求められる見通しです。", impact: "neutral", date: "7年目 Q1" },
    { id: "cn-7-3", source: "業界紙 Maritime Daily", category: "海外", headline: "韓国系造船所がベトナム拠点を増強", summary: "人件費の安さを生かした建造が拡大。周辺には日本の製造業の工場も多く、生産拠点としての注目が高まっています。", impact: "neutral", date: "7年目 Q2" },
    { id: "cn-7-4", source: "Clarksons Research", category: "海外", headline: "中国の造船所が値下げで受注を確保", summary: "世界最大の造船国として発注を集める一方、地元の機器メーカーとの価格競争は激しさを増しています。", impact: "neutral", date: "7年目 Q2" },
  ],
  8: [
    { id: "cn-8-1", source: "Clarksons Research", category: "市況", headline: "古い船の解体が増え、船の余りが解消に向かう", summary: "運賃に底打ちの兆し。先送りされていた改造工事の商談が少しずつ戻ってきています。", impact: "positive", date: "8年目 Q1" },
    { id: "cn-8-2", source: "業界紙 Maritime Daily", category: "市況", headline: "国内の新造船建造量、10年前の7割に", summary: "人手不足と海外造船所との価格競争で、国内造船所は建造を絞っています。国内向けの船舶機器の需要は、景気が戻っても年1割ほどずつ縮む見通しです。海外の造船所との取引を持たない機器メーカーは、回復期にも売上が戻りにくいと指摘されています。", impact: "negative", date: "8年目 Q1" },
    { id: "cn-8-3", source: "Clarksons Research", category: "市況", headline: "日本・欧州の船主、新造船の6割をアジアの造船所へ発注", summary: "船主各社は、中国・韓国・インド・ベトナムの造船所に発注先を広げています。機器メーカーには、発注先の国での納入やサポートの対応が求められ始めています。", impact: "neutral", date: "8年目 Q2" },
  ],
  9: [
    { id: "cn-9-1", source: "Clarksons Research", category: "市況", headline: "運賃が回復、新造船の発注が再開", summary: "船主の投資意欲が戻りつつあります。不況の間に関係を保ってきた取引先から、優先して声がかかる局面です。", impact: "positive", date: "9年目 Q1" },
    { id: "cn-9-2", source: "業界紙 Maritime Daily", category: "市況", headline: "市況は回復、しかし国内向けの需要は戻らず", summary: "運賃と新造船の発注は回復に向かっていますが、発注の多くは海外の造船所に向かっています。国内だけで商売をする機器メーカーの受注は、前年を下回る見込みです。", impact: "negative", date: "9年目 Q1" },
    { id: "cn-9-3", source: "業界紙 Maritime Daily", category: "競合動向", headline: "海外で安く作る競合、国内の案件でも値下げ攻勢", summary: "海外に工場を持つ競合他社が、国内の船主にも低価格で提案を始めています。価格を重視する案件では、受注の条件が厳しくなりそうです。", impact: "negative", date: "9年目 Q2" },
    { id: "cn-9-4", source: "各国政府発表", category: "海外", headline: "中国で輸出入の規制の運用が変更", summary: "一部の機器の取引で手続きが厳しくなり、代金の回収が遅れる・止まる事例が出ています。", impact: "negative", date: "9年目 Q2" },
  ],
  10: [
    { id: "cn-10-1", source: "Clarksons Research", category: "市況", headline: "新燃料船の発注が急増", summary: "環境規制に対応した新しい燃料の船の発注が一気に増えています。技術力と納期の確かさが問われる局面です。", impact: "positive", date: "10年目 Q1" },
    { id: "cn-10-2", source: "各国政府発表", category: "海外", headline: "インドで大型の新造計画が始動", summary: "国の支援を受けた大型の新造計画が動き出しました。現地で実績を積んだメーカーが優先される見通しです。", impact: "positive", date: "10年目 Q1" },
  ],
};

/** 継続プレイの年のシナリオ（ニュース・本案件・別枠の要求） */
export function continuationTurnData(cont: Continuation, turn: number): TurnData {
  const side: ShipownerRequest[] = [
    ...overseasTemplates(cont, turn).map((t) => ({
      ...build(cont, turn, t),
      tag: `進出先（${countryLabel[cont.overseas as Exclude<OverseasChoice, "none">]}）`,
      requiresLocalPartner: true,
      overseas: true,
    })),
  ];
  const yard = yardRequest(cont, turn);
  if (yard) side.push(yard);
  return {
    turn,
    headline: headlines[turn] ?? "",
    news: newsByTurn[turn] ?? [],
    requests: (mainTemplates[turn] ?? []).map((t) => build(cont, turn, t)),
    sideRequests: side,
    settlement: null,
  };
}

/** 継続プレイの年の追加案件の候補（見込み引き合いに応じて先頭から届く） */
export function continuationExtraPool(cont: Continuation, turn: number): ShipownerRequest[] {
  return (extraTemplates[turn] ?? []).map((t) => build(cont, turn, t));
}

/** 9年目の回復期の優先案件（回答しなくてもペナルティなし） */
export function recoveryRequests(cont: Continuation, turn: number): ShipownerRequest[] {
  if (turn !== 9 || !cont.recoveryOwners) return [];
  return cont.recoveryOwners.map((owner) => {
    const customer = baseCustomers.find((c) => c.name === owner);
    const t = recoveryTemplates[owner];
    return {
      id: `cr9-${customer?.id ?? owner}`,
      owner,
      region: customer?.region ?? "",
      vesselType: t?.vesselType ?? "既存船",
      requirement: t?.requirement ?? "回復期の優先案件。",
      budget: dealAmount(cont, 0.06),
      deadline: "9年目 Q2",
      status: "negotiating" as const,
      priorities: t?.priorities ?? ["実績", "サポート体制", "納期"],
      extra: true,
      tag: "回復期の優先案件",
    };
  });
}

/** 継続プレイで起こりうる追加案件（ID 引き用。回復期の優先案件を含む） */
export function allContinuationExtras(cont: Continuation): { turn: number; request: ShipownerRequest }[] {
  const out: { turn: number; request: ShipownerRequest }[] = [];
  for (let turn = CONTINUATION_START_TURN; turn <= CONTINUATION_END_TURN; turn++) {
    for (const request of continuationExtraPool(cont, turn)) out.push({ turn, request });
    for (const request of recoveryRequests(cont, turn)) out.push({ turn, request });
  }
  return out;
}

/** 指定した年のシナリオ（第1部は難易度で補正したデータ、第2部は継続プレイのデータ） */
export function scenarioTurn(state: GameState, turn = state.turn): TurnData {
  const cont = state.continuation;
  if (cont && turn >= CONTINUATION_START_TURN) return continuationTurnData(cont, turn);
  return getScenarioTurn(turn, state.mode);
}

// ---------------------------------------------------------------------------
// 決算と、年の変わり目の出来事
// ---------------------------------------------------------------------------

export type ContinuationClosing = {
  settlement: TurnSettlement;
  relationshipDeltas: Record<string, number>;
  continuation: Continuation;
};

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`;

/** 中国の規制変更で回収できなくなる割合（規制リスク調査を8年目までに買っていれば半分） */
export const CHINA_LOSS_RATE = 0.3;
export const CHINA_REPORT_ID = "r-os-china";

function chinaLossFor(state: GameState): number {
  const won8 = state.proposalLog
    .filter((p) => p.turn === 8 && p.won && p.requestId.startsWith("os-cn-"))
    .reduce((sum, p) => sum + p.revenue, 0);
  const prepared = state.researchPurchases.some(
    (p) => p.reportId === CHINA_REPORT_ID && p.turn <= 8,
  );
  return roundAmount(won8 * (prepared ? CHINA_LOSS_RATE / 2 : CHINA_LOSS_RATE));
}

/**
 * 継続プレイの年の締め（決算）。
 * 本業の売上 − 固定費に、6年目の作りきれない分・9年目の中国の特別損失を加え、
 * 不況の年の関係性の低下、年の変わり目の出来事（優先案件・大型案件の判定）を反映する。
 *
 * @param state 締める年の状態（マーケティング実行前）
 * @param plan その年に実行された配分
 */
export function closeContinuationYear(
  state: GameState,
  plan: MarketingPlan,
  relationshipDeltas: Record<string, number>,
): ContinuationClosing {
  const cont = state.continuation!;
  const turn = state.turn;
  const highlights: string[] = [];
  let revenue = baseRevenue(cont, turn);
  let expense = fixedCost(cont, turn);
  let trustDelta = 0;
  let deltas = relationshipDeltas;
  let next: Continuation = cont;

  const index = marketIndex[turn] ?? 1;
  highlights.push(
    `本業の売上 ${usd(revenue)}（市況指数 ${Math.round(index * 100)}%・生産能力 ${Math.round(
      productionCapacity(cont, turn) * 100,
    )}%${domesticRate(cont, turn) < 1 ? `・国内市場の縮小 ×${domesticRate(cont, turn)}` : ""}）`,
  );
  if (turn === 6) highlights.push("工場の操業停止（4か月）で、生産能力が3分の2に落ちました");
  if (turn === 9 && cont.repair === "patch") {
    highlights.push(
      cont.overseas === "vietnam"
        ? "応急修理した設備が再び2か月止まりましたが、ベトナム工場で代わりに作り、影響を帳消しにしました"
        : "6年目に応急修理した設備が再び2か月止まり、生産能力が6分の5に落ちました",
    );
  }
  if (domesticRate(cont, turn) < 1) {
    highlights.push(
      `国内市場の縮小：本業の売上 ×${domesticRate(cont, turn)}。海外造船所向けの需要に対応できる拠点がないため、国内の縮小分をおぎなえませんでした`,
    );
  }
  highlights.push(
    `固定費 ${usd(expense)}（${companySizeInfo[cont.size].label}：基準資金の${Math.round(
      companySizeInfo[cont.size].fixedCostRate * 100,
    )}%${cont.costCut && turn <= 8 ? "・経費削減 −15%" : ""}${
      cont.overseas === "vietnam" && turn >= 8 ? "・ベトナム工場 −10%" : ""
    }）`,
  );

  // 6年目：生産能力の枠を超えた分
  const overflow = cont.overflow;
  if (turn === 6 && overflow) {
    if (overflow.choice === "outsource") {
      const paid = roundAmount(overflow.amount * 0.6);
      revenue += paid;
      highlights.push(`枠を超えた受注 ${usd(overflow.amount)} を他社の工場に作ってもらい、${usd(paid)}（60%）を計上しました`);
    } else if (overflow.choice === "silent") {
      revenue += overflow.amount;
      trustDelta -= 10;
      for (const owner of overflow.owners) deltas = { ...deltas, [owner]: (deltas[owner] ?? 0) - 15 };
      highlights.push(
        `枠を超えた受注 ${usd(overflow.amount)} を黙って引き受けて全額計上しましたが、7年目の初めに納期の遅れが発覚し、信頼度 −10、${overflow.owners.join("・")} との関係性 −15`,
      );
    } else {
      highlights.push(`枠を超えた受注 ${usd(overflow.amount)} は、正直に伝えて納期を延ばしてもらいました（7年目の決算で入金）`);
    }
  }
  if (turn === 7 && overflow?.choice === "delay") {
    revenue += overflow.amount;
    highlights.push(`6年目に納期を延ばしてもらった ${usd(overflow.amount)} が入金されました`);
  }

  // 9年目：中国の規制変更
  if (turn === 9 && cont.overseas === "china") {
    const loss = chinaLossFor(state);
    next = { ...next, chinaLoss: loss };
    if (loss > 0) {
      expense += loss;
      const prepared = state.researchPurchases.some(
        (p) => p.reportId === CHINA_REPORT_ID && p.turn <= 8,
      );
      highlights.push(
        `中国の規制の運用変更で、8年目の受注代金のうち ${usd(loss)} が回収できなくなりました（特別損失）${
          prepared ? "。規制リスク調査で前もって備えていたため、損失は半分で済みました" : ""
        }`,
      );
    }
  }

  // 不況の年（6〜8年目）：営業訪問で関係を保てなければ、すべての既存船主の関係性が下がる
  if (turn <= 8) {
    if (planAmount(plan, "fieldSales") >= RELATIONSHIP_KEEP_SPEND) {
      highlights.push(`営業訪問を続けたため、不況の中でも既存船主との関係を保てました`);
    } else {
      for (const c of baseCustomers) {
        deltas = { ...deltas, [c.name]: (deltas[c.name] ?? 0) + RECESSION_RELATIONSHIP_DELTA };
      }
      highlights.push(
        `不況で船主が発注を絞り、営業訪問（${usd(RELATIONSHIP_KEEP_SPEND)} 以上）もなかったため、すべての既存船主との関係性が ${RECESSION_RELATIONSHIP_DELTA}`,
      );
    }
  }

  // 9年目に入るとき：関係を保った船主から回復期の優先案件が届く
  if (turn === 8) {
    const withDeltas = { ...state, relationshipDeltas: deltas };
    const kept = baseCustomers
      .map((c) => ({ name: c.name, score: currentRelationship(c, withDeltas) }))
      .filter((c) => c.score >= RECOVERY_RELATIONSHIP_MIN)
      .sort((a, b) => b.score - a.score);
    next = {
      ...next,
      keptOwners: kept.map((c) => c.name),
      recoveryOwners: cont.costCut ? [] : kept.slice(0, RECOVERY_MAX_DEALS).map((c) => c.name),
    };
  }

  // 10年目に入るとき：インドで実績を積んでいれば大型案件が届く
  if (turn === 9 && cont.overseas === "india") {
    next = {
      ...next,
      indiaBigDeal: state.proposalLog.some(
        (p) => p.won && p.requestId.startsWith("os-in-") && (p.turn === 8 || p.turn === 9),
      ),
    };
  }

  return {
    settlement: { revenue, expense, trustDelta, highlights },
    relationshipDeltas: deltas,
    continuation: next,
  };
}

// ---------------------------------------------------------------------------
// 9年目のお知らせ
// ---------------------------------------------------------------------------

export type RecoveryNotice = {
  /** 届いた優先案件の船主 */
  delivered: string[];
  /** 経費削減のため届かなかったか */
  blockedByCostCut: boolean;
  /** 経費を削っていなければ届いていた船主 */
  missedOwners: string[];
  /** 経費を削っていなければ届いていた額の合計 */
  missedAmount: number;
  /** 関係性が70に届かなかった既存船主 */
  belowOwners: string[];
  /** 声を紹介する船主（関係性が最も高かった既存船主） */
  voiceOwner: string | null;
};

export function recoveryNotice(state: GameState): RecoveryNotice | null {
  const cont = state.continuation;
  if (!cont || cont.keptOwners === null) return null;
  const kept = cont.keptOwners;
  const blocked = cont.costCut === true;
  const missedOwners = blocked ? kept.slice(0, RECOVERY_MAX_DEALS) : [];
  return {
    delivered: cont.recoveryOwners ?? [],
    blockedByCostCut: blocked,
    missedOwners,
    missedAmount: missedOwners.length * dealAmount(cont, 0.06),
    belowOwners: baseCustomers.map((c) => c.name).filter((n) => !kept.includes(n)),
    voiceOwner:
      [...baseCustomers]
        .sort((a, b) => currentRelationship(b, state) - currentRelationship(a, state))[0]
        ?.name ?? null,
  };
}

/** 船主の声（9年目・経費削減で優先案件が届かなかった場合） */
export const costCutVoices: Record<string, string> = {
  "Setouchi Kisen 株式会社": "Setouchi Kisen 田中専務の声：「不景気のときに人を減らしたと聞いてね。うちの船が止まったら困るんですよ。」",
  "Pacific Ocean Lines": "Pacific Ocean Lines Lim 氏の声：「サービス担当が減ったと聞いています。港で止まったときに誰が来てくれるのか、そこが心配でした。」",
  "Nordic Tanker AS": "Nordic Tanker Solberg 氏の声：「規制対応の相談に乗ってくれる人が減ったようなので、今回は他社にも声をかけました。」",
  "Aegean Bulk Carriers": "Aegean Bulk Papadakis 氏の声：「値段の話はできても、船隊全体を見てもらえる体制があるのか、確信が持てなかった。」",
  "Gulf Energy Shipping": "Gulf Energy Al-Mansoori 氏の声：「中東の拠点に人が来なくなった。再稼働の時期に頼れる相手を選びたい。」",
};

// ---------------------------------------------------------------------------
// 危機対応力（最終レポートの参考表示）
// ---------------------------------------------------------------------------

export type CrisisStar = { label: string; stars: 1 | 2 | 3; detail: string };

export function crisisStars(state: GameState): CrisisStar[] | null {
  const cont = state.continuation;
  if (!cont) return null;
  const kept = cont.keptOwners?.length ?? 0;
  const keptStars: 1 | 2 | 3 = kept >= 4 ? 3 : kept >= 2 ? 2 : 1;

  // 危機の直後（6年目の開始時）と、6・7年目の年末のうち最も低い信頼度
  const lowTrust = Math.min(
    clampScore(cont.trustAtStart + companySizeInfo[cont.size].crisisTrustDelta),
    ...state.turnLog
      .filter((t) => t.turn === 6 || t.turn === 7)
      .map((t) => t.trustEnd),
  );
  const drop = Math.max(0, cont.trustAtStart - lowTrust);
  const trustStars: 1 | 2 | 3 = drop <= 10 ? 3 : drop <= 25 ? 2 : 1;

  const late = state.proposalLog.filter((p) => p.won && p.turn >= 8);
  const total = late.reduce((sum, p) => sum + p.revenue, 0);
  const overseasIds = new Set<string>();
  for (let turn = 8; turn <= CONTINUATION_END_TURN; turn++) {
    for (const r of continuationTurnData(cont, turn).sideRequests ?? []) overseasIds.add(r.id);
  }
  const overseas = late
    .filter((p) => overseasIds.has(p.requestId))
    .reduce((sum, p) => sum + p.revenue, 0);
  const share = total > 0 ? overseas / total : 0;
  const overseasStars: 1 | 2 | 3 = share >= 0.3 ? 3 : share >= 0.1 ? 2 : 1;

  return [
    {
      label: "顧客をつなぎとめた",
      stars: keptStars,
      detail: `8年目の終わりに関係性 ${RECOVERY_RELATIONSHIP_MIN} 以上を保てた既存船主：${kept}社`,
    },
    {
      label: "信頼を守った",
      stars: trustStars,
      detail: `6〜7年目の信頼度の落ち幅：${drop}（第2部の開始前 ${cont.trustAtStart} → 最低 ${lowTrust}）`,
    },
    {
      label: "外に活路を開いた",
      stars: overseasStars,
      detail: `8〜10年目の受注額のうち、海外の案件が占める割合：${Math.round(share * 100)}%`,
    },
  ];
}

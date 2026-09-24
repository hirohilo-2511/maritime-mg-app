/**
 * ターン進行・マーケティング予算・市場調査ロジックの検算スクリプト（開発用）。
 *   npx tsx scripts/check-turns.mts
 */
import { advanceGameState, purchaseResearch } from "../lib/game";
import { getTurnData, initialGameState, turns } from "../lib/mock-data";
import {
  MAX_TRUST_GAIN_PER_TURN,
  emptyPlan,
  evenSplit,
  planTotal,
  simulateMarketing,
} from "../lib/marketing";
import {
  countUnpurchasedAvailable,
  researchReports,
  researchSpendInTurn,
} from "../lib/research";
import {
  JPY_PER_USD,
  formatMoney,
  formatMoneyCompact,
  formatMoneySigned,
} from "../lib/format";
import type { GameState } from "../lib/types";

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US")}`;

// --- 1. マーケティング予算を確定しないまま進行させる ---------------------
console.log("=== 予算を確定しない場合（投資なし） ===");
let state: GameState = initialGameState;
console.log(
  `[開始] ${state.turn}年目  資金 ${fmt(state.availableFunds)}  信頼度 ${state.trustScore}/100`,
);
for (let i = 0; i < turns.length + 1; i++) {
  const result = advanceGameState(state);
  if (!result.advanced) {
    console.log(`[停止] ${state.turn}年目は最終ターン。これ以上進めません。`);
    break;
  }
  state = result.state;
  const data = getTurnData(state.turn);
  console.log(
    `[進行] → ${state.turn}年目  資金 ${fmt(state.availableFunds)}  信頼度 ${state.trustScore}/100  ` +
      `マーケ投資 ${fmt(result.marketing.spend)} / 引き合い ${result.marketing.leads}件  ` +
      `ニュース ${data.news.length}件  要求 ${data.requests.length}件`,
  );
}

// --- 2. 毎ターン、資金の30%を均等配分して確定する -------------------------
console.log("\n=== 毎ターン 資金の30%を均等配分して確定する場合 ===");
state = initialGameState;
for (let i = 0; i < turns.length; i++) {
  const plan = evenSplit(Math.max(0, state.availableFunds) * 0.3);
  const preview = simulateMarketing(plan);
  const before = state;
  const result = advanceGameState({
    ...state,
    marketingPlan: plan,
    marketingCommitted: true,
  });
  if (!result.advanced) {
    console.log(`[停止] ${state.turn}年目は最終ターン。`);
    break;
  }
  state = result.state;
  console.log(
    `[${before.turn}年目] 配分 ${fmt(planTotal(plan))}（見込み ${preview.leads}件 / 信頼度 +${preview.trustDelta}）` +
      ` → ${state.turn}年目  資金 ${fmt(state.availableFunds)}  信頼度 ${state.trustScore}/100`,
  );
}
console.log(
  `[履歴] ${state.marketingHistory.length}件記録  確定フラグ=${state.marketingCommitted}`,
);

// --- 3. 市場調査レポートの購入 --------------------------------------------
console.log("\n=== 市場調査レポートの購入 ===");
let research: GameState = initialGameState;
console.log(
  `[開始] 資金 ${fmt(research.availableFunds)}  1年目に購入可能なレポート ${countUnpurchasedAvailable(
    research.researchPurchases,
    1,
  )}/${researchReports.length}件`,
);

for (const id of ["r-demand-vessel", "r-comp-price", "r-reg-subsidy"]) {
  const report = researchReports.find((r) => r.id === id)!;
  research = purchaseResearch(research, report.id, report.cost);
  console.log(
    `[購入] ${report.title}（${fmt(report.cost)}） → 資金 ${fmt(research.availableFunds)}`,
  );
}

// 二重購入は無視される
const dup = researchReports[0];
const beforeDup = research.availableFunds;
research = purchaseResearch(research, dup.id, dup.cost);
console.log(
  `[二重購入] ${dup.title} → 資金 ${fmt(research.availableFunds)}（変化なし: ${
    beforeDup === research.availableFunds
  }） 購入件数 ${research.researchPurchases.length}`,
);

// 資金を超える購入は無視される
const expensive = researchReports.find((r) => r.id === "r-reg-next")!;
const poor = purchaseResearch(
  { ...research, availableFunds: 10_000 },
  expensive.id,
  expensive.cost,
);
console.log(
  `[資金不足] ${expensive.title}（${fmt(expensive.cost)}）を資金 $10,000 で購入 → 購入件数 ${poor.researchPurchases.length}（変化なし: ${
    poor.researchPurchases.length === research.researchPurchases.length
  }）`,
);

// 3年目まで進めると未購入の購入可能レポートが増える
const advancedOnce = advanceGameState(research).state;
const advancedTwice = advanceGameState(advancedOnce).state;
console.log(
  `[調査費] 1年目の調査費 ${fmt(researchSpendInTurn(research.researchPurchases, 1))} / ` +
    `3年目に購入可能な未購入レポート ${countUnpurchasedAvailable(
      advancedTwice.researchPurchases,
      advancedTwice.turn,
    )}件`,
);

// --- 4. 境界値の確認 ------------------------------------------------------
console.log("\n=== 境界値 ===");
const zero = simulateMarketing(emptyPlan());
console.log(
  `配分0: 投資 ${fmt(zero.spend)} / 引き合い ${zero.leads}件 / 信頼度 +${zero.trustDelta} / CPA ${zero.costPerLead}`,
);

const maxPlan = evenSplit(5_000_000);
const maxOutcome = simulateMarketing(maxPlan);
console.log(
  `全チャネル上限: 投資 ${fmt(maxOutcome.spend)} / 引き合い ${maxOutcome.leads}件 / ` +
    `信頼度 +${maxOutcome.trustDelta}（上限 ${MAX_TRUST_GAIN_PER_TURN}）`,
);

const clamped = advanceGameState({
  ...initialGameState,
  trustScore: 98,
  marketingPlan: maxPlan,
  marketingCommitted: true,
  // 未回答ペナルティを除外するため、1年目の要求はすべて回答済みとする
  dealOutcomes: Object.fromEntries(
    getTurnData(1).requests.map((r) => [r.id, "won" as const]),
  ),
});
console.log(
  `信頼度98 + 決算6 + マーケ${maxOutcome.trustDelta} → ${clamped.state.trustScore}（100で上限クランプ）`,
);
console.log(
  `資金500,000 で ${fmt(maxOutcome.spend)} 投資 → ${fmt(clamped.state.availableFunds)}（倒産=${clamped.bankrupt} / ターン ${clamped.state.turn}年目で終了）`,
);

// --- 5. 表示通貨の変換 ----------------------------------------------------
console.log("\n=== 表示通貨（1 USD = " + JPY_PER_USD + " JPY）===");
for (const usd of [500_000, 1_200_000, 40_000, -640_000, 0]) {
  console.log(
    `  ${String(usd).padStart(9)} USD → ` +
      `USD: ${formatMoney(usd, "USD").padEnd(12)} ${formatMoneyCompact(usd, "USD").padEnd(8)} | ` +
      `JPY: ${formatMoney(usd, "JPY").padEnd(14)} ${formatMoneyCompact(usd, "JPY")}`,
  );
}
console.log(
  `  符号付き: ${formatMoneySigned(420_000, "USD")} / ${formatMoneySigned(-260_000, "JPY")}`,
);
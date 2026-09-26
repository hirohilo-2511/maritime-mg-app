/**
 * ステートマシンのエッジケース検証スクリプト（開発用）。失敗すると終了コード 1 で終わる。
 *   npx tsx scripts/check-edge-cases.mts
 */
import {
  acceptEmergencyLoan,
  advanceGameState,
  canEndTurn,
  declareBankruptcy,
  finalizeGame,
  hasProposedThisTurn,
  purchaseResearch,
  resolveProposal,
  spendableFunds,
  unansweredRequests,
} from "../lib/game";
import { buildFinalReport } from "../lib/finalReport";
import { buildYearlyReview } from "../lib/yearlyReview";
import { loanInterest, outstandingDebt } from "../lib/loans";
import { emptyPlan, marketingChannels } from "../lib/marketing";
import {
  createInitialGameState,
  getModeConfig,
  getScenarioTurn,
  loanBaseRate,
  synergyRuleFor,
} from "../lib/modes";
import { channelForPriority, evaluateSynergy, priorityRewardRate } from "../lib/synergy";
import { customerDeals, customers } from "../lib/customers";
import { getChannel } from "../lib/marketing";
import { researchReports } from "../lib/research";
import type { GameState, MarketingPlan } from "../lib/types";

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passes++;
  } else {
    failures++;
    console.log(`✗ ${name}${detail ? `  — ${detail}` : ""}`);
  }
}
function section(title: string) {
  console.log(`\n--- ${title}`);
}

const plan = (p: Partial<MarketingPlan>): MarketingPlan => ({ ...emptyPlan(), ...p });
const commit = (s: GameState, p: MarketingPlan): GameState => ({
  ...s,
  marketingPlan: p,
  marketingCommitted: true,
});
/** 手元資金を、チャネルの上限まで順に使い切る配分（$10,000 単位） */
const spendAll = (s: GameState): MarketingPlan => {
  let left = Math.floor(Math.max(0, s.availableFunds) / 10_000) * 10_000;
  const p = emptyPlan();
  for (const c of marketingChannels) {
    p[c.id] = Math.min(c.max, left);
    left -= p[c.id];
  }
  return p;
};

// ---------------------------------------------------------------------------
section("A: 資金が最小配分単位未満でも $0 確定でターンを進められる");
{
  const low: GameState = { ...createInitialGameState("intro"), availableFunds: 5_000 };
  check("未確定のままでは終了できない", !canEndTurn(low));
  const skipped = commit(low, emptyPlan());
  check("$0 確定で終了できる", canEndTurn(skipped));
  const r = advanceGameState(skipped);
  check("ターンが進む", r.advanced && r.state.turn === 2, `turn=${r.state.turn}`);
  check("資金不足になっていない（2年目決算は黒字）", r.insolvency === null);
}

// ---------------------------------------------------------------------------
section("資金不足：決算後に資金がマイナスなら緊急経営判断を待つ");
// 実践編の2年目決算は 売上 $290k − 固定費 $310k = −$20k
const shortOfCash = commit(
  { ...createInitialGameState("advanced"), availableFunds: 10_000 },
  emptyPlan(),
);
const pendingResult = advanceGameState(shortOfCash);
const pending = pendingResult.state;
{
  const p = pending.pendingInsolvency;
  check("判断待ちになる", p !== null && pendingResult.insolvency === p);
  check("まだ倒産・終了ではない", !pending.bankrupt && !pending.gameCompleted);
  check("ターンは進めない", pending.turn === 1);
  check("不足額 = −資金", p?.deficit === -pending.availableFunds, `${p?.deficit}`);
  check("年の記録は残る（未決着）", pending.turnLog.length === 1 && pending.turnLog[0].insolvency === null);
  const again = advanceGameState(pending);
  check("判断待ちの間は進めない", !again.advanced && again.state === pending);
  check("判断待ちの間は終了できない", !canEndTurn({ ...pending, marketingCommitted: true }));
  check("判断待ちの間は最終締めもしない", finalizeGame(pending).state === pending);
  const req = getScenarioTurn(1, "advanced").requests[0];
  check(
    "判断待ちの間は提案できない",
    resolveProposal({ ...pending, marketingCommitted: true }, req.id, req.priorities[0]) === null,
  );
  check("判断待ちの間は調査を購入できない", purchaseResearch(pending, researchReports[0].id, 0) === pending);
}

section("自主倒産：融資を受けずに終了（従来の倒産ルート）");
{
  const s = declareBankruptcy(pending);
  check("倒産フラグ・終了", s.bankrupt && s.gameCompleted && s.endReason === "declined");
  check("ターンは進めない（倒産した年で止まる）", s.turn === 1);
  check("資金はマイナスのまま", s.availableFunds < 0, `${s.availableFunds}`);
  check("融資は記録されない", s.loans.length === 0);
  check("年の記録に自主倒産", s.turnLog[0].insolvency === "declined" && s.turnLog[0].bankrupt);
  check("二重実行しても変わらない", declareBankruptcy(s) === s && acceptEmergencyLoan(s) === s);
  check("倒産後は進めない", !advanceGameState(s).advanced);
  const req = getScenarioTurn(1, "advanced").requests[0];
  check("倒産後は提案できない", resolveProposal(s, req.id, req.priorities[0]) === null);
  check("倒産後は調査を購入できない", purchaseResearch(s, researchReports[0].id, 0) === s);

  const report = buildFinalReport(s);
  check("評価は D", report.grade === "D", report.grade);
  check("プレイ年数は 1", report.yearsPlayed === 1);
  check("自主倒産の説明", report.evaluationReason.includes("自主倒産"));
  check("融資の総括なし", report.loanSummary === null);
  check("5年前提の文言を含まない", !JSON.stringify(report).includes("5年間"));
  const review = report.yearlyReview!;
  check("年次レビュー：自主倒産を説明", review[0].bankrupt && review[0].bads.some((t) => t.includes("自主倒産")));
}

// ---------------------------------------------------------------------------
section("緊急融資：金利表");
{
  check("信頼度80 → 5%", loanBaseRate(80) === 0.05);
  check("信頼度79 → 8%", loanBaseRate(79) === 0.08);
  check("信頼度40 → 11%", loanBaseRate(40) === 0.11);
  check("信頼度30 → 15%", loanBaseRate(30) === 0.15);
  check("信頼度29 → 18%", loanBaseRate(29) === 0.18);
  check("信頼度0 → 18%", loanBaseRate(0) === 0.18);
  check("年間利息は $1,000 単位", loanInterest({ principal: 210_000, rate: 0.18 }) === 38_000);
}

section("緊急融資：1回目");
const loan1 = acceptEmergencyLoan(pending);
{
  const offer = pending.pendingInsolvency!.offer!;
  const cfg = getModeConfig("advanced").emergencyLoan;
  check("1回目の提示", offer.number === 1 && offer.penaltyRate === 0);
  check("金利は決算後の信頼度で決まる", offer.rate === loanBaseRate(pending.trustScore), `${offer.rate} / 信頼度${pending.trustScore}`);
  check("融資額 = 不足額 + 運転資金 $200k", offer.principal === offer.deficit + 200_000 && !offer.workingCapitalReduced);
  check("次の年へ進む", loan1.turn === 2 && !loan1.gameCompleted && loan1.pendingInsolvency === null);
  check("資金 = 運転資金", loan1.availableFunds === 200_000, `${loan1.availableFunds}`);
  check("信頼度 −5", loan1.trustScore === Math.max(0, pending.trustScore + cfg.trustPenalty));
  check("借入残高", outstandingDebt(loan1) === offer.principal);
  check("年の記録：年末資金は融資後", loan1.turnLog[0].fundsEnd === 200_000 && loan1.turnLog[0].insolvency === "loan");
  check("年の記録：信頼度は融資後", loan1.turnLog[0].trustEnd === loan1.trustScore);
  check("二重実行しても変わらない", acceptEmergencyLoan(loan1) === loan1 && declareBankruptcy(loan1) === loan1);
  check("配分は未確定・提案はリセット", !loan1.marketingCommitted && loan1.proposalsCompleted.length === 0);

  // 翌年の決算で利息を支払う
  const next = advanceGameState(commit(loan1, emptyPlan()));
  const interest = loanInterest(loan1.loans[0]);
  check("翌年の決算で利息を支払う", next.interest === interest && next.state.turnLog[1].interestExpense === interest);
  const settlement = getScenarioTurn(3, "advanced").settlement!;
  check(
    "資金 = 資金 + 売上 − 固定費 − 利息",
    next.state.availableFunds === 200_000 + settlement.revenue - settlement.expense - interest,
    `${next.state.availableFunds}`,
  );
  check("年初資金 = 前年の年末資金（融資後）", next.state.turnLog[1].fundsStart === 200_000);
}

section("緊急融資：2回目（上乗せ金利・枠に合わせて運転資金を減額）");
const pending2 = advanceGameState(commit({ ...loan1, availableFunds: 0 }, emptyPlan())).state;
const loan2 = acceptEmergencyLoan(pending2);
{
  const offer = pending2.pendingInsolvency?.offer;
  const room = 400_000 - outstandingDebt(loan1);
  check("2回目の提示あり", offer?.number === 2, JSON.stringify(pending2.pendingInsolvency));
  check("上乗せ +5ポイント", offer?.penaltyRate === 0.05 && offer.rate === Math.round((offer.baseRate + 0.05) * 1000) / 1000);
  check("不足額は全額補填", offer?.deficit === -pending2.availableFunds);
  check("運転資金は枠の残りまで減額", offer?.workingCapital === room - offer!.deficit && offer!.workingCapitalReduced, `${offer?.workingCapital}`);
  check("累計は限度額ちょうど", outstandingDebt(loan2) === 400_000, `${outstandingDebt(loan2)}`);
  check("3年目へ進む", loan2.turn === 3);
  const review = buildFinalReport({ ...loan2, gameCompleted: true }).yearlyReview!;
  check("年次レビュー：融資の年は要改善", review[1].borrowed && review[1].verdict === "poor");
  check("年次レビュー：上乗せ金利を説明", review[1].bads.some((t) => t.includes("2回目の上乗せ")));
  check("年次レビュー：利息の圧迫を指摘", review[1].bads.some((t) => t.includes("利息")));
  const rate = loan2.loans[1].rate;
  check(
    "年次レビュー：18%以上なら延命措置の注記",
    review[1].notes.some((t) => t.includes("延命措置")) === rate >= 0.18,
    `rate=${rate}`,
  );
}

section("緊急融資：3回目は回数上限で倒産");
{
  const p = advanceGameState(commit({ ...loan2, availableFunds: 0 }, emptyPlan())).state;
  check("融資を受けられない（回数上限）", p.pendingInsolvency?.offer === null && p.pendingInsolvency.denial === "countLimit");
  check("融資を受けられないなら受諾しても変わらない", acceptEmergencyLoan(p) === p);
  const s = declareBankruptcy(p);
  check("倒産で終了（denied）", s.bankrupt && s.gameCompleted && s.endReason === "denied");
  const report = buildFinalReport(s);
  check("評価は D", report.grade === "D");
  check("未返済の元本を総括", report.loanSummary?.outstanding === 400_000 && report.loanSummary.loans.length === 2);
  check("回数上限を説明", report.evaluationReason.includes("上限の2回"), report.evaluationReason);
}

section("緊急融資：不足額が残りの枠を超えると倒産");
{
  const s: GameState = commit(
    {
      ...createInitialGameState("advanced"),
      turn: 3,
      availableFunds: 0,
      loans: [{ ...loan1.loans[0], principal: 395_000 }],
    },
    emptyPlan(),
  );
  const p = advanceGameState(s).state.pendingInsolvency;
  check("融資を受けられない（枠不足）", p?.offer === null && p.denial === "creditLimit", JSON.stringify(p));
}

section("最終年：利息と元本を一括返済");
{
  const loan = { ...loan1.loans[0], principal: 100_000, rate: 0.1 };
  const base: GameState = {
    ...createInitialGameState("intro"),
    turn: 5,
    availableFunds: 500_000,
    loans: [loan],
  };
  const done = finalizeGame(commit(base, emptyPlan())).state;
  check("資金 = 資金 − 利息 − 元本", done.availableFunds === 390_000, `${done.availableFunds}`);
  check("完走", done.endReason === "completed" && !done.bankrupt);
  check("返済済み・残高 0", done.loans[0].repaidTurn === 5 && outstandingDebt(done) === 0);
  check("記録：返済額・利息", done.turnLog.at(-1)!.repayment === 100_000 && done.turnLog.at(-1)!.interestExpense === 10_000);
  const report = buildFinalReport(done);
  check("融資の総括", report.loanSummary?.totalRepaid === 100_000 && report.loanSummary.totalInterest === 10_000);
  check("評価理由に返済を記載", report.evaluationReason.includes("一括返済"));
  check("融資を受けても D 以外になりうる", report.grade !== "D");
  check("年次レビュー：完済を記載", buildYearlyReview(done).at(-1)!.goods.some((t) => t.includes("完済")));

  const broke = finalizeGame(commit({ ...base, availableFunds: 50_000 }, emptyPlan())).state;
  check("返済後にマイナスなら債務超過", broke.bankrupt && broke.endReason === "insolvent" && broke.availableFunds === -60_000);
  const brokeReport = buildFinalReport(broke);
  check("債務超過は D", brokeReport.grade === "D");
  check("債務超過の説明", brokeReport.evaluationReason.includes("債務超過"));
}

section("導入編：普通のプレイでは資金不足にならない");
{
  // 毎年、手元資金をすべてマーケティングに使い切っても、導入編の決算は黒字
  let s: GameState = createInitialGameState("intro");
  let insolvent = false;
  while (s.turn < s.totalTurns) {
    const r = advanceGameState(commit(s, spendAll(s)));
    if (r.insolvency) insolvent = true;
    s = r.state;
    if (s.pendingInsolvency || s.gameCompleted) break;
  }
  check("導入編は資金不足にならない", !insolvent);
}

section("実践編：受注なしで毎年融資を受けても、遅くとも3年目の決算で終了");
{
  let s: GameState = createInitialGameState("advanced");
  for (let i = 0; i < 10 && !s.gameCompleted; i++) {
    // 手元資金をすべてマーケティングに使い、提案はしない
    s = advanceGameState(commit(s, spendAll(s))).state;
    if (s.pendingInsolvency) {
      s = s.pendingInsolvency.offer ? acceptEmergencyLoan(s) : declareBankruptcy(s);
    }
  }
  check("倒産（融資を受けられず）で終了", s.endReason === "denied", `${s.endReason}`);
  check("遅くとも3年目", s.turn <= 3, `${s.turn}年目`);
  check("融資は2回まで", s.loans.length <= 2);
}

// ---------------------------------------------------------------------------
section("B: 確定済み配分を差し引いた残額でしか調査を購入できない");
{
  const base: GameState = { ...createInitialGameState("intro"), availableFunds: 100_000 };
  const report = researchReports.find((r) => r.cost === 45_000)!;
  const committed = commit(base, plan({ seminar: 90_000 }));
  check("使える資金 = 資金 − 確定額", spendableFunds(committed) === 10_000);
  check("確定後は購入を拒否", purchaseResearch(committed, report.id, report.cost) === committed);
  const bought = purchaseResearch(base, report.id, report.cost);
  check("未確定なら購入できる", bought.availableFunds === 55_000);
  check("二重購入は拒否", purchaseResearch(bought, report.id, report.cost) === bought);
}

// ---------------------------------------------------------------------------
section("D/E/I: 二重提案・終了後の操作を防ぐ");
{
  let s = commit(createInitialGameState("intro"), plan({ seminar: 200_000 }));
  s = { ...s, turn: 5, totalTurns: 5 };
  const reqs = getScenarioTurn(5, "intro").requests;
  const first = resolveProposal(s, reqs[1].id, reqs[1].priorities[0]);
  check("1回目の提案は成立", first !== null);
  s = first!.state;
  check("提案後は配分ロック対象", hasProposedThisTurn(s));
  check("同じ要求への再提案は拒否", resolveProposal(s, reqs[1].id, reqs[1].priorities[0]) === null);

  const done = finalizeGame(s).state;
  check("最終ターン終了で完了", done.gameCompleted && !done.bankrupt);
  check("提案の完了状態は保持", done.proposalsCompleted.includes(reqs[1].id));
  const recommitted = { ...done, marketingCommitted: true };
  check(
    "終了後は未提案の要求にも提案できない",
    resolveProposal(recommitted, reqs[0].id, reqs[0].priorities[0]) === null,
  );
  check("終了後の finalize は何もしない", finalizeGame(done).state === done);

  // ターン移動（デモ操作）で戻っても、回答済みの要求には再提案できない
  const jumped: GameState = {
    ...done,
    gameCompleted: false,
    proposalsCompleted: [],
    marketingCommitted: true,
  };
  check(
    "ターン移動後も回答済みの要求は再提案不可",
    resolveProposal(jumped, reqs[1].id, reqs[1].priorities[0]) === null,
  );
  check("未確定のままでは提案できない", resolveProposal({ ...jumped, marketingCommitted: false }, reqs[0].id, reqs[0].priorities[0]) === null);
}

// ---------------------------------------------------------------------------
section("未回答ペナルティ：要求ごとに信頼度と関係性が下がる");
{
  for (const mode of ["intro", "advanced"] as const) {
    const cfg = getModeConfig(mode);
    const s = commit(createInitialGameState(mode), emptyPlan());
    const unanswered = unansweredRequests(s);
    const r = advanceGameState(s);
    const settlementTrust = getScenarioTurn(2, mode).settlement!.trustDelta;
    const expected = Math.max(
      0,
      Math.min(100, s.trustScore + settlementTrust + unanswered.length * cfg.ignoreTrustDelta),
    );
    check(`${cfg.label}: 未回答 ${unanswered.length}件分の信頼度ペナルティ`, r.state.trustScore === expected, `${r.state.trustScore} vs ${expected}`);
    check(`${cfg.label}: ペナルティは失注より重い`, cfg.ignoreTrustDelta < cfg.loseTrustDelta);
    for (const req of unanswered) {
      check(
        `${cfg.label}: ${req.owner} の関係性が低下`,
        (r.state.relationshipDeltas[req.owner] ?? 0) < 0,
      );
    }
  }
}

// ---------------------------------------------------------------------------
section("F/③: 途中終了・履歴なしでも最終レポートを生成できる");
{
  const empty = { ...createInitialGameState("advanced"), gameCompleted: true };
  let report = buildFinalReport(empty);
  check("履歴0件でも生成できる", report.grade !== undefined);

  // 3年設定で最後までプレイ
  let s: GameState = { ...createInitialGameState("advanced"), totalTurns: 3 };
  for (;;) {
    s = commit(s, plan({ seminar: 150_000 }));
    for (const req of getScenarioTurn(s.turn, s.mode).requests) {
      const res = resolveProposal(s, req.id, req.priorities[0]);
      if (res) s = res.state;
    }
    if (s.turn >= s.totalTurns) {
      s = finalizeGame(s).state;
      break;
    }
    s = advanceGameState(s).state;
    if (s.pendingInsolvency) s = declareBankruptcy(s);
    if (s.gameCompleted) break;
  }
  report = buildFinalReport(s);
  check("3年設定のプレイ年数", report.yearsPlayed === 3, `${report.yearsPlayed}`);
  check("3年設定で5年前提の文言を含まない", !JSON.stringify(report).includes("5年間"));
}

// ---------------------------------------------------------------------------
section("P: 配分比による受注判定（同額配分の不公平を解消）");
{
  const rule = synergyRuleFor("intro");
  const tie = plan({ fieldSales: 100_000, seminar: 100_000 });
  check("同額2チャネル：セミナー訴求も受注", evaluateSynergy("燃費性能", ["燃費性能"], tie, rule).won);
  check("同額2チャネル：営業訴求も受注", evaluateSynergy("サポート体制", ["サポート体制"], tie, rule).won);
  const even = plan({ expo: 50_000, fieldSales: 50_000, seminar: 50_000, tradePress: 50_000, digital: 50_000 });
  const evenRes = evaluateSynergy("燃費性能", ["燃費性能"], even, rule);
  check("均等配分（20%）は閾値未満で失注", !evenRes.won && evenRes.reason === "lowShare");
  const exact = plan({ seminar: 50_000, expo: 150_000 });
  check("ちょうど25%は受注", evaluateSynergy("燃費性能", ["燃費性能"], exact, rule).won);
  const zero = evaluateSynergy("燃費性能", ["燃費性能"], emptyPlan(), rule);
  check("配分なしは失注", !zero.won && zero.shortfall > 0);

  // 不足額を足せば受注でき、1刻み少ないと受注できない（追加分は配分全体にも加わる）
  const cases: [MarketingPlan, string, "intro" | "advanced"][] = [
    [even, "燃費性能", "intro"],
    [plan({ seminar: 40_000, expo: 300_000 }), "技術力", "advanced"],
    [plan({ seminar: 120_000, expo: 400_000 }), "規制適合", "advanced"],
    [emptyPlan(), "実績", "advanced"],
  ];
  for (const [p, prio, mode] of cases) {
    const r = synergyRuleFor(mode);
    const res = evaluateSynergy(prio, [prio], p, r);
    const ch = res.requiredChannel;
    const after = evaluateSynergy(prio, [prio], { ...p, [ch]: p[ch] + res.shortfall }, r);
    const less = evaluateSynergy(prio, [prio], { ...p, [ch]: p[ch] + res.shortfall - 10_000 }, r);
    check(`不足額 $${res.shortfall} を足すと受注（${mode}）`, after.won, after.reason);
    check(`不足額は最小（1刻み少ないと失注）（${mode}）`, !less.won);
  }

  const adv = synergyRuleFor("advanced");
  const small = evaluateSynergy("燃費性能", ["燃費性能"], plan({ seminar: 60_000 }), adv);
  check("実践編：配分比は十分でも $100k 未満は投資不足", !small.won && small.reason === "underinvested");
}

section("重視順位による報酬差");
{
  const s0 = commit(
    createInitialGameState("intro"),
    plan({ seminar: 100_000, fieldSales: 100_000, digital: 100_000 }),
  );
  const req = getScenarioTurn(1, "intro").requests[0]; // 燃費性能, 納期, 保証条件
  const cfg = getModeConfig("intro");
  req.priorities.forEach((prio, rank) => {
    const res = resolveProposal(s0, req.id, prio)!;
    const rate = priorityRewardRate(rank);
    check(`第${rank + 1}優先：受注`, res.outcome === "won");
    check(`第${rank + 1}優先：受注額 ${rate * 100}%`, res.revenue === Math.round(req.budget * rate), `${res.revenue}`);
    check(
      `第${rank + 1}優先：信頼度 +${Math.round(cfg.winTrustDelta * rate)}`,
      res.trustDelta === Math.round(cfg.winTrustDelta * rate),
    );
    check("提案ログに記録", res.state.proposalLog.at(-1)?.priorityRank === rank);
  });
}

// ---------------------------------------------------------------------------
section("年次の記録（turnLog）と年次レビュー");
{
  // 実践編を、年によって第1優先・第2優先・未回答を混ぜてプレイする
  let s: GameState = createInitialGameState("advanced");
  for (;;) {
    const reqs = getScenarioTurn(s.turn, s.mode).requests;
    const channels = new Set(reqs.map((r) => channelForPriority(r.priorities[0])));
    const p = emptyPlan();
    for (const c of channels) p[c] = 120_000;
    s = commit(s, p);
    reqs.forEach((r, i) => {
      if (s.turn === 2 && i === 0) return; // 2年目の1件目は未回答
      const focus = s.turn === 3 ? r.priorities[1] ?? r.priorities[0] : r.priorities[0];
      const res = resolveProposal(s, r.id, focus);
      if (res) s = res.state;
    });
    if (s.turn >= s.totalTurns) {
      s = finalizeGame(s).state;
      break;
    }
    s = advanceGameState(s).state;
    if (s.pendingInsolvency) s = declareBankruptcy(s);
    if (s.gameCompleted) break;
  }
  check("5年分の記録", s.turnLog.length === 5, `${s.turnLog.length}`);
  for (let i = 1; i < s.turnLog.length; i++) {
    check(
      `${i + 1}年目の年初資金 = 前年の年末資金`,
      s.turnLog[i].fundsStart === s.turnLog[i - 1].fundsEnd,
    );
  }
  check("最終記録の年末資金 = 最終資金", s.turnLog.at(-1)!.fundsEnd === s.availableFunds);
  check("2年目の未回答が記録される", s.turnLog[1].unansweredRequestIds.length === 1);

  const report = buildFinalReport(s);
  const review = report.yearlyReview!;
  check("実践編は年次レビューあり", review !== null && review.length === 5);
  check("2年目：未回答を指摘", review[1].bads.some((t) => t.includes("回答しませんでした")));
  check("3年目：第2優先の取りこぼしを指摘", review[2].bads.some((t) => t.includes("取りこぼし")));
  check("1年目：満額受注を評価", review[0].goods.some((t) => t.includes("満額")));
  check("機会損失 = 上限 − 受注", review.every((y) => y.opportunityLoss === Math.max(0, y.potentialRevenue - y.wonRevenue)));
  check("導入編は年次レビューなし", buildFinalReport({ ...s, mode: "intro" }).yearlyReview === null);

  // L：「もしも」は判定ルールと同じチャネル対応で助言する
  const story = report.ifStory;
  const mentioned = ["国際海事展示会", "営業員の増員・訪問", "技術セミナー", "業界誌広告", "デジタル / オンライン"].filter((n) => story.includes(n));
  const worstPrimary = story.match(/第1優先の「(.+?)」/)?.[1];
  check("もしも：第1優先を示す", worstPrimary !== undefined, story);
  if (worstPrimary) {
    const expected = getChannel(channelForPriority(worstPrimary)).name;
    check("もしも：助言チャネルが判定ルールと一致", mentioned.length === 1 && mentioned[0] === expected, `${mentioned} vs ${expected}`);
  }
  console.log(`  [もしも] ${story}`);
  console.log(`  [3年目] ${review[2].bads[0]}`);

  // M：船主カルテの取引履歴はプレイ結果と一致する
  const setouchi = customers.find((c) => c.name.startsWith("Setouchi"))!;
  const deals = customerDeals(setouchi, s);
  const logged = s.proposalLog.filter((p) => p.owner === setouchi.name);
  check("取引履歴：受注件数がプレイ結果と一致", deals.filter((d) => d.status === "won").length === logged.filter((p) => p.won).length);
  check(
    "取引履歴：未回答が表示される",
    deals.some((d) => d.status === "ignored") === s.turnLog.some((t) => t.unansweredRequestIds.some((id) => deals.find((d) => d.requestId === id))),
  );

  // 倒産した年までの年次レビュー
  const bankrupt = declareBankruptcy(
    advanceGameState(
      commit({ ...createInitialGameState("advanced"), availableFunds: 10_000 }, emptyPlan()),
    ).state,
  );
  const br = buildFinalReport(bankrupt).yearlyReview!;
  check("倒産：倒産した年までレビュー", br.length === 1 && br[0].bankrupt);
  check("倒産：要因を説明", br[0].bads.some((t) => t.includes("倒産")));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);

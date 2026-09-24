/**
 * ステートマシンのエッジケース検証スクリプト（開発用）。失敗すると終了コード 1 で終わる。
 *   npx tsx scripts/check-edge-cases.mts
 */
import {
  advanceGameState,
  canEndTurn,
  finalizeGame,
  hasProposedThisTurn,
  purchaseResearch,
  resolveProposal,
  spendableFunds,
  unansweredRequests,
} from "../lib/game";
import { buildFinalReport } from "../lib/finalReport";
import { emptyPlan } from "../lib/marketing";
import { createInitialGameState, getModeConfig, getScenarioTurn, synergyRuleFor } from "../lib/modes";
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

// ---------------------------------------------------------------------------
section("A: 資金が最小配分単位未満でも $0 確定でターンを進められる");
{
  const low: GameState = { ...createInitialGameState("intro"), availableFunds: 5_000 };
  check("未確定のままでは終了できない", !canEndTurn(low));
  const skipped = commit(low, emptyPlan());
  check("$0 確定で終了できる", canEndTurn(skipped));
  const r = advanceGameState(skipped);
  check("ターンが進む", r.advanced && r.state.turn === 2, `turn=${r.state.turn}`);
  check("倒産していない（2年目決算は黒字）", !r.bankrupt);
}

// ---------------------------------------------------------------------------
section("倒産：決算後に資金がマイナスならゲーム終了");
{
  // 実践編の2年目決算は 売上 $290k − 固定費 $310k = −$20k
  const s = commit(
    { ...createInitialGameState("advanced"), availableFunds: 10_000 },
    emptyPlan(),
  );
  const r = advanceGameState(s);
  check("倒産フラグ", r.bankrupt && r.state.bankrupt);
  check("ゲーム完了", r.state.gameCompleted);
  check("ターンは進めない（倒産した年で止まる）", r.state.turn === 1);
  check("資金はマイナス", r.state.availableFunds < 0, `${r.state.availableFunds}`);
  const again = advanceGameState(r.state);
  check("倒産後はさらに進めない", !again.advanced && again.state === r.state);
  check("倒産後は終了できない", !canEndTurn(r.state));
  const req = getScenarioTurn(1, "advanced").requests[0];
  check("倒産後は提案できない", resolveProposal(r.state, req.id, req.priorities[0]) === null);
  const bought = purchaseResearch(r.state, researchReports[0].id, 0);
  check("倒産後は調査を購入できない", bought === r.state);

  const report = buildFinalReport(r.state);
  check("評価は D", report.grade === "D", report.grade);
  check("プレイ年数は 1", report.yearsPlayed === 1);
  check("5年前提の文言を含まない", !JSON.stringify(report).includes("5年間"));
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
  const bankrupt = advanceGameState(
    commit({ ...createInitialGameState("advanced"), availableFunds: 10_000 }, emptyPlan()),
  ).state;
  const br = buildFinalReport(bankrupt).yearlyReview!;
  check("倒産：倒産した年までレビュー", br.length === 1 && br[0].bankrupt);
  check("倒産：要因を説明", br[0].bads.some((t) => t.includes("倒産")));
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);

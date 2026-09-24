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
import { createInitialGameState, getModeConfig, getScenarioTurn } from "../lib/modes";
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

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);

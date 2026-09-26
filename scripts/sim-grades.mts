/**
 * 難易度ごとに代表的なプレイ戦略を自動で回し、最終資金・信頼度・受注状況・評価を確認する（開発用）。
 *   npx tsx scripts/sim-grades.mts
 *
 * 調整の目標：
 * - 要求を読んで毎年配分を組み替える → S に届く
 * - 要求を読まない固定配分（2チャネル）→ A 止まり
 * - 均等配分（薄く広く）→ C
 * - 実践編で少額投資を続ける → 倒産の危険（D）
 * - 資金不足になったら緊急融資を受ける（受けられなければ倒産）。融資しても立て直せなければ D
 */
import {
  acceptEmergencyLoan,
  advanceGameState,
  declareBankruptcy,
  finalizeGame,
  resolveProposal,
} from "../lib/game";
import { buildFinalReport } from "../lib/finalReport";
import { emptyPlan, getChannel, planTotal } from "../lib/marketing";
import {
  createInitialGameState,
  gameModes,
  getModeConfig,
  getScenarioTurn,
  synergyRuleFor,
} from "../lib/modes";
import { channelForPriority, evaluateSynergy } from "../lib/synergy";
import type { GameMode, GameState, MarketingChannelId, MarketingPlan } from "../lib/types";

type Strategy = {
  name: string;
  /** そのターンの配分（null = 投資を見送り、提案もしない） */
  plan: (s: GameState) => MarketingPlan | null;
  /** そのターンに提案するか（省略時は配分がある限り提案する） */
  propose?: (s: GameState) => boolean;
};

/** 各要求の第1優先に対応するチャネルへ、1チャネルあたり perChannel を配分する */
function readPrimaries(perChannel: number): Strategy["plan"] {
  return (s) => {
    const channels = new Set<MarketingChannelId>(
      getScenarioTurn(s.turn, s.mode).requests.map((r) => channelForPriority(r.priorities[0])),
    );
    const plan = emptyPlan();
    for (const c of channels) plan[c] = Math.min(perChannel, getChannel(c).max);
    return plan;
  };
}

/**
 * 手元資金の範囲で、想定予算の大きい要求の第1優先チャネルから順に perChannel ずつ配分する
 * （融資直後など、資金が限られた状態から立て直すプレイ）
 */
function readPrimariesWithin(perChannel: number): Strategy["plan"] {
  return (s) => {
    const plan = emptyPlan();
    let left = s.availableFunds;
    const requests = [...getScenarioTurn(s.turn, s.mode).requests].sort((a, b) => b.budget - a.budget);
    for (const r of requests) {
      const c = channelForPriority(r.priorities[0]);
      if (plan[c] > 0 || left < perChannel) continue;
      plan[c] = Math.min(perChannel, getChannel(c).max);
      left -= plan[c];
    }
    return plan;
  };
}

const fixed = (p: Partial<MarketingPlan>): Strategy["plan"] => () => ({ ...emptyPlan(), ...p });

const strategies: Strategy[] = [
  { name: "要求を読む（第1優先に各$120k）", plan: readPrimaries(120_000) },
  { name: "要求を読む（第1優先に各$60k）", plan: readPrimaries(60_000) },
  { name: "固定：セミナー+営業 各$100k", plan: fixed({ seminar: 100_000, fieldSales: 100_000 }) },
  { name: "固定：セミナー集中 $150k", plan: fixed({ seminar: 150_000 }) },
  {
    name: "均等 $50k×5（薄く広く）",
    plan: fixed({ expo: 50_000, fieldSales: 50_000, seminar: 50_000, tradePress: 50_000, digital: 50_000 }),
  },
  { name: "放置（投資・提案なし）", plan: () => null },
  {
    // 1年目は提案せずに資金を使い切って資金不足 → 融資を受けて要求を読むプレイに転換（V字回復）
    name: "1年目に浪費→融資→要求を読む",
    plan: (s) =>
      s.turn === 1
        ? { ...emptyPlan(), expo: Math.min(400_000, s.availableFunds) }
        : readPrimariesWithin(100_000)(s),
    propose: (s) => s.turn > 1,
  },
];

function play(mode: GameMode, strategy: Strategy) {
  let s = createInitialGameState(mode);
  let won = 0;
  let proposals = 0;
  let primaryWins = 0;
  const rule = synergyRuleFor(mode);
  for (;;) {
    const planned = strategy.plan(s);
    let plan = planned ?? emptyPlan();
    // 資金を超える配分は確定できないため、資金内に収まるよう縮める
    if (planTotal(plan) > s.availableFunds) plan = emptyPlan();
    s = { ...s, marketingPlan: plan, marketingCommitted: true };
    if (planned && (strategy.propose?.(s) ?? true)) {
      for (const r of getScenarioTurn(s.turn, mode).requests) {
        // 受注できる訴求ポイントのうち、最も重視順位の高いものを選ぶ
        const focus =
          r.priorities.find((p) => evaluateSynergy(p, r.priorities, plan, rule).won) ??
          r.priorities[0];
        const res = resolveProposal(s, r.id, focus);
        if (!res) continue;
        proposals++;
        if (res.outcome === "won") {
          won++;
          if (res.synergy.priorityRank === 0) primaryWins++;
        }
        s = res.state;
      }
    }
    if (s.turn >= s.totalTurns) {
      s = finalizeGame(s).state;
      break;
    }
    s = advanceGameState(s).state;
    // 資金不足：融資を受けられれば受け、受けられなければ倒産
    if (s.pendingInsolvency) {
      s = s.pendingInsolvency.offer ? acceptEmergencyLoan(s) : declareBankruptcy(s);
    }
    if (s.gameCompleted) break;
  }
  const report = buildFinalReport(s);
  const ratio = s.availableFunds / getModeConfig(mode).initialFunds;
  console.log(
    `  ${strategy.name.padEnd(26)} 資金 $${s.availableFunds.toLocaleString("en-US").padStart(11)} ` +
      `(${String(Math.round(ratio * 100)).padStart(5)}%)  信頼度 ${String(s.trustScore).padStart(3)}  ` +
      `受注 ${won}/${proposals}（第1優先 ${primaryWins}）  ` +
      `融資 ${s.loans.length}回${s.loans.length ? `（${s.loans.map((l) => `${Math.round(l.rate * 100)}%`).join("・")}）` : ""}  ` +
      `評価 ${report.grade}${s.bankrupt ? `（${s.turn}年目・${s.endReason}）` : ""}`,
  );
  return report.grade;
}

for (const mode of gameModes) {
  console.log(`=== ${getModeConfig(mode).label} ===`);
  for (const st of strategies) play(mode, st);
}

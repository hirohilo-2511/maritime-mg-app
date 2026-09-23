/**
 * 難易度ごとに代表的なプレイ戦略を自動で回し、最終資金・信頼度・評価を確認する（開発用）。
 *   npx tsx scripts/sim-grades.mts
 */
import { advanceGameState, finalizeGame, resolveProposal } from "../lib/game";
import { buildFinalReport } from "../lib/finalReport";
import { emptyPlan, marketingChannels } from "../lib/marketing";
import { createInitialGameState, gameModes, getModeConfig, getScenarioTurn } from "../lib/modes";
import { axisChannel, axisForPriority } from "../lib/synergy";
import type { GameMode, GameState, MarketingChannelId, MarketingPlan } from "../lib/types";

type Strategy = {
  name: string;
  /** そのターンの配分と、各要求で選ぶ訴求ポイントを決める */
  plan: (s: GameState) => { plan: MarketingPlan; focus: (priorities: string[]) => string };
};

/** 要求の重視項目をもっとも多くカバーできるチャネルに集中投資する */
function focused(amount: number): Strategy["plan"] {
  return (s) => {
    const reqs = getScenarioTurn(s.turn, s.mode).requests;
    const votes = new Map<MarketingChannelId, number>();
    for (const r of reqs)
      for (const p of new Set(r.priorities.map((p) => axisChannel[axisForPriority(p)])))
        votes.set(p, (votes.get(p) ?? 0) + r.budget);
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const plan = emptyPlan();
    const max = marketingChannels.find((c) => c.id === best)!.max;
    plan[best] = Math.min(amount, max);
    return {
      plan,
      focus: (ps) => ps.find((p) => axisChannel[axisForPriority(p)] === best) ?? ps[0],
    };
  };
}

const strategies: Strategy[] = [
  { name: "集中投資 $150k（最適）", plan: focused(150_000) },
  { name: "集中投資 $80k（少額）", plan: focused(80_000) },
  {
    name: "集中 $200k + 技術セミナー",
    plan: (s) => {
      const base = focused(200_000)(s);
      const plan = { ...base.plan };
      // 最大投資チャネルを崩さない範囲で、信頼度に効く技術セミナーにも配分する
      if (plan.seminar === 0) plan.seminar = 190_000;
      return { ...base, plan };
    },
  },
  {
    name: "均等配分 $50k×5（的外れ多め）",
    plan: () => {
      const plan = emptyPlan();
      for (const c of marketingChannels) plan[c.id] = 50_000;
      return { plan, focus: (ps) => ps[0] };
    },
  },
];

function play(mode: GameMode, strategy: Strategy) {
  let s = createInitialGameState(mode);
  for (;;) {
    const { plan, focus } = strategy.plan(s);
    s = { ...s, marketingPlan: plan, marketingCommitted: true };
    for (const r of getScenarioTurn(s.turn, mode).requests) {
      const res = resolveProposal(s, r.id, focus(r.priorities));
      if (res) s = res.state;
    }
    if (s.turn >= s.totalTurns) {
      s = finalizeGame(s).state;
      break;
    }
    s = advanceGameState(s).state;
  }
  const report = buildFinalReport(s);
  const ratio = s.availableFunds / getModeConfig(mode).initialFunds;
  console.log(
    `  ${strategy.name.padEnd(24)} 資金 $${s.availableFunds.toLocaleString("en-US").padStart(11)} ` +
      `(${Math.round(ratio * 100)}%)  信頼度 ${String(s.trustScore).padStart(3)}  評価 ${report.grade}`,
  );
}

for (const mode of gameModes) {
  console.log(`=== ${getModeConfig(mode).label} ===`);
  for (const st of strategies) play(mode, st);
}

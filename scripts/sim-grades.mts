/**
 * 難易度ごとに代表的なプレイ戦略を自動で回し、最終資金・信頼度・受注状況・評価を確認する（開発用）。
 *   npx tsx scripts/sim-grades.mts
 *
 * 調整の目標：
 * - 要求を読んで毎年配分を組み替える → S に届く
 * - 要求を読まない固定配分（2〜3施策）→ A 止まり（第1優先の偏りで S に届かないこと）
 * - 均等配分（薄く広く）→ C
 * - 実践編で少額投資を続ける → 倒産の危険（D）
 * - 資金不足になったら緊急融資を受ける（受けられなければ倒産）。融資しても立て直せなければ D
 * - 全施策に同額・大金をほぼ均等に配る（選択と集中をしない）→ S に届かない
 * - 実践編：関係する市場調査を買って重視順を知る → S に届く／調査しないと第1優先を外しやすい
 * 受注できる訴求ポイントがない要求は、提案せずに辞退する。
 * プレイヤーは画面に見えている重視順（実践編で未調査なら順不同）だけを手がかりにする。
 */
import {
  acceptEmergencyLoan,
  advanceGameState,
  declareBankruptcy,
  declineRequest,
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
import { displayedPriorities, isPriorityOrderKnown, customerByName } from "../lib/customers";
import { purchaseResearch } from "../lib/game";
import { reportCustomerIds, researchReports } from "../lib/research";
import type { GameMode, GameState, MarketingChannelId, MarketingPlan } from "../lib/types";

type Strategy = {
  name: string;
  /** そのターンの配分（null = 投資を見送り、提案もしない） */
  plan: (s: GameState) => MarketingPlan | null;
  /** そのターンに提案するか（省略時は配分がある限り提案する） */
  propose?: (s: GameState) => boolean;
  /** 年初に、重視順の分からない船主の市場調査を買うか（配分 perChannel × 施策数を残せる範囲で） */
  research?: number;
};

/** 画面に見えている重視項目の並び（未調査の実践編では順不同） */
const seen = (s: GameState, r: { owner: string; priorities: string[] }) =>
  displayedPriorities(s, r.owner, r.priorities).items;

/** 重視順の分からない今年の船主について、いちばん安い関係レポートを買う */
function buyResearch(s: GameState, perChannel: number): GameState {
  const requests = getScenarioTurn(s.turn, s.mode).requests;
  for (const r of requests) {
    if (isPriorityOrderKnown(s, r.owner)) continue;
    const id = customerByName(r.owner)?.id;
    const report = researchReports
      .filter((rep) => rep.availableFrom <= s.turn && id && reportCustomerIds(rep).includes(id))
      .filter((rep) => !s.researchPurchases.some((p) => p.reportId === rep.id))
      .sort((a, b) => a.cost - b.cost)[0];
    if (!report) continue;
    // 購入後も、今年の要求の施策へ perChannel ずつ配分できる資金を残す
    const channels = new Set(requests.map((q) => channelForPriority(seen(s, q)[0])));
    if (s.availableFunds - report.cost < channels.size * perChannel) continue;
    s = purchaseResearch(s, report.id, report.cost);
  }
  return s;
}

/** 各要求の第1優先に対応するチャネルへ、1チャネルあたり perChannel を配分する */
function readPrimaries(perChannel: number): Strategy["plan"] {
  return (s) => {
    const channels = new Set<MarketingChannelId>(
      getScenarioTurn(s.turn, s.mode).requests.map((r) => channelForPriority(seen(s, r)[0])),
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
      const c = channelForPriority(seen(s, r)[0]);
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
  { name: "調査して要求を読む（各$100k）", plan: readPrimariesWithin(100_000), research: 100_000 },
  { name: "調査せず要求を読む（各$100k）", plan: readPrimariesWithin(100_000) },
  { name: "固定：セミナー+営業 各$100k", plan: fixed({ seminar: 100_000, fieldSales: 100_000 }) },
  { name: "固定：セミナー集中 $150k", plan: fixed({ seminar: 150_000 }) },
  {
    name: "均等 $50k×5（薄く広く）",
    plan: fixed({ expo: 50_000, fieldSales: 50_000, seminar: 50_000, tradePress: 50_000, digital: 50_000 }),
  },
  { name: "放置（投資・提案なし）", plan: () => null },
  { name: "固定：セミナー+営業+業界誌", plan: (s) => {
      const per = Math.min(150_000, Math.floor(s.availableFunds / 3 / 10_000) * 10_000);
      return { ...emptyPlan(), seminar: per, fieldSales: per, tradePress: per };
    } },
  { name: "全5施策に同額（資金内で最大）", plan: (s) => {
      const per = Math.min(150_000, Math.floor(s.availableFunds / 5 / 10_000) * 10_000);
      return fixed({ expo: per, fieldSales: per, seminar: per, tradePress: per, digital: per })(s);
    } },
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
    if (strategy.research) s = buyResearch(s, strategy.research);
    const planned = strategy.plan(s);
    let plan = planned ?? emptyPlan();
    // 資金を超える配分は確定できないため、資金内に収まるよう縮める
    if (planTotal(plan) > s.availableFunds) plan = emptyPlan();
    s = { ...s, marketingPlan: plan, marketingCommitted: true };
    if (planned && (strategy.propose?.(s) ?? true)) {
      for (const r of getScenarioTurn(s.turn, mode).requests) {
        // 受注できる訴求ポイントのうち、最も重視順位の高いものを選ぶ
        const focus = seen(s, r).find((p) => evaluateSynergy(p, r.priorities, plan, rule).won);
        // 裏付けのある訴求ポイントがなければ、失注覚悟で出さずに辞退する
        if (!focus) {
          s = declineRequest(s, r.id);
          continue;
        }
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

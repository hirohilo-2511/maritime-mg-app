/**
 * 継続プレイ（第2部 6〜10年目）のバランス確認（開発用）。
 *   npx tsx scripts/sim-continuation.mts
 *
 * 基準資金 5 段階 × 進出先 4 通り × 戦い方 3 通りを自動で回し、
 * 7年目の終わりの資金・最終資金（基準資金比）・信頼度・第1優先的中率・評価を並べる。
 *
 * 合格の目安（設計書 11-2）：
 * - 消化試合にならない：どの基準資金でも、6・7年目に関係維持（$50,000）は打てる（融資を含む）
 * - 基準資金が極端（$50万・$1,500万）でも、上手な戦い方なら S に届く
 * - 稼ぎ損がない：同じ戦い方なら、基準資金が大きいほど評価が同じか上
 * - 進出しない＝正解になっていない：上手なプレイどうしでは「進出しない」の最終資金がいちばん低い
 * - 危機の強さ：何もしないと、7年目の終わりに基準資金の 50% 前後まで減る
 */
import {
  acceptEmergencyLoan,
  advanceGameState,
  declareBankruptcy,
  declineRequest,
  finalizeGame,
  purchaseResearch,
  resolveProposal,
} from "../lib/game";
import { buildFinalReport } from "../lib/finalReport";
import { LOCAL_PARTNER_MIN_SPEND, emptyPlan, getChannel, planTotal } from "../lib/marketing";
import { createInitialGameState } from "../lib/modes";
import {
  RELATIONSHIP_KEEP_SPEND,
  chooseCostCut,
  chooseOverflow,
  chooseOverseas,
  chooseRepair,
  dismissNotice,
  hasLocalPartner,
  needsOverflowChoice,
  pendingDecision,
  scenarioTurn,
  startContinuation,
  synergyRuleAt,
} from "../lib/continuation";
import { axisChannel, evaluateSynergy } from "../lib/synergy";
import { customerByName, displayedPriorities, isPriorityOrderKnown } from "../lib/customers";
import { hasActiveReport, reportCustomerIds, reportsFor, researchPrice } from "../lib/research";
import { requestsForTurn } from "../lib/extraRequests";
import type {
  GameState,
  MarketingChannelId,
  MarketingPlan,
  OverflowChoice,
  OverseasChoice,
  RepairChoice,
  ShipownerRequest,
} from "../lib/types";

type Style = {
  name: string;
  repair: RepairChoice;
  costCut: boolean;
  overflow: OverflowChoice;
  /** 使う施策の最大数（0 = 投資しない） */
  maxChannels: number;
  /** 不況の年に営業訪問で関係を保つか */
  keep: boolean;
  /** 重視順が分からない船主の市場調査を買うか */
  research: boolean;
  /** 提案・辞退をするか（しない = 放置） */
  answer: boolean;
  /** 本案件の第1優先を射抜くことを重く見るか（S 狙い） */
  aimS?: boolean;
};

const styles: Style[] = [
  { name: "攻め（設備更新・読んで集中）", repair: "renew", costCut: false, overflow: "delay", maxChannels: 3, keep: true, research: true, answer: true, aimS: true },
  { name: "守り（応急・経費削減・1施策）", repair: "patch", costCut: true, overflow: "outsource", maxChannels: 1, keep: true, research: false, answer: true },
  { name: "何もしない", repair: "patch", costCut: false, overflow: "silent", maxChannels: 0, keep: false, research: false, answer: false },
];

const bases = [500_000, 1_000_000, 3_000_000, 8_000_000, 15_000_000];
const overseasList: OverseasChoice[] = ["india", "vietnam", "china", "none"];

const seen = (s: GameState, r: ShipownerRequest) =>
  displayedPriorities(s, r.owner, r.priorities).items;

/** 第1部を完走した状態（資金だけ基準資金に置き換える） */
function partOneEnd(base: number): GameState {
  let s: GameState = { ...createInitialGameState("advanced"), turn: 5, totalTurns: 5 };
  s = finalizeGame({ ...s, marketingCommitted: true }).state;
  return { ...s, availableFunds: base, trustScore: 90 };
}

/** 重視順の分からない今年の船主の関係レポートを買う（資金の 5% までに抑える） */
function buyResearch(s: GameState): GameState {
  for (const r of requestsForTurn(s)) {
    if (r.declineOnly || isPriorityOrderKnown(s, r.owner)) continue;
    const id = customerByName(r.owner)?.id;
    const report = reportsFor(s)
      .filter((rep) => rep.availableFrom <= s.turn && id && reportCustomerIds(rep).includes(id))
      .filter((rep) => !hasActiveReport(s, rep.id))
      .sort((a, b) => researchPrice(s, a) - researchPrice(s, b))[0];
    if (!report) continue;
    const price = researchPrice(s, report);
    if (price > s.availableFunds * 0.15) continue;
    s = purchaseResearch(s, report.id, price);
  }
  // 中国に進出したら、規制リスク調査も買っておく
  if (s.continuation?.overseas === "china" && s.turn <= 8) {
    const china = reportsFor(s).find((r) => r.id === "r-os-china");
    if (china && !hasActiveReport(s, china.id) && researchPrice(s, china) < s.availableFunds * 0.05) {
      s = purchaseResearch(s, china.id, researchPrice(s, china));
    }
  }
  return s;
}

/** 受注の見込み（見えている重視順で、裏付けのある最上位の訴求） */
function bestFocus(s: GameState, r: ShipownerRequest, plan: MarketingPlan): string | null {
  if (r.declineOnly) return null;
  if (r.requiresLocalPartner && (plan.localPartner ?? 0) < LOCAL_PARTNER_MIN_SPEND) return null;
  const rule = synergyRuleAt(s);
  return seen(s, r).find((p) => evaluateSynergy(p, r.priorities, plan, rule).won) ?? null;
}

/**
 * プレイヤーが見込む受注額（見えている並びの先頭を第1優先とみなす）。
 * S を狙うプレイでは、本案件の第1優先を射抜くことを受注額より重く見る。
 */
function expectedValue(s: GameState, plan: MarketingPlan, aimS = false): number {
  let value = 0;
  const main = new Set(scenarioTurn(s).requests.map((r) => r.id));
  for (const r of requestsForTurn(s)) {
    const focus = bestFocus(s, r, plan);
    if (!focus) continue;
    const rank = seen(s, r).indexOf(focus);
    value += r.budget * ([1, 0.8, 0.6][rank] ?? 0.6);
    if (aimS && rank === 0 && main.has(r.id)) value += s.continuation!.baseFunds * 0.1;
  }
  return value;
}

/** 施策の組み合わせを総当たりして、見込み受注額 − 投資額が最大の配分を選ぶ */
function choosePlan(s: GameState, style: Style): MarketingPlan {
  const keep = style.keep && s.turn <= 8 ? RELATIONSHIP_KEEP_SPEND : 0;
  const base = emptyPlan();
  if (keep) base.fieldSales = keep;
  if (style.maxChannels === 0) return base;
  const channels = Object.values(axisChannel) as MarketingChannelId[];
  const partnerOptions = hasLocalPartner(s) ? [0, LOCAL_PARTNER_MIN_SPEND] : [0];
  let best = base;
  let bestNet = expectedValue(s, base, style.aimS) - planTotal(base);
  for (let mask = 1; mask < 1 << channels.length; mask++) {
    const picked = channels.filter((_, i) => mask & (1 << i));
    if (picked.length > style.maxChannels) continue;
    for (const partner of partnerOptions) {
      for (const per of [100_000, 150_000, 200_000, 250_000, 300_000, 400_000]) {
        const plan = { ...base, localPartner: partner };
        for (const c of picked) plan[c] = Math.min(Math.max(per, plan[c]), getChannel(c).max);
        const cost = planTotal(plan);
        if (cost > s.availableFunds) continue;
        const net = expectedValue(s, plan, style.aimS) - cost;
        if (net > bestNet) {
          best = plan;
          bestNet = net;
        }
      }
    }
  }
  // 資金が足りず関係維持もできない場合は、払える範囲で
  if (planTotal(best) > s.availableFunds) return emptyPlan();
  return best;
}

type Result = {
  ratio7: number;
  ratio: number;
  trust: number;
  hit: number;
  grade: string;
  loans: number;
  bankrupt: boolean;
  keptUnder: boolean;
};

function play(baseFunds: number, overseas: OverseasChoice, style: Style): Result {
  let s = startContinuation(partOneEnd(baseFunds), {
    grade: "A",
    finalFunds: baseFunds,
    finalTrust: 90,
    primaryHitRate: 0.8,
  });
  const K = s.continuation!.baseFunds;
  let ratio7 = 0;
  let keptUnder = false;
  for (;;) {
    // 年初の判断
    const d = pendingDecision(s);
    if (d === "crisis") s = chooseCostCut(chooseRepair(s, style.repair), style.costCut);
    if (d === "overseas") {
      const next = chooseOverseas(s, overseas);
      s = next === s ? chooseOverseas(s, "none") : next;
    }
    if (d === "recoveryNotice") s = dismissNotice(s, 9);

    if (style.research) s = buyResearch(s);
    const plan = choosePlan(s, style);
    if (s.turn <= 7 && style.keep && (plan.fieldSales ?? 0) < RELATIONSHIP_KEEP_SPEND) keptUnder = true;
    s = { ...s, marketingPlan: plan, marketingCommitted: true };

    if (style.answer) {
      for (const r of requestsForTurn(s)) {
        const focus = bestFocus(s, r, plan);
        if (!focus) {
          if (!r.extra) s = declineRequest(s, r.id);
          continue;
        }
        const res = resolveProposal(s, r.id, focus);
        if (res) s = res.state;
      }
    }
    if (needsOverflowChoice(s)) s = chooseOverflow(s, style.overflow);

    if (s.turn >= s.totalTurns) {
      s = finalizeGame(s).state;
      break;
    }
    s = advanceGameState(s).state;
    if (s.pendingInsolvency) {
      s = s.pendingInsolvency.offer ? acceptEmergencyLoan(s) : declareBankruptcy(s);
    }
    if (s.turn === 8 || (s.gameCompleted && ratio7 === 0)) ratio7 = s.availableFunds / K;
    if (s.gameCompleted) break;
  }
  const report = buildFinalReport(s);
  return {
    ratio7,
    ratio: s.availableFunds / K,
    trust: s.trustScore,
    hit: report.primaryHitRate,
    grade: report.grade,
    loans: s.loans.filter((l) => l.turn >= 6).length,
    bankrupt: s.bankrupt,
    keptUnder,
  };
}

const pct = (v: number) => `${String(Math.round(v * 100)).padStart(4)}%`;
const label: Record<OverseasChoice, string> = { india: "インド", vietnam: "ベトナム", china: "中国", none: "進出なし" };

const results: { base: number; overseas: OverseasChoice; style: Style; r: Result }[] = [];
for (const base of bases) {
  console.log(`=== 基準資金 $${base.toLocaleString("en-US")} ===`);
  for (const style of styles) {
    for (const overseas of overseasList) {
      const r = play(base, overseas, style);
      results.push({ base, overseas, style, r });
      console.log(
        `  ${style.name.padEnd(18)} ${label[overseas].padEnd(5)} 7年目末 ${pct(r.ratio7)}  最終 ${pct(r.ratio)}  ` +
          `信頼度 ${String(r.trust).padStart(3)}  的中 ${pct(r.hit)}  融資 ${r.loans}回  評価 ${r.grade}` +
          (r.keptUnder ? "  ※関係維持できず" : ""),
      );
    }
  }
}

// 合格の目安の自動チェック
const failures: string[] = [];
const attackStyle = styles[0];
for (const base of bases) {
  const smart = results.filter((x) => x.base === base && x.style === attackStyle);
  const bestOverseas = Math.max(...smart.filter((x) => x.overseas !== "none").map((x) => x.r.ratio));
  const none = smart.find((x) => x.overseas === "none")!.r.ratio;
  if (none >= bestOverseas) failures.push(`$${base}: 進出しないのほうが最終資金が多い`);
  if (!smart.some((x) => x.r.grade === "S")) failures.push(`$${base}: 攻めでも S に届かない`);
  const idle = results.find((x) => x.base === base && x.style === styles[2] && x.overseas === "none")!.r;
  if (idle.ratio7 > 0.65 || idle.ratio7 < 0.3) failures.push(`$${base}: 何もしないときの7年目末が ${pct(idle.ratio7)}`);
  if (results.some((x) => x.base === base && x.r.keptUnder)) failures.push(`$${base}: 関係維持を打てない年がある`);
}
const rank = { S: 5, A: 4, B: 3, C: 2, D: 1 } as Record<string, number>;
const attack = styles[0];
for (const style of styles) {
  for (const overseas of overseasList) {
    const row = bases.map((b) => results.find((x) => x.base === b && x.style === style && x.overseas === overseas)!.r.grade);
    // 既知の例外：進出しない攻めは、受注額の下限（$250,000）が効く小さな会社だけ S に届く
    // （中堅以上では「進出しないと S は取りにくい」という設計どおり）
    if (style === attack && overseas === "none") continue;
    for (let i = 1; i < row.length; i++) {
      if (rank[row[i]] < rank[row[i - 1]]) {
        failures.push(`${style.name}・${label[overseas]}: 基準資金が大きいほうが評価が下がる（${row.join("→")}）`);
        break;
      }
    }
  }
}
console.log(failures.length ? `\n要確認:\n- ${failures.join("\n- ")}` : "\nすべての目安を満たしています");

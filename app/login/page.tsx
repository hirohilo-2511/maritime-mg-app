"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { gameModes, modeConfigs } from "@/lib/modes";
import type { GameMode } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 " +
  "placeholder:text-navy-300 transition-colors " +
  "focus:border-sea-500 focus:outline-2 focus:outline-offset-0 focus:outline-sea-500/30";

/** 1年の流れ（プレイヤーガイドの「1年はこの3ステップ」） */
const yearSteps: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "budget",
    title: "予算を配る",
    body: "5つのマーケティング施策に予算を配って「確定」。確定したら、その年は変えられません。",
  },
  {
    icon: "presentation",
    title: "船主に提案",
    body: "船主の要求に、訴求ポイントを選んで提案。受注か失注かはその場で分かります。",
  },
  {
    icon: "calendar",
    title: "ターン終了",
    body: "決算で資金と信頼度が変わり、次の年へ。これを5年間くり返します。",
  },
];

/** 勝つためのコツ（プレイヤーガイドより） */
const tips = [
  {
    title: "船主の「第1優先」に応える",
    body: "重視項目は大事な順。第1優先で受注すると満額、2番目は80%、3番目は60%に目減りします。",
  },
  {
    title: "力を入れる施策をしぼる",
    body: "配分全体の「4分の1以上」を投じた施策だけが提案の裏付けになります。5つに均等だと、どれも届きません。",
  },
  {
    title: "勝ち目がなければ「辞退」も作戦",
    body: "放置（未回答）がいちばん信用を落とします。裏付けがない案件は辞退で傷を浅く。",
  },
];

/** 航海図：要求と、裏付けになる施策 */
const chart = [
  ["燃費・技術", "技術セミナー"],
  ["サポート", "営業員の増員・訪問"],
  ["価格", "国際海事展示会"],
  ["実績", "業界誌広告"],
  ["納期", "デジタル"],
];

/**
 * トップページ。ゲームの紹介（プレイヤーガイドの要約）と、
 * 導入編・実践編を選んで始める入口を兼ねる。認証はない。
 */
export default function LoginPage() {
  const router = useRouter();
  const { startGame } = useGame();
  const [playerName, setPlayerNameInput] = useState("");

  function handleStart(mode: GameMode) {
    startGame(mode, playerName);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-navy-50">
      {/* ヘッダー */}
      <header className="bg-navy-900">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sea-500/15 text-sea-400 ring-1 ring-sea-500/30">
            <Icon name="anchor" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold text-white">Maritime B2B Simulator</p>
            <p className="text-[11px] tracking-wide text-navy-400">
              BUSINESS SIMULATION PLATFORM
            </p>
          </div>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-navy-900 pb-16">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full border border-white/5"
        />
        <div
          aria-hidden
          className="absolute top-1/3 right-12 h-64 w-64 rounded-full bg-sea-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-5 pt-10">
          <h1 className="text-3xl leading-snug font-bold text-white sm:text-4xl">
            5年で、
            <span className="text-sea-400">海の信頼</span>
            を勝ち取れ。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-navy-300 sm:text-base">
            あなたは船舶用機器メーカーの経営企画。限られた予算をマーケティング施策に配り、
            世界の船主からの要求に提案して、5年間で資金と信頼度を伸ばす経営シミュレーションです。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#start"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-sea-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-sea-600"
            >
              ゲームをはじめる
            </a>
            <span className="inline-flex h-11 items-center text-xs text-navy-400">
              登録・インストール不要。ブラウザだけで遊べます
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-12 px-5 py-12">
        {/* 1年の流れ */}
        <section>
          <h2 className="text-xl font-bold text-navy-900">1年はこの3ステップ</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {yearSteps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-navy-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sea-500/10 text-sea-600">
                  <Icon name={step.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-navy-900">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* コツと航海図 */}
        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-navy-900">勝つためのコツ</h2>
            <ol className="mt-4 space-y-3">
              {tips.map((tip, i) => (
                <li
                  key={tip.title}
                  className="flex gap-3 rounded-xl border border-navy-200 bg-white p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-navy-900">{tip.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-navy-600">
                      {tip.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-navy-900">航海図</h2>
            <p className="mt-1 text-xs text-navy-500">
              どの要求に、どの施策が効く？
            </p>
            <table className="mt-3 w-full overflow-hidden rounded-xl border border-navy-200 bg-white text-sm">
              <thead>
                <tr className="bg-navy-100 text-left text-xs text-navy-600">
                  <th className="px-4 py-2 font-semibold">船主の要求</th>
                  <th className="px-4 py-2 font-semibold">裏付けになる施策</th>
                </tr>
              </thead>
              <tbody>
                {chart.map(([need, measure]) => (
                  <tr key={need} className="border-t border-navy-100">
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{need}</td>
                    <td className="px-4 py-2.5 text-navy-700">{measure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 rounded-lg bg-white px-4 py-3 text-xs leading-relaxed text-navy-600 ring-1 ring-navy-200">
              <span className="font-bold text-navy-900">最高評価 S：</span>
              信頼度 95 以上・最終資金が初期資金の 130% 以上・第1優先に応えた受注が 80% 以上。
            </p>
          </div>
        </section>

        {/* はじめる */}
        <section id="start" className="scroll-mt-6">
          <h2 className="text-xl font-bold text-navy-900">モードを選んで出航</h2>
          <p className="mt-1 text-sm text-navy-500">
            はじめてなら「導入編」。慣れたら「実践編」に挑戦してください。
          </p>

          <div className="mt-4 max-w-sm">
            <label
              htmlFor="playerName"
              className="mb-1.5 block text-xs font-semibold text-navy-700"
            >
              プレイヤー名（任意・最終レポートに載ります）
            </label>
            <input
              id="playerName"
              name="playerName"
              type="text"
              autoComplete="nickname"
              placeholder="山田 太郎"
              value={playerName}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {gameModes.map((id) => {
              const cfg = modeConfigs[id];
              return (
                <div
                  key={id}
                  className="flex flex-col rounded-xl border border-navy-200 bg-white p-5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-navy-900">{cfg.label}</span>
                    <span className="ml-auto text-[10px] font-semibold tracking-widest text-navy-400">
                      {cfg.tag}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-navy-600">
                    {cfg.description}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5 rounded-lg bg-navy-50 px-3.5 py-3 text-xs leading-relaxed text-navy-600">
                    {cfg.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5">
                        <Icon
                          name="check"
                          className="mt-0.5 h-3 w-3 shrink-0 text-sea-600"
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="lg"
                    className="mt-4 w-full"
                    variant={id === "intro" ? "primary" : "secondary"}
                    onClick={() => handleStart(id)}
                  >
                    {cfg.label}をはじめる
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-navy-500">
            記録はブラウザの中だけに保存されます。プレイ中は再読み込みやタブを閉じるのを避けてください。
          </p>
        </section>
      </main>

      <footer className="border-t border-navy-200 py-6 text-center text-[11px] text-navy-400">
        © 2026 Maritime B2B Simulator. 登場する企業・ニュースはすべて架空です。
      </footer>
    </div>
  );
}

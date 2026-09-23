"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";

const inputClass =
  "w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 " +
  "placeholder:text-navy-300 transition-colors " +
  "focus:border-sea-500 focus:outline-2 focus:outline-offset-0 focus:outline-sea-500/30";

export default function LoginPage() {
  const router = useRouter();
  const { setPlayerName } = useGame();
  const [playerName, setPlayerNameInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * モック認証。バックエンド未実装のため、入力値の検証のみ行い
   * 擬似的な遅延のあとダッシュボードへ遷移する。
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setPlayerName(playerName);
    setTimeout(() => router.push("/dashboard"), 400);
  }

  return (
    <div className="flex min-h-screen bg-navy-50">
      {/* 左：ブランドパネル（デスクトップのみ） */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        {/* 装飾（航路をイメージした同心円） */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full border border-white/5"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full border border-white/5"
        />
        <div
          aria-hidden
          className="absolute top-1/3 right-12 h-64 w-64 rounded-full bg-sea-500/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sea-500/15 text-sea-400 ring-1 ring-sea-500/30">
            <Icon name="anchor" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold text-white">Maritime MG</p>
            <p className="text-[11px] tracking-wide text-navy-400">
              MANAGEMENT GAME PLATFORM
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-snug font-bold text-white">
            海事産業の意思決定を、
            <br />
            5年間のシミュレーションで。
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-navy-300">
            市場調査・マーケティング予算・船主との交渉。限られた資金と信頼度を配分しながら、
            自社を成長させる経営判断を体験する法人向けトレーニングプログラムです。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-navy-200">
            {[
              "実際の海事市況をモデル化したマーケットイベント",
              "船主プロファイルに応じた提案シミュレーション",
              "チーム対抗での経営スコア比較",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Icon
                  name="shield"
                  className="mt-0.5 h-4 w-4 shrink-0 text-sea-400"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-navy-500">
          © 2026 Maritime MG. プロトタイプ版。
        </p>
      </div>

      {/* 右：ログインフォーム */}
      <div className="flex w-full items-center justify-center px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* モバイル用ブランド */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-sea-400">
              <Icon name="anchor" className="h-6 w-6" />
            </span>
            <p className="text-base font-bold text-navy-900">Maritime MG</p>
          </div>

          <h1 className="text-2xl font-bold text-navy-900">ログイン</h1>
          <p className="mt-2 text-sm text-navy-500">
            登録済みの企業アカウントでサインインしてください。
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="playerName"
                className="mb-1.5 block text-xs font-semibold text-navy-700"
              >
                プレイヤー名
              </label>
              <input
                id="playerName"
                name="playerName"
                type="text"
                required
                autoComplete="name"
                placeholder="山田 太郎"
                value={playerName}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-navy-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.co.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-navy-700"
                >
                  パスワード
                </label>
                <span className="text-xs font-medium text-sea-600">
                  パスワードをお忘れですか？
                </span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-navy-500">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-navy-300 accent-navy-800"
              />
              ログイン状態を保持する
            </label>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "サインイン中…" : "ログイン"}
            </Button>
          </form>

          <p className="mt-6 rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-[11px] leading-relaxed text-navy-500">
            <span className="font-semibold text-navy-700">デモ環境:</span>
            認証は未実装です。任意のメールアドレスとパスワードでダッシュボードに遷移します。
          </p>
        </div>
      </div>
    </div>
  );
}

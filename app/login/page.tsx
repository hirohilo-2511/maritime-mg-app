"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/components/game/GameProvider";
import { modeConfigs } from "@/lib/modes";
import type { GameMode } from "@/lib/types";
import { ManualArtDefs } from "./ManualArt";
import s from "./landing.module.css";

/** 航海図：要求と、裏付けになる施策 */
const chart = [
  ["燃費・技術", "技術セミナー"],
  ["サポート", "営業員の増員・訪問"],
  ["価格", "国際海事展示会"],
  ["実績", "業界誌広告"],
  ["納期", "デジタル"],
];

/** 導入編・実践編の違い（プレイヤーガイド3ページ目の表） */
const compare = [
  ["スタート", "資金 $500,000・信頼度 50", "資金 $400,000・信頼度 40（市況も厳しめ）"],
  ["裏付けの条件", "配分全体の4分の1以上", "4分の1以上 ＋ $100,000 以上"],
  ["船主の重視順", "最初から見える", "市場調査で分かる（有効2年）"],
  ["提案画面のヒント", "裏付けの有無を表示", "表示なし（自分で見極める）"],
  ["追加案件", "なし", "見込み引き合い 20件・35件で翌年に届く"],
  ["最終レポート", "評価・スタイル分析・もしも", "＋ ROI・CPA、年次レビュー"],
];

function Arrow() {
  return (
    <div className={s.arrow}>
      <svg width="26" height="26" viewBox="0 0 10 10" aria-hidden>
        <path d="M2 1 L8 5 L2 9 Z" fill="#0b1f3a" />
      </svg>
    </div>
  );
}

/**
 * トップページ。プレイヤーガイド Ver.5.1 と同じ見た目でゲームを紹介し、
 * モードを選んで「アクセスはこちら」と同じ紺色のバーから始める。認証はない。
 */
export default function LoginPage() {
  const router = useRouter();
  const { startGame } = useGame();
  const [playerName, setPlayerName] = useState("");
  const [mode, setMode] = useState<GameMode>("intro");

  function handleStart() {
    startGame(mode, playerName);
    router.push("/dashboard");
  }

  const goButton = (
    <button type="button" className={s.go} onClick={handleStart}>
      <span className={s.emoji} style={{ fontSize: 26 }} aria-hidden>
        🚢
      </span>
      <span>
        <small>ゲームはこちら（登録・インストール不要）</small>
        <b>{modeConfigs[mode].label}ではじめる</b>
      </span>
      <span className={s.goArrow} aria-hidden>
        ▶
      </span>
    </button>
  );

  return (
    <div className={s.root}>
      <ManualArtDefs />

      {/* ===== 表紙 ===== */}
      <section className={s.cover}>
        <svg className={s.sun} width="120" height="120" viewBox="0 0 60 60" aria-hidden>
          <circle cx="30" cy="30" r="14" fill="#fde047" stroke="#0b1f3a" strokeWidth="1" />
          <g stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round">
            <path d="M30 10 v-5 M30 50 v5 M10 30 h-5 M50 30 h5 M16 16 l-3.5 -3.5 M44 44 l3.5 3.5 M44 16 l3.5 -3.5 M16 44 l-3.5 3.5" />
          </g>
        </svg>
        <svg className={s.cloud} style={{ right: "22%", top: 150 }} width="128" height="64" viewBox="0 0 120 60" aria-hidden>
          <use href="#cloud" width="100%" height="100%" />
        </svg>
        <svg className={s.cloud} style={{ right: "5%", top: 250 }} width="90" height="45" viewBox="0 0 120 60" aria-hidden>
          <use href="#cloud" width="100%" height="100%" />
        </svg>

        <div className={s.wrap}>
          <span className={s.ver}>経営シミュレーションゲーム</span>
          <div className={s.title}>
            <small>MARITIME B2B SIMULATOR</small>
            <h1>
              5年で、
              <br />
              <em>海の信頼</em>を
              <br />
              勝ち取れ！
            </h1>
            <span className={s.subtitle}>
              <span className={s.emoji}>⚓</span> 船舶用機器メーカーの経営企画として、予算と提案で勝負！
            </span>
          </div>

          <div className={s.talk}>
            <svg width="96" height="104" viewBox="0 0 120 130" aria-hidden>
              <use href="#captain" width="100%" height="100%" />
            </svg>
            <div className={s.bubble}>
              <small>カモメ船長</small>
              ようこそ、新人くん！ 予算を配って、船主さんの心をつかむ5年間の航海だ。いっしょに行こう！
            </div>
          </div>

          <div className={s.steps}>
            <div className={s.step}>
              <span className={s.n}>1</span>
              <b>名前を入れる</b>
              <p>入れなくても OK。最終レポートに名前が載るよ。</p>
              <input
                className={s.nameInput}
                type="text"
                aria-label="プレイヤー名"
                autoComplete="nickname"
                placeholder="山田 太郎"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <div className={s.step}>
              <span className={s.n}>2</span>
              <b>モードを選ぶ</b>
              <p>はじめてなら「導入編」。慣れたら「実践編」に挑戦！下のカードをタップしてね。</p>
            </div>
            <div className={s.step}>
              <span className={s.n}>3</span>
              <b>出航！</b>
              <p>紺色のバーを押せばスタート。登録やログインは不要だよ。</p>
            </div>
          </div>

          <div className={s.modes} role="radiogroup" aria-label="モード">
            {(
              [
                ["intro", "🌱", "var(--mint-l)", "資金 $500,000・信頼度 50。画面のヒントを見ながら、予算と提案の関係を体で覚えよう。"],
                ["advanced", "🔥", "var(--sun-l)", "資金 $400,000・信頼度 40。市況は厳しく、顧客の本音は調べないと分からない本番モード。"],
              ] as const
            ).map(([id, icon, bg, text]) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${s.mode} ${selected ? s.modeSelected : ""}`}
                  style={{ background: bg }}
                  onClick={() => setMode(id)}
                >
                  {selected && <span className={s.check}>✓ 選択中</span>}
                  <b>
                    <span className={s.emoji}>{icon}</span> {modeConfigs[id].label}
                  </b>
                  <p>{text}</p>
                </button>
              );
            })}
          </div>

          {goButton}
        </div>

        <div className={s.sea} aria-hidden>
          <svg className={s.waveBack} viewBox="0 0 210 40" preserveAspectRatio="none">
            <use href="#wave" x="0" y="4" width="210" height="36" fill="#38bdf8" />
          </svg>
          <svg className={s.ship} width="320" height="152" viewBox="0 0 400 190">
            <use href="#ship" width="100%" height="100%" />
          </svg>
          <svg className={s.waveFront} viewBox="0 0 210 40" preserveAspectRatio="none">
            <use href="#wave" x="-20" y="0" width="250" height="40" fill="#0284c7" />
          </svg>
        </div>
      </section>

      <div className={s.wrap}>
        {/* ===== 1年のながれ・コツ ===== */}
        <section className={s.section}>
          <h2 className={s.h2}>
            <span className={s.tag}>基本</span>1年はこの3ステップ
          </h2>
          <div className={s.talk}>
            <svg width="72" height="78" viewBox="0 0 120 130" aria-hidden>
              <use href="#captain" width="100%" height="100%" />
            </svg>
            <div className={s.bubble} style={{ marginBottom: 20 }}>
              迷ったら左のサイドバーを見るんだ。「今やること」を教えてくれるぞ！
            </div>
          </div>
          <div className={s.loop}>
            <div className={s.card} style={{ background: "#e0f2fe" }}>
              <div className={`${s.ic} ${s.emoji}`}>💰</div>
              <b>① 予算を配る</b>
              <p>5つの施策にスライダーで配って「確定」。確定したら、その年は変えられないよ。</p>
            </div>
            <Arrow />
            <div className={s.card} style={{ background: "var(--grape-l)" }}>
              <div className={`${s.ic} ${s.emoji}`}>🤝</div>
              <b>② 船主に提案</b>
              <p>重視される要素から「訴求ポイント」を1つ選ぶ。受注か失注か、その場で分かる！</p>
            </div>
            <Arrow />
            <div className={s.card} style={{ background: "var(--coral-l)" }}>
              <div className={`${s.ic} ${s.emoji}`}>📈</div>
              <b>③ ターン終了</b>
              <p>サイドバー左下のボタンで決算。資金と信頼度が変わって次の年へ。</p>
            </div>
          </div>

          <h2 className={s.h2} style={{ fontSize: 22 }}>
            <span className={s.emoji}>🏆</span> 勝つためのコツ 3つ
          </h2>
          <div className={s.tips}>
            <div className={s.tip}>
              <div className={s.no} style={{ background: "var(--coral)" }}>1</div>
              <div>
                <b>船主の「①第1優先」に応える</b>
                <p>重視項目は大事な順。第1優先で受注すると満額、2番目は80%、3番目は60%に目減り。</p>
              </div>
            </div>
            <div className={s.tip}>
              <div className={s.no} style={{ background: "var(--sea)" }}>2</div>
              <div>
                <b>力を入れる施策をしぼる</b>
                <p>配分全体の「4分の1以上」を投じた施策だけが、提案の裏付けになる。5つに均等だと、どれも届かない。スライダーの緑の目印が合図！</p>
              </div>
            </div>
            <div className={s.tip}>
              <div className={s.no} style={{ background: "var(--mint)" }}>3</div>
              <div>
                <b>勝ち目がなければ「辞退」も作戦</b>
                <p>放置（未回答）がいちばん信用を落とす。裏付けがない案件は「今期は辞退する」で傷を浅く。</p>
              </div>
            </div>
          </div>

          <div className={s.map}>
            <h3>
              <span className={s.emoji}>🗺️</span> 航海図：どの要求に、どの施策が効く？
            </h3>
            <div className={s.chips}>
              {chart.map(([need, measure]) => (
                <div key={need} className={s.chip}>
                  <div className={s.chipW}>{need}</div>
                  <div className={s.chipA}>▼</div>
                  <div className={s.chipC}>{measure}</div>
                </div>
              ))}
            </div>
            <p className={s.note}>
              予算画面の水色のタグにも「〇〇の裏付け」と書いてあるよ。規制適合・開発力は「燃費・技術」、保守契約・保証条件は「サポート」の仲間。
            </p>
          </div>
        </section>

        {/* ===== 評価とモードの違い ===== */}
        <section className={s.section}>
          <h2 className={s.h2}>
            <span className={s.tag}>評価</span>めざせ最高評価「S」
          </h2>
          <div className={s.rank}>
            <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden>
              <path d="M50 6 l12 26 28 3 -21 19 6 28 -25 -14 -25 14 6 -28 -21 -19 28 -3 z" fill="#fbbf24" stroke="#0b1f3a" strokeWidth="3.5" strokeLinejoin="round" />
              <text x="50" y="66" textAnchor="middle" fontSize="34" fontWeight="900" fill="#0b1f3a" fontFamily="Segoe UI, sans-serif">
                S
              </text>
            </svg>
            <div>
              <b>最高評価「S」の条件（3つとも達成）</b>
              <ul>
                <li>最終の信頼度が 95 以上</li>
                <li>最終資金が初期資金の 130% 以上（融資は返済後で判定）</li>
                <li>船主の第1優先に応えて受注した割合が 80% 以上</li>
              </ul>
              <p className={s.sub}>それ以外は資金と信頼度の合計で A〜C。倒産・最終年の債務超過は D。</p>
            </div>
          </div>

          <div className={s.cmpWrap}>
            <table className={s.cmp}>
              <thead>
                <tr>
                  <th>ひと目でわかる違い</th>
                  <th className={s.thIntro}>🌱 導入編</th>
                  <th className={s.thAdv}>🔥 実践編</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([label, intro, adv]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{intro}</td>
                    <td>{adv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== 出航 ===== */}
        <div className={s.finale}>
          <div className={s.finaleTxt}>
            <b>
              <span className={s.emoji}>🚢</span> さあ、出航しよう！
            </b>
            <p>
              読むのはここまで。まずは導入編で5年間を走り切ってみよう。
              <br />
              モードは表紙のカードで切り替えられるよ。
            </p>
          </div>
          <div className={s.finaleGo}>{goButton}</div>
          <svg viewBox="0 0 400 110" width="100%" height="140" preserveAspectRatio="xMidYMax meet" style={{ display: "block", marginTop: 8 }} aria-hidden>
            <use href="#captain" x="24" y="10" width="72" height="78" />
            <use href="#ship" x="150" y="12" width="190" height="90" />
            <use href="#wave" x="-20" y="80" width="440" height="30" fill="#0284c7" />
          </svg>
        </div>

        <div className={s.foot}>
          <span>記録はブラウザの中だけに保存されます。プレイ中は再読み込みやタブを閉じるのを避けてください。</span>
          <span>© 2026 Maritime B2B Simulator ／ 登場する企業・ニュースはすべて架空です</span>
        </div>
      </div>
    </div>
  );
}

# Maritime MG — 海事 B2B マーケティング経営シミュレーション

船舶用機器メーカーの経営企画として、5年間のマーケティング予算配分と船主への提案を繰り返し、資金と信頼度を伸ばす研修用ゲームです。

## ゲームルール（要点）

### 1ターン（1年）の流れ
1. **マーケティング予算の配分を確定する**（必須）。資金が足りない場合は「投資を見送る」で $0 のまま確定できます。
2. **船主の要求に提案する**（任意）。提案すると、そのターンの配分は変更できなくなります。
3. **ターンを終了する**。未回答の要求が残っている場合は確認が出て、1件ごとに信頼度ペナルティ（導入編 −10 / 実践編 −15）と、その船主との関係性の悪化が発生します。失注（−8 / −12）より重いため、負ける提案でも出したほうが傷は浅く済みます。

### 受注判定（シナジー）
- 訴求ポイントに対応するチャネル（燃費・技術 → 技術セミナー、サポート → 営業訪問、価格 → 展示会、実績 → 業界誌、納期 → デジタル）へ、**そのターンの配分の 25% 以上**を投じていれば受注します。
- 実践編では、さらに対応チャネルへ **$100,000 以上**の投資が必要です。
- 船主の重視項目は重要な順に並んでいます。**第1優先に応えると満額**、第2優先は 80%、第3優先は 60% の受注額になります（信頼度の上昇も同率で目減り）。

### 資金不足と緊急融資
決算後に資金がマイナスになると、**緊急経営判断**の画面が出ます。

- **緊急融資を受ける**：不足額 ＋ 運転資金（導入編 $100k / 実践編 $200k）を借りて次の年へ進みます。
  - 金利は決算後の信頼度で決まり、借りた時点で固定されます（80以上 5% / 60〜79 8% / 40〜59 11% / 30〜39 15% / 30未満 18%）。
  - 2回目は **+5ポイント** 上乗せされます（最大 23%）。融資を受けると信頼度が **−5** されます。
  - 翌年から毎年の決算で利息を払い、最終年に元本を一括返済します。返済後の資金がマイナスなら**債務超過**で D です。
  - 融資は**最大2回**、累計の借入は**初期資金まで**（導入編 $500k / 実践編 $400k）。枠が足りないときは運転資金を減らし、不足額そのものが枠を超えると融資を受けられません。
- **自主倒産する**：融資を受けずに、その年でゲームを終了します（D）。
- 3回目の資金不足や枠不足のときは、選択肢はなく倒産で終了します。受注できないまま赤字が続くと、遅くとも3年目の決算で終わります。
- 導入編は決算が毎年黒字で、予算も手元資金までしか使えないため、通常のプレイでは資金不足になりません（融資は実質的に実践編の仕組みです）。

### 評価
- **S**：信頼度 95 以上・最終資金が初期資金比 130% 以上・**第1優先的中率 80% 以上**（融資を受けていても対象）
- **A〜C**：資金の伸び（初期資金比、3倍で頭打ち）と信頼度の合成指標
- **D**：自主倒産・融資を受けられず倒産・最終年の債務超過
- 最終資金は、融資の元本と利息を支払った後の額で評価します。

実践編の最終レポートには、ROI・CPA などの B2B 指標に加えて、年ごとの良かった点・機会損失を説明する**年次レビュー**が表示されます。

## 開発用スクリプト

```bash
npx tsx scripts/check-edge-cases.mts  # ステートマシン・判定・レポートの検証（失敗時は終了コード 1）
npx tsx scripts/check-turns.mts       # ターン進行・予算・市場調査の検算
npx tsx scripts/sim-grades.mts        # 代表的な戦略ごとの評価（バランス調整用）
```

## 既知の課題

- **見込み引き合い件数はゲーム結果に影響しません。** 現状は CPL などの指標表示にのみ使われています。「件数より質」を体験として学べるよう、将来的に受注判定や決算へ反映することを検討しています。
- **受注額は全額が資金に入ります。** そのため好調なプレイでは資金が初期の数十倍まで伸び、評価では資金比を 3 倍で頭打ちにして調整しています（B2B 指標は粗利率 30% を仮定して算出）。
- 同梱の PDF マニュアル（`maritime_mg_manual_v3.pdf` など）は、上記の受注判定・倒産（緊急融資）・未回答ペナルティの変更前の内容です。
- ゲームの状態はブラウザのメモリ上にのみ保持され、ページを再読み込みすると初期化されます。

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

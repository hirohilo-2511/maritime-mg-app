/** 表示通貨。ゲーム内の金額はすべて USD で保持し、表示時に換算する */
export type Currency = "USD" | "JPY";

/** プロトタイプ用の固定レート */
export const JPY_PER_USD = 150;

/** 金額を USD 表記（$500,000 / -$120,000）に整形する */
export function formatUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}

/** 金額を短縮表記（$1.2M / $780K）に整形する */
export function formatUsdCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`;
  }
  return formatUsd(value);
}

/** 金額を円表記（¥75,000,000）に整形する */
function formatJpy(usd: number): string {
  const jpy = Math.round(usd * JPY_PER_USD);
  const sign = jpy < 0 ? "-" : "";
  return `${sign}¥${Math.abs(jpy).toLocaleString("en-US")}`;
}

/** 金額を円の短縮表記（¥1.2億 / ¥7,500万）に整形する */
function formatJpyCompact(usd: number): string {
  const jpy = Math.round(usd * JPY_PER_USD);
  const sign = jpy < 0 ? "-" : "";
  const abs = Math.abs(jpy);
  if (abs >= 100_000_000) {
    return `${sign}¥${(abs / 100_000_000).toFixed(1).replace(/\.0$/, "")}億`;
  }
  if (abs >= 10_000) {
    return `${sign}¥${Math.round(abs / 10_000).toLocaleString("en-US")}万`;
  }
  return formatJpy(usd);
}

/** 表示通貨に合わせて金額を整形する（入力は常に USD） */
export function formatMoney(usd: number, currency: Currency): string {
  return currency === "JPY" ? formatJpy(usd) : formatUsd(usd);
}

/** 表示通貨に合わせて金額を短縮表記で整形する */
export function formatMoneyCompact(usd: number, currency: Currency): string {
  return currency === "JPY" ? formatJpyCompact(usd) : formatUsdCompact(usd);
}

/** 符号付きで整形する（+$420,000 / -$260,000） */
export function formatMoneySigned(usd: number, currency: Currency): string {
  const formatted = formatMoney(usd, currency);
  return usd >= 0 ? `+${formatted}` : formatted;
}

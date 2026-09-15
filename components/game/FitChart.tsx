import { Icon } from "@/components/ui/Icon";
import { fitAxes, type FitScores } from "@/lib/customers";

/**
 * 船主の期待水準と自社の提供力を比較するダンベルチャート。
 * 2値 × 5項目のギャップ比較なので、レーダーではなくダンベル形式を採用している。
 * 値はすべてテキストとしても表示しているため、ホバーに依存せず読める。
 */
export function FitChart({
  expectations,
  capability,
}: {
  expectations: FitScores;
  capability: FitScores;
}) {
  return (
    <div>
      {/* 凡例（2系列以上は常に表示） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-[11px] text-navy-600">
          <span className="h-2.5 w-2.5 rounded-full bg-viz-expect" aria-hidden />
          船主の期待水準
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-navy-600">
          <span className="h-2.5 w-2.5 rounded-full bg-viz-own" aria-hidden />
          自社の提供力
        </span>
        <span className="ml-auto text-[10px] tracking-widest text-navy-400">
          0 – 100
        </span>
      </div>

      <ul className="mt-2 divide-y divide-navy-100">
        {fitAxes.map((axis) => {
          const expect = expectations[axis.id];
          const own = capability[axis.id];
          const gap = own - expect;
          const shortfall = gap <= -10;
          const met = gap >= 0;

          return (
            <li
              key={axis.id}
              className="flex items-center gap-3 py-2.5 sm:gap-4"
            >
              {/* 軸名と実数値 */}
              <div className="w-24 shrink-0 sm:w-28">
                <p className="truncate text-[12px] font-semibold text-navy-900">
                  {axis.label}
                </p>
                <p className="tabular mt-0.5 text-[11px] text-navy-400">
                  期待 {expect} · 自社 {own}
                </p>
              </div>

              {/* プロット領域 */}
              <div className="relative h-7 min-w-0 flex-1">
                {/* 目盛（ヘアライン・実線） */}
                {[0, 50, 100].map((tick) => (
                  <span
                    key={tick}
                    aria-hidden
                    className="absolute top-1 bottom-1 w-px bg-navy-100"
                    style={{ left: `${tick}%` }}
                  />
                ))}

                {/* 2点を結ぶコネクタ（2px） */}
                <span
                  aria-hidden
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-navy-200"
                  style={{
                    left: `${Math.min(expect, own)}%`,
                    width: `${Math.abs(gap)}%`,
                  }}
                />

                {/* 期待水準 */}
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-viz-expect ring-2 ring-white"
                  style={{ left: `${expect}%` }}
                  title={`${axis.label} 船主の期待水準 ${expect}`}
                />
                {/* 自社の提供力 */}
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-viz-own ring-2 ring-white"
                  style={{ left: `${own}%` }}
                  title={`${axis.label} 自社の提供力 ${own}`}
                />
              </div>

              {/* ギャップ（状態は色＋アイコン＋ラベルで示す） */}
              <div className="w-16 shrink-0 text-right">
                <p
                  className={`tabular flex items-center justify-end gap-1 text-[12px] font-bold ${
                    shortfall
                      ? "text-rose-600"
                      : met
                        ? "text-emerald-600"
                        : "text-amber-700"
                  }`}
                >
                  <Icon
                    name={met ? "trendUp" : "trendDown"}
                    className="h-3 w-3"
                  />
                  {gap > 0 ? "+" : ""}
                  {gap}
                </p>
                <p className="text-[10px] text-navy-400">
                  {shortfall ? "不足" : met ? "充足" : "やや不足"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px] leading-relaxed text-navy-400">
        ※ 「実績評価」は企業の信頼度スコアに連動します。ギャップが −10
        以下の軸は提案時の弱点になります。
      </p>
    </div>
  );
}

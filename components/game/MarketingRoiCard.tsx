"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useMoney } from "@/components/game/SettingsProvider";
import { calcRoi, marketingChannels } from "@/lib/marketing";
import type { MarketingRecord } from "@/lib/types";

/** 過去ターンのマーケティング投資対効果レポート */
export function MarketingRoiCard({ history }: { history: MarketingRecord[] }) {
  const { money, moneyCompact } = useMoney();
  // 直近のターンを上に表示する
  const rows = [...history].reverse();

  return (
    <Card>
      <CardHeader
        title="投資対効果（ROI）レポート"
        description="確定した予算とその成果の履歴"
        icon={<Icon name="trendUp" className="h-5 w-5" />}
      />

      {rows.length === 0 ? (
        <CardBody>
          <p className="rounded-lg bg-navy-50 px-3.5 py-3 text-[13px] leading-relaxed text-navy-500">
            まだ実績がありません。予算を確定してターンを終了すると、投資額・獲得引き合い件数・ROI
            がここに記録されます。
          </p>
        </CardBody>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-[13px]">
            <thead>
              <tr className="border-b border-navy-100 text-[10px] tracking-widest text-navy-400">
                <th className="px-5 py-2.5 font-semibold">ターン</th>
                <th className="px-3 py-2.5 text-right font-semibold">投資額</th>
                <th className="px-3 py-2.5 text-right font-semibold">引き合い</th>
                <th className="px-3 py-2.5 text-right font-semibold">CPA</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  同ターン売上
                </th>
                <th className="px-5 py-2.5 text-right font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {rows.map((record) => {
                const roi = calcRoi(record.revenue, record.spend);
                const cpa =
                  record.leads > 0
                    ? Math.round(record.spend / record.leads)
                    : null;
                // 投資額が最も大きかったチャネル
                const topChannel = marketingChannels
                  .map((c) => ({ name: c.name, amount: record.plan[c.id] }))
                  .sort((a, b) => b.amount - a.amount)[0];

                return (
                  <tr key={record.turn} className="hover:bg-navy-50/60">
                    <td className="px-5 py-3">
                      <p className="font-bold text-navy-900">
                        {record.turn}年目
                      </p>
                      {record.spend > 0 && topChannel.amount > 0 ? (
                        <p className="mt-0.5 text-[11px] text-navy-400">
                          主軸: {topChannel.name}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-navy-400">
                          投資なし
                        </p>
                      )}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-navy-700">
                      {money(record.spend)}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-navy-700">
                      {record.leads}件
                    </td>
                    <td className="tabular px-3 py-3 text-right text-navy-700">
                      {cpa !== null ? money(cpa) : "—"}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-navy-700">
                      {moneyCompact(record.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {roi !== null ? (
                        <span
                          className={`tabular font-bold ${
                            roi >= 1 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {roi.toFixed(1)}倍
                        </span>
                      ) : (
                        <span className="text-navy-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-navy-100 px-5 py-3 text-[11px] leading-relaxed text-navy-400">
            ※ ROI
            は同ターンに計上された売上全体を投資額で割った簡易指標です（プロトタイプのダミー算定）。
          </p>
        </div>
      )}
    </Card>
  );
}

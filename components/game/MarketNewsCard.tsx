import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { MarketNews, NewsImpact } from "@/lib/types";

const impactStyle: Record<
  NewsImpact,
  { label: string; tone: BadgeTone; icon: IconName }
> = {
  positive: { label: "好影響", tone: "positive", icon: "trendUp" },
  negative: { label: "悪影響", tone: "negative", icon: "trendDown" },
  neutral: { label: "中立", tone: "neutral", icon: "minus" },
};

export function MarketNewsCard({ news }: { news: MarketNews[] }) {
  return (
    <Card>
      <CardHeader
        title="マーケットニュース"
        description="今ターンに市場で起きた出来事"
        icon={<Icon name="research" className="h-5 w-5" />}
        action={
          <Button variant="ghost" size="sm">
            すべて見る
          </Button>
        }
      />
      <ul className="divide-y divide-navy-100">
        {news.map((item) => {
          const impact = impactStyle[item.impact];
          return (
            <li
              key={item.id}
              className="px-5 py-4 transition-colors hover:bg-navy-50/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{item.source}</Badge>
                <Badge>{item.category}</Badge>
                <Badge tone={impact.tone}>
                  <Icon name={impact.icon} className="h-3 w-3" />
                  {impact.label}
                </Badge>
                <span className="ml-auto text-[11px] text-navy-400 tabular">
                  {item.date}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-navy-900">
                {item.headline}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-navy-500">
                {item.summary}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

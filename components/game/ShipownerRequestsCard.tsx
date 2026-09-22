"use client";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProposalAction } from "@/components/game/ProposalAction";
import { useMoney } from "@/components/game/SettingsProvider";
import type { RequestStatus, ShipownerRequest } from "@/lib/types";

const statusStyle: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  new: { label: "新規", tone: "info" },
  in_review: { label: "検討中", tone: "warning" },
  negotiating: { label: "交渉中", tone: "positive" },
};

export function ShipownerRequestsCard({
  requests,
}: {
  requests: ShipownerRequest[];
}) {
  const { moneyCompact } = useMoney();

  return (
    <Card>
      <CardHeader
        title="現在の船主の要求"
        description={`対応待ち ${requests.length} 件`}
        icon={<Icon name="anchor" className="h-5 w-5" />}
        action={
          <Button variant="ghost" size="sm">
            案件一覧
          </Button>
        }
      />
      <ul className="divide-y divide-navy-100">
        {requests.map((req) => {
          const status = statusStyle[req.status];
          return (
            <li key={req.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-navy-900">
                      {req.owner}
                    </h3>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-navy-400">
                    {req.region}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-base leading-none font-bold text-navy-900">
                    {moneyCompact(req.budget)}
                  </p>
                  <p className="mt-1 text-[11px] text-navy-400">想定予算</p>
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 rounded-lg bg-navy-50/80 px-3 py-2.5 text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11px] font-semibold tracking-wide text-navy-400">
                    対象船
                  </dt>
                  <dd className="text-navy-700">{req.vesselType}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11px] font-semibold tracking-wide text-navy-400">
                    要求内容
                  </dt>
                  <dd className="leading-relaxed text-navy-700">
                    {req.requirement}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-[11px] font-semibold tracking-wide text-navy-400">
                    回答期限
                  </dt>
                  <dd className="text-navy-700 tabular">{req.deadline}</dd>
                </div>
              </dl>

              {/*
                チップ群とアクションボタンを別の flex 子にすることで、
                狭いカラムではボタンが潰れずに次の行へ回り込む。
              */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold whitespace-nowrap text-navy-400">
                    重視される要素:
                  </span>
                  {req.priorities.map((p) => (
                    <Badge key={p}>{p}</Badge>
                  ))}
                </div>
                <div className="ml-auto">
                  <ProposalAction request={req} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { FinalReport } from "@/components/game/FinalReport";
import { useGame } from "@/components/game/GameProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function FinalReportPage() {
  const { state } = useGame();

  if (!state.gameCompleted) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Icon name="alert" className="mx-auto h-8 w-8 text-navy-400" />
        <h1 className="mt-3 text-lg font-bold text-navy-900">
          まだ総合フィードバックはありません
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">
          最終ターンを終了すると、ここに5年間の総合フィードバックが表示されます。
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="mt-5">
            ダッシュボードに戻る
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return <FinalReport />;
}

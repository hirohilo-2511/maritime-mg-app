"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProposalModal } from "@/components/game/ProposalModal";
import { useGame } from "@/components/game/GameProvider";
import type { ShipownerRequest } from "@/lib/types";

/**
 * 船主要求 1 件に対する「提案を作成」ボタン。
 * マーケティング予算の確定前は非活性にし、完了後は状態を表示する。
 */
export function ProposalAction({ request }: { request: ShipownerRequest }) {
  const { canCreateProposal, isProposalCompleted } = useGame();
  const [open, setOpen] = useState(false);
  const completed = isProposalCompleted(request.id);

  return (
    <>
      {completed ? (
        <Badge tone="positive" className="h-8 px-3">
          <Icon name="check" className="h-3.5 w-3.5" />
          提案済み
        </Badge>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onClick={() => setOpen(true)}
          disabled={!canCreateProposal}
          title={
            canCreateProposal
              ? undefined
              : "先にマーケティング予算を確定してください"
          }
          aria-label={`${request.owner} への提案を作成`}
        >
          提案を作成
          <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </Button>
      )}

      {open ? (
        <ProposalModal request={request} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

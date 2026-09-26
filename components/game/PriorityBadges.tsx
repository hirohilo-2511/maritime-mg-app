"use client";

import { Badge } from "@/components/ui/Badge";
import { useGame } from "@/components/game/GameProvider";
import { displayedPriorities } from "@/lib/customers";

/**
 * 船主要求の重視項目のバッジ列。
 * 重視順が分かる場合は「第1優先」を強調し、分からない場合（実践編で未調査）は順不同で並べる。
 */
export function PriorityBadges({
  owner,
  priorities,
}: {
  owner: string;
  priorities: string[];
}) {
  const { state } = useGame();
  const { items, ordered } = displayedPriorities(state, owner, priorities);

  return (
    <>
      {items.map((p, rank) => (
        <Badge key={p} tone={ordered && rank === 0 ? "info" : "neutral"}>
          {ordered && rank === 0 ? `① ${p}` : p}
        </Badge>
      ))}
      {!ordered ? (
        <span
          className="text-[10px] text-navy-400"
          title="関係する市場調査を購入すると、重視順（第1優先）が分かります"
        >
          （順不同・市場調査で重視順が分かります）
        </span>
      ) : null}
    </>
  );
}

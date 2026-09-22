"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useGame } from "@/components/game/GameProvider";
import { useMoney } from "@/components/game/SettingsProvider";
import type { ShipownerRequest } from "@/lib/types";

/**
 * 船主要求 1 件に対する提案作成モーダル。
 * 重視される要素から訴求ポイントを選ばせ、提案を「完了」状態にする。
 */
export function ProposalModal({
  request,
  onClose,
}: {
  request: ShipownerRequest;
  onClose: () => void;
}) {
  const { completeProposal } = useGame();
  const { money } = useMoney();
  const [focus, setFocus] = useState<string>(request.priorities[0] ?? "");
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    confirmRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    completeProposal(request.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="bg-navy-900 px-6 py-5 text-white">
          <p className="text-[10px] font-semibold tracking-widest text-navy-400">
            PROPOSAL
          </p>
          <h2 id="proposal-modal-title" className="mt-1 text-xl font-bold">
            {request.owner} への提案
          </h2>
          <p className="mt-1 text-sm text-navy-300">{request.vesselType}</p>
        </div>

        <div className="px-6 py-4">
          <p className="rounded-lg bg-navy-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-navy-600">
            {request.requirement}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="tabular text-[13px] font-bold text-navy-900">
              {money(request.budget)}
            </span>
            <span className="text-[11px] text-navy-400">想定予算</span>
          </div>

          <p className="mt-4 text-[10px] font-semibold tracking-widest text-navy-400">
            提案の訴求ポイント
          </p>
          <p className="mt-1 text-[12px] text-navy-500">
            重視される要素のうち、最も強く訴求するポイントを選んでください。
          </p>
          <div className="mt-2.5 space-y-2">
            {request.priorities.map((p) => (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                  focus === p
                    ? "border-navy-800 bg-navy-50"
                    : "border-navy-200/70 hover:bg-navy-50/60"
                }`}
              >
                <input
                  type="radio"
                  name="proposal-focus"
                  value={p}
                  checked={focus === p}
                  onChange={() => setFocus(p)}
                  className="h-4 w-4 accent-navy-800"
                />
                <span className="font-medium text-navy-800">{p}</span>
                <Badge className="ml-auto">重視項目</Badge>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 border-t border-navy-100 px-6 py-4">
          <Button variant="secondary" size="lg" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            ref={confirmRef}
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!focus}
          >
            この内容で提案を確定する
            <Icon name="check" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "info"
  | "positive"
  | "negative"
  | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-navy-100 text-navy-600 ring-navy-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  negative: "bg-rose-50 text-rose-700 ring-rose-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

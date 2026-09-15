import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/** ヘッダーのゲーム状況インジケーター 1 枚 */
export function StatPill({
  icon,
  label,
  value,
  unit,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  /** 値の下に置く補助表示（プログレスバーなど） */
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-navy-200/70 bg-navy-50/60 px-3.5 py-2.5 sm:min-w-[10.5rem] sm:flex-none">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-navy-400">
        <Icon name={icon} className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="tabular text-xl leading-none font-bold text-navy-900">
          {value}
        </span>
        {unit ? (
          <span className="text-xs font-medium text-navy-400">{unit}</span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

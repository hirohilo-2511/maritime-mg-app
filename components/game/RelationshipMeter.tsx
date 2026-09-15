/**
 * 関係性スコアのメーター。
 * 塗りが状態（良好 / 標準 / 要注意）を表し、トラックは同系の淡い step を使う。
 */
export function RelationshipMeter({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const level =
    score >= 70
      ? { fill: "bg-emerald-600", track: "bg-emerald-100", label: "良好" }
      : score >= 45
        ? { fill: "bg-sea-600", track: "bg-sky-100", label: "標準" }
        : { fill: "bg-amber-500", track: "bg-amber-100", label: "要注意" };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`font-semibold text-navy-400 ${
            size === "sm" ? "text-[10px]" : "text-[10px] tracking-widest"
          }`}
        >
          関係性スコア
        </p>
        <p className="tabular text-[11px] font-bold text-navy-900">
          {score} / 100
          <span className="ml-1.5 font-semibold text-navy-400">
            {level.label}
          </span>
        </p>
      </div>
      <div
        className={`mt-1 w-full overflow-hidden rounded-full ${level.track} ${
          size === "sm" ? "h-1.5" : "h-2"
        }`}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="関係性スコア"
      >
        <div
          className={`h-full rounded-full ${level.fill}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

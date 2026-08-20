/** Thin colored progress track shared by dashboard stat/summary cards. */
export function ProgressBar({ value, color, className }: { value: number; color: string; className?: string }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className ?? ""}`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** Status color for a percentage-style metric against a single "critical
 * below this" threshold (e.g. compliance rate). */
export function getThresholdColor(value: number, criticalBelow: number): string {
  return value < criticalBelow ? "var(--status-critical)" : "var(--status-good)";
}

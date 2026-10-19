import { Badge } from "@/components/ui/badge";
import { type CoverageSummary, PACE_LABELS, type Pace } from "@/lib/coverage";
import { cn } from "@/lib/utils";

const PACE_VARIANT: Record<Pace, "success" | "info" | "warning"> = {
  ahead: "success",
  "on-track": "info",
  behind: "warning",
};

export function PaceBadge({ pace }: { pace: Pace | null }) {
  if (!pace) return null;
  return <Badge variant={PACE_VARIANT[pace]}>{PACE_LABELS[pace]}</Badge>;
}

/** A plain bar (no script) with a tick where the class should be by today. */
export function CoverageBar({
  percent,
  expected,
  label,
  className,
}: {
  percent: number;
  expected?: number | null;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("relative h-2 w-full rounded-md bg-muted", className)}
    >
      <div
        className="h-full rounded-md bg-primary"
        style={{ width: `${percent}%` }}
      />
      {expected != null && expected > 0 && (
        <div
          aria-hidden
          className="absolute -top-1 h-4 w-0.5 bg-foreground"
          style={{ left: `calc(${Math.min(100, expected)}% - 1px)` }}
        />
      )}
    </div>
  );
}

/** "12 of 40 sub-strands covered · 3 in progress" */
export function coverageLine(s: CoverageSummary) {
  return [
    `${s.covered} of ${s.subStrands} sub-strand${s.subStrands === 1 ? "" : "s"} covered`,
    s.inProgress > 0 && `${s.inProgress} in progress`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "By today you'd expect about 55%." */
export function expectedLine(s: CoverageSummary) {
  return s.expected === null
    ? "Add your term dates under Me to see whether you're on track."
    : `By today you'd expect about ${s.expected}%. The line on the bar marks it.`;
}

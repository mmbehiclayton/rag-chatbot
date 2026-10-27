import { ChevronRight } from "lucide-react";
import Link from "next/link";
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
  if (s.expected !== null && s.expected >= 100)
    return "The school year is over. This is what your classes covered.";
  return s.expected === null
    ? "Add your term dates under Profile to see whether you're on track."
    : `By today you'd expect about ${s.expected}%. The line on the bar marks it.`;
}

/** The big number at the top of a coverage page. */
export function SummaryCard({
  title,
  summary,
  children,
}: {
  title?: string;
  summary: CoverageSummary;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && (
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
          )}
          <p className="text-2xl font-semibold">{summary.percent}%</p>
        </div>
        <PaceBadge pace={summary.pace} />
      </div>
      <CoverageBar
        percent={summary.percent}
        expected={summary.expected}
        label={title ? `Coverage of ${title}` : "Coverage"}
      />
      <p className="text-sm">{coverageLine(summary)}</p>
      <p className="text-xs text-muted-foreground">{expectedLine(summary)}</p>
      {children}
    </section>
  );
}

export type CoverageRowItem = {
  href: string;
  label: string;
  summary: CoverageSummary;
  /** False when there is no design or scheme to measure against. */
  tracked: boolean;
  /** Extra line under the counts, e.g. "3 of 7 learning areas tracked". */
  note?: string;
};

/** Tappable cards with a bar each: classes on the overview, learning areas on a class. */
export function CoverageList({
  rows,
  untracked,
}: {
  rows: CoverageRowItem[];
  untracked: string;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.href}>
          <Link
            href={r.href}
            className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
          >
            <span className="min-w-0 flex-1 space-y-2">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-base font-semibold">
                  {r.label}
                </span>
                <span className="shrink-0 text-base font-semibold">
                  {r.tracked ? `${r.summary.percent}%` : "–"}
                </span>
              </span>
              {r.tracked && (
                <CoverageBar
                  percent={r.summary.percent}
                  expected={r.summary.expected}
                  label={`Coverage of ${r.label}`}
                />
              )}
              <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{r.tracked ? coverageLine(r.summary) : untracked}</span>
                <PaceBadge pace={r.summary.pace} />
              </span>
              {r.note && (
                <span className="block text-xs text-muted-foreground">
                  {r.note}
                </span>
              )}
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

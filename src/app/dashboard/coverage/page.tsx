import { ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CoverageBar,
  coverageLine,
  expectedLine,
  PaceBadge,
} from "@/components/coverage/coverage-parts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getCoverage } from "@/lib/coverage-data";

/** Every class's syllabus coverage this school year, and the total across them. */
export default async function CoveragePage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const { year, classes, summary } = await getCoverage(session.userId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Syllabus coverage"
        description={`How much of each curriculum design you have covered in ${year}. Lessons you mark as taught count on their own, and you can mark any sub-strand yourself.`}
      />

      {classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Add the grades and learning areas you teach, then come back to track coverage."
          action={
            <Button
              className="h-11"
              render={<Link href="/dashboard/profile" />}
            >
              Add my classes
            </Button>
          }
        />
      ) : (
        <>
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">
                  All my classes
                </h2>
                <p className="text-2xl font-semibold">{summary.percent}%</p>
              </div>
              <PaceBadge pace={summary.pace} />
            </div>
            <CoverageBar
              percent={summary.percent}
              expected={summary.expected}
              label="Coverage across all my classes"
            />
            <p className="text-sm">{coverageLine(summary)}</p>
            <p className="text-xs text-muted-foreground">
              {expectedLine(summary)}
            </p>
          </section>

          <ul className="divide-y rounded-xl border bg-card">
            {classes.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.label}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {c.source ? `${c.summary.percent}%` : "–"}
                      </span>
                    </span>
                    {c.source && (
                      <CoverageBar
                        percent={c.summary.percent}
                        expected={c.summary.expected}
                        label={`Coverage of ${c.label}`}
                      />
                    )}
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.source
                        ? coverageLine(c.summary)
                        : "No curriculum design or scheme of work yet"}
                      <PaceBadge pace={c.summary.pace} />
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

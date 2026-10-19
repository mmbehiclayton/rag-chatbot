import { ArrowLeft, CalendarRange, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CoverageList,
  SummaryCard,
} from "@/components/coverage/coverage-parts";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { createHref } from "@/lib/classes";
import { getCoverage } from "@/lib/coverage-data";
import { cn } from "@/lib/utils";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** One class's coverage: the total, then each learning area the teacher teaches in it. */
export default async function ClassCoveragePage({
  params,
  searchParams,
}: {
  params: Promise<{ grade: string }>;
  searchParams: Promise<{ stream?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const grade = decode((await params).grade);
  const { stream } = await searchParams;

  const { year, groups } = await getCoverage(session.userId, { grade });
  const group = groups.find((g) => g.stream === (stream ?? "")) ?? groups[0];
  if (!group) redirect("/dashboard/coverage");
  const tracked = group.areas.filter((a) => a.source !== null);
  const untracked = group.areas.filter((a) => a.source === null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-11"
        render={<Link href="/dashboard/coverage" />}
      >
        <ArrowLeft /> All my classes
      </Button>

      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{group.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Syllabus coverage for {year}, across the learning areas you teach in
          this class.
        </p>
      </div>

      {groups.length > 1 && (
        <nav
          aria-label="Stream"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {groups.map((g) => (
            <Link
              key={g.stream}
              href={g.href}
              aria-current={g.stream === group.stream ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium whitespace-nowrap",
                g.stream === group.stream
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {g.label}
            </Link>
          ))}
        </nav>
      )}

      {tracked.length > 0 && (
        <SummaryCard title="Whole class" summary={group.summary}>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            {tracked.length} of {group.areas.length} learning area
            {group.areas.length === 1 ? "" : "s"} tracked
          </p>
        </SummaryCard>
      )}

      {tracked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Learning areas</h2>
          <CoverageList
            untracked=""
            rows={tracked.map((a) => ({
              href: a.href,
              label: a.subject,
              summary: a.summary,
              tracked: true,
              note:
                a.source === "schemes"
                  ? "From your schemes of work: the design isn't in Elimu yet"
                  : undefined,
            }))}
          />
        </section>
      )}

      {untracked.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Not tracked yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The curriculum design for these isn't in Elimu yet. Make a scheme
              of work and its sub-strands will be tracked here.
            </p>
          </div>
          <ul className="space-y-2">
            {untracked.map((a) => (
              <li key={a.href}>
                <Link
                  href={createHref("scheme", a.grade, a.subject)}
                  className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {a.subject}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <CalendarRange className="size-3.5" aria-hidden /> Make a
                      scheme of work
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
        </section>
      )}
    </div>
  );
}

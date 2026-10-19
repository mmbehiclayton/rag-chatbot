import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CoverageList,
  SummaryCard,
} from "@/components/coverage/coverage-parts";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
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

      <SummaryCard title={group.label} summary={group.summary} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Learning areas</h2>
        <CoverageList
          untracked="No curriculum design or scheme of work yet"
          rows={group.areas.map((a) => ({
            href: a.href,
            label: a.subject,
            summary: a.summary,
            tracked: a.source !== null,
            note:
              a.source === "schemes"
                ? "From your schemes of work: the design isn't in Elimu yet"
                : undefined,
          }))}
        />
      </section>
    </div>
  );
}

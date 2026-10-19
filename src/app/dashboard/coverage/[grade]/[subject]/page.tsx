import { ArrowLeft, BookMarked, CalendarRange, Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoverageControl } from "@/components/coverage/coverage-control";
import { SummaryCard } from "@/components/coverage/coverage-parts";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref, createHref, designHref } from "@/lib/classes";
import {
  COVERAGE_LABELS,
  coverageGradeHref,
  coverageHref,
} from "@/lib/coverage";
import { getCoverage } from "@/lib/coverage-data";
import { streamLabel } from "@/lib/term-pack";
import { cn } from "@/lib/utils";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const TERMS = ["1", "2", "3"] as const;

function Tab({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium whitespace-nowrap",
        current
          ? "border-primary bg-accent text-accent-foreground"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/** One learning area's sub-strands by term, each with a tap to mark how far the class has got. */
export default async function ClassCoveragePage({
  params,
  searchParams,
}: {
  params: Promise<{ grade: string; subject: string }>;
  searchParams: Promise<{ stream?: string; term?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const { grade: g, subject: s } = await params;
  const grade = decode(g);
  const subject = decode(s);
  const { stream: streamParam, term: termParam } = await searchParams;

  const { year, currentTerm, classes } = await getCoverage(session.userId, {
    grade,
    subject,
  });
  const cls =
    classes.find((c) => c.stream === (streamParam ?? "")) ?? classes[0];
  if (!cls) redirect("/dashboard/coverage");

  const term =
    termParam === "all"
      ? null
      : (TERMS.find((t) => t === termParam) ??
        (currentTerm ? String(currentTerm) : null));
  const items = term
    ? cls.items.filter((i) => i.term === Number(term))
    : cls.items;
  const strands = [...new Set(items.map((i) => i.strand))].map((strand) => ({
    strand,
    items: items.filter((i) => i.strand === strand),
  }));
  const href = (t: string | null) => {
    const q = new URLSearchParams();
    if (cls.stream) q.set("stream", cls.stream);
    q.set("term", t ?? "all");
    return `${coverageHref(grade, subject)}?${q}`;
  };
  const { summary } = cls;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-11"
        render={<Link href={coverageGradeHref(grade, cls.stream)} />}
      >
        <ArrowLeft /> {streamLabel(grade, cls.stream)}
      </Button>

      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">{cls.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Syllabus coverage for {year}.
        </p>
      </div>

      {classes.length > 1 && (
        <nav
          aria-label="Stream"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        >
          {classes.map((c) => (
            <Tab key={c.stream} href={c.href} current={c.stream === cls.stream}>
              {streamLabel(grade, c.stream)}
            </Tab>
          ))}
        </nav>
      )}

      {!cls.source ? (
        <EmptyState
          icon={BookMarked}
          title="Nothing to track yet"
          description="The curriculum design for this class isn't in Elimu yet. Make a scheme of work and its sub-strands will show here."
          action={
            <Button
              className="h-11"
              render={<Link href={createHref("scheme", grade, subject)} />}
            >
              <CalendarRange /> Make a scheme of work
            </Button>
          }
        />
      ) : (
        <>
          <SummaryCard summary={summary}>
            <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
              {summary.terms.map((t) => (
                <div key={t.term}>
                  <dt className="text-xs text-muted-foreground">
                    Term {t.term}
                  </dt>
                  <dd className="text-base font-semibold">
                    {t.subStrands ? `${t.percent}%` : "–"}
                  </dd>
                </div>
              ))}
            </dl>
          </SummaryCard>

          {cls.source === "schemes" && (
            <p className="flex gap-2 rounded-xl border bg-card p-3 text-sm">
              <Info
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
              />
              <span>
                The curriculum design for this class isn't in Elimu yet, so this
                list comes from your schemes of work. It may not be the whole
                year's syllabus.
              </span>
            </p>
          )}

          <nav
            aria-label="Term"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {TERMS.map((t) => (
              <Tab key={t} href={href(t)} current={t === term}>
                Term {t}
              </Tab>
            ))}
            <Tab href={href(null)} current={term === null}>
              Whole year
            </Tab>
          </nav>

          {strands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sub-strands fall in this term.
            </p>
          ) : (
            <div className="space-y-4">
              {strands.map(({ strand, items }) => (
                <section key={strand} className="space-y-2">
                  <h2 className="text-base font-semibold">{strand}</h2>
                  <ul className="divide-y rounded-xl border bg-card">
                    {items.map((i) => (
                      <li
                        key={`${cls.stream}|${i.strand}|${i.name}`}
                        className="space-y-3 px-4 py-3 sm:flex sm:items-start sm:gap-4 sm:space-y-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {i.number && `${i.number} `}
                            {i.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              `${i.lessons} lesson${i.lessons === 1 ? "" : "s"}`,
                              term === null && `Term ${i.term}`,
                              i.planned > 0 &&
                                `${i.taught} of ${i.planned} taught in your record of work`,
                              i.manual &&
                                i.auto &&
                                i.manual !== i.auto &&
                                `record says ${COVERAGE_LABELS[i.auto].toLowerCase()}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="sm:w-72 sm:shrink-0">
                          <CoverageControl
                            grade={grade}
                            subject={subject}
                            stream={cls.stream}
                            strand={i.strand}
                            subStrand={i.name}
                            status={i.status}
                            manual={i.manual !== null}
                            auto={i.auto}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            A sub-strand counts as covered when every lesson for it in your
            scheme is marked taught, or when you mark it yourself. Progress is
            weighted by the suggested lessons in the design.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11"
              render={<Link href={classHref(grade, subject)} />}
            >
              Open this class
            </Button>
            {cls.source === "design" && (
              <Button
                variant="outline"
                className="h-11"
                render={<Link href={designHref(grade, subject)} />}
              >
                <BookMarked /> Read the curriculum design
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

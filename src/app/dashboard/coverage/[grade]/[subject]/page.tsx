import {
  ArrowLeft,
  BookMarked,
  CalendarRange,
  ChevronRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoverageBar, SummaryCard } from "@/components/coverage/coverage-parts";
import { SubStrandPanel } from "@/components/coverage/sub-strand-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref, createHref, designHref } from "@/lib/classes";
import {
  type CoverageItem,
  coverageGradeHref,
  coverageHref,
  shortDate,
  summarise,
} from "@/lib/coverage";
import { getCoverage } from "@/lib/coverage-data";
import { streamLabel, todayInKenya } from "@/lib/term-pack";
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

function ItemBadge({ item }: { item: CoverageItem }) {
  if (item.status === "COVERED")
    return (
      <Badge variant="success">
        {item.doneOn ? `Covered ${shortDate(item.doneOn)}` : "Covered"}
      </Badge>
    );
  if (item.status === "IN_PROGRESS")
    return <Badge variant="info">In progress</Badge>;
  return <Badge variant="secondary">Not started</Badge>;
}

const summaryRow =
  "flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden";

/** One learning area: its strands, each opening to sub-strands whose lessons the teacher ticks off. */
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
  const today = todayInKenya();
  const strands = [...new Set(items.map((i) => i.strand))].map((strand) => {
    const list = items.filter((i) => i.strand === strand);
    return {
      strand,
      items: list,
      covered: list.filter((i) => i.status === "COVERED").length,
      percent: summarise(list, [], today).percent,
    };
  });
  // Open where the class has got to: the first strand, and sub-strand, not yet covered.
  const nextStrand = strands.find((st) => st.covered < st.items.length);
  const nextItem = nextStrand?.items.find((i) => i.status !== "COVERED");
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
            <div className="space-y-3">
              {strands.map((st) => (
                <details
                  key={`${cls.stream}|${st.strand}`}
                  open={st === nextStrand}
                  className="group/strand rounded-xl border bg-card"
                >
                  <summary className={cn(summaryRow, "px-4 py-3")}>
                    <span className="min-w-0 flex-1 space-y-1.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold">
                          {st.strand}
                        </span>
                        <span className="shrink-0 text-sm font-semibold">
                          {st.percent}%
                        </span>
                      </span>
                      <CoverageBar
                        percent={st.percent}
                        label={`Coverage of ${st.strand}`}
                      />
                      <span className="block text-xs text-muted-foreground">
                        {st.covered} of {st.items.length} sub-strand
                        {st.items.length === 1 ? "" : "s"} covered
                      </span>
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open/strand:rotate-90"
                      aria-hidden
                    />
                  </summary>
                  <ul className="divide-y border-t">
                    {st.items.map((i) => (
                      <li key={`${cls.stream}|${i.strand}|${i.name}`}>
                        <details open={i === nextItem} className="group/sub">
                          <summary className={cn(summaryRow, "px-4 py-2")}>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium">
                                {i.number && `${i.number} `}
                                {i.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {[
                                  `${i.ticks.length} of ${i.lessons} lesson${i.lessons === 1 ? "" : "s"} done`,
                                  term === null && `Term ${i.term}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <ItemBadge item={i} />
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground transition-transform group-open/sub:rotate-90"
                              aria-hidden
                            />
                          </summary>
                          <div className="px-4 pt-1 pb-4">
                            <SubStrandPanel
                              // A fresh panel once the server has the saved ticks.
                              key={`${i.status}|${i.coveredOn}|${i.ticks.map((t) => `${t.lesson}${t.source}${t.on}`).join(",")}`}
                              grade={grade}
                              subject={subject}
                              stream={cls.stream}
                              strand={i.strand}
                              subStrand={i.name}
                              lessons={i.lessons}
                              titles={i.titles}
                              ticks={i.ticks}
                              confirmed={i.coveredOn !== null}
                              today={today}
                              planHref={`${createHref("lesson", grade, subject)}&${new URLSearchParams({ topic: i.name })}`}
                            />
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tick lessons as you teach them, or mark a whole sub-strand covered.
            Lessons marked taught on your record of work count on their own.
            Progress is weighted by the suggested lessons in the design.
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

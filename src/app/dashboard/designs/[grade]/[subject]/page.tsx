import { ArrowLeft, CalendarRange, NotebookPen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WhatsAppShare } from "@/components/shared/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { createHref } from "@/lib/classes";
import {
  getPublishedMap,
  MAP_STATUS,
  subStrandsForTerm,
} from "@/lib/curriculum-map";
import { db, withDbRetry } from "@/lib/db";
import { publicDesignHref } from "@/lib/public-designs";
import { siteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const TERMS = ["1", "2", "3"] as const;

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** One learning area's design: strands, sub-strands and outcomes, each with a way to start planning. */
export default async function DesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ grade: string; subject: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const { grade: g, subject: s } = await params;
  const grade = decode(g);
  const subject = decode(s);
  const { term: termParam } = await searchParams;
  const term = TERMS.find((t) => t === termParam) ?? null;

  const [map, meta] = await Promise.all([
    getPublishedMap(grade, subject),
    withDbRetry(() =>
      db.curriculumMap.findFirst({
        where: { grade, subject, status: MAP_STATUS.PUBLISHED },
        select: { lessonsPerWeek: true, publishedAt: true },
      }),
    ),
  ]);
  if (!map) notFound();

  const inTerm = term
    ? new Set(
        subStrandsForTerm(map, `Term ${term}`).map(
          (u) => `${u.strand}|${u.name}`,
        ),
      )
    : null;
  const strands = map.strands
    .map((strand, si) => ({
      ...strand,
      number: si + 1,
      subStrands: strand.subStrands
        .map((sub, ui) => ({ ...sub, number: `${si + 1}.${ui + 1}` }))
        .filter((sub) => !inTerm || inTerm.has(`${strand.name}|${sub.name}`)),
    }))
    .filter((strand) => strand.subStrands.length > 0);

  const all = map.strands.flatMap((x) => x.subStrands);
  const lessons = all.reduce((n, u) => n + u.lessons, 0);
  const perWeek = meta?.lessonsPerWeek ?? null;
  const base = `/dashboard/designs/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
  const lessonHref = (topic: string) =>
    `/dashboard/create/lesson?${new URLSearchParams({ grade, subject, topic })}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-11"
        render={<Link href="/dashboard/designs" />}
      >
        <ArrowLeft /> All designs
      </Button>

      <PageHeader
        title={`${grade} ${subject}`}
        description={
          meta?.publishedAt
            ? `Checked by two teachers on ${meta.publishedAt.toLocaleDateString(
                "en-KE",
                { day: "numeric", month: "long", year: "numeric" },
              )}. Always confirm details against the official KICD design.`
            : "Checked by two teachers. Always confirm details against the official KICD design."
        }
      />

      <dl className="grid grid-cols-3 gap-3 rounded-xl border bg-card p-4 text-center">
        <div>
          <dt className="text-xs text-muted-foreground">Sub-strands</dt>
          <dd className="text-lg font-semibold">{all.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Suggested lessons</dt>
          <dd className="text-lg font-semibold">{lessons}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Lessons a week</dt>
          <dd className="text-lg font-semibold">{perWeek ?? "–"}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="sm:flex-1"
          render={<Link href={createHref("scheme", grade, subject)} />}
        >
          <CalendarRange /> Make my scheme of work
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="sm:flex-1"
          render={<Link href={createHref("lesson", grade, subject)} />}
        >
          <NotebookPen /> Plan a lesson
        </Button>
      </div>

      <WhatsAppShare
        url={`${siteUrl()}${publicDesignHref(grade, subject)}`}
        text={`${grade} ${subject} curriculum design on Elimu:`}
      />

      <nav aria-label="Term" className="flex gap-2 overflow-x-auto pb-1">
        {[null, ...TERMS].map((t) => (
          <Link
            key={t ?? "all"}
            href={t ? `${base}?term=${t}` : base}
            aria-current={t === term ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium",
              t === term
                ? "border-primary bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t ? `Term ${t}` : "Whole year"}
          </Link>
        ))}
      </nav>
      {term && (
        <p className="-mt-4 text-xs text-muted-foreground">
          Where the design doesn't name a term, Elimu splits the sub-strands
          evenly across the year in design order.
        </p>
      )}

      <div className="space-y-4">
        {strands.map((strand) => (
          <section key={strand.name} className="space-y-2">
            <h2 className="text-base font-semibold">
              {strand.number}.0 {strand.name}
            </h2>
            <ul className="divide-y rounded-xl border bg-card">
              {strand.subStrands.map((sub) => (
                <li key={sub.number}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-3 px-4 py-3 hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {sub.number} {sub.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {sub.lessons} lesson{sub.lessons === 1 ? "" : "s"}
                          {sub.outcomes.length
                            ? ` · ${sub.outcomes.length} outcome${sub.outcomes.length === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </span>
                      {sub.term && (
                        <Badge variant="info">Term {sub.term}</Badge>
                      )}
                      <span
                        className="text-xs text-primary group-open:hidden"
                        aria-hidden
                      >
                        Show
                      </span>
                      <span
                        className="hidden text-xs text-primary group-open:inline"
                        aria-hidden
                      >
                        Hide
                      </span>
                    </summary>
                    <div className="space-y-4 border-t px-4 py-4">
                      <List
                        title="By the end of the sub-strand, the learner should be able to:"
                        items={sub.outcomes}
                      />
                      <List
                        title="Key inquiry questions"
                        items={sub.inquiryQuestions}
                      />
                      <List
                        title="Suggested learning experiences"
                        items={sub.learningExperiences}
                      />
                      <Button
                        className="h-11 w-full sm:w-auto"
                        render={<Link href={lessonHref(sub.name)} />}
                      >
                        <NotebookPen /> Plan a lesson on this
                      </Button>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

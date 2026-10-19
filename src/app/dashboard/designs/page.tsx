import { BookOpen, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionTitle } from "@/components/shared/link-list";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { designHref } from "@/lib/classes";
import { MAP_STATUS } from "@/lib/curriculum-map";
import { getGradeOptions, getTeachingProfile } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { cn } from "@/lib/utils";

const PILOT_LEVEL = "Junior Secondary";

type Summary = { strands: number; subStrands: number; perWeek: number | null };

function summary(s: Summary) {
  return [
    `${s.strands} strand${s.strands === 1 ? "" : "s"}`,
    `${s.subStrands} sub-strand${s.subStrands === 1 ? "" : "s"}`,
    s.perWeek ? `${s.perWeek} lessons a week` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Curriculum designs by section and grade. Only designs a second curator has checked can be opened. */
export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const { level: levelParam, q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [grades, profile, maps] = await Promise.all([
    getGradeOptions(),
    getTeachingProfile(session.userId),
    withDbRetry(() =>
      db.curriculumMap.findMany({
        where: { status: MAP_STATUS.PUBLISHED },
        select: {
          grade: true,
          subject: true,
          lessonsPerWeek: true,
          strands: { select: { _count: { select: { subStrands: true } } } },
        },
      }),
    ),
  ]);

  const ready = new Map<string, Summary>(
    maps
      .filter((m) => m.strands.some((s) => s._count.subStrands > 0))
      .map((m) => [
        `${m.grade}|${m.subject}`,
        {
          strands: m.strands.length,
          subStrands: m.strands.reduce((n, s) => n + s._count.subStrands, 0),
          perWeek: m.lessonsPerWeek,
        },
      ]),
  );

  const myGrades = profile?.gradesTaught ?? [];
  const mySubjects = profile?.subjectsTaught ?? [];
  const levels = [...new Set(grades.map((g) => g.level))];
  const myLevel = grades.find((g) => myGrades.includes(g.name))?.level;
  const level =
    levelParam && levels.includes(levelParam)
      ? levelParam
      : (myLevel ??
        (levels.includes(PILOT_LEVEL) ? PILOT_LEVEL : (levels[0] ?? "")));

  // The teacher's own classes that are ready to read, so they don't have to look for them.
  const myClasses = grades
    .filter((g) => myGrades.includes(g.name))
    .flatMap((g) =>
      g.learningAreas
        .filter((s) => mySubjects.includes(s) && ready.has(`${g.name}|${s}`))
        .map((s) => ({ grade: g.name, subject: s })),
    );

  // A search looks across every section; otherwise show the chosen section.
  const shown = (query ? grades : grades.filter((g) => g.level === level))
    .map((g) => ({
      ...g,
      learningAreas: g.learningAreas.filter(
        (s) =>
          !query ||
          s.toLowerCase().includes(query) ||
          g.name.toLowerCase().includes(query),
      ),
    }))
    .filter((g) => g.learningAreas.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Curriculum designs"
        description="Strands, sub-strands and learning outcomes from the KICD designs, checked by two teachers. Free to read, with one tap to plan a lesson."
      />

      <form method="GET" action="/dashboard/designs" className="relative">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search, e.g. Agriculture or Grade 8"
          aria-label="Search learning areas"
          className="h-11 pl-9"
        />
      </form>

      {!query && myClasses.length > 0 && (
        <section className="space-y-3">
          <SectionTitle title="Your classes" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {myClasses.map((c) => {
              const s = ready.get(`${c.grade}|${c.subject}`);
              return (
                <li key={`${c.grade}|${c.subject}`}>
                  <Link
                    href={designHref(c.grade, c.subject)}
                    className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/60"
                  >
                    <BookOpen
                      className="size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {c.grade} {c.subject}
                      </span>
                      {s && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {summary(s)}
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!query && levels.length > 1 && (
        <nav aria-label="Sections" className="flex gap-2 overflow-x-auto pb-1">
          {levels.map((l) => (
            <Link
              key={l}
              href={`/dashboard/designs?level=${encodeURIComponent(l)}`}
              aria-current={l === level ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium",
                l === level
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </Link>
          ))}
        </nav>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description={
            query
              ? `No learning area matches "${q}".`
              : "No grades are set up for this section yet."
          }
        />
      ) : (
        shown.map((g) => {
          const count = g.learningAreas.filter((s) =>
            ready.has(`${g.name}|${s}`),
          ).length;
          return (
            <section key={g.name} className="space-y-2">
              <SectionTitle
                title={g.name}
                action={
                  <span className="text-xs text-muted-foreground">
                    {count} of {g.learningAreas.length} ready
                  </span>
                }
              />
              <ul className="divide-y rounded-xl border bg-card">
                {g.learningAreas.map((subject) => {
                  const s = ready.get(`${g.name}|${subject}`);
                  return (
                    <li key={subject}>
                      {s ? (
                        <Link
                          href={designHref(g.name, subject)}
                          className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {subject}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {summary(s)}
                            </span>
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </Link>
                      ) : (
                        <div className="flex min-h-14 flex-col justify-center px-4 py-3">
                          <span className="truncate text-sm text-muted-foreground">
                            {subject}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Coming soon. Our curators are still checking it.
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

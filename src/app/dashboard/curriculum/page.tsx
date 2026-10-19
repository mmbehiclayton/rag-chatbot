import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapStatusBadge,
  mapHref,
} from "@/components/curriculum/map-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { getCurator, MAP_STATUS } from "@/lib/curriculum-map";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { cn } from "@/lib/utils";

const PILOT_LEVEL = "Junior Secondary";

export default async function CurriculumMapsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const session = await auth();
  if (!(await getCurator(session.userId))) redirect("/dashboard");

  const { level: levelParam } = await searchParams;
  const [grades, maps, designs] = await Promise.all([
    getGradeOptions(),
    withDbRetry(() =>
      db.curriculumMap.findMany({
        select: {
          grade: true,
          subject: true,
          status: true,
          _count: { select: { strands: true } },
        },
      }),
    ),
    withDbRetry(() =>
      db.curriculumDocument.findMany({
        where: { status: "completed", tenantId: null },
        select: { gradeLevel: true, subject: true },
      }),
    ),
  ]);
  const hasDesign = new Set(designs.map((d) => `${d.gradeLevel}|${d.subject}`));

  const levels = [...new Set(grades.map((g) => g.level))];
  const level =
    levels.includes(levelParam ?? "") && levelParam
      ? levelParam
      : levels.includes(PILOT_LEVEL)
        ? PILOT_LEVEL
        : levels[0];
  const byKey = new Map(maps.map((m) => [`${m.grade}|${m.subject}`, m]));
  const shown = grades.filter((g) => g.level === level);
  const pairs = shown.flatMap((g) =>
    g.learningAreas.map((s) => byKey.get(`${g.name}|${s}`)),
  );
  const inUse = pairs.filter((m) => m?.status === MAP_STATUS.PUBLISHED).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Curriculum maps"
        description="Strands, sub-strands and learning outcomes for each learning area. Elimu uses a map for teachers' documents only after a second curator has checked it."
      />

      <nav aria-label="Levels" className="flex gap-2 overflow-x-auto pb-1">
        {levels.map((l) => (
          <Link
            key={l}
            href={`/dashboard/curriculum?level=${encodeURIComponent(l)}`}
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

      <p className="text-sm text-muted-foreground">
        {inUse} of {pairs.length} maps in use for {level}.
      </p>

      {shown.map((g) => (
        <section key={g.name} className="space-y-2">
          <h2 className="text-base font-semibold">{g.name}</h2>
          {g.learningAreas.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
              No learning areas are set up for this grade yet.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {g.learningAreas.map((subject) => {
                const map = byKey.get(`${g.name}|${subject}`);
                return (
                  <li key={subject}>
                    <Link
                      href={mapHref(g.name, subject)}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {subject}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {map
                            ? `${map._count.strands} strand${map._count.strands === 1 ? "" : "s"}`
                            : hasDesign.has(`${g.name}|${subject}`)
                              ? "Design uploaded · ready to draft"
                              : "Not started · no design uploaded"}
                        </span>
                      </span>
                      {map && <MapStatusBadge status={map.status} />}
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

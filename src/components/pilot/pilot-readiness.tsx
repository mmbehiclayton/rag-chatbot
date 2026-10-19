import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { mapHref } from "@/components/curriculum/map-status-badge";
import { Badge } from "@/components/ui/badge";
import { MAP_STATUS } from "@/lib/curriculum-map";
import { getGradeOptions } from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";

const PILOT_LEVEL = "Junior Secondary";

type Variant = "success" | "warning" | "destructive" | "secondary" | "info";

const DESIGN: Record<string, { label: string; variant: Variant }> = {
  completed: { label: "Design ready", variant: "success" },
  processing: { label: "Design still reading", variant: "info" },
  pending: { label: "Design still reading", variant: "info" },
  error: { label: "Design failed", variant: "destructive" },
};
const MAP: Record<string, { label: string; variant: Variant }> = {
  [MAP_STATUS.PUBLISHED]: { label: "Map in use", variant: "success" },
  [MAP_STATUS.IN_REVIEW]: {
    label: "Map waiting for a check",
    variant: "warning",
  },
  [MAP_STATUS.DRAFT]: { label: "Map in draft", variant: "secondary" },
};
// When a class has more than one upload, the best one counts.
const DESIGN_RANK: Record<string, number> = {
  completed: 3,
  processing: 2,
  pending: 2,
  error: 1,
};

/** Which Grade 7–9 classes have what teachers need: a design Elimu has read, and a checked curriculum map. */
export async function PilotReadiness() {
  const [grades, designs, maps] = await Promise.all([
    getGradeOptions(),
    withDbRetry(() =>
      db.curriculumDocument.findMany({
        where: { tenantId: null },
        select: { gradeLevel: true, subject: true, status: true },
      }),
    ),
    withDbRetry(() =>
      db.curriculumMap.findMany({
        select: { grade: true, subject: true, status: true },
      }),
    ),
  ]);

  const design = new Map<string, string>();
  for (const d of designs) {
    const key = `${d.gradeLevel}|${d.subject}`;
    if (
      (DESIGN_RANK[d.status] ?? 0) > (DESIGN_RANK[design.get(key) ?? ""] ?? 0)
    )
      design.set(key, d.status);
  }
  const map = new Map(maps.map((m) => [`${m.grade}|${m.subject}`, m.status]));

  const classes = grades
    .filter((g) => g.level === PILOT_LEVEL)
    .flatMap((g) =>
      g.learningAreas.map((subject) => {
        const key = `${g.name}|${subject}`;
        const d = design.get(key);
        const m = map.get(key);
        return {
          grade: g.name,
          subject,
          design: d,
          map: m,
          ready: d === "completed" && m === MAP_STATUS.PUBLISHED,
        };
      }),
    );
  const ready = classes.filter((c) => c.ready).length;
  const withDesign = classes.filter((c) => c.design === "completed").length;
  const withMap = classes.filter((c) => c.map === MAP_STATUS.PUBLISHED).length;
  const todo = classes.filter((c) => !c.ready);
  const share = classes.length ? Math.round((ready / classes.length) * 100) : 0;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Ready for the pilot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A Grade 7–9 class is ready when Elimu has read its curriculum design
          and its curriculum map is in use.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm">
          <span className="text-2xl font-semibold">{ready}</span> of{" "}
          {classes.length} classes ready
        </p>
        <div className="h-2 overflow-hidden rounded-md bg-muted" aria-hidden>
          <div
            className={
              ready === classes.length
                ? "h-full bg-success"
                : "h-full bg-primary"
            }
            style={{ width: `${share}%` }}
          />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Designs ready</dt>
            <dd className="font-medium">
              {withDesign} of {classes.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Maps in use</dt>
            <dd className="font-medium">
              {withMap} of {classes.length}
            </dd>
          </div>
        </dl>
      </div>

      {classes.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
          No Junior Secondary learning areas are set up yet. Add them under
          Structure.
        </p>
      ) : todo.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-success">
          Every Grade 7–9 class is ready.
        </p>
      ) : (
        <>
          <h3 className="text-sm font-semibold">Still to do ({todo.length})</h3>
          <ul className="divide-y rounded-xl border bg-card">
            {todo.map((c) => {
              const d = c.design ? DESIGN[c.design] : undefined;
              const m = c.map ? MAP[c.map] : undefined;
              return (
                <li key={`${c.grade}|${c.subject}`}>
                  <Link
                    href={mapHref(c.grade, c.subject)}
                    className="flex min-h-11 items-center gap-3 p-4 hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm font-medium">
                        {c.grade} · {c.subject}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={d?.variant ?? "destructive"}>
                          {d?.label ?? "No design"}
                        </Badge>
                        <Badge variant={m?.variant ?? "secondary"}>
                          {m?.label ?? "No map yet"}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            Upload missing or failed designs under{" "}
            <Link
              href="/dashboard/knowledge"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Knowledge base
            </Link>
            . Open a class to draft its map from the design, then publish it.
          </p>
        </>
      )}
    </section>
  );
}

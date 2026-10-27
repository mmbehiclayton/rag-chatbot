import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PaceBadge } from "@/components/coverage/coverage-parts";
import { Donut } from "@/components/shared/donut";
import { getCoverage } from "@/lib/coverage-data";
import { db, withDbRetry } from "@/lib/db";
import { pickTerm, termLabel, todayInKenya } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

/** Home page numbers: syllabus coverage as rings, and what the teacher has prepared this term. */
export async function TeacherStats({ teacherId }: { teacherId: string }) {
  const today = todayInKenya();
  const [coverage, terms] = await Promise.all([
    getCoverage(teacherId),
    getTeacherTerms(teacherId),
  ]);
  const term = pickTerm(
    terms.filter((t) => t.closesOn >= today),
    today,
  );
  const countFor = (filed: { term?: string; year?: number }) =>
    Promise.all([
      withDbRetry(() =>
        db.lessonPlan.count({ where: { teacherId, ...filed } }),
      ),
      withDbRetry(() =>
        db.schemeOfWork.count({ where: { teacherId, ...filed } }),
      ),
      withDbRetry(() =>
        db.lessonNote.count({
          where: { teacherId, lessonPlan: { ...filed } },
        }),
      ),
      withDbRetry(() =>
        db.assessment.count({ where: { teacherId, ...filed } }),
      ),
    ]);

  const [termCounts, reused] = await Promise.all([
    countFor(term ? { term: `Term ${term.term}`, year: term.year } : {}),
    withDbRetry(() =>
      db.generationLog.count({ where: { userId: teacherId, model: "cache" } }),
    ),
  ]);
  // Between terms nothing is filed for the coming term yet; a row of zeros would hide
  // the work the teacher has done, so show everything they have made instead.
  const forTerm = term && termCounts.some((n) => n > 0);
  const [lessons, schemes, notes, assessments] = forTerm
    ? termCounts
    : term
      ? await countFor({})
      : termCounts;

  const tracked = coverage.classes.filter((c) => c.source);
  const s = coverage.summary;
  const counts = [
    { label: "Lesson plans", value: lessons, href: "/dashboard/lessons" },
    { label: "Schemes", value: schemes, href: "/dashboard/schemes" },
    { label: "Lesson notes", value: notes, href: "/dashboard/notes" },
    {
      label: "Assessments",
      value: assessments,
      href: "/dashboard/assessments",
    },
  ];

  return (
    <section className="space-y-3">
      {tracked.length > 0 && (
        <Link
          href="/dashboard/coverage"
          className="block space-y-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-center gap-4">
            <Donut
              value={s.percent}
              marker={s.expected}
              label={`Syllabus coverage ${s.percent}%${s.expected != null ? `, expected ${s.expected}% by today` : ""}`}
            >
              <span className="text-2xl font-semibold">{s.percent}%</span>
              <span className="text-xs text-muted-foreground">covered</span>
            </Donut>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Syllabus coverage</h2>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <PaceBadge pace={s.pace} />
              <p className="text-sm">
                {s.covered} of {s.subStrands} sub-strands covered
              </p>
              {s.expected != null && (
                <p className="text-xs text-muted-foreground">
                  {s.expected >= 100
                    ? "The school year is over. This is what your classes covered."
                    : `By today you'd expect about ${s.expected}% (the tick on the ring).`}
                </p>
              )}
            </div>
          </div>
          {tracked.length > 1 && (
            <ul className="grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
              {tracked.slice(0, 8).map((c) => (
                <li key={c.href} className="flex items-center gap-2">
                  <Donut
                    value={c.summary.percent}
                    marker={c.summary.expected}
                    size={48}
                    stroke={6}
                    label={`${c.label}: ${c.summary.percent}% covered`}
                  >
                    <span className="text-xs font-semibold">
                      {c.summary.percent}%
                    </span>
                  </Donut>
                  <span className="min-w-0 text-xs leading-snug">
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {forTerm && term
            ? `Prepared for ${termLabel(term)}`
            : "Prepared so far"}
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {counts.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="flex min-h-16 flex-col justify-center rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <span className="text-xl font-semibold">{c.value}</span>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        {reused > 0 && (
          <p className="text-xs text-muted-foreground">
            You reused {reused} document{reused === 1 ? "" : "s"} from other
            teachers instead of writing {reused === 1 ? "it" : "them"} again.
          </p>
        )}
      </div>
    </section>
  );
}

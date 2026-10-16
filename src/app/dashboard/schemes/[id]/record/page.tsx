import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getSchemeSchedule } from "@/lib/term-pack-data";
import { formatDay, formatRange, termLabel } from "@/lib/term-pack";
import { ExportButton, parseTitle } from "@/components/document/doc-parts";
import { LessonRemarks } from "@/components/term-pack/lesson-remarks";
import { MarkLesson } from "@/components/term-pack/mark-lesson";
import { Button } from "@/components/ui/button";

export default async function RecordOfWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const scheme = await withDbRetry(() =>
    db.schemeOfWork.findFirst({
      where: { id, teacherId: session.userId },
      select: { id: true, teacherId: true, title: true, grade: true, subject: true, term: true, year: true, content: true },
    })
  );
  if (!scheme) notFound();

  const schedule = await getSchemeSchedule(scheme);
  const { term, today } = schedule;
  const ready = !!term && schedule.days.length > 0;

  // Lessons up to today, plus the next few so the teacher can see what's coming.
  const slots = schedule.slots.filter((s) => s.lessonNumber);
  const past = slots.filter((s) => s.date <= today);
  const upcoming = slots.filter((s) => s.date > today).slice(0, 5);
  const taught = past.filter((s) => s.status === "TAUGHT").length;
  const carried = past.filter((s) => s.status === "CARRIED_OVER").length;
  const notMarked = past.filter((s) => !s.status && s.date < today).length;
  const lastLesson = schedule.lessons.length;
  const lastSlot = slots.at(-1);
  const runsOver = ready && lastSlot?.lessonNumber !== lastLesson && schedule.lessons.length > 0;

  const weeks = new Map<number, typeof past>();
  for (const s of past) weeks.set(s.week, [...(weeks.get(s.week) ?? []), s]);
  const weekRange = (n: number) => schedule.weeks.find((w) => w.number === n);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href={`/dashboard/schemes/${scheme.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Scheme of work
        </Link>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Record of work</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scheme.grade} · {scheme.subject} · {term ? termLabel(term) : scheme.term} · {parseTitle(scheme.title).title}
          </p>
        </div>
        {ready && <ExportButton href={`/api/export?type=record&id=${scheme.id}`} label="Print for signing" />}
      </div>

      {!ready ? (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              {!term
                ? `Add your ${scheme.term} dates so Elimu can put this scheme on real dates.`
                : `Add the days you teach ${scheme.grade} ${scheme.subject} to your timetable.`}{" "}
              Your record of work then fills in as you mark lessons taught.
            </p>
          </div>
          <Button render={<Link href="/dashboard/profile/term" />}>Set up my term</Button>
        </section>
      ) : (
        <>
          <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card text-center">
            <div className="p-3">
              <dt className="text-xs text-muted-foreground">Taught</dt>
              <dd className="text-lg font-semibold">{taught}</dd>
            </div>
            <div className="p-3">
              <dt className="text-xs text-muted-foreground">Carried over</dt>
              <dd className="text-lg font-semibold">{carried}</dd>
            </div>
            <div className="p-3">
              <dt className="text-xs text-muted-foreground">Not marked</dt>
              <dd className="text-lg font-semibold">{notMarked}</dd>
            </div>
          </dl>

          {runsOver && (
            <p className="rounded-md bg-warning/10 p-3 text-sm">
              The term has fewer timetabled lessons than this scheme. At this pace you'll reach lesson {lastSlot?.lessonNumber ?? 0} of{" "}
              {lastLesson} by closing day.
            </p>
          )}

          {past.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
              {term!.opensOn > today
                ? `${termLabel(term!)} opens on ${formatDay(term!.opensOn)}. Lessons show here from the first day.`
                : "No lessons on your timetable yet."}
            </p>
          ) : (
            [...weeks.entries()].reverse().map(([week, items]) => {
              const range = weekRange(week);
              return (
                <section key={week} className="rounded-xl border bg-card">
                  <h2 className="border-b px-4 py-3 text-base font-semibold">
                    Week {week}
                    {range && <span className="ml-2 text-sm font-normal text-muted-foreground">{formatRange(range.from, range.to)}</span>}
                  </h2>
                  <ol className="divide-y">
                    {[...items].reverse().map((s) => (
                      <li key={`${s.date}-${s.slot}`} className="space-y-3 px-4 py-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {formatDay(s.date)} · Lesson {s.lessonNumber}
                            {s.lesson?.strand ? ` · ${s.lesson.strand}` : ""}
                          </p>
                          <p className="mt-0.5 text-sm font-medium">{s.lesson?.subStrand || `Lesson ${s.lessonNumber}`}</p>
                        </div>
                        <MarkLesson schemeId={scheme.id} date={s.date} slot={s.slot} status={s.status} size="default" />
                        {s.status === "TAUGHT" && <LessonRemarks schemeId={scheme.id} date={s.date} slot={s.slot} initial={s.remarks} />}
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })
          )}

          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Coming up</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {upcoming.map((s) => (
                  <li key={`${s.date}-${s.slot}`} className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {formatDay(s.date)} · Week {s.week}, lesson {s.lessonNumber}
                    </p>
                    <p className="mt-0.5 text-sm">{s.lesson?.subStrand || `Lesson ${s.lessonNumber}`}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

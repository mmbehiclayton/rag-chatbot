import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { TimetableLessonCard } from "@/components/term-pack/timetable-lesson";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { formatDay, formatRange, termLabel } from "@/lib/term-pack";
import { getTimetableView } from "@/lib/term-pack-data";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const query = await searchParams;
  const requested =
    typeof query.week === "string"
      ? Number.parseInt(query.week, 10)
      : undefined;
  const { today, term, hasTimetable, weeks, week, lessons, progress } =
    await getTimetableView(session.userId, requested);

  if (!term || !hasTimetable || !week) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="This week" />
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex gap-3">
            <CalendarDays
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden
            />
            <p className="text-sm">
              Add your term dates and timetable to see your lessons for the
              week.
            </p>
          </div>
          <Button render={<Link href="/dashboard/profile/term" />}>
            Set up my term
          </Button>
        </section>
      </div>
    );
  }

  const days = [...new Set(lessons.map((l) => l.date))];
  const prev = weeks.find((w) => w.number === week.number - 1);
  const next = weeks.find((w) => w.number === week.number + 1);
  const isCurrent = week.from <= today && today <= week.to;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <PageHeader
          title={isCurrent ? "This week" : `Week ${week.number}`}
          description={`${termLabel(term)} · Week ${week.number} of ${weeks.length} · ${formatRange(week.from, week.to)}`}
          action={
            <Button
              variant="outline"
              className="h-11"
              render={<Link href="/dashboard/profile/term" />}
            >
              <CalendarDays /> Term dates and timetable
            </Button>
          }
        />
        <div className="flex items-center justify-between gap-2">
          {prev ? (
            <Button
              variant="outline"
              size="lg"
              render={
                <Link href={`/dashboard/timetable?week=${prev.number}`} />
              }
            >
              <ChevronLeft /> Week {prev.number}
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button
              variant="outline"
              size="lg"
              render={
                <Link href={`/dashboard/timetable?week=${next.number}`} />
              }
            >
              Week {next.number} <ChevronRight />
            </Button>
          )}
        </div>
      </div>

      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
          No lessons on your timetable this week.
        </p>
      ) : (
        days.map((d) => (
          <section key={d} className="space-y-2">
            <h2 className="text-base font-semibold">
              {formatDay(d)}
              {d === today && (
                <span className="ml-2 text-sm font-normal text-primary">
                  Today
                </span>
              )}
            </h2>
            <ul className="space-y-2">
              {lessons
                .filter((l) => l.date === d)
                .map((l) => (
                  <TimetableLessonCard
                    key={`${l.date}-${l.period}`}
                    lesson={l}
                    today={today}
                    size="default"
                  />
                ))}
            </ul>
          </section>
        ))
      )}

      {progress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Progress this term</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {progress.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.taught} of {p.total} lessons taught
                      {p.carried > 0 && ` · ${p.carried} carried over`}
                      {p.unmarked > 0 && ` · ${p.unmarked} not marked`}
                    </span>
                    {!p.finishes && (
                      <span className="mt-1 block rounded-md bg-warning/10 px-2 py-1 text-xs">
                        At this pace the scheme won't be finished by closing
                        day.
                      </span>
                    )}
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

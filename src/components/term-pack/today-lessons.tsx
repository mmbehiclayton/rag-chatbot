import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { getTimetableView } from "@/lib/term-pack-data";
import { formatDay, termLabel } from "@/lib/term-pack";
import { TimetableLessonCard } from "@/components/term-pack/timetable-lesson";
import { SectionTitle } from "@/components/shared/link-list";
import { Button } from "@/components/ui/button";

/** Today's timetabled lessons in period order with Taught / Carry over, or the next setup step if there are none. */
export async function TodayLessons({ teacherId, hasSchemes }: { teacherId: string; hasSchemes: boolean }) {
  const { today, term, inTerm, hasTimetable, lessons: week, unmarked } = await getTimetableView(teacherId);
  const lessons = week.filter((l) => l.date === today);

  if (!term || !hasTimetable) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Add your term dates and timetable</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Elimu then puts your scheme of work on real dates, shows each day's lessons here and fills your record of work as you
              teach.
            </p>
          </div>
        </div>
        <Button render={<Link href="/dashboard/profile/term" />}>Set up my term</Button>
      </section>
    );
  }

  if (!inTerm) {
    return (
      <p className="flex gap-2 rounded-xl border bg-card p-4 text-sm">
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          {term.opensOn > today ? `${termLabel(term)} opens on ${formatDay(term.opensOn)}.` : "School is closed for the holiday."}{" "}
          <Link href="/dashboard/profile/term" className="font-medium text-primary hover:underline">
            Term dates
          </Link>
        </span>
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <SectionTitle
        title={`Today · ${formatDay(today)}`}
        action={
          <Link href="/dashboard/timetable" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            This week
          </Link>
        }
      />
      {lessons.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
          {hasSchemes ? "No lessons on your timetable today." : `Create a scheme of work for ${termLabel(term)} and your lessons will show here.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((l) => (
            <TimetableLessonCard key={`${l.date}-${l.period}`} lesson={l} today={today} />
          ))}
        </ul>
      )}
      {unmarked.map((u) => (
        <Link
          key={u.href}
          href={u.href}
          className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm hover:bg-muted/60"
        >
          <span className="flex-1">
            {u.label}: {u.count} earlier {u.count === 1 ? "lesson isn't" : "lessons aren't"} marked yet
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ))}
    </section>
  );
}

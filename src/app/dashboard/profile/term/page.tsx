import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  TermDatesForm,
  TimetableForm,
} from "@/components/term-pack/term-setup";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/classes";
import { getDesignLessonsPerWeek } from "@/lib/curriculum-map";
import {
  pickTerm,
  SUGGESTED_TERMS,
  termLabel,
  todayInKenya,
} from "@/lib/term-pack";
import { getTeacherTerms, getTimetable } from "@/lib/term-pack-data";

export default async function TermSetupPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [saved, timetable, classes, designPerWeek] = await Promise.all([
    getTeacherTerms(session.userId),
    getTimetable(session.userId),
    getTeacherClasses(session.userId),
    getDesignLessonsPerWeek(),
  ]);
  const today = todayInKenya();

  // Saved terms first, then suggested terms that haven't ended yet.
  const options = saved.map((t) => ({ ...t, saved: true, estimate: false }));
  for (const s of SUGGESTED_TERMS) {
    if (
      s.closesOn < today ||
      options.some((o) => o.year === s.year && o.term === s.term)
    )
      continue;
    options.push({ ...s, saved: false });
  }
  options.sort((a, b) => a.year - b.year || a.term - b.term);
  const initial = pickTerm(options, today);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard/profile"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Me
        </Link>
        <PageHeader
          title="Term dates and timetable"
          description="Elimu uses these to put your scheme of work on real dates and to show today's lessons."
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Term dates</h2>
        {initial ? (
          <TermDatesForm
            key={saved.map(termLabel).join()}
            options={options}
            initial={termLabel(initial)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No terms to set up.</p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Timetable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The classes you teach in each period. It repeats every week of the
            term.
          </p>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Add the classes you teach first"
            action={
              <Button render={<Link href="/onboarding?from=profile" />}>
                Add classes
              </Button>
            }
          />
        ) : (
          <TimetableForm
            classes={classes.map((c) => ({
              grade: c.grade,
              subject: c.subject,
            }))}
            entries={timetable}
            designPerWeek={designPerWeek}
          />
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { auth } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/classes";
import { getTeacherTerms, getTimetables } from "@/lib/term-pack-data";
import { SUGGESTED_TERMS, pickTerm, termLabel, todayInKenya } from "@/lib/term-pack";
import { TermDatesForm, TimetableForm } from "@/components/term-pack/term-setup";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default async function TermSetupPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [saved, timetables, classes] = await Promise.all([
    getTeacherTerms(session.userId),
    getTimetables(session.userId),
    getTeacherClasses(session.userId),
  ]);
  const today = todayInKenya();

  // Saved terms first, then suggested terms that haven't ended yet.
  const options = saved.map((t) => ({ ...t, saved: true, estimate: false }));
  for (const s of SUGGESTED_TERMS) {
    if (s.closesOn < today || options.some((o) => o.year === s.year && o.term === s.term)) continue;
    options.push({ ...s, saved: false });
  }
  options.sort((a, b) => a.year - b.year || a.term - b.term);
  const initial = pickTerm(options, today);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <Link href="/dashboard/profile" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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
          <TermDatesForm key={saved.map(termLabel).join()} options={options} initial={termLabel(initial)} />
        ) : (
          <p className="text-sm text-muted-foreground">No terms to set up.</p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Timetable</h2>
          <p className="mt-1 text-sm text-muted-foreground">Which days you teach each class. This is the same every week of the term.</p>
        </div>
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Add the classes you teach first"
            action={<Button render={<Link href="/onboarding?from=profile" />}>Add classes</Button>}
          />
        ) : (
          <TimetableForm
            classes={classes.map((c) => ({ grade: c.grade, subject: c.subject, days: timetables.get(`${c.grade}|${c.subject}`) ?? [] }))}
          />
        )}
      </section>
    </div>
  );
}

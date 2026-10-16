import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGradeOptions, getIndexedCurricula, getTeachingProfile, preferClass } from "@/lib/curriculum-options";
import { PageHeader } from "@/components/shared/page-header";
import { TermPlanForm, type TermCalendar } from "@/components/create/term-plan-form";
import { getTeacherTerms, getTimetables } from "@/lib/term-pack-data";
import { lessonSlots, pickTerm, teachingWeeks, termLabel, todayInKenya } from "@/lib/term-pack";


// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const query = await searchParams;

  const [profile, grades, curricula, terms, timetables] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    getIndexedCurricula(session.tenantId),
    getTeacherTerms(session.userId),
    getTimetables(session.userId),
  ]);

  // For each term number, the teacher's term in progress or next to open, with lessons per class.
  const today = todayInKenya();
  const calendar: TermCalendar = {};
  for (const n of [1, 2, 3]) {
    const t = pickTerm(terms.filter((x) => x.term === n && x.closesOn >= today), today);
    if (!t) continue;
    const lessons: Record<string, number> = {};
    for (const [key, days] of timetables) lessons[key] = lessonSlots(t, days).length;
    const perWeek = Object.fromEntries([...timetables].map(([key, days]) => [key, days.length]));
    calendar[`Term ${n}`] = { year: t.year, label: termLabel(t), weeks: teachingWeeks(t).length, lessons, perWeek, opensOn: t.opensOn };
  }
  const current = pickTerm(terms.filter((x) => x.closesOn >= today), today);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Scheme of work" description="Plan a whole term week by week from the KICD curriculum design." />
      <TermPlanForm
        kind="scheme"
        grades={grades}
        myGrades={preferClass(profile?.gradesTaught, query.grade)}
        mySubjects={preferClass(profile?.subjectsTaught, query.subject)}
        curricula={curricula}
        calendar={calendar}
        initialTerm={current ? `Term ${current.term}` : undefined}
      />
    </div>
  );
}

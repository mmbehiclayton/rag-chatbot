import { redirect } from "next/navigation";
import {
  type TermCalendar,
  TermPlanForm,
} from "@/components/create/term-plan-form";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { getDesignLessonsPerWeek } from "@/lib/curriculum-map";
import {
  getGradeOptions,
  getIndexedCurricula,
  getTeachingProfile,
  preferClass,
} from "@/lib/curriculum-options";
import {
  lessonSlots,
  pickTerm,
  teachingWeeks,
  termLabel,
  todayInKenya,
} from "@/lib/term-pack";
import {
  getTeacherTerms,
  getTimetable,
  periodsFor,
  streamsFor,
} from "@/lib/term-pack-data";

// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const query = await searchParams;

  const [profile, grades, curricula, terms, timetable, designPerWeek] =
    await Promise.all([
      getTeachingProfile(session.userId),
      getGradeOptions(),
      getIndexedCurricula(session.tenantId),
      getTeacherTerms(session.userId),
      getTimetable(session.userId),
      getDesignLessonsPerWeek(),
    ]);

  // For each term number, the teacher's term in progress or next to open, with lessons per class.
  // Streams share one scheme, so it is sized for the stream with the most lessons.
  const today = todayInKenya();
  const classes = [
    ...new Set(timetable.map((e) => `${e.grade}|${e.subject}`)),
  ].map((key) => {
    const [grade, subject] = key.split("|");
    return {
      key,
      streams: streamsFor(timetable, grade, subject).map((s) =>
        periodsFor(timetable, grade, s, subject),
      ),
    };
  });
  const calendar: TermCalendar = {};
  for (const n of [1, 2, 3]) {
    const t = pickTerm(
      terms.filter((x) => x.term === n && x.closesOn >= today),
      today,
    );
    if (!t) continue;
    const lessons: Record<string, number> = {};
    const perWeek: Record<string, number> = {};
    for (const c of classes) {
      lessons[c.key] = Math.max(
        ...c.streams.map((p) => lessonSlots(t, p).length),
      );
      perWeek[c.key] = Math.max(...c.streams.map((p) => p.length));
    }
    calendar[`Term ${n}`] = {
      year: t.year,
      label: termLabel(t),
      weeks: teachingWeeks(t).length,
      lessons,
      perWeek,
      opensOn: t.opensOn,
    };
  }
  const current = pickTerm(
    terms.filter((x) => x.closesOn >= today),
    today,
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Scheme of work"
        description="Plan a whole term week by week from the KICD curriculum design."
      />
      <TermPlanForm
        kind="scheme"
        grades={grades}
        myGrades={preferClass(profile?.gradesTaught, query.grade)}
        mySubjects={preferClass(profile?.subjectsTaught, query.subject)}
        curricula={curricula}
        calendar={calendar}
        designPerWeek={designPerWeek}
        initialTerm={current ? `Term ${current.term}` : undefined}
      />
    </div>
  );
}

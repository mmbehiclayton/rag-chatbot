import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getGradeOptions, getIndexedCurricula, getTeachingProfile } from "@/lib/curriculum-options";
import { PageHeader } from "@/components/shared/page-header";
import { QuickLessonForm } from "@/components/create/quick-lesson-form";

export default async function CreateLessonPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [profile, grades, schemes, curricula] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    // Sub-strands from the teacher's own schemes become topic suggestions.
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { grade: true, subject: true, content: true },
      })
    ),
    getIndexedCurricula(session.tenantId),
  ]);

  const suggestions: Record<string, string[]> = {};
  for (const scheme of schemes) {
    const key = `${scheme.grade}|${scheme.subject}`;
    const weeks = (scheme.content as { weeks?: { rows?: { subStrand?: string }[] }[] } | null)?.weeks ?? [];
    const topics = weeks.flatMap((w) => w.rows ?? []).map((r) => r.subStrand).filter((t): t is string => !!t);
    suggestions[key] = [...new Set([...(suggestions[key] ?? []), ...topics])].slice(0, 12);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Lesson plan" description="Choose the class and topic. Elimu writes a full CBC lesson plan for you to review." />
      <QuickLessonForm
        grades={grades}
        myGrades={profile?.gradesTaught ?? []}
        mySubjects={profile?.subjectsTaught ?? []}
        topicSuggestions={suggestions}
        curricula={curricula}
      />
    </div>
  );
}

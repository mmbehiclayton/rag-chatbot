import { redirect } from "next/navigation";
import { QuickLessonForm } from "@/components/create/quick-lesson-form";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import {
  getCurriculumRequests,
  getGradeOptions,
  getIndexedCurricula,
  getTeachingProfile,
  preferClass,
} from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";

// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;
export default async function CreateLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const query = await searchParams;

  const [profile, grades, schemes, [curricula, requested]] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    // Sub-strands from the teacher's own schemes become topic suggestions.
    withDbRetry(() =>
      db.schemeOfWork.findMany({
        where: { teacherId: session.userId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { grade: true, subject: true, content: true },
      }),
    ),
    Promise.all([
      getIndexedCurricula(session.tenantId),
      getCurriculumRequests(session.userId),
    ]),
  ]);

  const suggestions: Record<string, string[]> = {};
  for (const scheme of schemes) {
    const key = `${scheme.grade}|${scheme.subject}`;
    const weeks =
      (
        scheme.content as {
          weeks?: { rows?: { subStrand?: string }[] }[];
        } | null
      )?.weeks ?? [];
    const topics = weeks
      .flatMap((w) => w.rows ?? [])
      .map((r) => r.subStrand)
      .filter((t): t is string => !!t);
    suggestions[key] = [
      ...new Set([...(suggestions[key] ?? []), ...topics]),
    ].slice(0, 12);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Lesson plan"
        description="Choose the class and topic. Elimu writes a full CBC lesson plan for you to review."
      />
      <QuickLessonForm
        grades={grades}
        myGrades={preferClass(profile?.gradesTaught, query.grade)}
        mySubjects={preferClass(profile?.subjectsTaught, query.subject)}
        topicSuggestions={suggestions}
        curricula={curricula}
        requested={requested}
        initialTopic={
          typeof query.topic === "string" ? query.topic.slice(0, 200) : ""
        }
      />
    </div>
  );
}

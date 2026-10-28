import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TermPlanForm } from "@/components/create/term-plan-form";
import { DocumentsLeft } from "@/components/shared/documents-left";
import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import {
  getCurriculumRequests,
  getGradeOptions,
  getIndexedCurricula,
  getTeachingProfile,
  preferClass,
} from "@/lib/curriculum-options";
import { assessmentTypeFor, pickTerm, todayInKenya } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";

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

  const [profile, grades, [curricula, requested], terms] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    Promise.all([
      getIndexedCurricula(session.tenantId),
      getCurriculumRequests(session.userId),
    ]),
    getTeacherTerms(session.userId),
  ]);
  // Start on the term in progress (or next to open) and the assessment due about now.
  const today = todayInKenya();
  const current = pickTerm(
    terms.filter((t) => t.closesOn >= today),
    today,
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Assessment"
        description="A test, quiz, practical task or checklist, from the curriculum design."
      />
      <Suspense fallback={null}>
        <DocumentsLeft userId={session.userId} role={session.role} />
      </Suspense>
      <TermPlanForm
        kind="assessment"
        grades={grades}
        myGrades={preferClass(profile?.gradesTaught, query.grade)}
        mySubjects={preferClass(profile?.subjectsTaught, query.subject)}
        curricula={curricula}
        requested={requested}
        initialTerm={current ? `Term ${current.term}` : undefined}
        initialAssessmentType={
          current ? assessmentTypeFor(current, today) : undefined
        }
      />
    </div>
  );
}

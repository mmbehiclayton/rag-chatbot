import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGradeOptions, getIndexedCurricula, getTeachingProfile } from "@/lib/curriculum-options";
import { PageHeader } from "@/components/shared/page-header";
import { TermPlanForm } from "@/components/create/term-plan-form";

export default async function Page() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [profile, grades, curricula] = await Promise.all([
    getTeachingProfile(session.userId),
    getGradeOptions(),
    getIndexedCurricula(session.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Assessment" description="An assessment paper with a marking scheme, from the curriculum design." />
      <TermPlanForm
        kind="assessment"
        grades={grades}
        myGrades={profile?.gradesTaught ?? []}
        mySubjects={profile?.subjectsTaught ?? []}
        curricula={curricula}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGradeOptions, getIndexedCurricula, getTeachingProfile, preferClass } from "@/lib/curriculum-options";
import { PageHeader } from "@/components/shared/page-header";
import { TermPlanForm } from "@/components/create/term-plan-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const query = await searchParams;

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
        myGrades={preferClass(profile?.gradesTaught, query.grade)}
        mySubjects={preferClass(profile?.subjectsTaught, query.subject)}
        curricula={curricula}
      />
    </div>
  );
}

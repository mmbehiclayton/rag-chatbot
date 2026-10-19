import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CoverageList,
  SummaryCard,
} from "@/components/coverage/coverage-parts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getCoverage } from "@/lib/coverage-data";

/** Coverage for each class the teacher teaches this school year, and the total across them. */
export default async function CoveragePage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const { year, groups, summary } = await getCoverage(session.userId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Syllabus coverage"
        description={`How much of each curriculum design you have covered in ${year}. Lessons you mark as taught count on their own, and you can mark any sub-strand yourself.`}
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes yet"
          description="Add the grades and learning areas you teach, then come back to track coverage."
          action={
            <Button
              className="h-11"
              render={<Link href="/dashboard/profile" />}
            >
              Add my classes
            </Button>
          }
        />
      ) : (
        <>
          <SummaryCard title="All my classes" summary={summary} />
          <section className="space-y-2">
            <h2 className="text-base font-semibold">My classes</h2>
            <CoverageList
              untracked="No curriculum design or scheme of work yet"
              rows={groups.map((g) => ({
                href: g.href,
                label: g.label,
                summary: g.summary,
                tracked: g.tracked > 0,
                note: `${g.tracked} of ${g.areas.length} learning area${g.areas.length === 1 ? "" : "s"} tracked`,
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { classHref } from "@/lib/classes";
import { BulletList, DocHeader, DocSection, ExportButton, Field, asArray, parseTitle } from "@/components/document/doc-parts";
import { ApproveSchemeButton, LessonRowAction, WeekBatchButton, WeekLessons } from "@/components/document/scheme-lessons";


// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;

type Row = {
  strand?: string;
  subStrand?: string;
  specificLearningOutcomes?: string[];
  keyInquiryQuestions?: string[];
  learningExperiences?: string[];
  learningResources?: string[];
  assessmentMethods?: string[];
};
type Content = {
  termlyOverview?: {
    totalLessons?: number;
    strandsCovered?: string[];
    communityServiceActivities?: string[];
    parentalEngagementStrategies?: string[];
    crossCurricularIntegration?: string[];
  };
  weeks?: { weekNumber?: number; rows?: Row[] }[];
};

export default async function SchemeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const scheme = await withDbRetry(() =>
    db.schemeOfWork.findFirst({
      where: { id, teacherId: session.userId },
      include: { lessonPlans: { select: { id: true, lessonNumber: true } } },
    })
  );
  if (!scheme) notFound();

  const content = (scheme.content ?? {}) as Content;
  const overview = content.termlyOverview ?? {};
  const lessonIds = new Map(scheme.lessonPlans.map((l) => [l.lessonNumber, l.id]));
  const { title, needsReview } = parseTitle(scheme.title);

  // Lesson numbers run across the whole term, one per scheme row (matches getSchemeLessonsStatus).
  let counter = 0;
  const weeks = asArray<NonNullable<Content["weeks"]>[number]>(content.weeks).map((week, wi) => ({
    weekNumber: week.weekNumber ?? wi + 1,
    rows: asArray<Row>(week.rows).map((row) => {
      counter++;
      return { row, lesson: { lessonNumber: counter, topic: row.subStrand || row.strand || `Lesson ${counter}`, lessonId: lessonIds.get(counter) ?? null } };
    }),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <DocHeader
        backHref={classHref(scheme.grade, scheme.subject)}
        backLabel={`${scheme.grade} ${scheme.subject}`}
        title={title}
        meta={`${scheme.grade} · ${scheme.subject} · ${scheme.term} · ${counter} lessons`}
        needsReview={needsReview}
        actions={
          <>
            <ExportButton href={`/api/export?type=scheme&id=${scheme.id}`} />
            {needsReview && <ApproveSchemeButton schemeId={scheme.id} />}
          </>
        }
      />

      {needsReview && (
        <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Elimu's accuracy check flagged parts of this scheme. Compare the strands and learning outcomes with the curriculum design before you use it.
        </p>
      )}

      <DocSection title="Term overview">
        <Field label="Strands covered">{asArray(overview.strandsCovered).length > 0 && <BulletList items={overview.strandsCovered} />}</Field>
        <details className="text-base">
          <summary className="min-h-10 cursor-pointer text-sm font-medium text-primary">Community service, parents and links to other learning areas</summary>
          <div className="mt-3 space-y-3">
            <Field label="Community service learning">
              {asArray(overview.communityServiceActivities).length > 0 && <BulletList items={overview.communityServiceActivities} />}
            </Field>
            <Field label="Parental engagement">
              {asArray(overview.parentalEngagementStrategies).length > 0 && <BulletList items={overview.parentalEngagementStrategies} />}
            </Field>
            <Field label="Links to other learning areas">
              {asArray(overview.crossCurricularIntegration).length > 0 && <BulletList items={overview.crossCurricularIntegration} />}
            </Field>
          </div>
        </details>
      </DocSection>

      {weeks.map((week) => (
        <WeekLessons key={week.weekNumber} schemeId={scheme.id} rows={week.rows.map((r) => r.lesson)}>
          <section id={`week-${week.weekNumber}`} className="scroll-mt-20 rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold">Week {week.weekNumber}</h2>
              <WeekBatchButton rows={week.rows.map((r) => r.lesson)} />
            </div>
            <ol className="divide-y">
              {week.rows.map(({ row, lesson }) => (
                <li key={lesson.lessonNumber} className="space-y-3 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Lesson {lesson.lessonNumber} · {row.strand}
                    </p>
                    <p className="mt-0.5 font-medium">{row.subStrand}</p>
                  </div>
                  <BulletList items={row.specificLearningOutcomes} />
                  <details>
                    <summary className="min-h-9 cursor-pointer text-sm font-medium text-primary">More details</summary>
                    <div className="mt-3 space-y-3 text-sm">
                      <Field label="Key inquiry questions">{asArray(row.keyInquiryQuestions).length > 0 && <BulletList items={row.keyInquiryQuestions} />}</Field>
                      <Field label="Learning experiences">{asArray(row.learningExperiences).length > 0 && <BulletList items={row.learningExperiences} />}</Field>
                      <Field label="Learning resources">{asArray(row.learningResources).length > 0 && <BulletList items={row.learningResources} />}</Field>
                      <Field label="Assessment">{asArray(row.assessmentMethods).length > 0 && <BulletList items={row.assessmentMethods} />}</Field>
                    </div>
                  </details>
                  <LessonRowAction row={lesson} />
                </li>
              ))}
            </ol>
          </section>
        </WeekLessons>
      ))}
    </div>
  );
}

import { AlertTriangle, CalendarDays, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocMoreMenu } from "@/components/document/doc-actions";
import {
  asArray,
  BulletList,
  DocHeader,
  DocSection,
  Field,
  parseTitle,
} from "@/components/document/doc-parts";
import { ImproveButton } from "@/components/document/improve-button";
import {
  ApproveSchemeButton,
  LessonRowAction,
  WeekBatchButton,
  WeekLessons,
} from "@/components/document/scheme-lessons";
import { HeadCheck } from "@/components/pilot/head-check";
import { ShareElimu } from "@/components/shared/share-elimu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";
import { docMeta } from "@/lib/documents";
import { downloadNote } from "@/lib/downloads";
import {
  formatDay,
  formatRange,
  termLabel,
  todayInKenya,
} from "@/lib/term-pack";
import { getSchemeSchedule } from "@/lib/term-pack-data";

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

export default async function SchemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  // What a download costs, looked up alongside the page's own queries.
  const download = downloadNote(
    session.userId,
    `/api/export?type=scheme&id=${id}`,
  );
  const scheme = await withDbRetry(() =>
    db.schemeOfWork.findFirst({
      where: { id, teacherId: session.userId },
      include: { lessonPlans: { select: { id: true, lessonNumber: true } } },
    }),
  );
  if (!scheme) notFound();
  // An earlier version to go back to after "Improve".
  const canUndo =
    (await db.documentVersion
      .count({
        where: {
          kind: "SCHEME",
          documentId: scheme.id,
          teacherId: session.userId,
        },
      })
      .catch(() => 0)) > 0;

  const [schedule, headReview] = await Promise.all([
    getSchemeSchedule(scheme),
    withDbRetry(() =>
      db.headReview.findUnique({
        where: { schemeId_kind: { schemeId: scheme.id, kind: "SCHEME" } },
        select: { answer: true },
      }),
    ).catch(() => null),
  ]);
  const dated = !!schedule.term && schedule.periods.length > 0;
  const weekDates = new Map(schedule.weeks.map((w) => [w.number, w]));
  // The date each lesson falls on now, after any carried-over lessons.
  const lessonDates = new Map<number, string>();
  for (const s of schedule.slots)
    if (
      s.lessonNumber &&
      !lessonDates.has(s.lessonNumber) &&
      s.status !== "CARRIED_OVER"
    )
      lessonDates.set(s.lessonNumber, s.date);

  const content = (scheme.content ?? {}) as Content;
  const overview = content.termlyOverview ?? {};
  const lessonIds = new Map(
    scheme.lessonPlans.map((l) => [l.lessonNumber, l.id]),
  );
  const { title, needsReview } = parseTitle(scheme.title);

  // Lesson numbers run across the whole term, one per scheme row (matches getSchemeLessonsStatus).
  let counter = 0;
  const weeks = asArray<NonNullable<Content["weeks"]>[number]>(
    content.weeks,
  ).map((week, wi) => ({
    weekNumber: week.weekNumber ?? wi + 1,
    rows: asArray<Row>(week.rows).map((row) => {
      counter++;
      return {
        row,
        lesson: {
          lessonNumber: counter,
          topic: row.subStrand || row.strand || `Lesson ${counter}`,
          lessonId: lessonIds.get(counter) ?? null,
        },
      };
    }),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <DocHeader
        kind="scheme"
        check={{ kind: "scheme", id: scheme.id, checkedAt: scheme.checkedAt }}
        backHref={classHref(scheme.grade, scheme.subject)}
        backLabel={`${scheme.grade} ${scheme.subject}`}
        title={title}
        meta={docMeta(
          {
            grade: scheme.grade,
            subject: scheme.subject,
            term: schedule.term ? termLabel(schedule.term) : scheme.term,
            year: schedule.term ? null : scheme.year,
          },
          `${counter} lessons`,
        )}
        needsReview={needsReview}
        actions={
          <>
            <Button
              className="w-full sm:w-auto"
              render={<Link href={`/dashboard/schemes/${scheme.id}/record`} />}
            >
              <ClipboardCheck /> Record of work
            </Button>
            {needsReview && <ApproveSchemeButton schemeId={scheme.id} />}
            <ImproveButton kind="SCHEME" id={scheme.id} canUndo={canUndo} />
            <DocMoreMenu
              type="schemes"
              id={scheme.id}
              copy={{
                term: scheme.term,
                year: scheme.year,
                thisYear: Number(todayInKenya().slice(0, 4)),
                lessons: scheme.lessonPlans.length,
              }}
              exportHref={`/api/export?type=scheme&id=${scheme.id}`}
              downloadNote={await download}
              pdfInMenu
              deleteNote="Its lesson plans are kept. Its record of work (lessons marked as taught) is deleted too."
            />
          </>
        }
      />

      {needsReview && (
        <p className="flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-warning"
            aria-hidden
          />
          Elimu's accuracy check flagged parts of this scheme. Compare the
          strands and learning outcomes with the curriculum design before you
          use it.
        </p>
      )}

      {!dated && (
        <p className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <span>
            <Link
              href="/dashboard/profile/term"
              className="font-medium text-primary hover:underline"
            >
              Add your term dates and timetable
            </Link>{" "}
            to see the date of each lesson and fill your record of work as you
            teach.
          </span>
        </p>
      )}

      {!needsReview && (
        <HeadCheck
          schemeId={scheme.id}
          kind="SCHEME"
          answer={headReview?.answer ?? null}
        />
      )}

      <DocSection title="Term overview">
        <Field label="Strands covered">
          {asArray(overview.strandsCovered).length > 0 && (
            <BulletList items={overview.strandsCovered} />
          )}
        </Field>
        <details className="text-base">
          <summary className="min-h-10 cursor-pointer text-sm font-medium text-primary">
            Community service, parents and links to other learning areas
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Community service learning">
              {asArray(overview.communityServiceActivities).length > 0 && (
                <BulletList items={overview.communityServiceActivities} />
              )}
            </Field>
            <Field label="Parental engagement">
              {asArray(overview.parentalEngagementStrategies).length > 0 && (
                <BulletList items={overview.parentalEngagementStrategies} />
              )}
            </Field>
            <Field label="Links to other learning areas">
              {asArray(overview.crossCurricularIntegration).length > 0 && (
                <BulletList items={overview.crossCurricularIntegration} />
              )}
            </Field>
          </div>
        </details>
      </DocSection>

      {weeks.map((week) => (
        <WeekLessons
          key={week.weekNumber}
          schemeId={scheme.id}
          rows={week.rows.map((r) => r.lesson)}
        >
          <section
            id={`week-${week.weekNumber}`}
            className="scroll-mt-20 rounded-xl border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold">
                Week {week.weekNumber}
                {weekDates.get(week.weekNumber) && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {formatRange(
                      weekDates.get(week.weekNumber)?.from ?? "",
                      weekDates.get(week.weekNumber)?.to ?? "",
                    )}
                  </span>
                )}
              </h2>
              <WeekBatchButton rows={week.rows.map((r) => r.lesson)} />
            </div>
            <ol className="divide-y">
              {week.rows.map(({ row, lesson }) => (
                <li
                  key={lesson.lessonNumber}
                  id={`lesson-${lesson.lessonNumber}`}
                  className="scroll-mt-20 space-y-3 px-4 py-4 sm:px-5"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Lesson {lesson.lessonNumber}
                      {lessonDates.get(lesson.lessonNumber) &&
                        ` · ${formatDay(lessonDates.get(lesson.lessonNumber) ?? "")}`}{" "}
                      · {row.strand}
                    </p>
                    <p className="mt-0.5 font-medium">{row.subStrand}</p>
                  </div>
                  <BulletList items={row.specificLearningOutcomes} />
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
                      More details
                    </summary>
                    <div className="mt-3 space-y-3 text-sm">
                      <Field label="Key inquiry questions">
                        {asArray(row.keyInquiryQuestions).length > 0 && (
                          <BulletList items={row.keyInquiryQuestions} />
                        )}
                      </Field>
                      <Field label="Learning experiences">
                        {asArray(row.learningExperiences).length > 0 && (
                          <BulletList items={row.learningExperiences} />
                        )}
                      </Field>
                      <Field label="Learning resources">
                        {asArray(row.learningResources).length > 0 && (
                          <BulletList items={row.learningResources} />
                        )}
                      </Field>
                      <Field label="Assessment">
                        {asArray(row.assessmentMethods).length > 0 && (
                          <BulletList items={row.assessmentMethods} />
                        )}
                      </Field>
                    </div>
                  </details>
                  <LessonRowAction row={lesson} />
                </li>
              ))}
            </ol>
          </section>
        </WeekLessons>
      ))}

      <ShareElimu
        userId={session.userId}
        made={`my ${scheme.grade} ${scheme.subject} scheme of work`}
      />
    </div>
  );
}

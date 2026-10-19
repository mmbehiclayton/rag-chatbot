import { ChevronRight, Pencil, Presentation } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateNotesButton } from "@/components/create/create-notes-button";
import { CopilotButton } from "@/components/document/copilot-button";
import {
  asArray,
  BulletList,
  DocHeader,
  DocSection,
  ExportButton,
  Field,
} from "@/components/document/doc-parts";
import type { LessonContent } from "@/components/document/lesson-types";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";

// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;
export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const lesson = await withDbRetry(() =>
    db.lessonPlan.findFirst({
      where: { id, teacherId: session.userId },
      include: {
        scheme: { select: { id: true, grade: true, subject: true } },
        lessonNotes: {
          select: { id: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  );
  if (!lesson) notFound();

  const c = (lesson.content ?? {}) as LessonContent;
  const s = c.lessonStructure ?? {};
  const grade = lesson.grade ?? lesson.scheme?.grade;
  const subject = lesson.subject ?? lesson.scheme?.subject;
  const meta = [grade, subject, `${lesson.durationMinutes} min`]
    .filter(Boolean)
    .join(" · ");
  const note = lesson.lessonNotes[0];
  const activities = asArray<
    NonNullable<
      NonNullable<LessonContent["lessonStructure"]>["mainActivities"]
    >[number]
  >(s.mainActivities);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6">
      <DocHeader
        backHref={
          lesson.scheme
            ? `/dashboard/schemes/${lesson.scheme.id}`
            : grade && subject
              ? classHref(grade, subject)
              : "/dashboard/classes"
        }
        backLabel={
          lesson.scheme
            ? "Scheme of work"
            : grade && subject
              ? `${grade} ${subject}`
              : "My classes"
        }
        title={c.topic || lesson.topic}
        meta={meta}
        actions={
          <>
            <Button
              variant="outline"
              render={<Link href={`/dashboard/lessons/${lesson.id}/edit`} />}
            >
              <Pencil /> Edit
            </Button>
            <ExportButton href={`/api/export?type=lesson&id=${lesson.id}`} />
            <Button
              variant="outline"
              render={<Link href={`/dashboard/lessons/${lesson.id}/present`} />}
            >
              <Presentation /> Present
            </Button>
            {note ? (
              <Button
                variant="outline"
                render={<Link href={`/dashboard/notes/${note.id}`} />}
              >
                Lesson notes <ChevronRight />
              </Button>
            ) : (
              <CreateNotesButton lessonPlanId={lesson.id} />
            )}
          </>
        }
      />

      <DocSection title="Overview">
        {(c.strand || c.subStrand) && (
          <Field label="Strand / sub-strand">
            <p>{[c.strand, c.subStrand].filter(Boolean).join(" — ")}</p>
          </Field>
        )}
        <Field label="Specific learning outcomes">
          {asArray(c.specificLearningOutcomes).length > 0 && (
            <BulletList items={c.specificLearningOutcomes} />
          )}
        </Field>
        <Field label="Key inquiry questions">
          {asArray(c.keyInquiryQuestions).length > 0 && (
            <BulletList items={c.keyInquiryQuestions} />
          )}
        </Field>
        <Field label="Learning resources">
          {asArray(c.learningResources).length > 0 && (
            <BulletList items={c.learningResources} />
          )}
        </Field>
      </DocSection>

      {s.introduction && (
        <DocSection
          title={`Introduction${s.introduction.duration ? ` · ${s.introduction.duration} min` : ""}`}
        >
          <Field label="Recap">
            {s.introduction.recap && <p>{s.introduction.recap}</p>}
          </Field>
          <Field label="Link to learners' lives">
            {s.introduction.connectionToLearnersLives && (
              <p>{s.introduction.connectionToLearnersLives}</p>
            )}
          </Field>
          <Field label="Learning intentions">
            {s.introduction.learningIntentions && (
              <p>{s.introduction.learningIntentions}</p>
            )}
          </Field>
          <Field label="Success criteria">
            {s.introduction.successCriteria && (
              <p>{s.introduction.successCriteria}</p>
            )}
          </Field>
        </DocSection>
      )}

      {activities.map((a, i) => (
        <DocSection
          key={a.activityName || a.duration || `activity-${i + 1}`}
          title={`Activity ${i + 1}: ${a.activityName ?? ""}${a.duration ? ` · ${a.duration} min` : ""}`}
        >
          {a.grouping && (
            <p className="text-sm text-muted-foreground">{a.grouping}</p>
          )}
          <Field label="Teacher">
            {asArray(a.teacherActions).length > 0 && (
              <BulletList items={a.teacherActions} ordered />
            )}
          </Field>
          <Field label="Learners">
            {asArray(a.learnerActions).length > 0 && (
              <BulletList items={a.learnerActions} ordered />
            )}
          </Field>
          <Field label="Check for understanding">
            {a.formativeAssessment && <p>{a.formativeAssessment}</p>}
          </Field>
        </DocSection>
      ))}

      {s.differentiation && (
        <DocSection title="Differentiation">
          <Field label="Learners needing support">
            {s.differentiation.learnersNeedingSupport && (
              <p>{s.differentiation.learnersNeedingSupport}</p>
            )}
          </Field>
          <Field label="Most learners">
            {s.differentiation.averageLearners && (
              <p>{s.differentiation.averageLearners}</p>
            )}
          </Field>
          <Field label="Learners ready for more">
            {s.differentiation.advancedLearners && (
              <p>{s.differentiation.advancedLearners}</p>
            )}
          </Field>
        </DocSection>
      )}

      {s.conclusion && (
        <DocSection
          title={`Conclusion${s.conclusion.duration ? ` · ${s.conclusion.duration} min` : ""}`}
        >
          <Field label="Summary">
            {s.conclusion.summary && <p>{s.conclusion.summary}</p>}
          </Field>
          <Field label="Assessment">
            {s.conclusion.assessmentOfLearning && (
              <p>{s.conclusion.assessmentOfLearning}</p>
            )}
          </Field>
          <Field label="Exit ticket">
            {s.conclusion.exitTicket && <p>{s.conclusion.exitTicket}</p>}
          </Field>
          <Field label="Homework">
            {s.conclusion.homework && <p>{s.conclusion.homework}</p>}
          </Field>
          <Field label="Next lesson">
            {s.conclusion.previewNextLesson && (
              <p>{s.conclusion.previewNextLesson}</p>
            )}
          </Field>
        </DocSection>
      )}

      <details className="rounded-xl border bg-card p-4 sm:p-5">
        <summary className="min-h-10 cursor-pointer font-semibold">
          Competencies, values, rubric and media ideas
        </summary>
        <div className="mt-3 space-y-4 text-base leading-relaxed">
          {asArray<{ competency?: string; howDeveloped?: string }>(
            c.coreCompetencies,
          ).length > 0 && (
            <Field label="Core competencies">
              <ul className="space-y-2">
                {asArray<{ competency?: string; howDeveloped?: string }>(
                  c.coreCompetencies,
                ).map((x, i) => (
                  <li
                    key={
                      x.competency || x.howDeveloped || `competency-${i + 1}`
                    }
                  >
                    <span className="font-medium">{x.competency}:</span>{" "}
                    {x.howDeveloped}
                  </li>
                ))}
              </ul>
            </Field>
          )}
          {asArray<{ value?: string; howDemonstrated?: string }>(c.values)
            .length > 0 && (
            <Field label="Values">
              <ul className="space-y-2">
                {asArray<{ value?: string; howDemonstrated?: string }>(
                  c.values,
                ).map((x, i) => (
                  <li key={x.value || x.howDemonstrated || `value-${i + 1}`}>
                    <span className="font-medium">{x.value}:</span>{" "}
                    {x.howDemonstrated}
                  </li>
                ))}
              </ul>
            </Field>
          )}
          {c.assessmentRubric && (
            <Field
              label={`Rubric${c.assessmentRubric.criteria ? `: ${c.assessmentRubric.criteria}` : ""}`}
            >
              <dl className="grid gap-2 text-sm sm:grid-cols-[11rem_1fr]">
                <dt className="text-muted-foreground">
                  Exceeding expectations
                </dt>
                <dd>{c.assessmentRubric.exceeding}</dd>
                <dt className="text-muted-foreground">Meeting expectations</dt>
                <dd>{c.assessmentRubric.meeting}</dd>
                <dt className="text-muted-foreground">
                  Approaching expectations
                </dt>
                <dd>{c.assessmentRubric.approaching}</dd>
                <dt className="text-muted-foreground">Below expectations</dt>
                <dd>{c.assessmentRubric.below}</dd>
              </dl>
            </Field>
          )}
          {asArray<{ type?: string; description?: string; purpose?: string }>(
            c.multimediaSuggestions,
          ).length > 0 && (
            <Field label="Media and practical ideas">
              <ul className="space-y-2">
                {asArray<{
                  type?: string;
                  description?: string;
                  purpose?: string;
                }>(c.multimediaSuggestions).map((m, i) => (
                  <li key={m.description || m.purpose || `media-${i + 1}`}>
                    {m.description}
                    {m.purpose && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {m.purpose}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </div>
      </details>

      <CopilotButton lessonId={lesson.id} topic={c.topic || lesson.topic} />
    </div>
  );
}

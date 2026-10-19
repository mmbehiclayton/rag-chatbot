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
import type {
  LessonActivity,
  LessonContent,
} from "@/components/document/lesson-types";
import { ReflectionForm } from "@/components/document/reflection-form";
import { ShareElimu } from "@/components/shared/share-elimu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";
import { docMeta } from "@/lib/documents";

/** "Name: how" pairs, such as core competencies and how the lesson develops them. */
function pairs(items: { name?: string; detail?: string }[]) {
  const list = items.filter((x) => x.name || x.detail);
  if (list.length === 0) return null;
  return (
    <ul className="space-y-2">
      {list.map((x, i) => (
        <li key={`${x.name}-${i}`}>
          {x.name && <span className="font-medium">{x.name}:</span>} {x.detail}
        </li>
      ))}
    </ul>
  );
}

function text(value?: string) {
  return value ? <p>{value}</p> : null;
}

function bullets(items: unknown, ordered = false) {
  return asArray(items).some((i) => typeof i === "string" && i.trim()) ? (
    <BulletList items={items} ordered={ordered} />
  ) : null;
}

// Writing a document with AI can take a couple of minutes.
export const maxDuration = 300;

/** A lesson plan in the KICD order, from strand to the teacher's reflection. */
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
        scheme: {
          select: {
            id: true,
            grade: true,
            subject: true,
            term: true,
            year: true,
          },
        },
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
  const meta = docMeta(
    {
      grade,
      subject,
      term: lesson.term ?? lesson.scheme?.term,
      year: lesson.year ?? lesson.scheme?.year,
    },
    lesson.scheme && lesson.week ? `Week ${lesson.week}` : null,
    lesson.scheme ? `Lesson ${lesson.lessonNumber}` : null,
    `${lesson.durationMinutes} min`,
  );
  const note = lesson.lessonNotes[0];
  const steps = asArray<LessonActivity>(s.mainActivities);
  const extended = c.extendedActivity || s.conclusion?.homework;
  const competencies = asArray<{ competency?: string; howDeveloped?: string }>(
    c.coreCompetencies,
  ).map((x) => ({ name: x.competency, detail: x.howDeveloped }));
  const values = asArray<{ value?: string; howDemonstrated?: string }>(
    c.values,
  ).map((x) => ({ name: x.value, detail: x.howDemonstrated }));
  const issues = asArray<{ issue?: string; howAddressed?: string }>(
    c.pertinentIssues,
  ).map((x) => ({ name: x.issue, detail: x.howAddressed }));
  const links = asArray<{ learningArea?: string; link?: string }>(
    c.linksToOtherLearningAreas,
  ).map((x) => ({ name: x.learningArea, detail: x.link }));
  const media = asArray<{ description?: string; purpose?: string }>(
    c.multimediaSuggestions,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-6">
      <DocHeader
        kind="lesson"
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

      <DocSection title="Strand and learning outcomes">
        <Field label="Strand">{text(c.strand)}</Field>
        <Field label="Sub-strand">{text(c.subStrand)}</Field>
        <Field label="Specific learning outcomes">
          {bullets(c.specificLearningOutcomes, true) && (
            <>
              <p>By the end of the lesson, the learner should be able to:</p>
              {bullets(c.specificLearningOutcomes, true)}
            </>
          )}
        </Field>
        <Field label="Key inquiry questions">
          {bullets(c.keyInquiryQuestions)}
        </Field>
        <Field label="Learning resources">{bullets(c.learningResources)}</Field>
        <Field label="Organisation of learning">
          {text(c.organisationOfLearning)}
        </Field>
      </DocSection>

      {s.introduction && (
        <DocSection
          title={`Introduction${s.introduction.duration ? ` · ${s.introduction.duration} min` : ""}`}
        >
          <Field label="Recap">{text(s.introduction.recap)}</Field>
          <Field label="Link to learners' lives">
            {text(s.introduction.connectionToLearnersLives)}
          </Field>
          <Field label="Learning intentions">
            {text(s.introduction.learningIntentions)}
          </Field>
          <Field label="Success criteria">
            {text(s.introduction.successCriteria)}
          </Field>
        </DocSection>
      )}

      {steps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Lesson development</h2>
          {steps.map((a, i) => (
            <DocSection
              key={a.activityName || `step-${i + 1}`}
              title={`Step ${i + 1}${a.activityName ? `: ${a.activityName}` : ""}${a.duration ? ` · ${a.duration} min` : ""}`}
            >
              {a.grouping && (
                <p className="text-sm text-muted-foreground">{a.grouping}</p>
              )}
              <Field label="Learners">{bullets(a.learnerActions, true)}</Field>
              <Field label="Teacher">{bullets(a.teacherActions, true)}</Field>
              <Field label="Competencies, values and issues">
                {text(a.integration)}
              </Field>
              <Field label="Check for understanding">
                {text(a.formativeAssessment)}
              </Field>
            </DocSection>
          ))}
        </section>
      )}

      {s.conclusion && (
        <DocSection
          title={`Conclusion${s.conclusion.duration ? ` · ${s.conclusion.duration} min` : ""}`}
        >
          <Field label="Summary">{text(s.conclusion.summary)}</Field>
          <Field label="Assessment">
            {text(s.conclusion.assessmentOfLearning)}
          </Field>
          <Field label="Exit ticket">{text(s.conclusion.exitTicket)}</Field>
          <Field label="Next lesson">
            {text(s.conclusion.previewNextLesson)}
          </Field>
        </DocSection>
      )}

      {extended && (
        <DocSection title="Extended activity">
          <p>{extended}</p>
        </DocSection>
      )}

      {s.differentiation && (
        <DocSection title="Differentiation">
          <Field label="Learners needing support">
            {text(s.differentiation.learnersNeedingSupport)}
          </Field>
          <Field label="Most learners">
            {text(s.differentiation.averageLearners)}
          </Field>
          <Field label="Learners ready for more">
            {text(s.differentiation.advancedLearners)}
          </Field>
        </DocSection>
      )}

      <details className="rounded-xl border bg-card p-4 sm:p-5">
        <summary className="min-h-10 cursor-pointer font-semibold">
          Competencies, values, issues and rubric
        </summary>
        <div className="mt-3 space-y-4 text-base leading-relaxed">
          <Field label="Core competencies">{pairs(competencies)}</Field>
          <Field label="Values">{pairs(values)}</Field>
          <Field label="Pertinent and contemporary issues">
            {pairs(issues)}
          </Field>
          <Field label="Links to other learning areas">{pairs(links)}</Field>
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
          {media.length > 0 && (
            <Field label="Media and practical ideas">
              {pairs(
                media.map((m) => ({
                  detail: [m.description, m.purpose]
                    .filter(Boolean)
                    .join(" – "),
                })),
              )}
            </Field>
          )}
        </div>
      </details>

      <DocSection title="Reflection">
        <ReflectionForm
          lessonId={lesson.id}
          initial={c.reflection ?? ""}
          onRecord={!!lesson.scheme}
        />
      </DocSection>

      <ShareElimu
        userId={session.userId}
        made={
          grade && subject
            ? `my ${grade} ${subject} lesson plan`
            : "a lesson plan"
        }
      />

      <CopilotButton lessonId={lesson.id} topic={c.topic || lesson.topic} />
    </div>
  );
}

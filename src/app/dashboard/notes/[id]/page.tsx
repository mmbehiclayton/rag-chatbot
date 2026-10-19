import { notFound, redirect } from "next/navigation";
import {
  asArray,
  BulletList,
  DocHeader,
  DocSection,
  ExportButton,
  Field,
} from "@/components/document/doc-parts";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

type Notes = {
  learningOutcomes?: string[];
  conceptOverview?: {
    keyDefinitions?: string[];
    backgroundContext?: string;
    whatLearnersNeedToKnow?: string;
  };
  workedExamples?: {
    title?: string;
    level?: string;
    procedure?: string[];
    thinkAloudCommentary?: string;
  }[];
  questioningSequences?: {
    trigger?: string;
    initialQuestion?: string;
    expectedAnswer?: string;
    followUpIfWrong?: string;
    followUpIfCorrect?: string;
  }[];
  misconceptions?: { misconception?: string; correction?: string }[];
  boardSummary?: string[];
  references?: string[];
};

const LEVEL: Record<string, string> = {
  BASIC: "Basic",
  MEDIUM: "Medium",
  ADVANCED: "Advanced",
};

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const note = await withDbRetry(() =>
    db.lessonNote.findFirst({
      where: { id, teacherId: session.userId },
      include: {
        lessonPlan: {
          select: {
            id: true,
            topic: true,
            grade: true,
            subject: true,
            content: true,
            scheme: { select: { grade: true, subject: true } },
          },
        },
      },
    }),
  );
  if (!note) notFound();

  const c = (note.resources ?? {}) as Notes;
  const plan = note.lessonPlan;
  const planContent = (plan.content ?? {}) as {
    strand?: string;
    subStrand?: string;
    specificLearningOutcomes?: string[];
  };
  // Notes made before October 2026 didn't copy the outcomes; fall back to the plan's.
  const outcomes = asArray(c.learningOutcomes).length
    ? c.learningOutcomes
    : planContent.specificLearningOutcomes;
  const meta = [
    plan.grade ?? plan.scheme?.grade,
    plan.subject ?? plan.scheme?.subject,
    "Lesson notes",
  ]
    .filter(Boolean)
    .join(" · ");
  const examples = asArray<NonNullable<Notes["workedExamples"]>[number]>(
    c.workedExamples,
  );
  const questions = asArray<NonNullable<Notes["questioningSequences"]>[number]>(
    c.questioningSequences,
  );
  const misconceptions = asArray<NonNullable<Notes["misconceptions"]>[number]>(
    c.misconceptions,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DocHeader
        backHref={`/dashboard/lessons/${plan.id}`}
        backLabel="Lesson plan"
        title={plan.topic}
        meta={meta}
        actions={<ExportButton href={`/api/export?type=notes&id=${note.id}`} />}
      />

      <DocSection title="What this lesson covers">
        <Field label="Strand">
          {planContent.strand && <p>{planContent.strand}</p>}
        </Field>
        <Field label="Sub-strand">
          {planContent.subStrand && <p>{planContent.subStrand}</p>}
        </Field>
        <Field label="Specific learning outcomes">
          {asArray(outcomes).length > 0 && (
            <BulletList items={outcomes} ordered />
          )}
        </Field>
      </DocSection>

      <DocSection title="Concept overview">
        <Field label="What learners need to know">
          <p>{c.conceptOverview?.whatLearnersNeedToKnow || note.notes}</p>
        </Field>
        <Field label="Background">
          {c.conceptOverview?.backgroundContext && (
            <p>{c.conceptOverview.backgroundContext}</p>
          )}
        </Field>
        {asArray(c.conceptOverview?.keyDefinitions).length > 0 && (
          <Field label="Key definitions">
            <BulletList items={c.conceptOverview?.keyDefinitions} />
          </Field>
        )}
      </DocSection>

      {examples.length > 0 && (
        <DocSection title="Worked examples">
          {examples.map((ex, i) => (
            <div
              key={ex.title || ex.level || `example-${i + 1}`}
              className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">
                  {ex.title || `Example ${i + 1}`}
                </h3>
                {ex.level && (
                  <Badge variant="secondary">
                    {LEVEL[ex.level] ?? ex.level}
                  </Badge>
                )}
              </div>
              <BulletList items={ex.procedure} ordered />
              {ex.thinkAloudCommentary && (
                <p className="rounded-md bg-muted/60 p-3 text-sm">
                  <span className="font-medium">Think aloud: </span>
                  {ex.thinkAloudCommentary}
                </p>
              )}
            </div>
          ))}
        </DocSection>
      )}

      {questions.length > 0 && (
        <DocSection title="Questioning">
          {questions.map((q, i) => (
            <div
              key={q.initialQuestion || q.trigger || `question-${i + 1}`}
              className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0"
            >
              {q.trigger && (
                <p className="text-sm text-muted-foreground">{q.trigger}</p>
              )}
              <p className="font-medium">“{q.initialQuestion}”</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
                <dt className="text-muted-foreground">Expected answer</dt>
                <dd>{q.expectedAnswer}</dd>
                <dt className="text-muted-foreground">If incorrect</dt>
                <dd>{q.followUpIfWrong}</dd>
                <dt className="text-muted-foreground">If correct</dt>
                <dd>{q.followUpIfCorrect}</dd>
              </dl>
            </div>
          ))}
        </DocSection>
      )}

      {misconceptions.length > 0 && (
        <DocSection title="Common misconceptions">
          <ul className="space-y-3">
            {misconceptions.map((m, i) => (
              <li
                key={
                  m.misconception || m.correction || `misconception-${i + 1}`
                }
                className="space-y-1"
              >
                <p className="font-medium">{m.misconception}</p>
                <p className="text-sm text-muted-foreground">{m.correction}</p>
              </li>
            ))}
          </ul>
        </DocSection>
      )}

      {asArray(c.boardSummary).length > 0 && (
        <DocSection title="Board summary">
          <p className="text-sm text-muted-foreground">
            Short points to write on the board for learners to copy.
          </p>
          <BulletList items={c.boardSummary} />
        </DocSection>
      )}

      {asArray(c.references).length > 0 && (
        <DocSection title="References">
          <BulletList items={c.references} />
        </DocSection>
      )}
    </div>
  );
}

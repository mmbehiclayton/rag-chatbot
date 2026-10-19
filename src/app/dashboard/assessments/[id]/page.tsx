import { notFound, redirect } from "next/navigation";
import {
  asArray,
  BulletList,
  DocHeader,
  DocSection,
  ExportButton,
  parseTitle,
} from "@/components/document/doc-parts";
import { auth } from "@/lib/auth";
import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";

type Question = {
  questionNumber?: number;
  questionText?: string;
  learningOutcome?: string;
  marks?: number;
  modelAnswer?: string;
  rubric?: string;
};
type Section = {
  sectionTitle?: string;
  instructions?: string;
  questions?: Question[];
};
type Band = { level?: string; range?: string; descriptor?: string };
type Content = {
  subStrandsCovered?: string[];
  sections?: Section[];
  markingScheme?: {
    totalMarks?: number;
    gradingScale?: Band[];
  };
};

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const assessment = await withDbRetry(() =>
    db.assessment.findFirst({ where: { id, teacherId: session.userId } }),
  );
  if (!assessment) notFound();

  const content = (assessment.content ?? {}) as Content;
  const sections = asArray<Section>(content.sections);
  const totalMarks =
    content.markingScheme?.totalMarks ??
    sections
      .flatMap((s) => asArray<Question>(s.questions))
      .reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const grading = asArray<Band>(content.markingScheme?.gradingScale);
  const covered = asArray(content.subStrandsCovered);
  const { title, needsReview } = parseTitle(assessment.title);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DocHeader
        backHref={classHref(assessment.grade, assessment.subject)}
        backLabel={`${assessment.grade} ${assessment.subject}`}
        title={title}
        meta={`${assessment.grade} · ${assessment.subject} · ${assessment.type} · ${totalMarks} marks`}
        needsReview={needsReview}
        actions={
          <ExportButton
            href={`/api/export?type=assessment&id=${assessment.id}`}
          />
        }
      />

      {covered.length > 0 && (
        <DocSection title="Sub-strands covered">
          <BulletList items={covered} />
        </DocSection>
      )}

      {sections.map((section, si) => {
        const sectionKey = section.sectionTitle || `Section ${si + 1}`;
        return (
          <DocSection
            key={sectionKey}
            title={section.sectionTitle || `Section ${si + 1}`}
          >
            {section.instructions && (
              <p className="text-sm text-muted-foreground">
                {section.instructions}
              </p>
            )}
            <ol className="space-y-4">
              {asArray<Question>(section.questions).map((q, qi) => {
                const questionKey =
                  q.questionNumber != null
                    ? `q-${q.questionNumber}`
                    : q.questionText || `question-${qi + 1}`;
                return (
                  <li
                    key={questionKey}
                    className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex gap-3">
                      <span className="font-medium">
                        {q.questionNumber ?? qi + 1}.
                      </span>
                      <p className="flex-1 whitespace-pre-line">
                        {q.questionText}
                      </p>
                      {q.marks != null && (
                        <span className="shrink-0 text-sm text-muted-foreground">
                          ({q.marks} mk{q.marks === 1 ? "" : "s"})
                        </span>
                      )}
                    </div>
                    {(q.modelAnswer || q.rubric || q.learningOutcome) && (
                      <details className="group ml-6 rounded-md bg-muted/60 px-3 py-2 text-sm">
                        <summary className="min-h-8 cursor-pointer font-medium text-primary">
                          Marking guide
                        </summary>
                        <div className="mt-2 space-y-2">
                          {q.learningOutcome && (
                            <p className="text-muted-foreground">
                              Tests: {q.learningOutcome}
                            </p>
                          )}
                          {q.modelAnswer && (
                            <p className="whitespace-pre-line">
                              {q.modelAnswer}
                            </p>
                          )}
                          {q.rubric && (
                            <p className="whitespace-pre-line text-muted-foreground">
                              {q.rubric}
                            </p>
                          )}
                        </div>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
          </DocSection>
        );
      })}

      {grading.length > 0 && (
        <DocSection title="Grading">
          <ul className="divide-y text-sm">
            {grading.map((g, i) => (
              <li
                key={`${g.level ?? g.range ?? "band"}-${i}`}
                className="space-y-0.5 py-2"
              >
                <p className="flex justify-between gap-4 font-medium">
                  <span>{g.level ?? g.range}</span>
                  {g.level && g.range && <span>{g.range} marks</span>}
                </p>
                <p className="text-muted-foreground">{g.descriptor}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Check the mark ranges against your school's grading policy.
          </p>
        </DocSection>
      )}
    </div>
  );
}

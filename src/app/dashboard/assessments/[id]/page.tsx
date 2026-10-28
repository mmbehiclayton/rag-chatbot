import { notFound, redirect } from "next/navigation";
import { DocMoreMenu } from "@/components/document/doc-actions";
import {
  asArray,
  BulletList,
  DocHeader,
  DocSection,
  ExportButton,
  parseTitle,
} from "@/components/document/doc-parts";
import { TableOfSpecs } from "@/components/document/table-of-specs";
import {
  ChecklistBody,
  PracticalBody,
} from "@/components/document/task-assessment";
import {
  assessmentKind,
  type ChecklistContent,
  type PracticalContent,
} from "@/lib/assessment-kinds";
import { specTable } from "@/lib/assessment-specs";
import { auth } from "@/lib/auth";
import { classHref } from "@/lib/classes";
import { db, withDbRetry } from "@/lib/db";
import { docMeta } from "@/lib/documents";
import { downloadNote } from "@/lib/downloads";
import { todayInKenya } from "@/lib/term-pack";

type Question = {
  questionNumber?: number;
  questionText?: string;
  learningOutcome?: string;
  level?: string;
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
  // What a download costs, looked up alongside the page's own queries.
  const download = downloadNote(
    session.userId,
    `/api/export?type=assessment&id=${id}`,
  );
  const assessment = await withDbRetry(() =>
    db.assessment.findFirst({
      where: { id, teacherId: session.userId },
      include: { scheme: { select: { id: true } } },
    }),
  );
  if (!assessment) notFound();

  const content = (assessment.content ?? {}) as Content;
  const kind = assessmentKind(content);
  const sections = asArray<Section>(content.sections);
  const totalMarks =
    content.markingScheme?.totalMarks ??
    sections
      .flatMap((s) => asArray<Question>(s.questions))
      .reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const grading = asArray<Band>(content.markingScheme?.gradingScale);
  const covered = asArray(content.subStrandsCovered);
  const specs = specTable(sections);
  const { title, needsReview } = parseTitle(assessment.title);
  const count = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  const size =
    kind === "practical"
      ? count(
          asArray((content as PracticalContent).rubric).length,
          "criterion",
          "criteria",
        )
      : kind === "checklist"
        ? count(
            asArray((content as ChecklistContent).items).length,
            "indicator",
            "indicators",
          )
        : `${totalMarks} marks`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DocHeader
        kind="assessment"
        check={{
          kind: "assessment",
          id: assessment.id,
          checkedAt: assessment.checkedAt,
        }}
        backHref={classHref(assessment.grade, assessment.subject)}
        backLabel={`${assessment.grade} ${assessment.subject}`}
        title={title}
        meta={docMeta(
          {
            grade: assessment.grade,
            subject: assessment.subject,
            term: assessment.term,
            year: assessment.year,
          },
          assessment.type,
          size,
        )}
        needsReview={needsReview}
        actions={
          <>
            <ExportButton
              main
              href={`/api/export?type=assessment&id=${assessment.id}`}
              note={await download}
            />
            <DocMoreMenu
              type="assessments"
              id={assessment.id}
              copy={{
                term: assessment.term,
                year: assessment.year,
                thisYear: Number(todayInKenya().slice(0, 4)),
              }}
              exportHref={`/api/export?type=assessment&id=${assessment.id}`}
              downloadNote={await download}
              links={
                assessment.scheme
                  ? [
                      {
                        label: "Scheme of work",
                        href: `/dashboard/schemes/${assessment.scheme.id}`,
                      },
                    ]
                  : []
              }
            />
          </>
        }
      />

      {covered.length > 0 && (
        <DocSection title="Sub-strands covered">
          <BulletList items={covered} />
        </DocSection>
      )}

      {kind === "practical" && (
        <PracticalBody content={content as PracticalContent} />
      )}
      {kind === "checklist" && (
        <ChecklistBody content={content as ChecklistContent} />
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
                        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary">
                          Marking guide
                        </summary>
                        <div className="mt-2 space-y-2">
                          {q.learningOutcome && (
                            <p className="text-muted-foreground">
                              Tests: {q.learningOutcome}
                              {q.level ? ` (${q.level})` : ""}
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

      <TableOfSpecs specs={specs} />

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

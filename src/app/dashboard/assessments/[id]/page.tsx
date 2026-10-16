import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { DocHeader, DocSection, ExportButton, asArray, parseTitle } from "@/components/document/doc-parts";

type Question = { questionNumber?: number; questionText?: string; marks?: number; modelAnswer?: string; rubric?: string };
type Section = { sectionTitle?: string; instructions?: string; questions?: Question[] };
type Content = { sections?: Section[]; markingScheme?: { totalMarks?: number; gradingScale?: { range?: string; descriptor?: string }[] } };

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const assessment = await withDbRetry(() => db.assessment.findFirst({ where: { id, teacherId: session.userId } }));
  if (!assessment) notFound();

  const content = (assessment.content ?? {}) as Content;
  const sections = asArray<Section>(content.sections);
  const totalMarks =
    content.markingScheme?.totalMarks ??
    sections.flatMap((s) => asArray<Question>(s.questions)).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const grading = asArray<{ range?: string; descriptor?: string }>(content.markingScheme?.gradingScale);
  const { title, needsReview } = parseTitle(assessment.title);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DocHeader
        backHref="/dashboard/library?type=assessments"
        backLabel="Library"
        title={title}
        meta={`${assessment.grade} · ${assessment.subject} · ${assessment.type} · ${totalMarks} marks`}
        needsReview={needsReview}
        actions={<ExportButton href={`/api/export?type=assessment&id=${assessment.id}`} />}
      />

      {sections.map((section, si) => (
        <DocSection key={si} title={section.sectionTitle || `Section ${si + 1}`}>
          {section.instructions && <p className="text-sm text-muted-foreground">{section.instructions}</p>}
          <ol className="space-y-4">
            {asArray<Question>(section.questions).map((q, qi) => (
              <li key={qi} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                <div className="flex gap-3">
                  <span className="font-medium">{q.questionNumber ?? qi + 1}.</span>
                  <p className="flex-1 whitespace-pre-line">{q.questionText}</p>
                  {q.marks != null && <span className="shrink-0 text-sm text-muted-foreground">({q.marks} mk{q.marks === 1 ? "" : "s"})</span>}
                </div>
                {(q.modelAnswer || q.rubric) && (
                  <details className="group ml-6 rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <summary className="min-h-8 cursor-pointer font-medium text-primary">Marking guide</summary>
                    <div className="mt-2 space-y-2">
                      {q.modelAnswer && <p className="whitespace-pre-line">{q.modelAnswer}</p>}
                      {q.rubric && <p className="whitespace-pre-line text-muted-foreground">{q.rubric}</p>}
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </DocSection>
      ))}

      {grading.length > 0 && (
        <DocSection title="Grading scale">
          <ul className="divide-y text-sm">
            {grading.map((g, i) => (
              <li key={i} className="flex justify-between gap-4 py-2">
                <span className="font-medium">{g.range}</span>
                <span className="text-right text-muted-foreground">{g.descriptor}</span>
              </li>
            ))}
          </ul>
        </DocSection>
      )}
    </div>
  );
}

import {
  asArray,
  BulletList,
  DocSection,
} from "@/components/document/doc-parts";
import {
  type ChecklistContent,
  type PracticalContent,
  RUBRIC_LEVELS,
} from "@/lib/assessment-kinds";

type Criterion = NonNullable<PracticalContent["rubric"]>[number];
type Indicator = NonNullable<ChecklistContent["items"]>[number];

/** A practical or project task: what learners do, then the rubric the teacher scores it with. */
export function PracticalBody({ content }: { content: PracticalContent }) {
  const rubric = asArray<Criterion>(content.rubric).filter((c) => c.criterion);
  return (
    <>
      {content.task && (
        <DocSection title="The task">
          <p className="whitespace-pre-line">{content.task}</p>
        </DocSection>
      )}
      {asArray(content.materials).length > 0 && (
        <DocSection title="Materials">
          <BulletList items={content.materials} />
        </DocSection>
      )}
      {asArray(content.steps).length > 0 && (
        <DocSection title="Steps for learners">
          <BulletList items={content.steps} ordered />
        </DocSection>
      )}
      {content.teacherNotes && (
        <DocSection title="Notes for the teacher">
          <p className="whitespace-pre-line">{content.teacherNotes}</p>
        </DocSection>
      )}
      {rubric.length > 0 && (
        <DocSection title="Rubric">
          <p className="text-sm text-muted-foreground">
            Score each criterion from 4 (exceeding) to 1 (below). It prints on
            its own page after the task.
          </p>
          <ol className="space-y-4">
            {rubric.map((c, i) => (
              <li
                key={`${c.criterion}-${i}`}
                className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0"
              >
                <p className="font-medium">
                  {i + 1}. {c.criterion}
                </p>
                {c.learningOutcome && (
                  <p className="text-sm text-muted-foreground">
                    Tests: {c.learningOutcome}
                  </p>
                )}
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {RUBRIC_LEVELS.map((l) =>
                    c[l.key] ? (
                      <div key={l.key} className="rounded-md bg-muted/60 p-3">
                        <dt className="font-medium">
                          {l.short} · {l.score}
                          <span className="sr-only"> {l.label}</span>
                        </dt>
                        <dd className="text-muted-foreground">{c[l.key]}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            {RUBRIC_LEVELS.map((l) => `${l.short}: ${l.label}`).join(" · ")}
          </p>
        </DocSection>
      )}
    </>
  );
}

/** An observation checklist: the activity, and what the teacher looks for in each learner. */
export function ChecklistBody({ content }: { content: ChecklistContent }) {
  const items = asArray<Indicator>(content.items).filter((i) => i.indicator);
  return (
    <>
      {content.activity && (
        <DocSection title="The activity">
          <p className="whitespace-pre-line">{content.activity}</p>
        </DocSection>
      )}
      {items.length > 0 && (
        <DocSection title="What to look for">
          <ol className="divide-y text-sm">
            {items.map((item, i) => (
              <li key={`${item.indicator}-${i}`} className="space-y-0.5 py-2">
                <p className="text-base">
                  {i + 1}. {item.indicator}
                </p>
                {item.learningOutcome && (
                  <p className="text-muted-foreground">
                    Tests: {item.learningOutcome}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Download PDF prints it as a class list with a column for each of
            these, to tick as you watch.
          </p>
        </DocSection>
      )}
    </>
  );
}

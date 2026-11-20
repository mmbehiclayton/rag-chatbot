import { DocSection } from "@/components/document/doc-parts";
import {
  COGNITIVE_LEVELS,
  percent,
  type SpecTable,
} from "@/lib/assessment-specs";

/** How an assessment's marks spread across learning outcomes and levels. */
export function TableOfSpecs({ specs }: { specs: SpecTable }) {
  if (specs.rows.length === 0) return null;
  return (
    <DocSection title="Table of specifications">
      <p className="text-sm text-muted-foreground">
        How the marks spread across learning outcomes
        {specs.hasLevels ? " and levels" : ""}. It prints after the marking
        scheme.
      </p>
      {specs.hasLevels && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COGNITIVE_LEVELS.map((level, i) => (
            <li key={level} className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">{level}</p>
              <p className="font-medium">
                {specs.byLevel[i]} marks{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({percent(specs.byLevel[i], specs.total)})
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
      <ul className="divide-y text-sm">
        {specs.rows.map((row) => (
          <li key={row.outcome} className="space-y-0.5 py-2">
            <p>{row.outcome}</p>
            <p className="text-muted-foreground">
              {row.questions.length === 1 ? "Question" : "Questions"}{" "}
              {row.questions.join(", ")} · {row.marks} marks (
              {percent(row.marks, specs.total)})
            </p>
          </li>
        ))}
      </ul>
    </DocSection>
  );
}

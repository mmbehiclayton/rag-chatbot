"use client";

import { Info, Loader2, Save, Sparkles, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { suggestRule, updateGenerationRule } from "@/lib/actions/rules";

const CONTENT_TYPES = [
  { id: "SCHEME_OF_WORK", label: "Schemes of work" },
  { id: "LESSON_PLAN", label: "Lesson plans" },
  { id: "LESSON_NOTES", label: "Lesson notes" },
  { id: "ASSESSMENT", label: "Assessments" },
];

export function RulesClient({
  initialRules,
  requests,
}: {
  initialRules: { contentType: string; customPrompt: string }[];
  /** What teachers asked Elimu to change, newest first. */
  requests: { contentType: string; instruction: string; createdAt: string }[];
}) {
  const initial = Object.fromEntries(
    initialRules.map((r) => [r.contentType, r.customPrompt]),
  );
  const [saved, setSaved] = useState<Record<string, string>>(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>(initial);
  const [activeType, setActiveType] = useState(CONTENT_TYPES[0].id);
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggest] = useTransition();
  const asked = requests.filter((r) => r.contentType === activeType);

  const suggest = () =>
    startSuggest(async () => {
      try {
        const result = await suggestRule(activeType, draft);
        if (!result.ok) return void toast.error(result.error);
        setDrafts((d) => ({ ...d, [activeType]: result.rule }));
        toast.success("Draft rule ready. Read it, edit it, then save.");
      } catch {
        toast.error("Couldn't reach Elimu. Try again.");
      }
    });

  const draft = drafts[activeType] ?? "";
  const dirty = draft !== (saved[activeType] ?? "");

  const save = () =>
    startTransition(async () => {
      try {
        await updateGenerationRule(activeType, draft);
        setSaved((s) => ({ ...s, [activeType]: draft }));
        toast.success("Rule saved. New generations use it straight away.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't save the rule",
        );
      }
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Prompt rules"
        description="Extra instructions added to the AI's instructions for every teacher. Use them to fix things the AI keeps getting wrong."
      />

      <nav
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        aria-label="Type of work"
      >
        {CONTENT_TYPES.map((t) => {
          const changed = (drafts[t.id] ?? "") !== (saved[t.id] ?? "");
          return (
            <Button
              key={t.id}
              size="sm"
              variant={t.id === activeType ? "secondary" : "ghost"}
              className="h-11 shrink-0"
              aria-current={t.id === activeType ? "page" : undefined}
              onClick={() => setActiveType(t.id)}
            >
              {t.label}
              {changed && (
                <span
                  className="size-1.5 rounded-full bg-warning"
                  title="Not saved"
                  aria-hidden="true"
                />
              )}
            </Button>
          );
        })}
      </nav>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <label htmlFor="rule" className="text-sm font-medium">
          Rule for{" "}
          {CONTENT_TYPES.find((t) => t.id === activeType)?.label.toLowerCase()}
        </label>
        <Textarea
          id="rule"
          value={draft}
          onChange={(e) =>
            setDrafts((d) => ({ ...d, [activeType]: e.target.value }))
          }
          placeholder="For example: Write learning outcomes exactly as they appear in the KICD design."
          className="min-h-48 text-base sm:text-sm"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            className="h-11"
            disabled={!dirty || isPending}
            onClick={() =>
              setDrafts((d) => ({
                ...d,
                [activeType]: saved[activeType] ?? "",
              }))
            }
          >
            <Undo2 /> Undo changes
          </Button>
          <Button
            className="h-11"
            disabled={!dirty || isPending}
            onClick={save}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save
            rule
          </Button>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              What teachers asked Elimu to change
            </h2>
            <p className="text-sm text-muted-foreground">
              Requests teachers made with Improve. If the same ask keeps coming
              up, add it to the rule.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 shrink-0"
            disabled={asked.length < 3 || isSuggesting || isPending}
            onClick={suggest}
          >
            {isSuggesting ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Suggest a better rule
          </Button>
        </div>
        {asked.length ? (
          <ul className="divide-y text-sm">
            {asked.slice(0, 30).map((r) => (
              <li key={`${r.createdAt}-${r.instruction}`} className="py-2">
                {r.instruction}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No requests yet for this type of work.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          A suggested rule goes into the box above. Nothing changes for teachers
          until you save it.
        </p>
      </section>

      <p className="flex gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Rules apply to every teacher on Elimu from their next generation. Leave
        a rule empty to turn it off.
      </p>
    </div>
  );
}

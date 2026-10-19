"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { answerHeadReview } from "@/lib/actions/pilot";
import { cn } from "@/lib/utils";

const ANSWERS = [
  { value: "ACCEPTED", label: "Yes, accepted" },
  { value: "CHANGES", label: "Asked for changes" },
  { value: "NOT_YET", label: "Not yet" },
] as const;

/** "Did your head teacher accept this?" The pilot's main test is whether heads accept Elimu's documents. */
export function HeadCheck({
  schemeId,
  kind,
  answer,
}: {
  schemeId: string;
  kind: "SCHEME" | "RECORD";
  answer: string | null;
}) {
  const [current, setCurrent] = useState(answer);
  const [isPending, startTransition] = useTransition();
  const doc = kind === "SCHEME" ? "this scheme of work" : "this record of work";

  const choose = (value: string) =>
    startTransition(async () => {
      const before = current;
      setCurrent(value);
      const result = await answerHeadReview({ schemeId, kind, answer: value });
      if (!result.success) {
        setCurrent(before);
        toast.error(result.error);
      } else toast.success("Thank you for telling us");
    });

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-medium">
        Did your head teacher or HOD accept {doc}?
      </h2>
      <div
        role="radiogroup"
        aria-label={`Head teacher's answer for ${doc}`}
        className="flex flex-wrap gap-2"
      >
        {ANSWERS.map((a) => (
          <label
            key={a.value}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3.5 text-sm font-medium transition-colors disabled:opacity-60",
              current === a.value
                ? "border-primary bg-accent text-accent-foreground"
                : "border-input bg-card hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name={`head-check-${kind}`}
              className="sr-only"
              checked={current === a.value}
              disabled={isPending}
              onChange={() => choose(a.value)}
            />
            {a.label}
          </label>
        ))}
      </div>
      {current === "CHANGES" && (
        <p className="text-xs text-muted-foreground">
          Edit the parts they asked about, print again, and tell us here once
          it's accepted.
        </p>
      )}
    </section>
  );
}

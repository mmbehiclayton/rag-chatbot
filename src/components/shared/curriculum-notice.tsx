"use client";

import { Check, Info, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { requestCurriculum } from "@/lib/actions/curriculum-request";
import { cn } from "@/lib/utils";

/** What the teacher is trying to make, for the wording. */
export type NoticeFor = "scheme" | "assessment" | "lesson" | "notes" | "class";

const MESSAGE: Record<NoticeFor, string> = {
  scheme:
    "so Elimu can't write a scheme of work for it without guessing. Try another learning area for now.",
  assessment:
    "so Elimu can't set an assessment for it without guessing. Try another learning area for now.",
  lesson:
    "Elimu can still write a lesson plan, but check the strand, sub-strand and learning outcomes against your design.",
  notes:
    "Elimu can still write notes, but check them against your design before you teach.",
  class:
    "You can still make lesson plans and notes, but check them against your design. Schemes of work and assessments need the design.",
};

/**
 * Says plainly that a class's curriculum design isn't in Elimu yet and what still works,
 * and lets the teacher tell Elimu they need it.
 */
export function CurriculumNotice({
  grade,
  subject,
  kind,
  requested = false,
  className,
}: {
  grade: string;
  subject: string;
  kind: NoticeFor;
  requested?: boolean;
  className?: string;
}) {
  const [sent, setSent] = useState(requested);
  const [isPending, startTransition] = useTransition();
  const blocks = kind === "scheme" || kind === "assessment";

  const ask = () =>
    startTransition(async () => {
      try {
        const result = await requestCurriculum(grade, subject);
        if (!result.ok) return void toast.error(result.error);
        setSent(true);
        toast.success("Thanks. We'll add it as soon as we can.");
      } catch {
        toast.error("That didn't send. Check your connection and try again.");
      }
    });

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-3 text-sm",
        blocks ? "border-warning/40 bg-warning/10" : "bg-card",
        className,
      )}
    >
      <p className="flex gap-2">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <span>
          The curriculum design for {grade} {subject} isn't in Elimu yet
          {blocks ? ", " : ". "}
          {MESSAGE[kind]}
        </span>
      </p>
      {sent ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Check className="size-4 shrink-0 text-success" aria-hidden />
          You've told us you need it. We'll add it as soon as we can.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full bg-card sm:w-auto"
          disabled={isPending}
          onClick={ask}
        >
          {isPending ? <Spinner /> : <Send />} Tell Elimu I need this
        </Button>
      )}
    </div>
  );
}

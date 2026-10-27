"use client";

import { Sparkles, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type ImproveKind,
  improveDocument,
  undoImprove,
} from "@/lib/actions/generation";
import { LESSON_PARTS, type LessonPart } from "@/lib/improve-parts";

const IDEAS: Record<ImproveKind, string[]> = {
  LESSON: [
    "Make it more practical",
    "Add a group activity",
    "Use local examples",
    "Use simpler language",
    "Use only materials a rural school has",
  ],
  NOTES: [
    "Add more worked examples",
    "Use simpler language",
    "Use local examples",
    "Add more questions to ask the class",
  ],
  SCHEME: [
    "Add more practical activities",
    "Use local resources",
    "Add more ways to assess learners",
    "Use simpler language",
  ],
};

const WHAT: Record<ImproveKind, string> = {
  LESSON: "lesson plan",
  NOTES: "lesson notes",
  SCHEME: "scheme of work",
};

const OFFLINE =
  "We lost contact with Elimu. Reload the page in a minute to see if the change was made.";

/** Lets the teacher ask Elimu to change their scheme, lesson plan or notes, with undo. */
export function ImproveButton({
  kind,
  id,
  canUndo,
}: {
  kind: ImproveKind;
  id: string;
  canUndo: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [part, setPart] = useState<LessonPart>("whole");
  const [isPending, startTransition] = useTransition();
  const [isUndoing, startUndo] = useTransition();

  const undo = () =>
    startUndo(async () => {
      try {
        const result = await undoImprove({ kind, id });
        if (!result.ok) return void toast.error(result.error);
        toast.success("Earlier version is back");
        router.refresh();
      } catch {
        toast.error(OFFLINE);
      }
    });

  const submit = () =>
    startTransition(async () => {
      try {
        const result = await improveDocument({
          kind,
          id,
          instruction,
          part: kind === "LESSON" ? part : undefined,
        });
        if (!result.ok) return void toast.error(result.error);
        setOpen(false);
        setInstruction("");
        setPart("whole");
        toast.success(`Your ${WHAT[kind]} has been changed`, {
          description: "Read it through before you use it.",
          action: { label: "Undo", onClick: undo },
        });
        router.refresh();
      } catch {
        toast.error(OFFLINE);
      }
    });

  const addIdea = (idea: string) =>
    setInstruction((text) =>
      text.trim()
        ? `${text.trim().replace(/[.,]$/, "")}. ${idea}.`
        : `${idea}.`,
    );

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogTrigger render={<Button variant="outline" />}>
          <Sparkles /> Improve
        </DialogTrigger>
        <DialogContent className="gap-4 text-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Improve this {WHAT[kind]}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tell Elimu what to change. Everything else stays the same.
            </DialogDescription>
          </DialogHeader>

          {kind === "LESSON" && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Which part?</legend>
              <div className="flex flex-wrap gap-2">
                {LESSON_PARTS.map((p) => (
                  <Button
                    key={p.part}
                    type="button"
                    variant={part === p.part ? "default" : "outline"}
                    aria-pressed={part === p.part}
                    className="min-h-11 rounded-md text-sm font-normal"
                    disabled={isPending}
                    onClick={() => setPart(p.part)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-2">
            {IDEAS[kind].map((idea) => (
              <Button
                key={idea}
                type="button"
                variant="outline"
                className="min-h-11 rounded-md text-sm font-normal"
                disabled={isPending}
                onClick={() => addIdea(idea)}
              >
                {idea}
              </Button>
            ))}
          </div>

          <Textarea
            aria-label="What should Elimu change?"
            placeholder="For example: Add a short song to start the lesson"
            value={instruction}
            maxLength={500}
            rows={4}
            disabled={isPending}
            onChange={(e) => setInstruction(e.target.value)}
            className="text-sm"
          />

          {kind === "SCHEME" && (
            <p className="text-xs text-muted-foreground">
              Lesson plans you have already made from this scheme stay as they
              are.
            </p>
          )}

          <DialogFooter>
            <Button
              size="lg"
              className="w-full"
              disabled={isPending || instruction.trim().length < 3}
              onClick={submit}
            >
              {isPending ? <Spinner /> : <Sparkles />}
              {isPending
                ? `Changing… about ${kind === "SCHEME" ? "a minute" : part !== "whole" ? "10 seconds" : "30 seconds"}`
                : "Make the change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {canUndo && (
        <Button variant="outline" disabled={isUndoing} onClick={undo}>
          {isUndoing ? <Spinner /> : <Undo2 />} Undo change
        </Button>
      )}
    </>
  );
}

"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { showGenerationError } from "@/components/shared/limit-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { generateLessonNotes } from "@/lib/actions/generation";

/** Generates teaching notes for one lesson plan, then opens them. */
export function CreateNotesButton({
  lessonPlanId,
  variant = "outline",
  label = "Create lesson notes",
}: {
  lessonPlanId: string;
  variant?: "default" | "outline";
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // There's no room for a message beside the button, so failures get a toast that stays
  // until the teacher closes it, with Try again.
  const failed = (message: string) =>
    toast.error(message, {
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
      action: { label: "Try again", onClick: run },
    });

  const run = () =>
    startTransition(async () => {
      try {
        const result = await generateLessonNotes(lessonPlanId);
        if (!result.ok) return void showGenerationError(result, failed);
        toast.success("Lesson notes ready");
        router.push(`/dashboard/notes/${result.id}`);
      } catch {
        toast.error(
          "We lost contact with Elimu. Reload this page in a minute: the notes may still have been made.",
          { duration: Number.POSITIVE_INFINITY, closeButton: true },
        );
      }
    });

  return (
    <Button variant={variant} disabled={isPending} onClick={run}>
      {isPending ? <Spinner /> : <NotebookPen />}
      {isPending ? "Writing notes… about 30 seconds" : label}
    </Button>
  );
}

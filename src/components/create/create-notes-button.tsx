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

  return (
    <Button
      variant={variant}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await generateLessonNotes(lessonPlanId);
            if (!result.ok) return void showGenerationError(result);
            toast.success("Lesson notes ready");
            router.push(`/dashboard/notes/${result.id}`);
          } catch {
            toast.error(
              "We lost contact with Elimu. Reload this page in a minute: the notes may still have been made.",
            );
          }
        })
      }
    >
      {isPending ? <Spinner /> : <NotebookPen />}
      {isPending ? "Writing notes… about 30 seconds" : label}
    </Button>
  );
}

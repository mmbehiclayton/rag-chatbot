"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { generateLessonNotes } from "@/lib/actions/generation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
            const notes = await generateLessonNotes(lessonPlanId);
            toast.success("Lesson notes ready");
            router.push(`/dashboard/notes/${notes.id}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create notes. Please try again.");
          }
        })
      }
    >
      {isPending ? <Spinner /> : <NotebookPen />}
      {isPending ? "Writing notes… about 30 seconds" : label}
    </Button>
  );
}

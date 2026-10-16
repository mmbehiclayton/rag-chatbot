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
            const result = await generateLessonNotes(lessonPlanId);
            if (!result.ok) return void toast.error(result.error);
            toast.success("Lesson notes ready");
            router.push(`/dashboard/notes/${result.id}`);
          } catch {
            toast.error("We couldn't reach Elimu. Check your connection and try again.");
          }
        })
      }
    >
      {isPending ? <Spinner /> : <NotebookPen />}
      {isPending ? "Writing notes… about 30 seconds" : label}
    </Button>
  );
}

"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { makeDocument, useStillHere } from "@/components/shared/making";
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
  const [isPending, setPending] = useState(false);
  const here = useStillHere();

  // There's no room for a message beside the button, so failures get a toast that stays
  // until the teacher closes it, with Try again.
  const failed = ({ message, lost }: { message: string; lost?: boolean }) =>
    toast.error(message, {
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
      action: lost ? undefined : { label: "Try again", onClick: run },
    });

  const run = async () => {
    setPending(true);
    await makeDocument({
      what: "lesson notes",
      run: () => generateLessonNotes(lessonPlanId),
      href: (id) => `/dashboard/notes/${id}`,
      router,
      here,
      onError: failed,
      readyMessage: () => "Your lesson notes are ready",
    });
    setPending(false);
  };

  return (
    <Button variant={variant} disabled={isPending} onClick={run}>
      {isPending ? <Spinner /> : <NotebookPen />}
      {isPending ? "Writing notes… about 30 seconds" : label}
    </Button>
  );
}

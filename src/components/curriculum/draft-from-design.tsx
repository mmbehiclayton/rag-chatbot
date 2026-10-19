"use client";

import { FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { draftCurriculumMap } from "@/lib/actions/curriculum-map";

/** Lets a curator start a map from the uploaded curriculum design instead of typing it in. */
export function DraftFromDesign({
  grade,
  subject,
  designTitle,
  hasStrands,
}: {
  grade: string;
  subject: string;
  designTitle: string;
  hasStrands: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await draftCurriculumMap(grade, subject).catch(() => ({
        success: false as const,
        error: "We couldn't reach Elimu. Check your connection and try again.",
      }));
      if (!result.success) return void toast.error(result.error);
      toast.success(
        "Draft ready. Check it against the design before sending it for checking.",
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {hasStrands
              ? "Redo this draft from the curriculum design"
              : "Start from the curriculum design"}
          </p>
          <p className="text-sm text-muted-foreground">
            Elimu reads “{designTitle}” and fills in the strands, sub-strands,
            outcomes, inquiry questions and learning experiences. You then check
            them against the design. It takes a minute or two.
          </p>
        </div>
      </div>
      <Button
        variant={hasStrands ? "outline" : "default"}
        disabled={pending}
        onClick={() => (hasStrands ? setConfirming(true) : run())}
      >
        {pending ? <Spinner /> : <Sparkles />}
        {pending ? "Reading the design…" : "Draft from design"}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything in this map will be replaced with a new draft from the
              design. Changes you have made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my draft</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

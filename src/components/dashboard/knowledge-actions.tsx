"use client";

import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteCurriculum,
  retryCurriculum,
  retryFailedCurricula,
} from "@/lib/actions/curriculum";

export function AutoRefresh({ hasProcessing }: { hasProcessing: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasProcessing) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [hasProcessing, router]);
  return null;
}

export function KnowledgeRefreshButton() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Refresh"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isRefreshing}
    >
      <RefreshCw className={isRefreshing ? "animate-spin" : undefined} />
    </Button>
  );
}

export function DeleteCurriculumButton({
  documentId,
  title,
}: {
  documentId: string;
  title: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCurriculum(documentId);
      if (result.success) toast.success("Curriculum design deleted");
      else toast.error(result.error);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Delete ${title}`}
            disabled={isPending}
          />
        }
      >
        {isPending ? <Spinner /> : <Trash2 />}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this curriculum design?</AlertDialogTitle>
          <AlertDialogDescription>
            Ask Elimu and document generation will stop using “{title}”. Its
            curriculum map, if any, is kept. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Reads the PDF again. Used after a failure, or to add page numbers to designs indexed before they were recorded. */
export function RetryButton({
  documentId,
  label = "Try again",
}: {
  documentId: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={() =>
        startTransition(async () => {
          const result = await retryCurriculum(documentId);
          if (result.success) {
            toast.success(
              "Indexing started. This page updates when it's done.",
            );
            router.refresh();
          } else toast.error(result.error ?? "Couldn't start indexing.");
        })
      }
      disabled={isPending}
    >
      {isPending ? <Spinner /> : <RotateCcw />} {label}
    </Button>
  );
}

/** Reads all failed designs again, a few at a time. */
export function RetryAllButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="h-11 shrink-0"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await retryFailedCurricula();
            if (!result.success) return void toast.error(result.error);
            toast.success(
              `Reading ${result.started} design${result.started > 1 ? "s" : ""} again. This page updates when they're done.`,
              result.left > 0
                ? {
                    description: `${result.left} more after these. Press Try all again once these finish.`,
                  }
                : undefined,
            );
            router.refresh();
          } catch {
            toast.error(
              "We lost contact with Elimu. Reload the page and try again.",
            );
          }
        })
      }
    >
      {isPending ? <Spinner /> : <RefreshCw />} Try all again
      {count > 1 ? ` (${count})` : ""}
    </Button>
  );
}

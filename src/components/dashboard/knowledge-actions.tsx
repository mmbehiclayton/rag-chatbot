"use client";

import { useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteCurriculum, retryCurriculum } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, RefreshCw, RotateCcw } from "lucide-react";
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
      onClick={() => startTransition(() => router.refresh())}
      className="h-12 w-12 rounded-[20px] p-0 border-border/50 bg-background/50 hover:bg-muted transition-all"
      disabled={isRefreshing}
    >
      <RefreshCw className={`w-5 h-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );
}

export function DeleteCurriculumButton({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCurriculum(documentId);
      if (result.success) {
        toast.success("Curriculum document and all its vectors have been completely deleted.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className="h-8 w-8 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors inline-flex items-center justify-center disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[32px] border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl p-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black text-red-500">Delete Knowledge Vectors?</AlertDialogTitle>
          <AlertDialogDescription className="text-base font-medium">
            This will permanently delete this curriculum document and immediately purge all its associated extracted vector chunks from the database. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel className="h-12 rounded-[20px] font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="h-12 rounded-[20px] font-bold bg-red-600 hover:bg-red-700 text-white border-0">
            Yes, Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RetryButton({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await retryCurriculum(documentId);
          if (result.success) toast.success("Re-ingestion queued — page auto-refreshes when complete.");
          else toast.error(result.error ?? "Failed to retry.");
        })
      }
      disabled={isPending}
      title="Retry ingestion"
      className="h-8 w-8 rounded-full hover:bg-orange-500/10 text-muted-foreground hover:text-orange-500 transition-colors inline-flex items-center justify-center disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
    </button>
  );
}

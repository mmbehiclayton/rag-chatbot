"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteJob, reviewJob } from "@/lib/actions/jobs";

function useRun() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const run = (
    action: () => Promise<{ success: boolean; error?: string }>,
    done: string,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.success) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });
  return { isPending, run };
}

/** Staff only: approve a job, or turn it down with a note for the poster. */
export function JobReview({ id }: { id: string }) {
  const { isPending, run } = useRun();
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2 border-t pt-3">
      <Input
        aria-label="Why it can't go up (needed to turn it down)"
        placeholder="Why it can't go up (only if turning it down)"
        maxLength={300}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() =>
            run(
              () => reviewJob({ id, approve: true }),
              "Job is now on the feed",
            )
          }
        >
          Approve
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(
              () => reviewJob({ id, approve: false, note }),
              "Job turned down",
            )
          }
        >
          Turn down
        </Button>
      </div>
    </div>
  );
}

/** The poster or staff take a job down. */
export function JobDelete({ id }: { id: string }) {
  const { isPending, run } = useRun();
  return (
    <Button
      variant="ghost"
      className="text-destructive"
      disabled={isPending}
      onClick={async () => {
        if (
          await confirmAction({
            title: "Take this job down?",
            body: "Teachers won't see it in the staffroom any more.",
            confirm: "Take down",
            destructive: true,
          })
        )
          run(() => deleteJob(id), "Job taken down");
      }}
    >
      Take down
    </Button>
  );
}

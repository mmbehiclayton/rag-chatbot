"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CornerDownRight, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { markLesson } from "@/lib/actions/term-pack";
import type { LessonStatus } from "@/lib/term-pack";
import { Button } from "@/components/ui/button";

/** "Taught" / "Carry over" for one timetabled lesson. Once marked, shows the result with an undo. */
export function MarkLesson({
  schemeId,
  date,
  slot,
  status,
  size = "lg",
}: {
  schemeId: string;
  date: string;
  slot: number;
  status: LessonStatus | null;
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(status);

  const set = (next: LessonStatus | null) =>
    startTransition(async () => {
      setShown(next);
      const result = await markLesson({ schemeId, date, slot, status: next });
      if (!result.success) toast.error(result.error);
      router.refresh();
    });

  if (shown) {
    return (
      <div className="flex items-center gap-2">
        <span className={shown === "TAUGHT" ? "text-sm font-medium text-success" : "text-sm font-medium text-muted-foreground"}>
          {shown === "TAUGHT" ? "Taught" : "Carried over"}
        </span>
        <Button variant="ghost" size={size} onClick={() => set(null)} disabled={isPending}>
          <Undo2 /> Undo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button size={size} onClick={() => set("TAUGHT")} disabled={isPending}>
        <Check /> Taught
      </Button>
      <Button variant="outline" size={size} onClick={() => set("CARRIED_OVER")} disabled={isPending}>
        <CornerDownRight /> Carry over
      </Button>
    </div>
  );
}

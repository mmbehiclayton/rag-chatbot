"use client";

import { Check, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { setChecked } from "@/lib/actions/checked";
import type { CheckableKind } from "@/lib/documents";

const dayFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Nairobi",
});

/** Draft until the teacher reads it through and marks it checked; printouts follow. */
export function CheckButton({
  kind,
  id,
  checkedAt,
  needsReview,
}: {
  kind: CheckableKind;
  id: string;
  checkedAt: string | null;
  needsReview: boolean;
}) {
  const [checked, setCheckedAt] = useState(checkedAt);
  const [isPending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const result = await setChecked(kind, id, !checked);
      if (!result.success) return void toast.error(result.error);
      setCheckedAt(result.checkedAt);
      toast.success(
        result.checkedAt ? "Marked as checked" : "Marked as a draft again",
      );
    });

  if (checked)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="checked" />
        <span className="text-sm text-muted-foreground">
          You checked this on {dayFormat.format(new Date(checked))}.
        </span>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={isPending}
          onClick={toggle}
        >
          <Undo2 /> Undo
        </Button>
      </div>
    );

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={needsReview ? "needsReview" : "draft"} />
      </div>
      <p className="text-sm text-muted-foreground">
        Read it through and change anything that doesn't fit your class. Until
        you mark it as checked, the printout says "Draft – check before use".
      </p>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={isPending}
        onClick={toggle}
      >
        <Check /> {isPending ? "Saving…" : "Mark as checked"}
      </Button>
    </div>
  );
}

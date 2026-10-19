"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewPayment } from "@/lib/actions/pilot";

/** Activate a pass once the code is on the M-Pesa statement, or turn it down with a reason the teacher sees. */
export function PaymentReview({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const send = (approve: boolean) =>
    startTransition(async () => {
      const result = await reviewPayment({ id, approve, note });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        approve ? "Term pass switched on" : "Teacher will see your reason",
      );
      router.refresh();
    });

  if (rejecting)
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why, e.g. code not on the statement"
          aria-label="Reason for turning down this payment"
          maxLength={200}
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            disabled={isPending || !note.trim()}
            onClick={() => send(false)}
          >
            Turn down
          </Button>
          <Button
            variant="ghost"
            disabled={isPending}
            onClick={() => setRejecting(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex gap-2">
      <Button disabled={isPending} onClick={() => send(true)}>
        <Check /> Activate
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => setRejecting(true)}
      >
        <X /> Turn down
      </Button>
    </div>
  );
}

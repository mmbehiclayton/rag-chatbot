"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setCommissionPercent } from "@/lib/actions/pilot";

/** Change the referral commission. Payments from now on use it; earlier ones keep their rate. */
export function CommissionForm({
  percent,
  min,
  max,
}: {
  percent: number;
  min: number;
  max: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(percent));
  const next = Number(value);
  const changed = next !== percent;

  const save = () =>
    startTransition(async () => {
      const result = await setCommissionPercent({ percent: next });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        next ? `Commission is now ${next}%` : "Commission switched off",
      );
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          changed &&
          (await confirmAction(
            next
              ? {
                  title: `Pay ${next}% commission?`,
                  body: `The teacher who invited the payer gets ${next}% of every term payment.`,
                  confirm: "Save",
                }
              : {
                  title: "Stop paying commission?",
                  body: "New payments won't earn commission.",
                  confirm: "Stop commission",
                  destructive: true,
                },
          ))
        )
          save();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="commission">Commission in %</Label>
        <Input
          id="commission"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="sm:w-40"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={
          isPending ||
          !changed ||
          !Number.isInteger(next) ||
          !(next >= min && next <= max)
        }
      >
        {isPending && <Spinner />} Save commission
      </Button>
    </form>
  );
}

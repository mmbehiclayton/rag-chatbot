"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setAllowances } from "@/lib/actions/pilot";
import type { AllowancePlan } from "@/lib/allowance";

const PLANS: { plan: AllowancePlan; label: string }[] = [
  { plan: "trial", label: "Free trial" },
  { plan: "free", label: "Free plan" },
  { plan: "paid", label: "Term pass" },
];

/** Documents a month for each plan. Teachers see the new numbers straight away. */
export function AllowanceForm({
  limits,
  min,
  max,
}: {
  limits: Record<AllowancePlan, number>;
  min: number;
  max: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(() =>
    Object.fromEntries(PLANS.map(({ plan }) => [plan, String(limits[plan])])),
  );
  const next = Object.fromEntries(
    PLANS.map(({ plan }) => [plan, Number(values[plan])]),
  ) as Record<AllowancePlan, number>;
  const changed = PLANS.some(({ plan }) => next[plan] !== limits[plan]);
  const valid = PLANS.every(
    ({ plan }) =>
      Number.isInteger(next[plan]) && next[plan] >= min && next[plan] <= max,
  );

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setAllowances(next);
          if (!result.success) return void toast.error(result.error);
          toast.success("Monthly allowances saved");
          router.refresh();
        });
      }}
    >
      {PLANS.map(({ plan, label }) => (
        <div key={plan} className="space-y-2">
          <Label htmlFor={`allowance-${plan}`}>{label}</Label>
          <Input
            id={`allowance-${plan}`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={values[plan]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [plan]: e.target.value }))
            }
            className="sm:w-28"
            required
          />
        </div>
      ))}
      <Button type="submit" disabled={isPending || !changed || !valid}>
        {isPending && <Spinner />} Save
      </Button>
    </form>
  );
}

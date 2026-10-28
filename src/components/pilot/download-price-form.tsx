"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setDownloadPrices } from "@/lib/actions/downloads";
import { DOC_LABELS, type DocKind } from "@/lib/documents";
import { DOWNLOAD_KINDS } from "@/lib/downloads";

const PLANS = DOWNLOAD_KINDS.map((plan) => ({
  plan,
  label: DOC_LABELS[plan],
}));

/** KES to download one document of each kind. Teachers see the new prices straight away. */
export function DownloadPriceForm({
  prices: limits,
  min,
  max,
}: {
  prices: Record<DocKind, number>;
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
  ) as Record<DocKind, number>;
  const changed = PLANS.some(({ plan }) => next[plan] !== limits[plan]);
  const valid = PLANS.every(
    ({ plan }) =>
      Number.isInteger(next[plan]) && next[plan] >= min && next[plan] <= max,
  );

  return (
    <form
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setDownloadPrices(next);
          if (!result.success) return void toast.error(result.error);
          toast.success("Download prices saved");
          router.refresh();
        });
      }}
    >
      {PLANS.map(({ plan, label }) => (
        <div key={plan} className="space-y-2">
          <Label htmlFor={`price-${plan}`}>{label} (KES)</Label>
          <Input
            id={`price-${plan}`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={values[plan]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [plan]: e.target.value }))
            }
            required
          />
        </div>
      ))}
      <Button
        type="submit"
        className="col-span-2 sm:col-span-1"
        disabled={isPending || !changed || !valid}
      >
        {isPending && <Spinner />} Save
      </Button>
    </form>
  );
}

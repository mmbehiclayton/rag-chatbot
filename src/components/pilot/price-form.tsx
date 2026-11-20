"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmAction } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { setTermPrice } from "@/lib/actions/pilot";

/** Change the term pass price for every teacher. New checkouts use it straight away. */
export function PriceForm({
  price,
  min,
  max,
}: {
  price: number;
  min: number;
  max: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(price));
  const next = Number(value);
  const changed = next !== price;

  const save = () =>
    startTransition(async () => {
      const result = await setTermPrice({ price: next });
      if (!result.success) return void toast.error(result.error);
      toast.success(`Term pass is now KES ${next}`);
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          changed &&
          (await confirmAction({
            title: `Change the term pass to KES ${next}?`,
            body: `It goes from KES ${price} to KES ${next} for all teachers.`,
            confirm: "Change price",
          }))
        )
          save();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="term-price">Price in KES</Label>
        <Input
          id="term-price"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={10}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="sm:w-40"
          required
        />
      </div>
      <Button
        type="submit"
        disabled={isPending || !changed || !(next >= min && next <= max)}
      >
        {isPending && <Spinner />} Save price
      </Button>
    </form>
  );
}

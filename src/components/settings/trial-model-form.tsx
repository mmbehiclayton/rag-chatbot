"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { setTrialModel } from "@/lib/actions/pilot";

/** Staff pick a cheaper writing model for their own documents, to compare before switching everyone. */
export function TrialModelForm({
  current,
  models,
}: {
  current: string | null;
  models: readonly string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(current ?? "");

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setTrialModel(value || null);
          if (!result.success) return void toast.error(result.error);
          toast.success(
            value
              ? `Your documents now use ${value}`
              : "Back to the normal model",
          );
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="trial-model">Model for my documents</Label>
        <NativeSelect
          id="trial-model"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:w-64"
        >
          <NativeSelectOption value="">
            Off (use the normal model)
          </NativeSelectOption>
          {models.map((m) => (
            <NativeSelectOption key={m} value={m}>
              {m}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" disabled={isPending || value === (current ?? "")}>
        {isPending && <Spinner />} Save
      </Button>
    </form>
  );
}

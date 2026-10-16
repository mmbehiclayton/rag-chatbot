"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveLessonRemarks } from "@/lib/actions/term-pack";
import { Input } from "@/components/ui/input";

/** The reflection column of the record of work. Saves when the teacher leaves the field. */
export function LessonRemarks({ schemeId, date, slot, initial }: { schemeId: string; date: string; slot: number; initial: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (value.trim() === saved.trim()) return;
    startTransition(async () => {
      const result = await saveLessonRemarks({ schemeId, date, slot, remarks: value });
      if (!result.success) return void toast.error(result.error);
      setSaved(value);
      toast.success("Reflection saved");
    });
  };

  return (
    <Input
      aria-label="Reflection on this lesson"
      placeholder="Reflection, e.g. most learners met the outcome"
      value={value}
      maxLength={500}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

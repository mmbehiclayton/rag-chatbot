"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveLessonReflection } from "@/lib/actions/generation";

/** The teacher's reflection after the lesson, saved on the plan without opening the editor. */
export function ReflectionForm({
  lessonId,
  initial,
  onRecord,
}: {
  lessonId: string;
  initial: string;
  /** The plan belongs to a scheme, so the reflection also shows on the record of work. */
  onRecord: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const changed = value.trim() !== saved.trim();

  const save = () =>
    startTransition(async () => {
      const result = await saveLessonReflection(lessonId, value);
      if (!result.success) return void toast.error(result.error);
      setSaved(value.trim());
      toast.success("Reflection saved");
    });

  return (
    <div className="space-y-3">
      <label
        htmlFor="reflection"
        className="block text-sm text-muted-foreground"
      >
        Write this after the lesson: what went well, which learners need more
        help, and what you will change.
        {onRecord && " It also goes on your record of work."}
      </label>
      <Textarea
        id="reflection"
        value={value}
        maxLength={2000}
        rows={4}
        disabled={isPending}
        placeholder="e.g. Most learners met the outcome. Five need more practice with fractions."
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        size="lg"
        disabled={!changed || isPending}
        onClick={save}
      >
        {isPending ? "Saving…" : "Save reflection"}
      </Button>
    </div>
  );
}

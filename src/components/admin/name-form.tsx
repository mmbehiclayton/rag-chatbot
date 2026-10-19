"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateProfile, updateSchool } from "@/lib/actions/settings";

const ACTIONS = { profile: updateProfile, school: updateSchool };

/** One name field with a Save button: your own name, or (for a school admin) the school's. */
export function NameForm({
  kind,
  label,
  initial,
}: {
  kind: keyof typeof ACTIONS;
  label: string;
  initial: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await ACTIONS[kind]({ name });
      if (!result.success) return void toast.error(result.error);
      setSaved(name.trim());
      toast.success("Saved");
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor={`${kind}-name`}>{label}</Label>
        <Input
          id={`${kind}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="h-11"
          required
        />
      </div>
      <Button
        type="submit"
        className="h-11"
        disabled={isPending || name.trim() === saved || name.trim().length < 2}
      >
        {isPending && <Spinner />} Save
      </Button>
    </form>
  );
}

"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createSchool, updateTenant } from "@/lib/actions/tenants";

const DEFAULT_QUOTA = 5_000_000;

function TenantFields({
  name,
  quota,
  onName,
  onQuota,
  idPrefix,
}: {
  name: string;
  quota: string;
  onName: (v: string) => void;
  onQuota: (v: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => onName(e.target.value)}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-quota`}>AI tokens a month</Label>
        <Input
          id={`${idPrefix}-quota`}
          type="number"
          inputMode="numeric"
          min={10000}
          step={100000}
          value={quota}
          onChange={(e) => onQuota(e.target.value)}
          required
        />
      </div>
    </div>
  );
}

/** Add a school. Teachers who sign up themselves get their own account, so this is for schools Elimu works with. */
export function AddSchool() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quota, setQuota] = useState(String(DEFAULT_QUOTA));
  const [isPending, startTransition] = useTransition();

  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add school
      </Button>
    );

  const save = () =>
    startTransition(async () => {
      const result = await createSchool({ name, tokenQuota: Number(quota) });
      if (!result.success) return void toast.error(result.error);
      toast.success(`${name.trim()} added`);
      setOpen(false);
      setName("");
      router.refresh();
    });

  return (
    <form
      className="w-full space-y-3 rounded-xl border bg-card p-4 sm:w-md"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <TenantFields
        name={name}
        quota={quota}
        onName={setName}
        onQuota={setQuota}
        idPrefix="new"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || name.trim().length < 2}>
          {isPending && <Spinner />} Add school
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Rename a school or account, or change its monthly AI token limit. */
export function EditTenant({
  id,
  name: initialName,
  quota: initialQuota,
}: {
  id: string;
  name: string;
  quota: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [quota, setQuota] = useState(String(initialQuota));
  const [isPending, startTransition] = useTransition();

  if (!open)
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Edit ${initialName}`}
        onClick={() => setOpen(true)}
      >
        <Pencil />
      </Button>
    );

  const save = () =>
    startTransition(async () => {
      const result = await updateTenant({
        id,
        name,
        tokenQuota: Number(quota),
      });
      if (!result.success) return void toast.error(result.error);
      toast.success("Saved");
      setOpen(false);
      router.refresh();
    });

  return (
    <form
      className="basis-full space-y-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <TenantFields
        name={name}
        quota={quota}
        onName={setName}
        onQuota={setQuota}
        idPrefix={id}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />} Save
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

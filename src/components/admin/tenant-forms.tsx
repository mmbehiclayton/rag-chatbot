"use client";

import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  addPersonToSchool,
  createSchool,
  deleteSchool,
  updateTenant,
} from "@/lib/actions/tenants";

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

/** Add a school admin or a teacher to a school by email. */
export function AddPerson({ id, school }: { id: string; school: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TEACHER">("TEACHER");
  const [isPending, startTransition] = useTransition();

  if (!open)
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Add a person to ${school}`}
        onClick={() => setOpen(true)}
      >
        <UserPlus />
      </Button>
    );

  const save = () =>
    startTransition(async () => {
      const result = await addPersonToSchool({
        schoolId: id,
        email,
        name: name || undefined,
        role,
      });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        result.created
          ? `Added. We've emailed ${email.trim()} a link to set a password.`
          : `${email.trim()} is now in ${school}.`,
      );
      setOpen(false);
      setEmail("");
      setName("");
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-person`}>Name (if they're new)</Label>
          <Input
            id={`${id}-person`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Role</legend>
        <div className="flex gap-2">
          {(
            [
              ["TEACHER", "Teacher"],
              ["ADMIN", "School admin"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={role === value ? "secondary" : "outline"}
              className="h-11"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Someone with an account moves into {school}. Anyone new gets an email
        with a link to set their password.
      </p>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !email.includes("@")}>
          {isPending && <Spinner />} Add person
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Delete a school after a second tap. Its people keep their accounts and work. */
export function DeleteSchool({
  id,
  school,
  people,
}: {
  id: string;
  school: string;
  people: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open)
    return (
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Delete ${school}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
    );

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSchool(id);
      if (!result.success) return void toast.error(result.error);
      toast.success(`${school} deleted`);
      router.refresh();
    });

  return (
    <div className="basis-full space-y-3 rounded-md border border-destructive/40 p-3">
      <p className="text-sm">
        Delete {school}?{" "}
        {people > 0
          ? `Its ${people === 1 ? "1 person keeps their" : `${people} people keep their`} account and work, moved to an account of their own as a teacher. `
          : ""}
        Designs the school uploaded are deleted. This can't be undone.
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" disabled={isPending} onClick={remove}>
          {isPending && <Spinner />} Delete school
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { AuthHeading, FormMessage, PasswordInput } from "@/components/shared/auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <>
      <AuthHeading title="Create your free account" description="Schemes of work, lesson plans and assessments aligned to the KICD curriculum." />

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required className="h-11 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="h-11 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required aria-describedby="password-hint" />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters
          </p>
        </div>

        {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Spinner />} Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import {
  AuthHeading,
  FormMessage,
  PasswordInput,
} from "@/components/shared/auth-parts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { resetPassword } from "@/lib/actions/auth";

function ResetForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, null);
  const token = useSearchParams().get("token");

  if (!token) {
    return (
      <>
        <AuthHeading
          title="This link doesn't work"
          description="The reset link is missing or incomplete. Request a new one."
        />
        <Button
          size="lg"
          className="w-full"
          render={<Link href="/forgot-password" />}
        >
          Request a new link
        </Button>
      </>
    );
  }

  if (state?.success) {
    return (
      <>
        <AuthHeading title="Password updated" />
        <div className="space-y-4">
          <FormMessage tone="success">
            You can now sign in with your new password.
          </FormMessage>
          <Button size="lg" className="w-full" render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Set a new password" />
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Spinner />} Save password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetForm />
    </Suspense>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";
import { AuthHeading, FormMessage } from "@/components/shared/auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, null);

  return (
    <>
      <AuthHeading title="Reset your password" description="Enter your email and we'll send you a link to set a new password." />

      {state?.success ? (
        <div className="space-y-4">
          <FormMessage tone="success">If an account uses that email, a reset link is on its way. Check your inbox and spam folder.</FormMessage>
          <Button size="lg" className="w-full" render={<Link href="/login" />}>
            Back to sign in
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="h-11 text-base" />
          </div>
          {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />} Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

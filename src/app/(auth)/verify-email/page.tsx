"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/actions/auth";
import { AuthHeading, FormMessage } from "@/components/shared/auth-parts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function VerifyForm() {
  const [state, formAction, isPending] = useActionState(verifyEmail, null);
  const params = useSearchParams();
  const token = params.get("token");

  if (params.get("success") === "true") {
    return (
      <>
        <AuthHeading title="Check your email" description="We've sent you a link to confirm your email address." />
        <Button size="lg" className="w-full" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <AuthHeading title="This link doesn't work" description="The confirmation link is missing or incomplete." />
        <Button size="lg" className="w-full" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </>
    );
  }

  if (state?.success) {
    return (
      <>
        <AuthHeading title="Email confirmed" />
        <div className="space-y-4">
          <FormMessage tone="success">Thank you. Your email address is confirmed.</FormMessage>
          <Button size="lg" className="w-full" render={<Link href="/dashboard" />}>
            Continue
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Confirm your email" description="Tap the button to confirm this is your email address." />
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Spinner />} Confirm email
        </Button>
      </form>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyForm />
    </Suspense>
  );
}

"use client";

import { verifyEmail } from "@/lib/actions/auth";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailForm() {
  const [state, formAction, isPending] = useActionState(verifyEmail, null);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const successParam = searchParams.get("success");

  if (successParam === "true") {
    return (
      <div className="text-center pb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto mb-4">
          <MailCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We've sent a verification link to your email address. Please check your terminal console to see the mock email link during development.
        </p>
        <form action={formAction}>
           <input type="hidden" name="token" value="dummy" />
           <Button type="button" onClick={() => window.location.href = "/login"} className="w-full">Back to login</Button>
        </form>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center pb-4">
        <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Link</h1>
        <p className="text-sm text-muted-foreground mb-6">The verification link is missing or invalid.</p>
        <Button onClick={() => window.location.href = "/register"} className="w-full">Sign up again</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center mb-8 relative">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
          <MailCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click the button below to verify your account.
        </p>
      </div>

      {state?.success ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 text-green-500 p-4 rounded-xl border border-green-500/20 text-sm text-center">
            Your email has been successfully verified!
          </div>
          <Button onClick={() => window.location.href = "/login"} className="w-full h-11 text-base font-medium">
            Continue to Login
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          
          {state?.error && (
            <p className="text-sm text-red-500 font-medium pb-2">{state.error}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isPending}>
            {isPending ? "Verifying..." : "Verify My Email"}
          </Button>
        </form>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}

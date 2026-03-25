"use client";

import { resetPassword } from "@/lib/actions/auth";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, null);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="text-center pb-4">
        <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Link</h1>
        <p className="text-sm text-muted-foreground mb-6">The password reset link is missing or invalid.</p>
        <Button render={<Link href="/forgot-password" />} className="w-full">Request new link</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center mb-8 relative">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your new password below.
        </p>
      </div>

      {state?.success ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 text-green-500 p-4 rounded-xl border border-green-500/20 text-sm text-center">
            Your password has been successfully reset!
          </div>
          <Button render={<Link href="/login" />} className="w-full h-11 text-base font-medium">
            Go to login
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" required className="h-11" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required className="h-11" />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500 font-medium pb-2">{state.error}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isPending}>
            {isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}

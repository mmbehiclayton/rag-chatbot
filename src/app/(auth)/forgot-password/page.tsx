"use client";

import { forgotPassword } from "@/lib/actions/auth";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPassword, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {state?.success ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 text-green-500 p-4 rounded-xl border border-green-500/20 text-sm text-center">
              If an account exists with that email, we have sent a reset link to it. (Check your terminal console during development!)
            </div>
            <Button type="button" onClick={() => window.location.href = "/login"} className="w-full h-11 text-base font-medium">
              Return to login
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="mwalimu@school.edu" required className="h-11" />
            </div>

            {state?.error && (
              <p className="text-sm text-red-500 font-medium pb-2">{state.error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isPending}>
              {isPending ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Remembered your password?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

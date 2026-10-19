"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  AuthHeading,
  FormMessage,
  PasswordInput,
} from "@/components/shared/auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/lib/actions/auth";
import { ensureDemoUsers } from "@/lib/actions/demo";

// Demo sign-in is for evaluation builds only; it never renders in production.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_ACCOUNTS = [
  { label: "Teacher", email: "teacher@greenvalley.ac.ke" },
  { label: "School admin", email: "admin@greenvalley.ac.ke" },
  { label: "Super admin", email: "superadmin@elimu.ai" },
];

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const demoLogin = async (email: string) => {
    setDemoLoading(email);
    try {
      const { password } = await ensureDemoUsers();
      const form = formRef.current;
      const emailInput =
        form?.querySelector<HTMLInputElement>('[name="email"]');
      const passwordInput =
        form?.querySelector<HTMLInputElement>('[name="password"]');
      if (emailInput) emailInput.value = email;
      if (passwordInput) passwordInput.value = password;
      form?.requestSubmit();
    } catch {
      setDemoLoading(null);
    }
  };

  return (
    <>
      <AuthHeading
        title="Sign in to Elimu"
        description="Plan your lessons in minutes."
      />

      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="h-11 text-base"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        {state?.error && <FormMessage tone="error">{state.error}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Spinner />} Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Elimu?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create a free account
        </Link>
      </p>

      {DEMO_MODE && (
        <div className="mt-6 space-y-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Demo accounts (evaluation only)
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                variant="outline"
                disabled={!!demoLoading || isPending}
                onClick={() => demoLogin(a.email)}
              >
                {demoLoading === a.email && <Spinner />} {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

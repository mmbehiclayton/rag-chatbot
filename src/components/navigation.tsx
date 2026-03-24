"use client";

import { Button, buttonVariants } from "./ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export const Navigation = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur-md bg-background/60">
      <div className="flex container max-w-5xl h-16 items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <Link href="/">Mwalimu AI</Link>
        </div>

        <div className="flex gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign In
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "default" })}>
              Sign Up
            </Link>
            <Link href="/dashboard" className={`${buttonVariants({ variant: "outline" })} hidden sm:inline-flex`}>
              Dashboard
            </Link>
        </div>
      </div>
    </nav>
  );
};
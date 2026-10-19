"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setTestMode } from "@/lib/actions/pilot";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    on: true,
    label: "Test mode: free for everyone",
    confirm:
      "Turn test mode on? Every teacher can use every class without paying.",
  },
  {
    on: false,
    label: "Payments on: pass required",
    confirm:
      "Turn payments on? After their 14-day trial, teachers keep one free class and need a term pass for the rest.",
  },
] as const;

export function TestModeToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const choose = (option: (typeof OPTIONS)[number]) => {
    if (option.on === on || !window.confirm(option.confirm)) return;
    startTransition(async () => {
      const result = await setTestMode({ on: option.on });
      if (!result.success) return void toast.error(result.error);
      toast.success(
        option.on
          ? "Test mode is on. Nobody needs to pay."
          : "Payments are on.",
      );
      router.refresh();
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Test mode"
      className="flex flex-col gap-2 sm:flex-row"
    >
      {OPTIONS.map((o) => (
        <label
          key={o.label}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3.5 text-sm font-medium transition-colors disabled:opacity-60",
            o.on === on
              ? "border-primary bg-accent text-accent-foreground"
              : "border-input bg-card hover:bg-muted",
          )}
        >
          <input
            type="radio"
            name="test-mode"
            className="sr-only"
            checked={o.on === on}
            disabled={isPending}
            onChange={() => choose(o)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

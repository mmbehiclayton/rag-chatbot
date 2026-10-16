"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large tappable chips for picking one or many short options (grades, learning areas). */
export function ChoiceChips({
  options,
  value,
  onChange,
  multiple = false,
  label,
  className,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  label: string;
  className?: string;
}) {
  const toggle = (option: string) => {
    if (!multiple) return onChange([option]);
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              selected
                ? "border-primary bg-accent text-accent-foreground"
                : "border-input bg-card text-foreground hover:bg-muted"
            )}
          >
            {selected && <Check className="size-4" aria-hidden />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

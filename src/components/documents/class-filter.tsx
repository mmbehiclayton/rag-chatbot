"use client";

import Link from "next/link";
import { CLASS_COOKIE, classKey } from "@/lib/class-filter";
import { cn } from "@/lib/utils";

/**
 * A sideways row of the teacher's classes. The choice is kept in a cookie so the
 * same class stays picked on Schemes, Lesson plans, Notes and Assessments.
 */
export function ClassFilter({
  basePath,
  classes,
  selected,
}: {
  basePath: string;
  classes: { grade: string; subject: string }[];
  /** classKey of the chosen class, or "" for all. */
  selected: string;
}) {
  const remember = (value: string) => {
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read on the server
    document.cookie = `${CLASS_COOKIE}=${encodeURIComponent(value)}; path=/dashboard; max-age=31536000; samesite=lax`;
  };
  const tabs = [
    { key: "", label: "All my classes" },
    ...classes.map((c) => ({
      key: classKey(c),
      label: `${c.grade} ${c.subject}`,
    })),
  ];

  return (
    <nav
      aria-label="Class"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {tabs.map((t) => (
        <Link
          key={t.key || "all"}
          href={`${basePath}?${new URLSearchParams({ class: t.key || "all" })}`}
          onClick={() => remember(t.key || "all")}
          aria-current={t.key === selected ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium whitespace-nowrap",
            t.key === selected
              ? "border-primary bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

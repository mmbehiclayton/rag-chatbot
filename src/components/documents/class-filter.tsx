"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { CLASS_COOKIE, classKey } from "@/lib/class-filter";

/**
 * One dropdown of the teacher's classes, grouped by grade, so the chosen class is always in view.
 * The choice is kept in a cookie so it stays the same on Schemes, Lesson plans, Notes and Assessments.
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const grades = [...new Set(classes.map((c) => c.grade))];

  const choose = (value: string) => {
    const key = value || "all";
    // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read on the server
    document.cookie = `${CLASS_COOKIE}=${encodeURIComponent(key)}; path=/dashboard; max-age=31536000; samesite=lax`;
    startTransition(() =>
      router.push(`${basePath}?${new URLSearchParams({ class: key })}`),
    );
  };

  return (
    <div className="space-y-1">
      <label htmlFor="class-filter" className="text-sm font-medium">
        Class
      </label>
      <NativeSelect
        id="class-filter"
        className="w-full sm:w-80"
        value={selected}
        disabled={isPending}
        onChange={(e) => choose(e.target.value)}
      >
        <NativeSelectOption value="">All my classes</NativeSelectOption>
        {grades.map((grade) => (
          <NativeSelectOptGroup key={grade} label={grade}>
            {classes
              .filter((c) => c.grade === grade)
              .map((c) => (
                <NativeSelectOption key={classKey(c)} value={classKey(c)}>
                  {c.grade} {c.subject}
                </NativeSelectOption>
              ))}
          </NativeSelectOptGroup>
        ))}
      </NativeSelect>
    </div>
  );
}

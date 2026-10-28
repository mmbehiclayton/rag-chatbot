import { Skeleton } from "@/components/ui/skeleton";

/** Shown while a document page loads: the same shape as DocHeader and its sections. */
export function DocSkeleton() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-5"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Opening the document…</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 sm:w-36 sm:flex-none" />
          <Skeleton className="h-11 w-24" />
          <Skeleton className="size-11" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Shown while a class page loads: its title, term tabs and lists. */
export function ClassSkeleton() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-5"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Opening the class…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-24" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

// Shown while any dashboard page loads its data on the server.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

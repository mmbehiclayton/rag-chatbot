"use client";

import { ErrorView } from "@/components/shared/error-view";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorView error={error} retry={unstable_retry} />;
}

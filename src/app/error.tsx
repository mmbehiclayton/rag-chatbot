"use client";

import { ErrorView } from "@/components/shared/error-view";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorView error={error} retry={unstable_retry} homeHref="/" />
    </main>
  );
}

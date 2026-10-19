"use client";

import "./globals.css";

/** Shown only if the root layout itself fails, so it carries its own page shell. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <title>Elimu</title>
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-xl font-semibold">Elimu didn't load</h1>
          <p className="text-sm text-muted-foreground">
            Check your connection and try again. Your saved work is safe.
          </p>
          {error?.digest && (
            <p className="text-xs text-muted-foreground">
              Code: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

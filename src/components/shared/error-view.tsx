"use client";

import { Home, RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const CONNECTIVITY =
  /can'?t reach database|connection|timed out|fetch failed|network|ECONNRESET|ETIMEDOUT|P10(01|02|08|17)/i;

/** What a teacher sees when a page fails: what happened, Try again, and a way home. */
export function ErrorView({
  error,
  retry,
  homeHref = "/dashboard",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}) {
  const [isRetrying, startRetry] = useTransition();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error("Page error:", error);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
  }, [error]);

  const connectivity = offline || CONNECTIVITY.test(error?.message ?? "");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
        {connectivity ? (
          <WifiOff className="size-7" aria-hidden />
        ) : (
          <RefreshCw className="size-7" aria-hidden />
        )}
      </div>
      <div className="max-w-md space-y-1.5">
        <h1 className="text-xl font-semibold">
          {offline
            ? "You're offline"
            : connectivity
              ? "Elimu is reconnecting"
              : "This page didn't load"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {offline
            ? "Check your data or Wi-Fi, then try again. Your saved work is safe."
            : connectivity
              ? "Elimu couldn't reach its data for a moment. This usually clears in a few seconds."
              : "Try again. If it keeps happening, tell us on WhatsApp and share the code below."}
        </p>
        {error?.digest && !connectivity && (
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button
          size="lg"
          disabled={isRetrying}
          onClick={() => startRetry(() => retry())}
        >
          {isRetrying ? <Spinner /> : <RefreshCw />} Try again
        </Button>
        <Button variant="ghost" size="lg" render={<Link href={homeHref} />}>
          <Home /> Go to Home
        </Button>
      </div>
    </div>
  );
}

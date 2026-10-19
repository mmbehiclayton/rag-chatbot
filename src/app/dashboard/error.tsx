"use client";

import { Database, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const isConnectivity =
    /can'?t reach database|connection|timed out|ECONNRESET|ETIMEDOUT|P10(01|02|08|17)/i.test(
      error?.message ?? "",
    );

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-warning/10 text-warning">
        <Database className="size-7" aria-hidden />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-semibold">
          {isConnectivity
            ? "Reconnecting to the server"
            : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isConnectivity
            ? "Elimu couldn't reach its data for a moment. This usually clears in a few seconds."
            : "This page didn't load. Try again, and if it keeps happening, let us know."}
        </p>
      </div>
      <Button onClick={reset} className="h-11">
        <RefreshCw /> Try again
      </Button>
    </div>
  );
}

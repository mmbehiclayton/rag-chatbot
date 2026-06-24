"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw } from "lucide-react";

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

  const isConnectivity = /can'?t reach database|connection|timed out|ECONNRESET|ETIMEDOUT|P10(01|02|08|17)/i.test(
    error?.message ?? ""
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
        <Database className="w-8 h-8" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold tracking-tight">
          {isConnectivity ? "Reconnecting to the server" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isConnectivity
            ? "The database was momentarily unavailable — it may have been waking from sleep. This usually clears within a second."
            : "An unexpected error occurred while loading this page."}
        </p>
      </div>
      <Button onClick={reset} className="gap-2 rounded-xl">
        <RefreshCw className="w-4 h-4" /> Try again
      </Button>
    </div>
  );
}

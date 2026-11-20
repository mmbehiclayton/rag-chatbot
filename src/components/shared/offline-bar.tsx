"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** A strip under the header while the phone has no connection, so failures aren't a surprise. */
export function OfflineBar() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <output className="no-print flex shrink-0 items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm md:px-6">
      <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
      <span>
        You're offline. You can still read what's open; saving and making
        documents need a connection.
      </span>
    </output>
  );
}

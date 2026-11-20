"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Chrome's install event; not in the DOM types yet. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "elimu-install-dismissed";

/** Registers the service worker that shows the offline page. Production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}

/** A card on Home offering to add Elimu to the home screen, until it is installed or closed. */
export function InstallAppCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    if (installed || dismissed) return;
    setHidden(false);
    // iPhones have no install button; Safari's Share menu does it.
    setIosHint(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  if (hidden || (!prompt && !iosHint)) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Smartphone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">Add Elimu to your home screen</p>
        {prompt ? (
          <>
            <p className="text-xs text-muted-foreground">
              Open it like an app, full screen, without looking for the link.
            </p>
            <Button
              className="h-11"
              onClick={async () => {
                await prompt.prompt();
                const { outcome } = await prompt.userChoice;
                setPrompt(null);
                if (outcome === "accepted") setHidden(true);
              }}
            >
              <Download /> Install Elimu
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            In Safari, tap{" "}
            <Share className="inline size-3.5" aria-label="Share" /> then "Add
            to Home Screen".
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground"
        aria-label="Close"
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}

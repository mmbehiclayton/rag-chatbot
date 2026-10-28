"use client";

import { FolderOpen, Ticket } from "lucide-react";
import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LimitInfo } from "@/lib/allowance";

// One dialog for the whole dashboard (mounted in its layout). Any form opens it through
// showGenerationError, so the forms don't each need their own.
let current: LimitInfo | null = null;
const listeners = new Set<() => void>();

function setLimit(info: LimitInfo | null) {
  current = info;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** Shows why a document couldn't be made: the used-up dialog for the monthly limit, a toast otherwise. */
export function showGenerationError(result: {
  error: string;
  limit?: LimitInfo;
}) {
  if (result.limit) setLimit(result.limit);
  else toast.error(result.error);
}

export function LimitDialog() {
  const info = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const close = () => setLimit(null);
  // Focus the main action when it opens, not the first button in the page order.
  const main = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && close()}>
      {info && (
        <DialogContent className="text-sm" initialFocus={main}>
          <DialogHeader>
            <DialogTitle className="pr-8 text-base font-semibold">
              No documents left this month
            </DialogTitle>
            <DialogDescription className="text-sm">
              You've made your {info.limit} for this month. You can make more
              from {info.resetsOn}. Everything you've already made still opens,
              and you can edit it.
            </DialogDescription>
          </DialogHeader>

          {info.pass && (
            <div className="flex gap-2 rounded-md bg-primary/5 p-3">
              <Ticket
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              <p>
                <span className="font-medium">
                  Term pass · KES {info.pass.price}
                </span>
                <span className="block text-muted-foreground">
                  Up to {info.pass.limit} documents a month and every download
                  for {info.pass.term}.
                </span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              onClick={close}
              render={<Link href="/dashboard/lessons" />}
            >
              <FolderOpen /> My documents
            </Button>
            {info.pass ? (
              <Button
                ref={main}
                size="lg"
                onClick={close}
                render={<Link href="/dashboard/profile/plan" />}
              >
                Get a term pass
              </Button>
            ) : (
              <Button ref={main} size="lg" onClick={close}>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

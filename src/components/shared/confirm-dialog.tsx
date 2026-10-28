"use client";

import { useSyncExternalStore } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Request = {
  title: string;
  body?: string;
  /** The label on the button that goes ahead, e.g. "Remove". */
  confirm: string;
  /** Red confirm button, for removing or ending something. */
  destructive?: boolean;
};

// One dialog for the whole app (mounted in the root layout), opened with
// `await confirmAction(...)` in place of window.confirm.
let current:
  | (Request & { open: boolean; resolve: (ok: boolean) => void })
  | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

function answer(ok: boolean) {
  if (!current?.open) return;
  current.resolve(ok);
  // Keep the text while the dialog fades out.
  current = { ...current, open: false };
  emit();
}

/** Asks the user to confirm. Resolves true when they go ahead, false when they cancel. */
export function confirmAction(request: Request): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...request, open: true, resolve };
    emit();
  });
}

export function ConfirmDialog() {
  const req = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  return (
    <AlertDialog
      open={!!req?.open}
      onOpenChange={(open) => !open && answer(false)}
    >
      {req && (
        <AlertDialogContent className="text-sm">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-base font-semibold">
              {req.title}
            </AlertDialogTitle>
            {req.body && (
              <AlertDialogDescription className="text-sm">
                {req.body}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={req.destructive ? "destructive" : "default"}
              onClick={() => answer(true)}
            >
              {req.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

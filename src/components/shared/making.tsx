"use client";

import Link from "next/link";
import type { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { LOST_CONTACT } from "@/components/shared/form-error";
import { showGenerationError } from "@/components/shared/limit-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { GenerationResult } from "@/lib/actions/generation";

/**
 * Documents being made in this tab. The server keeps writing when the teacher leaves the form,
 * so this list lets the rest of the app show it and say when it's ready. It lives in module
 * state, so it survives moving between pages but not a reload.
 */
type Making = { key: number; what: string; detail?: string };

let making: Making[] = [];
let nextKey = 0;
const listeners = new Set<() => void>();
const NONE: Making[] = [];

function set(next: Making[]) {
  making = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useMaking() {
  return useSyncExternalStore(
    subscribe,
    () => making,
    () => NONE,
  );
}

/** For makeDocument's `here`: true while the calling component is on screen. */
export function useStillHere() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return () => mounted.current;
}

const STAYS = { duration: Number.POSITIVE_INFINITY, closeButton: true };

/**
 * Makes a document and then, if the teacher is still on the form, opens it or shows why it
 * failed there. If they have moved on, a toast says it's ready (with Open) or what went wrong.
 *
 * Don't call this inside startTransition: React holds every navigation until a pending async
 * transition ends, so the teacher couldn't leave the page while the document is written.
 */
export async function makeDocument({
  what,
  detail,
  run,
  href,
  router,
  here,
  onError,
  readyMessage,
}: {
  /** e.g. "lesson plan", for the messages. */
  what: string;
  detail?: string;
  run: () => Promise<GenerationResult>;
  /** Where the finished document is. */
  href: (id: string) => string;
  router: ReturnType<typeof useRouter>;
  /** Whether the form that started it is still on screen. */
  here: () => boolean;
  /** Shows a failure in the form, when it's still on screen. */
  onError: (error: { message: string; lost?: boolean }) => void;
  readyMessage?: (result: { reused?: boolean }) => string;
}) {
  const entry = { key: nextKey++, what, detail };
  set([...making, entry]);
  let result: GenerationResult | null;
  try {
    result = await run();
  } catch {
    result = null;
  } finally {
    set(making.filter((m) => m !== entry));
  }

  if (!result) {
    if (here()) onError({ message: LOST_CONTACT, lost: true });
    else
      toast.error(`We lost contact while making your ${what}`, {
        ...STAYS,
        description: "It may still have been made. Check My documents.",
      });
    return;
  }
  if (!result.ok) {
    if (here()) showGenerationError(result, (message) => onError({ message }));
    else if (result.limit) showGenerationError(result);
    else
      toast.error(`Your ${what} wasn't made`, {
        ...STAYS,
        description: result.error,
      });
    return;
  }

  const id = result.id;
  const ready = readyMessage?.(result) ?? `Your ${what} is ready`;
  if (here()) {
    toast.success(ready);
    router.push(href(id));
  } else {
    toast.success(ready, {
      ...STAYS,
      description: detail,
      action: { label: "Open", onClick: () => router.push(href(id)) },
    });
    // The page they're on may list documents.
    router.refresh();
  }
}

/** A small "Making…" link in the header while documents are being made. */
export function MakingIndicator() {
  const list = useMaking();
  if (!list.length) return null;
  return (
    <Link
      href="/dashboard/lessons"
      aria-label={`${list.length} document${list.length === 1 ? "" : "s"} being made`}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:bg-muted"
    >
      <Spinner className="size-4" />
      <span aria-hidden>Making{list.length > 1 ? ` ${list.length}` : ""}</span>
    </Link>
  );
}

/** Rows for the documents still being made, at the top of the document lists. */
export function MakingList() {
  const list = useMaking();
  if (!list.length) return null;
  return (
    <ul className="divide-y rounded-xl border bg-card" aria-live="polite">
      {list.map((m) => (
        <li key={m.key} className="flex items-center gap-3 px-4 py-3">
          <Spinner className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium first-letter:uppercase">
              {m.what} being made…
            </p>
            {m.detail && (
              <p className="truncate text-xs text-muted-foreground">
                {m.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

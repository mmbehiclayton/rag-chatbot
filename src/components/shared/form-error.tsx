"use client";

import { CircleAlert, FolderOpen, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** When the request itself failed, so the document may still have been made. */
export const LOST_CONTACT =
  "We lost contact with Elimu. It may still have finished, so check My documents before you try again.";

/**
 * Why a form couldn't finish, kept on screen (unlike a toast) with a way forward.
 * It scrolls into view when it appears, since the teacher may be at the other end of the form.
 */
export function FormError({
  title,
  message,
  onRetry,
  showDocuments = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  /** Adds a My documents link, for when the document may have been made after all. */
  showDocuments?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={box}
      role="alert"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex gap-2">
        <CircleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
      {(onRetry || showDocuments) && (
        <div className="flex flex-wrap gap-2 pl-6">
          {onRetry && (
            <Button type="button" onClick={onRetry}>
              <RotateCcw /> Try again
            </Button>
          )}
          {showDocuments && (
            <Button
              variant="outline"
              render={<Link href="/dashboard/lessons" />}
            >
              <FolderOpen /> My documents
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

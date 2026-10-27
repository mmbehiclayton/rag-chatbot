"use client";

import { ArrowRight, Download, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDocument } from "@/lib/actions/documents";
import type { DocType } from "@/lib/doc-lists";

const NOUN: Record<DocType, string> = {
  schemes: "scheme of work",
  lessons: "lesson plan",
  notes: "lesson notes",
  assessments: "assessment",
};

/**
 * The ⋯ button at the end of every document's actions: download, links to related documents,
 * and delete (after a confirm). The main actions stay as buttons beside it.
 */
export function DocMoreMenu({
  type,
  id,
  downloadHref,
  links = [],
  deleteNote,
}: {
  type: DocType;
  id: string;
  /** Leave out when the page already has Download as its main button. */
  downloadHref?: string;
  links?: { label: string; href: string }[];
  /** What else goes with it, e.g. "Its lesson notes are deleted too." */
  deleteNote?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const noun = NOUN[type];

  const handleDelete = () =>
    startTransition(async () => {
      const result = await deleteDocument(type, id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} deleted`);
      router.push(`/dashboard/${type}`);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label="More actions"
              disabled={isPending}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {downloadHref && (
            <DropdownMenuItem
              // biome-ignore lint/a11y/useAnchorContent: base-ui renders the item's children into it.
              render={<a href={downloadHref} rel="noopener" target="_blank" />}
            >
              <Download /> Download PDF
            </DropdownMenuItem>
          )}
          {links.map((l) => (
            <DropdownMenuItem key={l.href} render={<Link href={l.href} />}>
              <ArrowRight /> {l.label}
            </DropdownMenuItem>
          ))}
          {(downloadHref || links.length > 0) && <DropdownMenuSeparator />}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteNote ? `${deleteNote} ` : ""}This can't be undone, and it
              doesn't give back a document from your monthly allowance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

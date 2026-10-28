"use client";

import {
  ArrowRight,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { copyDocument, deleteDocument } from "@/lib/actions/documents";
import type { DocType } from "@/lib/doc-lists";
import { TERMS } from "@/lib/kicd-constants";

const NOUN: Record<DocType, string> = {
  schemes: "scheme of work",
  lessons: "lesson plan",
  notes: "lesson notes",
  assessments: "assessment",
};

/** Where a copy goes; the document's own term and year, and the school year now. */
type CopyFrom = {
  term: string | null;
  year: number | null;
  thisYear: number;
  /** A scheme's lesson plans, which can come along. */
  lessons?: number;
};

/**
 * The ⋯ button at the end of every document's actions: PDF and Word, links to related documents,
 * make a copy, and delete (after a confirm). The main actions stay as buttons beside it.
 */
export function DocMoreMenu({
  type,
  id,
  exportHref,
  pdfInMenu = false,
  links = [],
  copy,
  deleteNote,
}: {
  type: DocType;
  id: string;
  /** The /api/export link for this document; the Word file adds &format=docx. */
  exportHref: string;
  /** False when the page already has Download PDF as its main button. */
  pdfInMenu?: boolean;
  links?: { label: string; href: string }[];
  /** Left out for lesson notes, which belong to their lesson plan. */
  copy?: CopyFrom;
  /** What else goes with it, e.g. "Its lesson notes are deleted too." */
  deleteNote?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [copying, setCopying] = useState(false);
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
          {pdfInMenu && (
            <DropdownMenuItem
              // biome-ignore lint/a11y/useAnchorContent: base-ui renders the item's children into it.
              render={<a href={exportHref} />}
            >
              <Download /> Download PDF
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            // No `download`: the file comes as an attachment anyway, and a document that still needs
            // paying for opens its download page instead of saving that page as a .docx.
            // biome-ignore lint/a11y/useAnchorContent: base-ui renders the item's children into it.
            render={<a href={`${exportHref}&format=docx`} />}
          >
            <FileText /> Download Word
          </DropdownMenuItem>
          {links.map((l) => (
            <DropdownMenuItem key={l.href} render={<Link href={l.href} />}>
              <ArrowRight /> {l.label}
            </DropdownMenuItem>
          ))}
          {copy && type !== "notes" && (
            <DropdownMenuItem onClick={() => setCopying(true)}>
              <Copy /> Make a copy
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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

      {copy && type !== "notes" && (
        <CopyDialog
          type={type}
          id={id}
          from={copy}
          open={copying}
          onOpenChange={setCopying}
        />
      )}
    </>
  );
}

function CopyDialog({
  type,
  id,
  from,
  open,
  onOpenChange,
}: {
  type: Exclude<DocType, "notes">;
  id: string;
  from: CopyFrom;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Most copies reuse last year's work this year, or this year's work next year.
  const [term, setTerm] = useState(from.term ?? TERMS[0]);
  const [year, setYear] = useState(
    from.year && from.year < from.thisYear
      ? from.thisYear
      : (from.year ?? from.thisYear) + 1,
  );
  const [withLessons, setWithLessons] = useState(true);
  const years = [
    ...new Set([
      from.thisYear - 1,
      from.thisYear,
      from.thisYear + 1,
      from.year ?? from.thisYear,
    ]),
  ].sort();
  const lessons = type === "schemes" ? (from.lessons ?? 0) : 0;

  const submit = () =>
    startTransition(async () => {
      const result = await copyDocument(
        type,
        id,
        { term, year },
        lessons > 0 && withLessons,
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Copy made for ${term} ${year}`);
      onOpenChange(false);
      router.push(`/dashboard/${type}/${result.id}`);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Make a copy
          </DialogTitle>
          <DialogDescription>
            For the same class in another term or year. It doesn't use your
            monthly allowance. Check the copy before you use it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="copy-term">Term</Label>
            <NativeSelect
              id="copy-term"
              className="w-full"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              {TERMS.map((t) => (
                <NativeSelectOption key={t} value={t}>
                  {t}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="copy-year">Year</Label>
            <NativeSelect
              id="copy-year"
              className="w-full"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <NativeSelectOption key={y} value={y}>
                  {y}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        {lessons > 0 && (
          <label
            htmlFor="copy-lessons"
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3"
          >
            <Checkbox
              id="copy-lessons"
              checked={withLessons}
              onCheckedChange={(c) => setWithLessons(c === true)}
              className="mt-0.5"
            />
            <span>
              Copy its {lessons} lesson {lessons === 1 ? "plan" : "plans"} and
              their lesson notes too
            </span>
          </label>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Spinner /> : <Copy />} Make the copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

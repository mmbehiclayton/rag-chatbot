"use client";

import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type TracedDownload, traceDownload } from "@/lib/actions/pilot";

const DOC_NAMES: Record<string, string> = {
  scheme: "Scheme of work",
  record: "Record of work",
  lesson: "Lesson plan",
  assessment: "Assessment",
  notes: "Lesson notes",
  term: "Term file",
};

/** Type the Ref code from a shared copy to see which account downloaded it. */
export function DownloadTrace() {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<TracedDownload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const look = () =>
    startTransition(async () => {
      const result = await traceDownload({ code });
      setFound(result.success ? result.download : null);
      setError(result.success ? null : result.error);
    });

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          look();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="trace-code">Ref code on the copy</Label>
          <Input
            id="trace-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. K7RM2Q9X"
            maxLength={20}
            autoComplete="off"
            className="uppercase sm:w-48"
            required
          />
        </div>
        <Button type="submit" disabled={isPending || !code.trim()}>
          {isPending ? <Spinner /> : <Search />} Look up
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {found && (
        <dl className="grid gap-x-4 gap-y-1 rounded-md bg-muted/60 p-3 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Teacher</dt>
          <dd>
            {found.teacher} · {found.email}
          </dd>
          <dt className="text-muted-foreground">School</dt>
          <dd>{found.school ?? "Not given"}</dd>
          <dt className="text-muted-foreground">Document</dt>
          <dd>
            {DOC_NAMES[found.docType] ?? found.docType}
            {found.title ? `: ${found.title}` : ""} (
            {found.format === "docx" ? "Word" : "PDF or print"})
          </dd>
          <dt className="text-muted-foreground">Downloaded</dt>
          <dd>
            {new Date(found.at).toLocaleString("en-KE", {
              timeZone: "Africa/Nairobi",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
          <dt className="text-muted-foreground">Last 30 days</dt>
          <dd>
            {found.downloads30d}{" "}
            {found.downloads30d === 1 ? "download" : "downloads"}
          </dd>
        </dl>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markCoverage } from "@/lib/actions/coverage";
import {
  COVERAGE_LABELS,
  COVERAGE_STATUSES,
  type CoverageStatus,
} from "@/lib/coverage";

/** Three taps, one per status, for one sub-strand. Marking it yourself overrides the record of work. */
export function CoverageControl({
  grade,
  subject,
  stream,
  strand,
  subStrand,
  status,
  manual,
  auto,
}: {
  grade: string;
  subject: string;
  stream: string;
  strand: string;
  subStrand: string;
  status: CoverageStatus;
  manual: boolean;
  auto: CoverageStatus | null;
}) {
  const [current, setCurrent] = useState(status);
  const [own, setOwn] = useState(manual);
  const [isPending, startTransition] = useTransition();

  const save = (next: CoverageStatus | null) =>
    startTransition(async () => {
      const before = { current, own };
      setCurrent(next ?? auto ?? "NOT_STARTED");
      setOwn(next !== null);
      const result = await markCoverage({
        grade,
        subject,
        stream,
        strand,
        subStrand,
        status: next,
      });
      if (!result.success) {
        setCurrent(before.current);
        setOwn(before.own);
        toast.error(result.error);
      }
    });

  return (
    <div className="space-y-1">
      <fieldset
        aria-label={`Coverage of ${subStrand}`}
        className="grid grid-cols-3 gap-1"
        disabled={isPending}
      >
        {COVERAGE_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={current === s ? "default" : "outline"}
            aria-pressed={current === s}
            className="min-h-11 px-1 text-xs"
            onClick={() => current !== s && save(s)}
          >
            {COVERAGE_LABELS[s]}
          </Button>
        ))}
      </fieldset>
      {own && auto && auto !== current && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto min-h-11 px-0 text-xs"
          disabled={isPending}
          onClick={() => save(null)}
        >
          Use my record of work ({COVERAGE_LABELS[auto].toLowerCase()})
        </Button>
      )}
    </div>
  );
}

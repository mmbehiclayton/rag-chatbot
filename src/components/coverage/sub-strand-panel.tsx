"use client";

import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { saveSubStrandCoverage } from "@/lib/actions/coverage";
import { type LessonTick, shortDate } from "@/lib/coverage";
import { cn } from "@/lib/utils";

/**
 * A sub-strand's lessons to tick, the day they were taught and "the whole sub-strand is covered",
 * saved together. Lessons marked Taught on the record of work are ticked already and locked here.
 */
export function SubStrandPanel({
  grade,
  subject,
  stream,
  strand,
  subStrand,
  lessons,
  titles,
  ticks,
  confirmed,
  today,
  planHref,
}: {
  grade: string;
  subject: string;
  stream: string;
  strand: string;
  subStrand: string;
  lessons: number;
  /** What each lesson is about; "" where nothing says. */
  titles: string[];
  ticks: LessonTick[];
  /** The teacher has marked the whole sub-strand covered. */
  confirmed: boolean;
  /** "YYYY-MM-DD" in Kenya */
  today: string;
  planHref: string;
}) {
  const fromRecord = new Map(
    ticks.filter((t) => t.source === "record").map((t) => [t.lesson, t.on]),
  );
  const savedMine = new Map(
    ticks.filter((t) => t.source === "mine").map((t) => [t.lesson, t.on]),
  );
  const [mine, setMine] = useState(() => new Set(savedMine.keys()));
  const [covered, setCovered] = useState(confirmed);
  const [autoCovered, setAutoCovered] = useState(false);
  const [date, setDate] = useState(today);
  const [isPending, startTransition] = useTransition();

  const numbers = Array.from({ length: lessons }, (_, i) => i + 1);
  const done = (n: number) => fromRecord.has(n) || mine.has(n);
  const changed =
    covered !== confirmed ||
    mine.size !== savedMine.size ||
    [...mine].some((n) => !savedMine.has(n));

  const toggle = (n: number, on: boolean) => {
    const next = new Set(mine);
    if (on) next.add(n);
    else next.delete(n);
    setMine(next);
    const all = numbers.every((k) => fromRecord.has(k) || next.has(k));
    // Ticking the last lesson finishes the sub-strand; unticking undoes only that.
    if (all && !covered) {
      setCovered(true);
      setAutoCovered(true);
    } else if (!all && autoCovered) {
      setCovered(false);
      setAutoCovered(false);
    }
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveSubStrandCoverage({
        grade,
        subject,
        stream,
        strand,
        subStrand,
        lessons: [...mine],
        date,
        covered,
      });
      if (result.success) toast.success(`${subStrand} saved`);
      else toast.error(result.error);
    });

  const id = (s: string) => `${stream}-${strand}-${subStrand}-${s}`;

  return (
    <div className="space-y-4">
      <fieldset disabled={isPending} className="space-y-1">
        <legend className="mb-2 text-sm font-medium">Lessons</legend>
        <ol className="divide-y rounded-md border">
          {numbers.map((n) => {
            const record = fromRecord.get(n);
            const on = record ?? savedMine.get(n);
            const title = titles[n - 1];
            return (
              <li key={n}>
                <label
                  htmlFor={id(`l${n}`)}
                  className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2.5 text-sm"
                >
                  <Checkbox
                    id={id(`l${n}`)}
                    checked={done(n)}
                    disabled={record !== undefined || isPending}
                    onCheckedChange={(c) => toggle(n, c === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block",
                        done(n) && "text-muted-foreground line-through",
                      )}
                    >
                      {title || `Lesson ${n}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {[
                        title && `Lesson ${n}`,
                        on &&
                          done(n) &&
                          `${record ? "Record of work · " : "Taught "}${shortDate(on)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
        {fromRecord.size > 0 && (
          <p className="text-xs text-muted-foreground">
            Lessons marked taught on your record of work are ticked for you.
          </p>
        )}
      </fieldset>

      <div className="space-y-3 border-t pt-3">
        <div className="space-y-1">
          <label htmlFor={id("date")} className="text-sm font-medium">
            Date taught
          </label>
          <Input
            id={id("date")}
            type="date"
            className="h-11 sm:w-48"
            value={date}
            min={`${today.slice(0, 4)}-01-01`}
            max={today}
            disabled={isPending}
            onChange={(e) => setDate(e.target.value || today)}
          />
          <p className="text-xs text-muted-foreground">
            Used for the lessons you tick now, and for the sub-strand when you
            finish it.
          </p>
        </div>
        <label
          htmlFor={id("covered")}
          className="flex min-h-11 items-center gap-3 text-sm font-medium"
        >
          <Checkbox
            id={id("covered")}
            checked={covered}
            disabled={isPending}
            onCheckedChange={(c) => {
              setCovered(c === true);
              setAutoCovered(false);
            }}
          />
          The whole sub-strand is covered
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-11"
          disabled={!changed || isPending}
          onClick={save}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="outline"
          className="h-11"
          render={<Link href={planHref} />}
        >
          <NotebookPen /> Plan a lesson on this
        </Button>
      </div>
    </div>
  );
}

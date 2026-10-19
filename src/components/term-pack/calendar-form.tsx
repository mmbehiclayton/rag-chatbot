"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { BreaksEditor } from "@/components/term-pack/breaks-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { AcademicYear } from "@/lib/academic-calendar";
import { removeAcademicYear, saveAcademicYear } from "@/lib/actions/calendar";
import {
  defaultHolidays,
  type Holiday,
  type TermBreak,
  teachingDays,
  teachingWeeks,
} from "@/lib/term-pack";

type TermDraft = { opensOn: string; closesOn: string; breaks: TermBreak[] };
type Draft = {
  year: number;
  estimate: boolean;
  terms: TermDraft[]; // always 3: Term 1, 2, 3
  holidays: Holiday[];
};

const STATUS = ["Official", "Estimate"];
const MAX_HOLIDAYS = 40;

function toDraft(y: AcademicYear): Draft {
  return {
    year: y.year,
    estimate: y.estimate,
    terms: [1, 2, 3].map((n) => {
      const t = y.terms.find((x) => x.term === n);
      return t
        ? { opensOn: t.opensOn, closesOn: t.closesOn, breaks: t.breaks }
        : { opensOn: "", closesOn: "", breaks: [] };
    }),
    holidays: y.holidays,
  };
}

function blankYear(year: number): Draft {
  return {
    year,
    estimate: true,
    terms: [1, 2, 3].map(() => ({ opensOn: "", closesOn: "", breaks: [] })),
    holidays: defaultHolidays(year),
  };
}

/** Elimu staff set each school year's terms, breaks and public holidays for every teacher. */
export function CalendarForm({
  years,
  initialYear,
}: {
  years: AcademicYear[];
  initialYear: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextYear = Math.max(initialYear, ...years.map((y) => y.year)) + 1;
  const [selected, setSelected] = useState(initialYear);
  const known = years.find((y) => y.year === selected);
  const [draft, setDraft] = useState<Draft>(() =>
    known ? toDraft(known) : blankYear(selected),
  );

  const pick = (year: number) => {
    const y = years.find((x) => x.year === year);
    setSelected(year);
    setDraft(y ? toDraft(y) : blankYear(year));
  };
  const yearChips = [
    ...years.map((y) => String(y.year)),
    ...(years.some((y) => y.year === nextYear) ? [] : [`Add ${nextYear}`]),
  ];

  const setTerm = (i: number, patch: Partial<TermDraft>) =>
    setDraft((d) => ({
      ...d,
      terms: d.terms.map((t, j) => (j === i ? { ...t, ...patch } : t)),
    }));
  const setHoliday = (i: number, patch: Partial<Holiday>) =>
    setDraft((d) => ({
      ...d,
      holidays: d.holidays.map((h, j) => (j === i ? { ...h, ...patch } : h)),
    }));

  const holidayDates = draft.holidays.map((h) => h.date).filter(Boolean);
  const filled = draft.terms
    .map((t, i) => ({ ...t, term: i + 1 }))
    .filter((t) => t.opensOn || t.closesOn);
  const termValid = (t: TermDraft) =>
    !!t.opensOn &&
    !!t.closesOn &&
    t.opensOn < t.closesOn &&
    t.breaks.every((b) => b.from && b.to && b.from <= b.to);
  const valid =
    filled.length > 0 &&
    filled.every(termValid) &&
    draft.holidays.every((h) => h.date && h.label.trim());

  const save = () =>
    startTransition(async () => {
      const result = await saveAcademicYear({
        year: draft.year,
        estimate: draft.estimate,
        terms: filled,
        holidays: draft.holidays.map((h) => ({
          date: h.date,
          label: h.label.trim(),
        })),
      });
      if (!result.success) return void toast.error(result.error);
      toast.success(`${draft.year} calendar saved for all teachers`);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result = await removeAcademicYear({ year: draft.year });
      if (!result.success) return void toast.error(result.error);
      toast.success(`Saved ${draft.year} calendar removed`);
      router.refresh();
    });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          valid &&
          window.confirm(
            `Save the ${draft.year} calendar? Teachers who haven't set their own dates will use it straight away.`,
          )
        )
          save();
      }}
    >
      <ChoiceChips
        label="School year"
        options={yearChips}
        value={[
          yearChips.find((c) => c.endsWith(String(selected))) ??
            String(selected),
        ]}
        onChange={([c]) => c && pick(Number(c.replace(/\D+/g, "")))}
      />

      {!known && (
        <p className="text-sm text-muted-foreground">
          A new school year. Kenya's fixed public holidays are filled in for
          you; add the terms once the Ministry publishes them.
        </p>
      )}
      {known && !known.saved && (
        <p className="text-sm text-muted-foreground">
          These are Elimu's built-in dates. Save them to confirm or change them.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Status</p>
        <ChoiceChips
          label="Status"
          options={STATUS}
          value={[draft.estimate ? "Estimate" : "Official"]}
          onChange={([s]) =>
            s && setDraft({ ...draft, estimate: s !== "Official" })
          }
        />
        <p className="text-xs text-muted-foreground">
          Teachers see a note to check estimated dates with their school.
        </p>
      </div>

      {draft.terms.map((t, i) => {
        const n = i + 1;
        const summary = termValid(t)
          ? {
              weeks: teachingWeeks({
                ...t,
                year: draft.year,
                term: n,
                holidays: holidayDates,
              }).length,
              days: teachingDays({
                ...t,
                year: draft.year,
                term: n,
                holidays: holidayDates,
              }).length,
            }
          : null;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: always Term 1, 2 and 3 in order
          <Card key={i}>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Term {n}</h2>
                {(t.opensOn || t.closesOn) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setTerm(i, { opensOn: "", closesOn: "", breaks: [] })
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`t${n}-opens`}>Opens</Label>
                  <Input
                    id={`t${n}-opens`}
                    type="date"
                    value={t.opensOn}
                    onChange={(e) => setTerm(i, { opensOn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`t${n}-closes`}>Closes</Label>
                  <Input
                    id={`t${n}-closes`}
                    type="date"
                    value={t.closesOn}
                    onChange={(e) => setTerm(i, { closesOn: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Breaks</p>
                <BreaksEditor
                  idPrefix={`t${n}`}
                  breaks={t.breaks}
                  onChange={(breaks) => setTerm(i, { breaks })}
                />
              </div>
              {summary ? (
                <p className="rounded-md bg-muted p-3 text-sm">
                  {summary.weeks} teaching weeks · {summary.days} school days
                </p>
              ) : (
                !t.opensOn &&
                !t.closesOn && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty if the dates aren't known yet.
                  </p>
                )
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Public holidays</h2>
              <p className="text-xs text-muted-foreground">
                No lessons are planned on these days. Add Eid and any holiday
                the government declares.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fill in Kenya's fixed public holidays again"
              onClick={() =>
                window.confirm(
                  "Replace this list with Kenya's fixed public holidays?",
                ) &&
                setDraft({ ...draft, holidays: defaultHolidays(draft.year) })
              }
            >
              <RotateCcw />
            </Button>
          </div>
          <ul className="space-y-3">
            {draft.holidays.map((h, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id, and keying by date would remount the input while it's edited
              <li key={i} className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor={`h${i}-label`} className="sr-only">
                    Holiday name
                  </Label>
                  <Input
                    id={`h${i}-label`}
                    value={h.label}
                    placeholder="Idd-ul-Fitr"
                    maxLength={60}
                    onChange={(e) => setHoliday(i, { label: e.target.value })}
                  />
                </div>
                <div className="w-40 shrink-0 space-y-2">
                  <Label htmlFor={`h${i}-date`} className="sr-only">
                    Date
                  </Label>
                  <Input
                    id={`h${i}-date`}
                    type="date"
                    value={h.date}
                    min={`${draft.year}-01-01`}
                    max={`${draft.year}-12-31`}
                    onChange={(e) => setHoliday(i, { date: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove ${h.label || "this holiday"}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      holidays: draft.holidays.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {draft.holidays.length < MAX_HOLIDAYS && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  holidays: [...draft.holidays, { date: "", label: "" }],
                })
              }
            >
              <Plus /> Add a holiday
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!valid || isPending}
        >
          {isPending && <Spinner />} Save {draft.year} calendar
        </Button>
        {known?.saved && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() =>
              window.confirm(
                `Remove the saved ${draft.year} calendar? Elimu goes back to its built-in dates for that year, if it has any.`,
              ) && remove()
            }
          >
            Remove saved {draft.year}
          </Button>
        )}
      </div>
    </form>
  );
}

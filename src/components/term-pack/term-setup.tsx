"use client";

import { CalendarCheck, Info, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { BreaksEditor } from "@/components/term-pack/breaks-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { resetTerm, saveTerm, saveTimetable } from "@/lib/actions/term-pack";
import {
  formatDay,
  type Holiday,
  parseStreams,
  streamLabel,
  type TermDates,
  teachingDays,
  teachingWeeks,
  termLabel,
  WEEKDAYS,
  weekdayOf,
} from "@/lib/term-pack";

/** `custom` when the teacher changed the school calendar's dates for this term. */
type TermOption = TermDates & { custom: boolean; estimate: boolean };

/** Term dates and breaks for one term at a time, starting from the school calendar. */
export function TermDatesForm({
  options,
  initial,
  holidays,
}: {
  options: TermOption[];
  initial: string;
  /** Public holidays from the school calendar, so the teacher sees which days are skipped. */
  holidays: Holiday[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(initial);
  const [form, setForm] = useState<TermDates>(
    () => options.find((o) => termLabel(o) === initial) ?? options[0],
  );
  const option = options.find((o) => termLabel(o) === selected);

  const pick = (label: string) => {
    const next = options.find((o) => termLabel(o) === label);
    if (!next) return;
    setSelected(label);
    setForm(next);
  };

  const valid =
    !!form.opensOn &&
    !!form.closesOn &&
    form.opensOn < form.closesOn &&
    form.breaks.every((b) => b.from && b.to && b.from <= b.to);
  const summary = useMemo(() => {
    if (!valid) return null;
    return {
      weeks: teachingWeeks(form).length,
      days: teachingDays(form).length,
    };
  }, [form, valid]);

  const inTerm = holidays.filter(
    (h) =>
      h.date >= form.opensOn &&
      h.date <= form.closesOn &&
      weekdayOf(h.date) <= 5,
  );

  const reset = () =>
    startTransition(async () => {
      const result = await resetTerm({ year: form.year, term: form.term });
      if (!result.success) return void toast.error(result.error);
      toast.success(`${termLabel(form)} is back to the official dates`);
      router.refresh();
    });

  const submit = () =>
    startTransition(async () => {
      const result = await saveTerm(form);
      if (!result.success) return void toast.error(result.error);
      toast.success(`${termLabel(form)} dates saved`);
      router.refresh();
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit();
      }}
    >
      <ChoiceChips
        label="Term"
        options={options.map(termLabel)}
        value={[selected]}
        onChange={([t]) => t && pick(t)}
      />

      {option?.estimate && !option.custom && (
        <p className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          These dates are an estimate. The Ministry hasn't published the{" "}
          {form.year} calendar yet, so check them with your school.
        </p>
      )}
      {option && !option.estimate && !option.custom && (
        <p className="text-sm text-muted-foreground">
          These are the official term dates. Change them only if your school's
          dates differ.
        </p>
      )}
      {option?.custom && (
        <div className="flex flex-col gap-2 rounded-md bg-muted p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2">
            <CalendarCheck
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            You set your school's own dates for this term.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={reset}
          >
            Use the official dates
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opens">School opens</Label>
              <Input
                id="opens"
                type="date"
                value={form.opensOn}
                onChange={(e) => setForm({ ...form, opensOn: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes">School closes</Label>
              <Input
                id="closes"
                type="date"
                value={form.closesOn}
                onChange={(e) => setForm({ ...form, closesOn: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Breaks</p>
              <p className="text-xs text-muted-foreground">
                Half-term, exam days and other days without lessons. Public
                holidays are skipped for you.
              </p>
            </div>
            <BreaksEditor
              idPrefix="term"
              breaks={form.breaks}
              onChange={(breaks) => setForm((f) => ({ ...f, breaks }))}
            />
          </div>

          {inTerm.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Public holidays this term</p>
              <ul className="text-sm text-muted-foreground">
                {inTerm.map((h) => (
                  <li key={h.date}>
                    {h.label} · {formatDay(h.date)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary && (
            <p className="rounded-md bg-muted p-3 text-sm">
              {summary.weeks} teaching weeks · {summary.days} school days
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!valid || isPending}
      >
        {isPending && <Spinner />} Save {termLabel(form)}
      </Button>
    </form>
  );
}

type ClassOption = { grade: string; subject: string };
type Entry = {
  weekday: number;
  period: number;
  startsAt?: string | null;
  grade: string;
  stream: string;
  subject: string;
};
type Option = {
  key: string;
  label: string;
  grade: string;
  stream: string;
  subject: string;
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MAX_PERIODS = 12;
const cellKey = (weekday: number, period: number) => `${weekday}-${period}`;
const classKey = (c: { grade: string; stream: string; subject: string }) =>
  `${c.grade}|${c.stream}|${c.subject}`;

/**
 * The teacher's weekly timetable. Streams are optional: a grade with no streams is one class ("Grade 7"),
 * otherwise each stream ("Grade 7 East") is its own class with its own record of work.
 */
export function TimetableForm({
  classes,
  entries,
  designPerWeek = {},
}: {
  classes: ClassOption[];
  entries: Entry[];
  /** Lessons a week from the KICD design, keyed "grade|subject". */
  designPerWeek?: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const grades = useMemo(
    () => [...new Set(classes.map((c) => c.grade))],
    [classes],
  );
  const [streamText, setStreamText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      grades.map((g) => [
        g,
        [
          ...new Set(
            entries
              .filter((e) => e.grade === g && e.stream)
              .map((e) => e.stream),
          ),
        ].join(", "),
      ]),
    ),
  );
  const [cells, setCells] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries.map((e) => [cellKey(e.weekday, e.period), classKey(e)]),
    ),
  );
  // Start time of each period, "08:20". Kept per day, since some days start later.
  const [times, setTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      entries
        .filter((e) => e.startsAt)
        .map((e) => [cellKey(e.weekday, e.period), e.startsAt ?? ""]),
    ),
  );
  // Setting a period's time fills the same period on days that have no time yet.
  const setTime = (weekday: number, period: number, value: string) =>
    setTimes((t) => {
      const next = { ...t, [cellKey(weekday, period)]: value };
      if (value)
        for (let d = 1; d <= 5; d++)
          if (!t[cellKey(d, period)]) next[cellKey(d, period)] = value;
      return next;
    });
  const [day, setDay] = useState(1);
  const [periods, setPeriods] = useState(() =>
    Math.min(MAX_PERIODS, Math.max(8, ...entries.map((e) => e.period))),
  );

  // Every class the teacher can put on the timetable: each learning area in each stream of its grade.
  const options = useMemo(() => {
    const list: Option[] = [];
    for (const c of classes) {
      const streams = parseStreams(streamText[c.grade] ?? "");
      for (const stream of streams.length ? streams : [""]) {
        list.push({
          key: classKey({ ...c, stream }),
          label: `${streamLabel(c.grade, stream)} · ${c.subject}`,
          ...c,
          stream,
        });
      }
    }
    return list;
  }, [classes, streamText]);
  const byKey = useMemo(
    () => new Map(options.map((o) => [o.key, o])),
    [options],
  );
  const valid = (k: string | undefined) => (k && byKey.has(k) ? k : "");

  const filled = Object.entries(cells).filter(([, k]) => valid(k));
  const perWeek = new Map<string, number>();
  for (const [, k] of filled) perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  const perDay = (d: number) =>
    filled.filter(([c]) => c.startsWith(`${d}-`)).length;
  const dayChip = (d: number) =>
    perDay(d) ? `${WEEKDAYS[d - 1]} · ${perDay(d)}` : WEEKDAYS[d - 1];

  const submit = () =>
    startTransition(async () => {
      const rows = filled.flatMap(([c, k]) => {
        const [weekday, period] = c.split("-").map(Number);
        const o = byKey.get(k);
        if (!o) return [];

        return [
          {
            weekday,
            period,
            startsAt: times[c] || null,
            grade: o.grade,
            stream: o.stream,
            subject: o.subject,
          },
        ];
      });
      const result = await saveTimetable(rows);
      if (!result.success) return void toast.error(result.error);
      toast.success("Timetable saved");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Streams</p>
          <p className="text-xs text-muted-foreground">
            Only if your school has more than one class in a grade. Leave it
            empty when the grade is one class.
          </p>
        </div>
        {grades.map((g) => (
          <div key={g} className="space-y-2">
            <Label htmlFor={`streams-${g}`}>{g} streams you teach</Label>
            <Input
              id={`streams-${g}`}
              value={streamText[g] ?? ""}
              placeholder="e.g. East, West"
              maxLength={200}
              onChange={(e) =>
                setStreamText((t) => ({ ...t, [g]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Your lessons each day</p>
          <p className="text-xs text-muted-foreground">
            Pick the class you teach in each period and the time it starts. The
            same class in two periods makes a double lesson.
          </p>
        </div>
        <ChoiceChips
          label="Day"
          options={[1, 2, 3, 4, 5].map(dayChip)}
          value={[dayChip(day)]}
          onChange={([v]) =>
            v && setDay(WEEKDAYS.findIndex((d) => v.startsWith(d)) + 1)
          }
        />
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{DAY_NAMES[day - 1]}</p>
            {Array.from({ length: periods }, (_, i) => i + 1).map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Label
                  htmlFor={`cell-${day}-${p}`}
                  className="w-16 shrink-0 text-muted-foreground"
                >
                  Period {p}
                </Label>
                <Input
                  type="time"
                  aria-label={`Period ${p} starts at`}
                  className="h-11 w-28 shrink-0"
                  value={times[cellKey(day, p)] ?? ""}
                  onChange={(e) => setTime(day, p, e.target.value)}
                />
                <NativeSelect
                  id={`cell-${day}-${p}`}
                  className="w-full min-w-0 flex-1"
                  value={valid(cells[cellKey(day, p)])}
                  onChange={(e) =>
                    setCells((c) => ({
                      ...c,
                      [cellKey(day, p)]: e.target.value,
                    }))
                  }
                >
                  <option value="">No lesson</option>
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ))}
            {periods < MAX_PERIODS && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPeriods((n) => n + 1)}
              >
                <Plus /> Add a period
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {perWeek.size > 0 && (
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {options
            .filter((o) => perWeek.has(o.key))
            .map((o) => {
              const count = perWeek.get(o.key) ?? 0;
              const design = designPerWeek[`${o.grade}|${o.subject}`];
              return (
                <li key={o.key} className="space-y-0.5 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{o.label}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {count} {count === 1 ? "lesson" : "lessons"} a week
                    </span>
                  </div>
                  {design && design !== count && (
                    <p className="text-xs text-warning">
                      The KICD design gives {design} a week.
                    </p>
                  )}
                </li>
              );
            })}
        </ul>
      )}

      <Button
        size="lg"
        className="w-full sm:w-auto"
        onClick={submit}
        disabled={isPending}
      >
        {isPending && <Spinner />} Save timetable
      </Button>
    </div>
  );
}

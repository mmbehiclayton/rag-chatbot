"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveTerm, saveTimetables } from "@/lib/actions/term-pack";
import { WEEKDAYS, teachingDays, teachingWeeks, termLabel, type TermDates } from "@/lib/term-pack";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type TermOption = TermDates & { saved: boolean; estimate: boolean };

/** Term dates and breaks for one term at a time. */
export function TermDatesForm({ options, initial }: { options: TermOption[]; initial: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(initial);
  const [form, setForm] = useState<TermDates>(() => options.find((o) => termLabel(o) === initial) ?? options[0]);
  const option = options.find((o) => termLabel(o) === selected);

  const pick = (label: string) => {
    const next = options.find((o) => termLabel(o) === label);
    if (!next) return;
    setSelected(label);
    setForm(next);
  };

  const valid = !!form.opensOn && !!form.closesOn && form.opensOn < form.closesOn && form.breaks.every((b) => b.from && b.to && b.from <= b.to);
  const summary = useMemo(() => {
    if (!valid) return null;
    return { weeks: teachingWeeks(form).length, days: teachingDays(form).length };
  }, [form, valid]);

  const setBreak = (i: number, patch: Partial<TermDates["breaks"][number]>) =>
    setForm((f) => ({ ...f, breaks: f.breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));

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
      <ChoiceChips label="Term" options={options.map(termLabel)} value={[selected]} onChange={([t]) => t && pick(t)} />

      {option?.estimate && !option.saved && (
        <p className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          These dates are an estimate. The Ministry hasn't published the {form.year} calendar yet, so check them with your school.
        </p>
      )}
      {option && !option.estimate && !option.saved && (
        <p className="text-sm text-muted-foreground">Filled in from the Ministry of Education calendar. Change them if your school's dates differ.</p>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opens">School opens</Label>
              <Input id="opens" type="date" value={form.opensOn} onChange={(e) => setForm({ ...form, opensOn: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes">School closes</Label>
              <Input id="closes" type="date" value={form.closesOn} onChange={(e) => setForm({ ...form, closesOn: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Breaks</p>
              <p className="text-xs text-muted-foreground">
                Half-term, exam days and other days without lessons. Public holidays are skipped for you, except Eid.
              </p>
            </div>
            {form.breaks.map((b, i) => (
              <div key={i} className="space-y-3 rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`break-${i}`}>Name</Label>
                    <Input
                      id={`break-${i}`}
                      value={b.label}
                      placeholder="Half-term break"
                      maxLength={60}
                      onChange={(e) => setBreak(i, { label: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Remove ${b.label || "this break"}`}
                    onClick={() => setForm((f) => ({ ...f, breaks: f.breaks.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`break-from-${i}`}>From</Label>
                    <Input id={`break-from-${i}`} type="date" value={b.from} onChange={(e) => setBreak(i, { from: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`break-to-${i}`}>To</Label>
                    <Input id={`break-to-${i}`} type="date" value={b.to} onChange={(e) => setBreak(i, { to: e.target.value })} required />
                  </div>
                </div>
              </div>
            ))}
            {form.breaks.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, breaks: [...f.breaks, { from: "", to: "", label: "" }] }))}
              >
                <Plus /> Add a break
              </Button>
            )}
          </div>

          {summary && (
            <p className="rounded-md bg-muted p-3 text-sm">
              {summary.weeks} teaching weeks · {summary.days} school days
            </p>
          )}
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!valid || isPending}>
        {isPending && <Spinner />} Save {termLabel(form)}
      </Button>
    </form>
  );
}

type ClassDays = { grade: string; subject: string; days: number[] };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** How many lessons each class has on each weekday. Tapping a day cycles 0 → 1 → 2 lessons. */
export function TimetableForm({ classes }: { classes: ClassDays[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(classes);

  const count = (days: number[], d: number) => days.filter((x) => x === d).length;
  const cycle = (i: number, d: number) =>
    setRows((rs) =>
      rs.map((r, j) => {
        if (j !== i) return r;
        const n = (count(r.days, d) + 1) % 3;
        return { ...r, days: [...r.days.filter((x) => x !== d), ...Array(n).fill(d)].sort() };
      })
    );

  const submit = () =>
    startTransition(async () => {
      const result = await saveTimetables(rows);
      if (!result.success) return void toast.error(result.error);
      toast.success("Timetable saved");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={`${r.grade}|${r.subject}`}>
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {r.grade} · {r.subject}
                  </p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {r.days.length} {r.days.length === 1 ? "lesson" : "lessons"} a week
                  </p>
                </div>
                <div role="group" aria-label={`${r.grade} ${r.subject} lessons by day`} className="grid grid-cols-5 gap-2">
                  {WEEKDAYS.map((name, di) => {
                    const n = count(r.days, di + 1);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => cycle(i, di + 1)}
                        aria-label={`${DAY_NAMES[di]}: ${n === 0 ? "no lesson" : n === 1 ? "1 lesson" : "double lesson"}`}
                        className={cn(
                          "flex min-h-14 flex-col items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                          n > 0 ? "border-primary bg-accent text-accent-foreground" : "border-input bg-card text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {name}
                        <span className="text-xs">{n === 0 ? "–" : n === 1 ? "1" : "2"}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Tap a day once for one lesson, twice for a double lesson, and again to clear it.</p>
      <Button size="lg" className="w-full sm:w-auto" onClick={submit} disabled={isPending}>
        {isPending && <Spinner />} Save timetable
      </Button>
    </div>
  );
}

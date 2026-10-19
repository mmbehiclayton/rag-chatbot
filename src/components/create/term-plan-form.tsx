"use client";

import { CalendarDays, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GenerationProgress } from "@/components/create/generation-progress";
import {
  defaultGradeSubject,
  GradeSubjectPicker,
} from "@/components/create/grade-subject-picker";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateAssessment,
  generateSchemeOfWork,
} from "@/lib/actions/generation";
import type { GradeOption } from "@/lib/curriculum-options";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const ASSESSMENT_TYPES = ["Opener", "Mid-term", "End of term"];
const MARKS = ["30", "50", "100"];

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
        required
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The teacher's saved terms, keyed "Term 1"…"Term 3": teaching weeks and timetabled lessons per class ("grade|subject"). */
export type TermCalendar = Record<
  string,
  {
    year: number;
    label: string;
    weeks: number;
    opensOn: string;
    lessons: Record<string, number>;
    perWeek: Record<string, number>;
  }
>;

/** Form for the curriculum-grounded generators: scheme of work and assessment. */
export function TermPlanForm({
  kind,
  grades,
  myGrades,
  mySubjects,
  curricula,
  calendar = {},
  designPerWeek = {},
  initialTerm,
}: {
  kind: "scheme" | "assessment";
  grades: GradeOption[];
  myGrades: string[];
  mySubjects: string[];
  curricula: string[];
  calendar?: TermCalendar;
  /** Lessons a week from the KICD design, keyed "grade|subject". */
  designPerWeek?: Record<string, number>;
  initialTerm?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState(() =>
    defaultGradeSubject(grades, myGrades, mySubjects),
  );
  const [term, setTerm] = useState(initialTerm ?? "Term 1");
  const [weeks, setWeeks] = useState(12);
  const [breakWeeks, setBreakWeeks] = useState(1);
  // Null until the teacher types a number, so it follows the design for whichever class is picked.
  const [perWeekInput, setPerWeekInput] = useState<number | null>(null);
  const [duration, setDuration] = useState("40 min");
  const [forceFresh, setForceFresh] = useState(false);
  const [assessmentType, setAssessmentType] = useState("End of term");
  const [marks, setMarks] = useState("50");

  const hasCurriculum = curricula.includes(`${target.grade}|${target.subject}`);
  const termDates = calendar[term];
  const classKey = `${target.grade}|${target.subject}`;
  const designWeek = designPerWeek[classKey];
  const lessonsPerWeek = perWeekInput ?? designWeek ?? 5;
  // With saved term dates and a timetable for this class, the lesson count comes from real dates.
  const fromCalendar =
    kind === "scheme" && termDates && termDates.lessons[classKey] > 0
      ? termDates
      : null;
  const numbersValid =
    kind === "assessment" ||
    !!fromCalendar ||
    (weeks >= 4 &&
      weeks <= 16 &&
      breakWeeks >= 0 &&
      breakWeeks < weeks &&
      lessonsPerWeek >= 1 &&
      lessonsPerWeek <= 10);
  const ready =
    !!target.grade && !!target.subject && hasCurriculum && numbersValid;
  const durationMinutes = Number.parseInt(duration, 10);

  const submit = () => {
    startTransition(async () => {
      try {
        if (kind === "scheme") {
          const result = await generateSchemeOfWork({
            ...target,
            term,
            durationMinutes,
            forceFresh,
            ...(fromCalendar
              ? {
                  weeks: fromCalendar.weeks,
                  holidays: 0,
                  lessonsPerWeek: fromCalendar.perWeek[classKey],
                  year: fromCalendar.year,
                  totalLessons: fromCalendar.lessons[classKey],
                }
              : { weeks, holidays: breakWeeks, lessonsPerWeek }),
          });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Scheme of work ready");
          router.push(`/dashboard/schemes/${result.id}`);
        } else {
          const result = await generateAssessment({
            ...target,
            term,
            type: `${assessmentType} assessment`,
            totalMarks: Number.parseInt(marks, 10),
            durationMinutes: 60,
          });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Assessment ready");
          router.push(`/dashboard/assessments/${result.id}`);
        }
      } catch {
        // Only reached when the request itself fails, e.g. the connection dropped.
        toast.error(
          "We couldn't reach Elimu. Check your connection and try again.",
        );
      }
    });
  };

  if (isPending) {
    return (
      <GenerationProgress
        title={
          kind === "scheme"
            ? "Writing your scheme of work"
            : "Writing your assessment"
        }
        detail={`${target.grade} ${target.subject} · ${term}`}
        estimate={
          kind === "scheme"
            ? "A full term takes 1 to 2 minutes. Please keep this page open."
            : "This usually takes under a minute. Please keep this page open."
        }
      />
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) submit();
      }}
    >
      <Card>
        <CardContent className="space-y-5">
          <GradeSubjectPicker
            grades={grades}
            myGrades={myGrades}
            mySubjects={mySubjects}
            value={target}
            onChange={(t) => {
              setTarget(t);
              setPerWeekInput(null);
            }}
          />

          {target.grade && target.subject && !hasCurriculum && (
            <p className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
              <Info
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden
              />
              The curriculum design for {target.grade} {target.subject} isn't in
              Elimu yet, so this can't be created. Try another learning area, or
              ask your school admin to add it.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Term</p>
            <ChoiceChips
              label="Term"
              options={TERMS}
              value={[term]}
              onChange={([t]) => t && setTerm(t)}
            />
          </div>

          {kind === "scheme" ? (
            <>
              {fromCalendar ? (
                <div className="flex gap-3 rounded-md bg-muted p-3 text-sm">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <p>
                    From your {fromCalendar.label} dates and timetable:{" "}
                    {fromCalendar.weeks} teaching weeks,{" "}
                    {fromCalendar.lessons[classKey]} lessons.{" "}
                    {designWeek &&
                      designWeek !== fromCalendar.perWeek[classKey] &&
                      `Your timetable has ${fromCalendar.perWeek[classKey]} a week, but the KICD design gives ${designWeek}. `}
                    <Link
                      href="/dashboard/profile/term"
                      className="font-medium text-primary hover:underline"
                    >
                      Change
                    </Link>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link
                    href="/dashboard/profile/term"
                    className="font-medium text-primary hover:underline"
                  >
                    Add your term dates and timetable
                  </Link>{" "}
                  so the scheme follows your real weeks and lessons.
                </p>
              )}
              {!fromCalendar && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    id="weeks"
                    label="Weeks in the term"
                    value={weeks}
                    onChange={setWeeks}
                    min={4}
                    max={16}
                  />
                  <NumberField
                    id="break"
                    label="Break weeks"
                    hint="Half-term and exam weeks"
                    value={breakWeeks}
                    onChange={setBreakWeeks}
                    min={0}
                    max={4}
                  />
                  <NumberField
                    id="lessons"
                    label="Lessons per week"
                    hint={
                      designWeek
                        ? `The KICD design gives ${designWeek}`
                        : undefined
                    }
                    value={lessonsPerWeek}
                    onChange={setPerWeekInput}
                    min={1}
                    max={10}
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">Lesson length</p>
                <ChoiceChips
                  label="Lesson length"
                  options={["30 min", "35 min", "40 min"]}
                  value={[duration]}
                  onChange={([d]) => d && setDuration(d)}
                />
              </div>
              <label
                htmlFor="force-fresh"
                className="flex min-h-11 items-start gap-3 text-sm"
              >
                <Checkbox
                  id="force-fresh"
                  checked={forceFresh}
                  onCheckedChange={(checked) => setForceFresh(checked === true)}
                  className="mt-0.5"
                />
                <span>
                  Write a new version
                  <span className="block text-xs text-muted-foreground">
                    By default Elimu reuses a reviewed scheme for the same class
                    and term, which is instant and saves your monthly allowance.
                  </span>
                </span>
              </label>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Type</p>
                <ChoiceChips
                  label="Assessment type"
                  options={ASSESSMENT_TYPES}
                  value={[assessmentType]}
                  onChange={([t]) => t && setAssessmentType(t)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Total marks</p>
                <ChoiceChips
                  label="Total marks"
                  options={MARKS}
                  value={[marks]}
                  onChange={([m]) => m && setMarks(m)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={!ready}>
        {kind === "scheme" ? "Create scheme of work" : "Create assessment"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Always review AI-generated content before you use it.
      </p>
    </form>
  );
}

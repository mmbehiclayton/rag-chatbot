"use client";

import { useState } from "react";
import type { GradeOption } from "@/lib/curriculum-options";
import { ChoiceChips } from "@/components/shared/choice-chips";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type GradeSubject = { grade: string; subject: string };

/**
 * Grade + learning area picker. Shows the teacher's own grades and learning areas
 * as chips (pre-selected), with "Other…" falling back to the full curriculum list.
 */
export function GradeSubjectPicker({
  grades,
  myGrades,
  mySubjects,
  value,
  onChange,
}: {
  grades: GradeOption[];
  myGrades: string[];
  mySubjects: string[];
  value: GradeSubject;
  onChange: (next: GradeSubject) => void;
}) {
  const known = (g: string) => grades.some((o) => o.name === g);
  const ownGrades = myGrades.filter(known);
  const [showAll, setShowAll] = useState(ownGrades.length === 0);

  const subjectsFor = (grade: string) => grades.find((g) => g.name === grade)?.learningAreas ?? [];
  const gradeSubjects = subjectsFor(value.grade);
  const ownSubjects = mySubjects.filter((s) => gradeSubjects.includes(s));

  const pickGrade = (grade: string) => {
    const options = subjectsFor(grade);
    const keep = options.includes(value.subject) ? value.subject : (mySubjects.find((s) => options.includes(s)) ?? "");
    onChange({ grade, subject: keep });
  };

  if (showAll) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade">Grade</Label>
          <NativeSelect id="grade" className="w-full" value={value.grade} onChange={(e) => pickGrade(e.target.value)} required>
            <NativeSelectOption value="" disabled>
              Choose grade
            </NativeSelectOption>
            {grades.map((g) => (
              <NativeSelectOption key={g.name} value={g.name}>
                {g.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Learning area</Label>
          <NativeSelect
            id="subject"
            className="w-full"
            value={value.subject}
            onChange={(e) => onChange({ ...value, subject: e.target.value })}
            disabled={!value.grade}
            required
          >
            <NativeSelectOption value="" disabled>
              Choose learning area
            </NativeSelectOption>
            {gradeSubjects.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {s}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {ownGrades.length > 0 && (
          <button type="button" className="text-left text-sm font-medium text-primary hover:underline sm:col-span-2" onClick={() => setShowAll(false)}>
            Show only my grades
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Grade</p>
        <ChoiceChips label="Grade" options={ownGrades} value={[value.grade]} onChange={([g]) => g && pickGrade(g)} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Learning area</p>
        {ownSubjects.length > 0 ? (
          <ChoiceChips
            label="Learning area"
            options={ownSubjects}
            value={[value.subject]}
            onChange={([s]) => s && onChange({ ...value, subject: s })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">None of your learning areas are taught in {value.grade}.</p>
        )}
      </div>
      <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setShowAll(true)}>
        Other grade or learning area…
      </button>
    </div>
  );
}

/** Starting value: the teacher's first grade and a learning area taught in it. */
export function defaultGradeSubject(grades: GradeOption[], myGrades: string[], mySubjects: string[]): GradeSubject {
  const grade = myGrades.find((g) => grades.some((o) => o.name === g)) ?? "";
  const options = grades.find((g) => g.name === grade)?.learningAreas ?? [];
  return { grade, subject: mySubjects.find((s) => options.includes(s)) ?? "" };
}

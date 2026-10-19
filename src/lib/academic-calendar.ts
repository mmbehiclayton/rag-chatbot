import { cache } from "react";
import { z } from "zod";
import { db, withDbRetry } from "@/lib/db";
import {
  DEFAULT_TERMS,
  defaultHolidays,
  isIsoDate,
  type TermDates,
} from "@/lib/term-pack";

/**
 * The school calendar every teacher starts from: term dates, breaks (half-term) and public holidays
 * for each school year. Elimu staff set it on the School calendar page; it is kept as one
 * PlatformSetting row. Years without a saved calendar use the built-in dates in term-pack.ts.
 * Teachers can still change a term's dates for their own school (TeacherTerm).
 */
export const CALENDAR_KEY = "academicCalendar";

const isoDate = z.string().refine(isIsoDate, "Choose a date.");

export const CalendarTermSchema = z.object({
  term: z.number().int().min(1).max(3),
  opensOn: isoDate,
  closesOn: isoDate,
  breaks: z
    .array(
      z.object({
        from: isoDate,
        to: isoDate,
        label: z.string().trim().max(60),
      }),
    )
    .max(10),
});

export const AcademicYearSchema = z.object({
  year: z.number().int().min(2024).max(2100),
  /** True while the Ministry hasn't published the year's calendar. */
  estimate: z.boolean(),
  terms: z.array(CalendarTermSchema).min(1).max(3),
  holidays: z
    .array(z.object({ date: isoDate, label: z.string().trim().min(1).max(60) }))
    .max(40),
});

export type AcademicYear = z.infer<typeof AcademicYearSchema> & {
  /** False when the year comes from the built-in dates, not a calendar Elimu staff saved. */
  saved: boolean;
};

const SavedSchema = z.object({ years: z.array(AcademicYearSchema) });

/** The years Elimu staff saved, or [] when nothing (or nothing valid) is saved. */
export async function savedYears() {
  const row = await withDbRetry(() =>
    db.platformSetting.findUnique({
      where: { key: CALENDAR_KEY },
      select: { value: true },
    }),
  ).catch(() => null);
  if (!row) return [];
  try {
    const parsed = SavedSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data.years : [];
  } catch {
    return [];
  }
}

function builtInYears(): AcademicYear[] {
  const years = [...new Set(DEFAULT_TERMS.map((t) => t.year))];
  return years.map((year) => {
    const terms = DEFAULT_TERMS.filter((t) => t.year === year);
    return {
      year,
      estimate: terms.some((t) => t.estimate),
      terms: terms.map(({ term, opensOn, closesOn, breaks }) => ({
        term,
        opensOn,
        closesOn,
        breaks,
      })),
      holidays: defaultHolidays(year),
      saved: false,
    };
  });
}

/** Every school year we have dates for, oldest first: saved years replace the built-in ones. */
export const getAcademicCalendar = cache(async (): Promise<AcademicYear[]> => {
  const saved = await savedYears();
  const byYear = new Map(builtInYears().map((y) => [y.year, y]));
  for (const y of saved) byYear.set(y.year, { ...y, saved: true });
  return [...byYear.values()].sort((a, b) => a.year - b.year);
});

export type CalendarTerm = TermDates & { estimate: boolean };

/** The public holidays of `year`: the saved calendar's, else the built-in ones. */
export function holidaysFor(calendar: AcademicYear[], year: number) {
  return (
    calendar.find((y) => y.year === year)?.holidays ?? defaultHolidays(year)
  );
}

/** Each term of the calendar, with its year's public holidays attached. */
export function calendarTerms(calendar: AcademicYear[]): CalendarTerm[] {
  return calendar.flatMap((y) =>
    [...y.terms]
      .sort((a, b) => a.term - b.term)
      .map((t) => ({
        ...t,
        year: y.year,
        estimate: y.estimate,
        holidays: y.holidays.map((h) => h.date),
      })),
  );
}

/** Problems with a year Elimu staff entered, in plain words; [] when it's fine. */
export function checkYear(y: z.infer<typeof AcademicYearSchema>) {
  const problems: string[] = [];
  const terms = [...y.terms].sort((a, b) => a.term - b.term);
  if (new Set(terms.map((t) => t.term)).size !== terms.length)
    problems.push("Each term can only appear once.");
  for (const t of terms) {
    const name = `Term ${t.term}`;
    if (t.opensOn >= t.closesOn)
      problems.push(
        `${name}: the closing date must be after the opening date.`,
      );
    if (Number(t.opensOn.slice(0, 4)) !== y.year)
      problems.push(`${name} must open in ${y.year}.`);
    for (const b of t.breaks) {
      if (b.from > b.to)
        problems.push(`${name}: a break must end on or after it starts.`);
      if (b.from < t.opensOn || b.to > t.closesOn)
        problems.push(`${name}: breaks must fall inside the term.`);
    }
  }
  for (let i = 1; i < terms.length; i++)
    if (terms[i].opensOn <= terms[i - 1].closesOn)
      problems.push(
        `Term ${terms[i].term} must open after Term ${terms[i - 1].term} closes.`,
      );
  for (const h of y.holidays)
    if (Number(h.date.slice(0, 4)) !== y.year)
      problems.push(`${h.label} is not in ${y.year}.`);
  return [...new Set(problems)];
}

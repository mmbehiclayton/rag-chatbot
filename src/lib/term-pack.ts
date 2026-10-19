/**
 * Term Pack scheduling: turns term dates, breaks and a class timetable into dated lesson slots,
 * then lays the scheme's lessons onto them. Pure functions on "YYYY-MM-DD" strings so the
 * same code runs on the server and in the browser without timezone drift.
 */

export type TermBreak = { from: string; to: string; label: string };
export type TermDates = {
  year: number;
  term: number;
  opensOn: string;
  closesOn: string;
  breaks: TermBreak[];
};

/**
 * Dates offered when a teacher sets up a term. 2026 is from the Ministry of Education calendar
 * (circular of 9 October 2025). 2027 Term 1 is an estimate until the 2027 calendar is published:
 * replace it then. Teachers always confirm or change these for their school.
 */
export const SUGGESTED_TERMS: (TermDates & { estimate: boolean })[] = [
  {
    year: 2026,
    term: 1,
    opensOn: "2026-01-05",
    closesOn: "2026-04-02",
    breaks: [],
    estimate: false,
  },
  {
    year: 2026,
    term: 2,
    opensOn: "2026-04-27",
    closesOn: "2026-07-31",
    breaks: [
      { from: "2026-06-24", to: "2026-06-28", label: "Half-term break" },
    ],
    estimate: false,
  },
  {
    year: 2026,
    term: 3,
    opensOn: "2026-08-24",
    closesOn: "2026-10-23",
    breaks: [],
    estimate: false,
  },
  {
    year: 2027,
    term: 1,
    opensOn: "2027-01-04",
    closesOn: "2027-04-01",
    breaks: [],
    estimate: true,
  },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

const DAY = 86_400_000;
const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (t: number) => new Date(t).toISOString().slice(0, 10);

export function isIsoDate(d: unknown): d is string {
  return (
    typeof d === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !Number.isNaN(toTime(d))
  );
}

/** 1 = Monday … 7 = Sunday. */
export function weekdayOf(d: string) {
  return ((new Date(toTime(d)).getUTCDay() + 6) % 7) + 1;
}

/** Today's date in Kenya, whatever the server's timezone. */
export function todayInKenya(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(now);
}

export function formatDay(d: string, withWeekday = true) {
  return new Date(toTime(d)).toLocaleDateString("en-KE", {
    timeZone: "UTC",
    ...(withWeekday ? { weekday: "short" } : {}),
    day: "numeric",
    month: "short",
  });
}

export function formatRange(from: string, to: string) {
  return from === to
    ? formatDay(from, false)
    : `${formatDay(from, false)} – ${formatDay(to, false)}`;
}

export function termLabel(t: { year: number; term: number }) {
  return `Term ${t.term} ${t.year}`;
}

/** "Term 2" → 2. */
export function termNumber(term: string) {
  const n = Number.parseInt(term.replace(/\D+/g, ""), 10);
  return n >= 1 && n <= 3 ? n : null;
}

/**
 * Public holidays with fixed dates, plus Good Friday and Easter Monday for the years we know.
 * Eid dates move each year, so teachers add them as a break.
 */
const FIXED_HOLIDAYS = [
  "01-01",
  "05-01",
  "06-01",
  "10-10",
  "10-20",
  "12-12",
  "12-25",
  "12-26",
];
const EASTER_HOLIDAYS = [
  "2026-04-03",
  "2026-04-06",
  "2027-03-26",
  "2027-03-29",
];

export function isPublicHoliday(d: string) {
  return FIXED_HOLIDAYS.includes(d.slice(5)) || EASTER_HOLIDAYS.includes(d);
}

function inBreak(d: string, breaks: TermBreak[]) {
  return isPublicHoliday(d) || breaks.some((b) => d >= b.from && d <= b.to);
}

/** School days (Monday to Friday) between opening and closing, minus breaks and public holidays. */
export function teachingDays(term: TermDates) {
  const days: string[] = [];
  const end = toTime(term.closesOn);
  for (let t = toTime(term.opensOn); t <= end; t += DAY) {
    const d = toDate(t);
    if (weekdayOf(d) <= 5 && !inBreak(d, term.breaks)) days.push(d);
  }
  return days;
}

export type TeachingWeek = { number: number; from: string; to: string };

/** Weeks with at least one school day, numbered from 1. A week lost wholly to a break isn't counted. */
export function teachingWeeks(term: TermDates): TeachingWeek[] {
  const weeks: TeachingWeek[] = [];
  let monday = "";
  for (const d of teachingDays(term)) {
    const m = toDate(toTime(d) - (weekdayOf(d) - 1) * DAY);
    if (m !== monday) {
      monday = m;
      weeks.push({ number: weeks.length + 1, from: d, to: d });
    } else weeks[weeks.length - 1].to = d;
  }
  return weeks;
}

/** One lesson on the weekly timetable: 1 = Monday … 5 = Friday, and the period that day (1 = first lesson). */
export type Period = { weekday: number; period: number };

/** `slot` is the period on the timetable that day. */
export type Slot = { date: string; slot: number; week: number };

/** Every timetabled lesson for one class in the term, in time order. Two periods on one day make a double lesson. */
export function lessonSlots(term: TermDates, periods: Period[]): Slot[] {
  const byDay = new Map<number, number[]>();
  for (const p of periods)
    if (p.weekday >= 1 && p.weekday <= 5)
      byDay.set(p.weekday, [...(byDay.get(p.weekday) ?? []), p.period]);
  for (const ps of byDay.values()) ps.sort((a, b) => a - b);
  const slots: Slot[] = [];
  for (const week of teachingWeeks(term)) {
    for (let t = toTime(week.from); t <= toTime(week.to); t += DAY) {
      const d = toDate(t);
      if (inBreak(d, term.breaks) || weekdayOf(d) > 5) continue;
      for (const period of byDay.get(weekdayOf(d)) ?? [])
        slots.push({ date: d, slot: period, week: week.number });
    }
  }
  return slots;
}

/** "Grade 7" for a single-stream grade, "Grade 7 East" for a stream. */
export function streamLabel(grade: string, stream: string) {
  return stream ? `${grade} ${stream}` : grade;
}

/** "East, west , East" → ["East", "west"]: the streams a teacher typed for one grade. */
export function parseStreams(text: string) {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " ").slice(0, 30))
    .filter(
      (s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()),
    );
}

export type LessonStatus = "TAUGHT" | "CARRIED_OVER";
export type MarkedSlot = {
  date: string;
  slot: number;
  lessonNumber: number;
  status: LessonStatus;
};
export type ScheduledSlot = Slot & {
  lessonNumber: number | null;
  status: LessonStatus | null;
};

export const slotKey = (date: string, slot: number) => `${date}#${slot}`;

/**
 * Lays lessons 1…total onto the slots in order. A lesson marked "carried over" moves to the next
 * slot, pushing the rest of the term back by one. Slots after the last lesson get no lesson.
 */
export function scheduleLessons(
  slots: Slot[],
  marks: MarkedSlot[],
  total: number,
): ScheduledSlot[] {
  const byKey = new Map(marks.map((m) => [slotKey(m.date, m.slot), m]));
  let next = 1;
  return slots.map((s) => {
    const mark = byKey.get(slotKey(s.date, s.slot));
    if (mark) {
      next =
        mark.status === "TAUGHT" ? mark.lessonNumber + 1 : mark.lessonNumber;
      return { ...s, lessonNumber: mark.lessonNumber, status: mark.status };
    }
    const lessonNumber = next <= total ? next++ : null;
    return { ...s, lessonNumber, status: null };
  });
}

export type Progress = {
  taught: number;
  carried: number;
  unmarked: number;
  total: number;
  finishes: boolean;
};

/** How far one class is through its scheme on `today`, and whether the term is long enough to finish it. */
export function scheduleProgress(
  slots: ScheduledSlot[],
  today: string,
  total: number,
): Progress {
  let taught = 0;
  let carried = 0;
  let unmarked = 0;
  for (const s of slots) {
    if (!s.lessonNumber) continue;
    if (s.status === "TAUGHT") taught++;
    else if (s.status === "CARRIED_OVER") carried++;
    else if (s.date < today) unmarked++;
  }
  const last = slots.findLast((s) => s.lessonNumber)?.lessonNumber ?? 0;
  return {
    taught,
    carried,
    unmarked,
    total,
    finishes: total === 0 || last === total,
  };
}

export type SchemeLesson = {
  lessonNumber: number;
  weekNumber: number;
  strand: string;
  subStrand: string;
  outcomes: string[];
};

type SchemeContent = {
  weeks?: {
    weekNumber?: number;
    rows?: {
      strand?: string;
      subStrand?: string;
      specificLearningOutcomes?: unknown;
    }[];
  }[];
};

/** The scheme's lessons in order: one per row, numbered across the term (as on the scheme page). */
export function schemeLessons(content: unknown): SchemeLesson[] {
  const weeks = (content as SchemeContent | null)?.weeks;
  const lessons: SchemeLesson[] = [];
  (Array.isArray(weeks) ? weeks : []).forEach((week, wi) => {
    for (const row of Array.isArray(week?.rows) ? week.rows : []) {
      lessons.push({
        lessonNumber: lessons.length + 1,
        weekNumber: week.weekNumber ?? wi + 1,
        strand: row?.strand ?? "",
        subStrand: row?.subStrand ?? "",
        outcomes: Array.isArray(row?.specificLearningOutcomes)
          ? row.specificLearningOutcomes.map(String)
          : [],
      });
    }
  });
  return lessons;
}

/** The term in progress on `today`, else the next one to open, else the most recent. */
export function pickTerm<T extends TermDates>(
  terms: T[],
  today: string,
): T | null {
  const sorted = [...terms].sort((a, b) => a.opensOn.localeCompare(b.opensOn));
  return (
    sorted.find((t) => t.opensOn <= today && today <= t.closesOn) ??
    sorted.find((t) => t.opensOn > today) ??
    sorted[sorted.length - 1] ??
    null
  );
}

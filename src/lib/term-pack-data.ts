import {
  calendarTerms,
  getAcademicCalendar,
  holidaysFor,
} from "@/lib/academic-calendar";
import { db, withDbRetry } from "@/lib/db";
import {
  type LessonStatus,
  lessonMinutesFor,
  lessonSlots,
  lessonTimes,
  type Period,
  type Progress,
  pickTerm,
  type ScheduledSlot,
  type SchemeLesson,
  scheduleLessons,
  scheduleProgress,
  schemeLessons,
  slotKey,
  streamLabel,
  type TeachingWeek,
  type TermBreak,
  type TermDates,
  teachingWeeks,
  termLabel,
  termNumber,
  todayInKenya,
  weekdayOf,
} from "@/lib/term-pack";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function toTermDates(row: {
  year: number;
  term: number;
  opensOn: Date;
  closesOn: Date;
  breaks: unknown;
}): TermDates {
  const breaks = Array.isArray(row.breaks)
    ? (row.breaks as TermBreak[]).filter((b) => b?.from && b?.to)
    : [];
  return {
    year: row.year,
    term: row.term,
    opensOn: iso(row.opensOn),
    closesOn: iso(row.closesOn),
    breaks,
  };
}

/** A term as the teacher uses it. `custom` when they changed the school calendar's dates for their school. */
export type TeacherTermDates = TermDates & {
  custom: boolean;
  estimate: boolean;
};

/**
 * The school calendar's terms, with the teacher's own dates in place of any term they changed.
 * Every term carries its year's public holidays from the calendar.
 */
export async function getTeacherTerms(
  teacherId: string,
): Promise<TeacherTermDates[]> {
  const [rows, calendar] = await Promise.all([
    withDbRetry(() =>
      db.teacherTerm.findMany({
        where: { teacherId },
        orderBy: [{ year: "asc" }, { term: "asc" }],
      }),
    ),
    getAcademicCalendar(),
  ]);
  const own = new Map(
    rows.map((r) => {
      const t = toTermDates(r);
      return [termLabel(t), t];
    }),
  );
  const terms: TeacherTermDates[] = calendarTerms(calendar).map((t) => {
    const mine = own.get(termLabel(t));
    if (!mine) return { ...t, custom: false };
    own.delete(termLabel(t));
    return { ...mine, holidays: t.holidays, custom: true, estimate: false };
  });
  // Terms the teacher set that the calendar doesn't have yet.
  for (const t of own.values())
    terms.push({
      ...t,
      holidays: holidaysFor(calendar, t.year).map((h) => h.date),
      custom: true,
      estimate: false,
    });
  return terms.sort((a, b) => a.year - b.year || a.term - b.term);
}

/** One lesson on the teacher's weekly timetable. `stream` is "" for a grade taught as one class. */
export type TimetableEntry = Period & {
  grade: string;
  stream: string;
  subject: string;
  /** "08:20" (24-hour), when the teacher has set it. */
  startsAt: string | null;
};

export async function getTimetable(
  teacherId: string,
): Promise<TimetableEntry[]> {
  return withDbRetry(() =>
    db.timetableSlot.findMany({
      where: { teacherId },
      orderBy: [{ weekday: "asc" }, { period: "asc" }],
      select: {
        weekday: true,
        period: true,
        startsAt: true,
        grade: true,
        stream: true,
        subject: true,
      },
    }),
  );
}

/** The streams of a grade the teacher has on their timetable for one learning area, in a stable order. */
export function streamsFor(
  timetable: TimetableEntry[],
  grade: string,
  subject: string,
) {
  const streams = new Set(
    timetable
      .filter((e) => e.grade === grade && e.subject === subject)
      .map((e) => e.stream),
  );
  return [...streams].sort((a, b) => a.localeCompare(b));
}

export function periodsFor(
  timetable: TimetableEntry[],
  grade: string,
  stream: string,
  subject: string,
): Period[] {
  return timetable.filter(
    (e) => e.grade === grade && e.stream === stream && e.subject === subject,
  );
}

/** The teacher's term a scheme belongs to: same term number, and the scheme's year when it has one. */
export function termForScheme(
  terms: TermDates[],
  scheme: { term: string; year: number | null },
  today = todayInKenya(),
) {
  const n = termNumber(scheme.term);
  if (!n) return null;
  const matching = terms.filter(
    (t) => t.term === n && (scheme.year == null || t.year === scheme.year),
  );
  return pickTerm(matching, today);
}

type SchemeForSchedule = {
  id: string;
  teacherId: string;
  grade: string;
  subject: string;
  term: string;
  year: number | null;
  content: unknown;
};

type RecordRow = {
  stream: string;
  date: Date;
  slot: number;
  lessonNumber: number;
  status: string;
  remarks: string | null;
};

/** A lesson plan made from the scheme, with the reflection the teacher wrote on it. */
export type SchemePlan = { id: string; reflection: string | null };

type PlanRow = SchemePlan & { lessonNumber: number };

export type SchemeSchedule = {
  term: TermDates | null;
  /** Streams of this grade on the timetable for the learning area ("" alone for a single-stream grade). */
  streams: string[];
  stream: string;
  periods: Period[];
  weeks: TeachingWeek[];
  slots: (ScheduledSlot & {
    lesson: SchemeLesson | null;
    remarks: string | null;
    plan: SchemePlan | null;
  })[];
  lessons: SchemeLesson[];
  progress: Progress;
  today: string;
};

/** Lays a scheme onto one stream's timetable for the term, with that stream's Taught / Carry over marks. */
function buildSchedule(
  scheme: SchemeForSchedule,
  stream: string,
  streams: string[],
  terms: TermDates[],
  timetable: TimetableEntry[],
  records: RecordRow[],
  plans: PlanRow[],
  today: string,
): SchemeSchedule {
  const lessons = schemeLessons(scheme.content);
  const term = termForScheme(terms, scheme, today);
  const periods = periodsFor(timetable, scheme.grade, stream, scheme.subject);
  const empty = {
    taught: 0,
    carried: 0,
    unmarked: 0,
    total: lessons.length,
    finishes: true,
  };
  if (!term)
    return {
      term: null,
      streams,
      stream,
      periods,
      weeks: [],
      slots: [],
      lessons,
      progress: empty,
      today,
    };

  const mine = records.filter((r) => r.stream === stream);
  const byNumber = new Map(lessons.map((l) => [l.lessonNumber, l]));
  const planByNumber = new Map(
    plans.map((p) => [
      p.lessonNumber,
      { id: p.id, reflection: p.reflection?.trim() || null },
    ]),
  );
  const remarks = new Map(
    mine.map((r) => [slotKey(iso(r.date), r.slot), r.remarks]),
  );
  const marks = mine.map((r) => ({
    date: iso(r.date),
    slot: r.slot,
    lessonNumber: r.lessonNumber,
    status: r.status as LessonStatus,
  }));
  const scheduled = scheduleLessons(
    lessonSlots(term, periods),
    marks,
    lessons.length,
  );
  const slots = scheduled.map((s) => ({
    ...s,
    lesson: s.lessonNumber ? (byNumber.get(s.lessonNumber) ?? null) : null,
    remarks: remarks.get(slotKey(s.date, s.slot)) ?? null,
    plan: s.lessonNumber ? (planByNumber.get(s.lessonNumber) ?? null) : null,
  }));
  return {
    term,
    streams,
    stream,
    periods,
    weeks: teachingWeeks(term),
    slots,
    lessons,
    progress: scheduleProgress(scheduled, today, lessons.length),
    today,
  };
}

/**
 * A scheme laid onto the teacher's real term dates and timetable, with Taught / Carry over marks applied.
 * Streams of a grade share the scheme but each keeps its own pace; without `stream`, the first stream is used.
 */
export async function getSchemeSchedule(
  scheme: SchemeForSchedule,
  stream?: string,
): Promise<SchemeSchedule> {
  const today = todayInKenya();
  const [terms, timetable, records, plans] = await Promise.all([
    getTeacherTerms(scheme.teacherId),
    getTimetable(scheme.teacherId),
    withDbRetry(() =>
      db.lessonRecord.findMany({ where: { schemeId: scheme.id } }),
    ),
    // Only the reflection, not the whole plan, so a long scheme stays light.
    withDbRetry(
      () => db.$queryRaw<PlanRow[]>`
        SELECT id, "lessonNumber", content->>'reflection' AS reflection
        FROM "LessonPlan"
        WHERE "schemeId" = ${scheme.id} AND "teacherId" = ${scheme.teacherId}
        ORDER BY "updatedAt" ASC`,
    ).catch(() => [] as PlanRow[]),
  ]);
  const streams = streamsFor(timetable, scheme.grade, scheme.subject);
  const chosen =
    stream !== undefined && streams.includes(stream)
      ? stream
      : (streams[0] ?? "");
  return buildSchedule(
    scheme,
    chosen,
    streams,
    terms,
    timetable,
    records,
    plans,
    today,
  );
}

export type Unmarked = { href: string; label: string; count: number };

/** One period on the teacher's timetable, with the scheme lesson that falls on it when there is a scheme. */
export type TimetableLesson = {
  date: string;
  period: number;
  week: number;
  grade: string;
  stream: string;
  subject: string;
  /** "Grade 7 East · Mathematics" */
  label: string;
  schemeId: string | null;
  lessonNumber: number | null;
  topic: string;
  status: LessonStatus | null;
  lessonPlanId: string | null;
  /** "8:20–9:00 am", when the teacher has set a start time for the period. */
  times: string | null;
};

export type ClassProgress = Progress & { label: string; href: string };

/**
 * The teacher's timetable for one teaching week of the term in progress (the current week by default),
 * with each class's latest scheme laid on it, plus unmarked lessons and progress for every class.
 */
export async function getTimetableView(teacherId: string, weekNumber?: number) {
  const today = todayInKenya();
  const [terms, timetable] = await Promise.all([
    getTeacherTerms(teacherId),
    getTimetable(teacherId),
  ]);
  const term = pickTerm(terms, today);
  const inTerm = !!term && term.opensOn <= today && today <= term.closesOn;
  const weeks = term ? teachingWeeks(term) : [];
  const week =
    weeks.find((w) => w.number === weekNumber) ??
    weeks.find((w) => w.to >= today) ??
    (term && term.closesOn < today ? weeks.at(-1) : weeks[0]) ??
    null;
  const view = {
    today,
    term,
    inTerm,
    hasTimetable: timetable.length > 0,
    weeks,
    week,
    lessons: [] as TimetableLesson[],
    unmarked: [] as Unmarked[],
    progress: [] as ClassProgress[],
  };
  if (!term || timetable.length === 0) return view;

  const schemes = await withDbRetry(() =>
    db.schemeOfWork.findMany({
      where: {
        teacherId,
        term: `Term ${term.term}`,
        OR: [{ year: term.year }, { year: null }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        teacherId: true,
        grade: true,
        subject: true,
        term: true,
        year: true,
        content: true,
        lessonPlans: { select: { id: true, lessonNumber: true } },
      },
    }),
  );
  // Each class uses its most recently updated scheme for the term.
  const latest = new Map<string, (typeof schemes)[number]>();
  for (const s of schemes)
    if (!latest.has(`${s.grade}|${s.subject}`))
      latest.set(`${s.grade}|${s.subject}`, s);
  const records = await withDbRetry(() =>
    db.lessonRecord.findMany({
      where: { schemeId: { in: [...latest.values()].map((s) => s.id) } },
      select: {
        schemeId: true,
        stream: true,
        date: true,
        slot: true,
        lessonNumber: true,
        status: true,
        remarks: true,
      },
    }),
  );

  const startsAt = new Map(
    timetable.map((e) => [`${e.weekday}-${e.period}`, e.startsAt]),
  );
  const timesOf = (date: string, period: number, grade: string) =>
    lessonTimes(
      startsAt.get(`${weekdayOf(date)}-${period}`),
      lessonMinutesFor(grade),
    );
  const classes = new Map<string, TimetableEntry>();
  for (const e of timetable)
    classes.set(`${e.grade}|${e.stream}|${e.subject}`, e);

  for (const c of classes.values()) {
    const label = `${streamLabel(c.grade, c.stream)} · ${c.subject}`;
    const base = {
      grade: c.grade,
      stream: c.stream,
      subject: c.subject,
      label,
    };
    const scheme = latest.get(`${c.grade}|${c.subject}`);

    if (!scheme) {
      // No scheme yet: still show the class on its timetabled days.
      if (!week) continue;
      for (const s of lessonSlots(
        term,
        periodsFor(timetable, c.grade, c.stream, c.subject),
      )) {
        if (s.week !== week.number) continue;
        view.lessons.push({
          ...base,
          date: s.date,
          period: s.slot,
          times: timesOf(s.date, s.slot, c.grade),
          week: s.week,
          schemeId: null,
          lessonNumber: null,
          topic: "",
          status: null,
          lessonPlanId: null,
        });
      }
      continue;
    }

    const streams = streamsFor(timetable, c.grade, c.subject);
    const schedule = buildSchedule(
      scheme,
      c.stream,
      streams,
      terms,
      timetable,
      records.filter((r) => r.schemeId === scheme.id),
      [],
      today,
    );
    const plans = new Map(
      scheme.lessonPlans.map((l) => [l.lessonNumber, l.id]),
    );
    const href = `/dashboard/schemes/${scheme.id}/record${c.stream ? `?${new URLSearchParams({ stream: c.stream })}` : ""}`;
    for (const s of schedule.slots) {
      if (s.week !== week?.number) continue;
      view.lessons.push({
        ...base,
        date: s.date,
        period: s.slot,
        times: timesOf(s.date, s.slot, c.grade),
        week: s.week,
        schemeId: scheme.id,
        lessonNumber: s.lessonNumber,
        topic:
          s.lesson?.subStrand ||
          s.lesson?.strand ||
          (s.lessonNumber ? `Lesson ${s.lessonNumber}` : ""),
        status: s.status,
        lessonPlanId: s.lessonNumber
          ? (plans.get(s.lessonNumber) ?? null)
          : null,
      });
    }
    if (schedule.progress.unmarked > 0)
      view.unmarked.push({ href, label, count: schedule.progress.unmarked });
    view.progress.push({ ...schedule.progress, label, href });
  }

  view.lessons.sort(
    (a, b) => a.date.localeCompare(b.date) || a.period - b.period,
  );
  view.progress.sort((a, b) => a.label.localeCompare(b.label));
  return view;
}

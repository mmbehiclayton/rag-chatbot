import { db, withDbRetry } from "@/lib/db";
import {
  lessonSlots,
  pickTerm,
  scheduleLessons,
  slotKey,
  schemeLessons,
  teachingWeeks,
  termNumber,
  todayInKenya,
  type LessonStatus,
  type ScheduledSlot,
  type SchemeLesson,
  type TeachingWeek,
  type TermBreak,
  type TermDates,
} from "@/lib/term-pack";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function toTermDates(row: { year: number; term: number; opensOn: Date; closesOn: Date; breaks: unknown }): TermDates {
  const breaks = Array.isArray(row.breaks) ? (row.breaks as TermBreak[]).filter((b) => b && b.from && b.to) : [];
  return { year: row.year, term: row.term, opensOn: iso(row.opensOn), closesOn: iso(row.closesOn), breaks };
}

export async function getTeacherTerms(teacherId: string): Promise<TermDates[]> {
  const rows = await withDbRetry(() => db.teacherTerm.findMany({ where: { teacherId }, orderBy: [{ year: "asc" }, { term: "asc" }] }));
  return rows.map(toTermDates);
}

export async function getTimetables(teacherId: string) {
  const rows = await withDbRetry(() => db.classTimetable.findMany({ where: { teacherId } }));
  return new Map(rows.map((r) => [`${r.grade}|${r.subject}`, r.days]));
}

/** The teacher's term a scheme belongs to: same term number, and the scheme's year when it has one. */
export function termForScheme(terms: TermDates[], scheme: { term: string; year: number | null }, today = todayInKenya()) {
  const n = termNumber(scheme.term);
  if (!n) return null;
  const matching = terms.filter((t) => t.term === n && (scheme.year == null || t.year === scheme.year));
  return pickTerm(matching, today);
}

export type SchemeSchedule = {
  term: TermDates | null;
  days: number[];
  weeks: TeachingWeek[];
  slots: (ScheduledSlot & { lesson: SchemeLesson | null; remarks: string | null })[];
  lessons: SchemeLesson[];
  today: string;
};

/** A scheme laid onto the teacher's real term dates and timetable, with Taught / Carry over marks applied. */
export async function getSchemeSchedule(scheme: {
  id: string;
  teacherId: string;
  grade: string;
  subject: string;
  term: string;
  year: number | null;
  content: unknown;
}): Promise<SchemeSchedule> {
  const today = todayInKenya();
  const [terms, timetable, records] = await Promise.all([
    getTeacherTerms(scheme.teacherId),
    withDbRetry(() =>
      db.classTimetable.findUnique({
        where: { teacherId_grade_subject: { teacherId: scheme.teacherId, grade: scheme.grade, subject: scheme.subject } },
      })
    ),
    withDbRetry(() => db.lessonRecord.findMany({ where: { schemeId: scheme.id } })),
  ]);
  const lessons = schemeLessons(scheme.content);
  const term = termForScheme(terms, scheme, today);
  const days = timetable?.days ?? [];
  if (!term) return { term: null, days, weeks: [], slots: [], lessons, today };

  const byNumber = new Map(lessons.map((l) => [l.lessonNumber, l]));
  const remarks = new Map(records.map((r) => [slotKey(iso(r.date), r.slot), r.remarks]));
  const marks = records.map((r) => ({ date: iso(r.date), slot: r.slot, lessonNumber: r.lessonNumber, status: r.status as LessonStatus }));
  const slots = scheduleLessons(lessonSlots(term, days), marks, lessons.length).map((s) => ({
    ...s,
    lesson: s.lessonNumber ? (byNumber.get(s.lessonNumber) ?? null) : null,
    remarks: remarks.get(slotKey(s.date, s.slot)) ?? null,
  }));
  return { term, days, weeks: teachingWeeks(term), slots, lessons, today };
}

export type Unmarked = { schemeId: string; label: string; count: number };

export type TodayLesson = {
  schemeId: string;
  grade: string;
  subject: string;
  date: string;
  slot: number;
  week: number;
  lessonNumber: number;
  topic: string;
  strand: string;
  status: LessonStatus | null;
  lessonPlanId: string | null;
};

/**
 * Today's timetabled lessons across the teacher's classes, from each class's latest scheme
 * for the term in progress, plus how many earlier lessons are still unmarked.
 */
export async function getTodayLessons(teacherId: string) {
  const today = todayInKenya();
  const [terms, timetables] = await Promise.all([getTeacherTerms(teacherId), getTimetables(teacherId)]);
  const current = pickTerm(terms, today);
  const inTerm = !!current && current.opensOn <= today && today <= current.closesOn;
  if (!current || !inTerm || timetables.size === 0) {
    return { today, term: current, inTerm, hasTimetable: timetables.size > 0, lessons: [] as TodayLesson[], unmarked: [] as Unmarked[] };
  }

  const schemes = await withDbRetry(() =>
    db.schemeOfWork.findMany({
      where: { teacherId, term: `Term ${current.term}`, OR: [{ year: current.year }, { year: null }] },
      orderBy: { updatedAt: "desc" },
      select: { id: true, teacherId: true, grade: true, subject: true, term: true, year: true, content: true, lessonPlans: { select: { id: true, lessonNumber: true } } },
    })
  );

  const seen = new Set<string>();
  const lessons: TodayLesson[] = [];
  const unmarked: Unmarked[] = [];
  for (const s of schemes) {
    const key = `${s.grade}|${s.subject}`;
    if (seen.has(key) || !timetables.has(key)) continue;
    seen.add(key);
    const schedule = await getSchemeSchedule(s);
    const plans = new Map(s.lessonPlans.map((l) => [l.lessonNumber, l.id]));
    let missed = 0;
    for (const slot of schedule.slots) {
      if (!slot.lessonNumber) continue;
      if (slot.date < today && !slot.status) missed++;
      if (slot.date !== today) continue;
      lessons.push({
        schemeId: s.id,
        grade: s.grade,
        subject: s.subject,
        date: slot.date,
        slot: slot.slot,
        week: slot.week,
        lessonNumber: slot.lessonNumber,
        topic: slot.lesson?.subStrand || slot.lesson?.strand || `Lesson ${slot.lessonNumber}`,
        strand: slot.lesson?.strand ?? "",
        status: slot.status,
        lessonPlanId: plans.get(slot.lessonNumber) ?? null,
      });
    }
    if (missed > 0) unmarked.push({ schemeId: s.id, label: `${s.grade} · ${s.subject}`, count: missed });
  }
  return { today, term: current, inTerm, hasTimetable: true, lessons, unmarked };
}

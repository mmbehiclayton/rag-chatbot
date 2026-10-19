import {
  BookOpen,
  ClipboardList,
  FileText,
  type LucideIcon,
  NotebookPen,
} from "lucide-react";
import { classLessonWhere } from "@/lib/classes";
import { db } from "@/lib/db";
import { filingLabel, filingOf } from "@/lib/filing";
import type { TermDates } from "@/lib/term-pack";

export const PAGE_SIZE = 20;

/** The four documents a teacher keeps, each with its own page on the bottom bar. */
export const DOC_TYPES = {
  schemes: {
    title: "Schemes of work",
    one: "scheme of work",
    many: "schemes of work",
    description: "Your plan for the term, week by week.",
    icon: BookOpen,
    create: "/dashboard/create/scheme",
    createLabel: "New scheme of work",
  },
  lessons: {
    title: "Lesson plans",
    one: "lesson plan",
    many: "lesson plans",
    description: "Plans for each lesson you teach.",
    icon: FileText,
    create: "/dashboard/create/lesson",
    createLabel: "New lesson plan",
  },
  notes: {
    title: "Lesson notes",
    one: "lesson notes",
    many: "lesson notes",
    description: "Teaching notes written from your lesson plans.",
    icon: NotebookPen,
    create: "/dashboard/notes/new",
    createLabel: "New lesson notes",
  },
  assessments: {
    title: "Assessments",
    one: "assessment",
    many: "assessments",
    description: "Tests and tasks with their marking schemes.",
    icon: ClipboardList,
    create: "/dashboard/create/assessment",
    createLabel: "New assessment",
  },
} satisfies Record<
  string,
  {
    title: string;
    one: string;
    many: string;
    description: string;
    icon: LucideIcon;
    create: string;
    createLabel: string;
  }
>;

export type DocType = keyof typeof DOC_TYPES;

export function isDocType(value: string | undefined): value is DocType {
  return !!value && value in DOC_TYPES;
}

export function docHref(type: DocType, id: string) {
  return `/dashboard/${type}/${id}`;
}

export type DocRow = {
  id: string;
  title: string;
  grade: string | null;
  subject: string | null;
  /** "Term 2 2026" */
  term: string;
  updatedAt: Date;
};

/** A class to filter by: one grade + learning area. */
export type ClassFilter = { grade: string; subject: string } | null;

const FILED = { term: true, year: true, createdAt: true } as const;

/** One page of a teacher's documents of a type, newest first, with the total. */
export async function loadDocRows(
  type: DocType,
  teacherId: string,
  {
    q,
    skip,
    terms,
    only,
  }: { q: string; skip: number; terms: TermDates[]; only: ClassFilter },
): Promise<[DocRow[], number]> {
  const termOf = (doc: Parameters<typeof filingOf>[1]) =>
    filingLabel(filingOf(terms, doc));
  const contains = q
    ? { contains: q, mode: "insensitive" as const }
    : undefined;
  const inClass = only ? { grade: only.grade, subject: only.subject } : {};

  switch (type) {
    case "lessons": {
      const where = {
        ...(only
          ? classLessonWhere(teacherId, only.grade, only.subject)
          : { teacherId }),
        ...(contains && { topic: contains }),
      };
      const [rows, count] = await Promise.all([
        db.lessonPlan.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            topic: true,
            grade: true,
            subject: true,
            updatedAt: true,
            ...FILED,
            scheme: { select: { grade: true, subject: true, ...FILED } },
          },
        }),
        db.lessonPlan.count({ where }),
      ]);
      return [
        rows.map((r) => ({
          id: r.id,
          title: r.topic,
          grade: r.grade ?? r.scheme?.grade ?? null,
          subject: r.subject ?? r.scheme?.subject ?? null,
          term: termOf(r),
          updatedAt: r.updatedAt,
        })),
        count,
      ];
    }
    case "schemes": {
      const where = {
        teacherId,
        ...inClass,
        ...(contains && { title: contains }),
      };
      const [rows, count] = await Promise.all([
        db.schemeOfWork.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            grade: true,
            subject: true,
            updatedAt: true,
            ...FILED,
          },
        }),
        db.schemeOfWork.count({ where }),
      ]);
      return [rows.map((r) => ({ ...r, term: termOf(r) })), count];
    }
    case "notes": {
      const { teacherId: _, ...plan } = only
        ? classLessonWhere(teacherId, only.grade, only.subject)
        : { teacherId };
      const lessonPlan = { ...plan, ...(contains && { topic: contains }) };
      const where = {
        teacherId,
        ...(Object.keys(lessonPlan).length > 0 && { lessonPlan }),
      };
      const [rows, count] = await Promise.all([
        db.lessonNote.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            updatedAt: true,
            lessonPlan: {
              select: {
                topic: true,
                grade: true,
                subject: true,
                ...FILED,
                scheme: { select: { grade: true, subject: true, ...FILED } },
              },
            },
          },
        }),
        db.lessonNote.count({ where }),
      ]);
      return [
        rows.map((r) => ({
          id: r.id,
          title: r.lessonPlan.topic,
          grade: r.lessonPlan.grade ?? r.lessonPlan.scheme?.grade ?? null,
          subject: r.lessonPlan.subject ?? r.lessonPlan.scheme?.subject ?? null,
          term: termOf(r.lessonPlan),
          updatedAt: r.updatedAt,
        })),
        count,
      ];
    }
    case "assessments": {
      const where = {
        teacherId,
        ...inClass,
        ...(contains && { title: contains }),
      };
      const [rows, count] = await Promise.all([
        db.assessment.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            grade: true,
            subject: true,
            updatedAt: true,
            ...FILED,
          },
        }),
        db.assessment.count({ where }),
      ]);
      return [rows.map((r) => ({ ...r, term: termOf(r) })), count];
    }
  }
}

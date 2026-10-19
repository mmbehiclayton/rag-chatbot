import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  FileText,
  NotebookPen,
  Search,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { filingLabel, filingOf } from "@/lib/filing";
import type { TermDates } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const TYPES = {
  lessons: {
    label: "Lessons",
    icon: FileText,
    href: (id: string) => `/dashboard/lessons/${id}`,
    create: "/dashboard/create/lesson",
  },
  schemes: {
    label: "Schemes",
    icon: BookOpen,
    href: (id: string) => `/dashboard/schemes/${id}`,
    create: "/dashboard/create/scheme",
  },
  notes: {
    label: "Notes",
    icon: NotebookPen,
    href: (id: string) => `/dashboard/notes/${id}`,
    create: "/dashboard/notes",
  },
  assessments: {
    label: "Assessments",
    icon: ClipboardList,
    href: (id: string) => `/dashboard/assessments/${id}`,
    create: "/dashboard/create/assessment",
  },
} as const;

type LibraryType = keyof typeof TYPES;

type Row = {
  id: string;
  title: string;
  grade: string | null;
  subject: string | null;
  /** "Term 2 2026" */
  term: string;
  updatedAt: Date;
};

const FILED = { term: true, year: true, createdAt: true } as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadRows(
  type: LibraryType,
  teacherId: string,
  q: string,
  skip: number,
  terms: TermDates[],
): Promise<[Row[], number]> {
  const termOf = (doc: Parameters<typeof filingOf>[1]) =>
    filingLabel(filingOf(terms, doc));
  const contains = q
    ? { contains: q, mode: "insensitive" as const }
    : undefined;

  switch (type) {
    case "lessons": {
      const where = { teacherId, ...(contains && { topic: contains }) };
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
      const where = { teacherId, ...(contains && { title: contains }) };
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
      const where = {
        teacherId,
        ...(contains && { lessonPlan: { topic: contains } }),
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
      const where = { teacherId, ...(contains && { title: contains }) };
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

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const rawType = first(params.type);
  const type: LibraryType =
    rawType && rawType in TYPES ? (rawType as LibraryType) : "lessons";
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const terms = await getTeacherTerms(session.userId);
  const [rows, total] = await withDbRetry(() =>
    loadRows(type, session.userId, q, (page - 1) * PAGE_SIZE, terms),
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const config = TYPES[type];

  const hrefFor = (next: { type?: LibraryType; page?: number }) => {
    const sp = new URLSearchParams();
    sp.set("type", next.type ?? type);
    if (q && !next.type) sp.set("q", q);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    return `/dashboard/library?${sp.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Library"
        description="Everything you have created, in one place."
      />

      <nav
        aria-label="Library sections"
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(TYPES) as LibraryType[]).map((key) => (
            <Link
              key={key}
              href={hrefFor({ type: key })}
              aria-current={key === type ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                key === type && "bg-card text-foreground shadow-sm",
              )}
            >
              {TYPES[key].label}
            </Link>
          ))}
        </div>
      </nav>

      <search className="flex gap-2">
        <form action="/dashboard/library" className="contents">
          <input type="hidden" name="type" value={type} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder={`Search ${config.label.toLowerCase()}`}
              aria-label={`Search ${config.label.toLowerCase()}`}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11 md:h-10">
            Search
          </Button>
        </form>
      </search>

      {rows.length === 0 ? (
        q ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`Nothing in ${config.label.toLowerCase()} matches “${q}”.`}
            action={
              <Button
                variant="outline"
                render={<Link href={hrefFor({ type })} />}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={config.icon}
            title={`No ${config.label.toLowerCase()} yet`}
            description="What you create will be saved here automatically."
            action={
              <Button render={<Link href={config.create} />}>
                Create {config.label.toLowerCase().replace(/s$/, "")}
              </Button>
            }
          />
        )
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={config.href(row.id)}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <config.icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[row.grade, row.subject].filter(Boolean).join(" · ") ||
                      "No grade set"}
                    {` · ${row.term} · `}
                    {formatDistanceToNow(row.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-2"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            render={
              page > 1 ? <Link href={hrefFor({ page: page - 1 })} /> : undefined
            }
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            render={
              page < pageCount ? (
                <Link href={hrefFor({ page: page + 1 })} />
              ) : undefined
            }
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

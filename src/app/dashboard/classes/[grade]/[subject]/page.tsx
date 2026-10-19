import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  ListChecks,
  NotebookPen,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExportButton, parseTitle } from "@/components/document/doc-parts";
import { CurriculumNotice } from "@/components/shared/curriculum-notice";
import { LinkList, SectionTitle } from "@/components/shared/link-list";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  classLessonWhere,
  createHref,
  designHref,
  gradeHref,
  nextLessonInScheme,
} from "@/lib/classes";
import { coverageHref } from "@/lib/coverage";
import { getPublishedMapKeys } from "@/lib/curriculum-map";
import {
  getCurriculumRequests,
  getIndexedCurricula,
} from "@/lib/curriculum-options";
import { db, withDbRetry } from "@/lib/db";
import { type Filing, filingLabel, filingOf, filingOn } from "@/lib/filing";
import { todayInKenya } from "@/lib/term-pack";
import { getTeacherTerms } from "@/lib/term-pack-data";
import { cn } from "@/lib/utils";

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ago(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      render={<Link href={href} />}
      aria-label={label}
    >
      <Plus /> New
    </Button>
  );
}

const FILED = { term: true, year: true, createdAt: true } as const;

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ grade: string; subject: string }>;
  searchParams: Promise<{ term?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const raw = await params;
  const grade = decode(raw.grade);
  const subject = decode(raw.subject);
  if (!grade || !subject) notFound();
  const teacherId = session.userId;

  const [schemes, lessons, notes, assessments, curricula, designs] =
    await Promise.all([
      withDbRetry(() =>
        db.schemeOfWork.findMany({
          where: { teacherId, grade, subject },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: {
            id: true,
            title: true,
            ...FILED,
            content: true,
            updatedAt: true,
            lessonPlans: { select: { lessonNumber: true } },
          },
        }),
      ),
      withDbRetry(() =>
        db.lessonPlan.findMany({
          where: classLessonWhere(teacherId, grade, subject),
          orderBy: { updatedAt: "desc" },
          take: 500,
          select: {
            id: true,
            topic: true,
            lessonNumber: true,
            week: true,
            schemeId: true,
            updatedAt: true,
            ...FILED,
            scheme: { select: FILED },
          },
        }),
      ),
      withDbRetry(() =>
        db.lessonNote.findMany({
          where: {
            teacherId,
            lessonPlan: classLessonWhere(teacherId, grade, subject),
          },
          orderBy: { updatedAt: "desc" },
          take: 500,
          select: {
            id: true,
            updatedAt: true,
            lessonPlan: {
              select: { topic: true, ...FILED, scheme: { select: FILED } },
            },
          },
        }),
      ),
      withDbRetry(() =>
        db.assessment.findMany({
          where: { teacherId, grade, subject },
          orderBy: { updatedAt: "desc" },
          take: 200,
          select: {
            id: true,
            title: true,
            type: true,
            updatedAt: true,
            ...FILED,
          },
        }),
      ),
      getIndexedCurricula(session.tenantId),
      getPublishedMapKeys(),
    ]);

  // Show one term at a time: the one asked for, else the term in progress, else the latest.
  const terms = await getTeacherTerms(teacherId);
  const labelOf = (doc: Parameters<typeof filingOf>[1]) =>
    filingLabel(filingOf(terms, doc));
  const filings = new Map<string, Filing>();
  for (const doc of [
    ...schemes,
    ...lessons,
    ...notes.map((n) => n.lessonPlan),
    ...assessments,
  ]) {
    const f = filingOf(terms, doc);
    filings.set(filingLabel(f), f);
  }
  const today = filingOn(terms, todayInKenya());
  filings.set(filingLabel(today), today);
  const termOptions = [...filings.entries()]
    .sort(([, a], [, b]) => b.year - a.year || b.term.localeCompare(a.term))
    .map(([label]) => label);
  const asked = [(await searchParams).term].flat()[0];
  const selected = asked && filings.has(asked) ? asked : filingLabel(today);
  const inTerm = <T extends Parameters<typeof filingOf>[1]>(docs: T[]) =>
    docs.filter((d) => labelOf(d) === selected);

  const termSchemes = inTerm(schemes);
  const termLessons = inTerm(lessons);
  const schemeLessons = termLessons
    .filter((l) => l.schemeId)
    .sort((a, b) => a.lessonNumber - b.lessonNumber);
  const otherLessons = termLessons.filter((l) => !l.schemeId);
  const termNotes = notes.filter((n) => labelOf(n.lessonPlan) === selected);
  const termAssessments = inTerm(assessments);
  const termHref = (label: string) =>
    `?${new URLSearchParams({ term: label })}`;

  const current = termSchemes[0];
  const next = current
    ? nextLessonInScheme(
        current,
        new Set(current.lessonPlans.map((l) => l.lessonNumber)),
      )
    : null;
  const hasCurriculum = curricula.includes(`${grade}|${subject}`);
  const requested =
    !hasCurriculum &&
    (await getCurriculumRequests(teacherId)).includes(`${grade}|${subject}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href={gradeHref(grade)}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {grade}
        </Link>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {grade} · {subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your documents for {selected}.
          </p>
        </div>
        {termOptions.length > 1 && (
          <nav
            aria-label="Term"
            className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
              {termOptions.map((label) => (
                <Link
                  key={label}
                  href={termHref(label)}
                  aria-current={label === selected ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                    label === selected && "bg-card text-foreground shadow-sm",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
        {(termSchemes.length > 0 ||
          termLessons.length > 0 ||
          termAssessments.length > 0) && (
          <div className="space-y-1">
            <ExportButton
              href={`/api/export?${new URLSearchParams({ type: "term", grade, subject, term: selected })}`}
              label="Download term file"
            />
            <p className="text-xs text-muted-foreground">
              Your scheme, record of work, lesson plans, notes and assessments
              for {selected} in one PDF, for when the head teacher asks.
            </p>
          </div>
        )}
        <Button
          variant="outline"
          className="h-11"
          render={<Link href={coverageHref(grade, subject)} />}
        >
          <ListChecks /> Syllabus coverage
        </Button>
        {designs.includes(`${grade}|${subject}`) && (
          <Button
            variant="outline"
            className="h-11"
            render={<Link href={designHref(grade, subject)} />}
          >
            <BookMarked /> Read the curriculum design
          </Button>
        )}
        {!hasCurriculum && (
          <CurriculumNotice
            grade={grade}
            subject={subject}
            kind="class"
            requested={requested}
          />
        )}
      </div>

      <section className="space-y-2">
        <SectionTitle
          title="Scheme of work"
          action={
            current && (
              <NewButton
                href={createHref("scheme", grade, subject)}
                label="New scheme of work"
              />
            )
          }
        />
        {current ? (
          <div className="rounded-xl border bg-card">
            <Link
              href={`/dashboard/schemes/${current.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
            >
              <BookOpen
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {parseTitle(current.title).title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {next
                    ? `${next.done} of ${next.total} lesson plans ready`
                    : "All lesson plans ready"}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
            {next && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Next to prepare · Week {next.weekNumber}, lesson{" "}
                    {next.lessonNumber}
                  </p>
                  <p className="truncate text-sm font-medium">{next.topic}</p>
                </div>
                <Button
                  render={
                    <Link
                      href={`/dashboard/schemes/${current.id}#week-${next.weekNumber}`}
                    />
                  }
                >
                  Prepare week {next.weekNumber}
                </Button>
              </div>
            )}
            <Link
              href={`/dashboard/schemes/${current.id}/record`}
              className="flex min-h-12 items-center gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-muted/60"
            >
              <ClipboardCheck
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="flex-1 font-medium">Record of work</span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-dashed bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Start with the scheme for the term. Elimu then creates the lesson
              plans from it, week by week.
            </p>
            <Button
              render={<Link href={createHref("scheme", grade, subject)} />}
            >
              <BookOpen /> Create the scheme of work
            </Button>
          </div>
        )}
        {termSchemes.length > 1 && (
          <LinkList
            items={termSchemes.slice(1).map((s) => ({
              href: `/dashboard/schemes/${s.id}`,
              title: parseTitle(s.title).title,
              meta: `Updated ${ago(s.updatedAt)}`,
              icon: BookOpen,
            }))}
          />
        )}
      </section>

      <section className="space-y-2">
        <SectionTitle
          title="Lesson plans"
          action={
            <NewButton
              href={createHref("lesson", grade, subject)}
              label="New lesson plan"
            />
          }
        />
        {termLessons.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            No lesson plans for {selected} yet. Create them from the scheme, or
            make a single lesson plan with New.
          </p>
        ) : (
          <>
            {schemeLessons.length > 0 && (
              <LinkList
                items={schemeLessons.map((l) => ({
                  href: `/dashboard/lessons/${l.id}`,
                  title: l.topic,
                  meta: [l.week && `Week ${l.week}`, `Lesson ${l.lessonNumber}`]
                    .filter(Boolean)
                    .join(" · "),
                  icon: FileText,
                }))}
              />
            )}
            {otherLessons.length > 0 && (
              <>
                {schemeLessons.length > 0 && (
                  <h3 className="pt-2 text-sm font-medium text-muted-foreground">
                    Other lesson plans
                  </h3>
                )}
                <LinkList
                  items={otherLessons.map((l) => ({
                    href: `/dashboard/lessons/${l.id}`,
                    title: l.topic,
                    meta: `Updated ${ago(l.updatedAt)}`,
                    icon: FileText,
                  }))}
                />
              </>
            )}
          </>
        )}
      </section>

      {termNotes.length > 0 && (
        <section className="space-y-2">
          <SectionTitle title="Lesson notes" />
          <LinkList
            items={termNotes.map((n) => ({
              href: `/dashboard/notes/${n.id}`,
              title: n.lessonPlan.topic,
              meta: `Updated ${ago(n.updatedAt)}`,
              icon: NotebookPen,
            }))}
          />
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle
          title="Assessments"
          action={
            <NewButton
              href={createHref("assessment", grade, subject)}
              label="New assessment"
            />
          }
        />
        {termAssessments.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            No assessments for {selected} yet.
          </p>
        ) : (
          <LinkList
            items={termAssessments.map((a) => ({
              href: `/dashboard/assessments/${a.id}`,
              title: parseTitle(a.title).title,
              meta: `${a.type} · updated ${ago(a.updatedAt)}`,
              icon: ClipboardList,
            }))}
          />
        )}
      </section>
    </div>
  );
}

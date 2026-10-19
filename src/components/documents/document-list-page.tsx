import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Plus, Search } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClassFilter } from "@/components/documents/class-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { CLASS_COOKIE, classKey, pickClass } from "@/lib/class-filter";
import { createHref, getTeacherClasses } from "@/lib/classes";
import { withDbRetry } from "@/lib/db";
import {
  DOC_TYPES,
  type DocType,
  docHref,
  loadDocRows,
  PAGE_SIZE,
} from "@/lib/doc-lists";
import { getTeacherTerms } from "@/lib/term-pack-data";

type Params = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decode(value: string | undefined) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/** Where the main button goes, with the chosen class filled in. */
function newHref(
  type: DocType,
  only: { grade: string; subject: string } | null,
) {
  const base = DOC_TYPES[type].create;
  if (!only) return base;
  if (type === "notes")
    return `${base}?${new URLSearchParams({ class: classKey(only) })}`;
  const kind = (
    { schemes: "scheme", lessons: "lesson", assessments: "assessment" } as const
  )[type];
  return createHref(kind, only.grade, only.subject);
}

/**
 * One document type's page: the teacher's classes to filter by, one button to make a new one,
 * search, and the list. Schemes, Lesson plans, Lesson notes and Assessments all use it.
 */
export async function DocumentListPage({
  type,
  searchParams,
}: {
  type: DocType;
  searchParams: Promise<Params>;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");
  const teacherId = session.userId;

  const params = await searchParams;
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1);

  const [classes, terms, cookieStore] = await Promise.all([
    getTeacherClasses(teacherId),
    getTeacherTerms(teacherId),
    cookies(),
  ]);
  const only = pickClass(
    classes,
    first(params.class),
    decode(cookieStore.get(CLASS_COOKIE)?.value),
  );
  const [rows, total] = await withDbRetry(() =>
    loadDocRows(type, teacherId, {
      q,
      skip: (page - 1) * PAGE_SIZE,
      terms,
      only,
    }),
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const config = DOC_TYPES[type];
  const basePath = `/dashboard/${type}`;
  const create = newHref(type, only);
  const className = only ? `${only.grade} ${only.subject}` : "";

  const hrefFor = (next: { page?: number; q?: string }) => {
    const sp = new URLSearchParams({ class: only ? classKey(only) : "all" });
    const query = next.q ?? q;
    if (query) sp.set("q", query);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    return `${basePath}?${sp}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={config.title} description={config.description} />

      {classes.length > 1 && (
        <ClassFilter
          basePath={basePath}
          classes={classes}
          selected={only ? classKey(only) : ""}
        />
      )}

      <Button
        size="lg"
        className="w-full sm:w-auto"
        render={<Link href={create} />}
      >
        <Plus /> {config.createLabel}
      </Button>

      <search>
        <form action={basePath} className="flex gap-2">
          <input
            type="hidden"
            name="class"
            value={only ? classKey(only) : "all"}
          />
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder={`Search ${config.many}`}
              aria-label={`Search ${config.many}`}
              className="h-11 pl-9"
            />
          </div>
          <Button type="submit" variant="outline" className="h-11">
            Search
          </Button>
        </form>
      </search>

      {rows.length === 0 ? (
        q ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`None of your ${config.many}${className ? ` for ${className}` : ""} match “${q}”.`}
            action={
              <Button
                variant="outline"
                render={<Link href={hrefFor({ q: "" })} />}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={config.icon}
            title={`No ${config.many}${className ? ` for ${className}` : ""} yet`}
            description={
              type === "notes"
                ? "Lesson notes are written from one of your lesson plans."
                : `Your ${config.many} are saved here as you make them.`
            }
            action={
              <Button render={<Link href={create} />}>
                <Plus /> {config.createLabel}
              </Button>
            }
          />
        )
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={docHref(type, row.id)}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <config.icon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[row.grade, row.subject].filter(Boolean).join(" · ") ||
                      "No grade set"}
                    {` · ${row.term} · `}
                    {formatDistanceToNow(row.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-2"
        >
          <Button
            variant="outline"
            className="h-11"
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
            className="h-11"
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

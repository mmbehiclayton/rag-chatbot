import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AddPerson,
  AddSchool,
  DeleteSchool,
  EditTenant,
} from "@/components/admin/tenant-forms";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const FILTERS = [
  { value: "", label: "All" },
  { value: "SCHOOL", label: "Schools" },
  { value: "INDEPENDENT_TEACHER", label: "Own accounts" },
] as const;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** Every school and teacher account, with this month's AI use against its limit. */
export default async function SchoolsPage(props: Props) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const params = await props.searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const query = typeof params?.query === "string" ? params.query.trim() : "";
  const type =
    params?.type === "SCHOOL" || params?.type === "INDEPENDENT_TEACHER"
      ? params.type
      : "";

  const where = {
    ...(query
      ? { name: { contains: query, mode: "insensitive" as const } }
      : {}),
    ...(type ? { type } : {}),
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [tenants, total, schoolCount, accountCount] = await withDbRetry(() =>
    Promise.all([
      db.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          type: true,
          tokenQuota: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      db.tenant.count({ where }),
      db.tenant.count({ where: { type: "SCHOOL" } }),
      db.tenant.count({ where: { type: "INDEPENDENT_TEACHER" } }),
    ]),
  );

  const usage = tenants.length
    ? await withDbRetry(() =>
        db.generationLog.groupBy({
          by: ["tenantId"],
          where: {
            tenantId: { in: tenants.map((t) => t.id) },
            createdAt: { gte: monthStart },
          },
          _sum: { totalTokens: true },
        }),
      )
    : [];
  const used = (id: string) =>
    usage.find((u) => u.tenantId === id)?._sum.totalTokens ?? 0;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Partial<{ page: number; type: string }>) => {
    const s = new URLSearchParams();
    if (query) s.set("query", query);
    const t = p.type ?? type;
    if (t) s.set("type", t);
    if ((p.page ?? 1) > 1) s.set("page", String(p.page));
    const qs = s.toString();
    return `/dashboard/tenants${qs ? `?${qs}` : ""}`;
  };
  const num = (n: number) => n.toLocaleString("en-KE");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Schools and accounts"
        description={`${num(schoolCount)} schools and ${num(accountCount)} teachers on their own account. Each has a monthly AI token limit, checked before every generation.`}
        action={<AddSchool />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          method="GET"
          action="/dashboard/tenants"
          className="relative w-full sm:max-w-xs"
        >
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          {type && <input type="hidden" name="type" value={type} />}
          <Input
            name="query"
            defaultValue={query}
            placeholder="Search by name"
            aria-label="Search by name"
            className="h-11 pl-9"
          />
        </form>
        <div className="flex gap-2" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={type === f.value ? "secondary" : "ghost"}
              className="h-11"
              render={<Link href={href({ type: f.value })} />}
              aria-current={type === f.value ? "page" : undefined}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description={
            query
              ? `No school or account matches "${query}".`
              : "No schools or accounts yet."
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {tenants.map((t) => {
            const spent = used(t.id);
            const pct = Math.min(
              100,
              Math.round((spent / Math.max(1, t.tokenQuota)) * 100),
            );
            const Icon = t.type === "SCHOOL" ? Building2 : User;
            return (
              <li key={t.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{t.name}</p>
                      <Badge
                        variant={t.type === "SCHOOL" ? "info" : "secondary"}
                      >
                        {t.type === "SCHOOL" ? "School" : "Own account"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t._count.users}{" "}
                      {t._count.users === 1 ? "person" : "people"} · added{" "}
                      {t.createdAt.toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-2 space-y-1">
                      <div
                        className="h-1.5 overflow-hidden rounded-md bg-muted"
                        aria-hidden
                      >
                        <div
                          className={cn(
                            "h-full",
                            pct >= 90
                              ? "bg-destructive"
                              : pct >= 70
                                ? "bg-warning"
                                : "bg-primary",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {num(spent)} of {num(t.tokenQuota)} tokens used this
                        month ({pct}%)
                      </p>
                    </div>
                  </div>
                  <EditTenant id={t.id} name={t.name} quota={t.tokenQuota} />
                  {t.type === "SCHOOL" && (
                    <>
                      <AddPerson id={t.id} school={t.name} />
                      <DeleteSchool
                        id={t.id}
                        school={t.name}
                        people={t._count.users}
                      />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Pages"
        >
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Previous page"
            disabled={page <= 1}
            render={
              page > 1 ? <Link href={href({ page: page - 1 })} /> : undefined
            }
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </p>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label="Next page"
            disabled={page >= pages}
            render={
              page < pages ? (
                <Link href={href({ page: page + 1 })} />
              ) : undefined
            }
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}

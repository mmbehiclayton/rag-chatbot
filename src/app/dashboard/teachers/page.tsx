import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SchoolInvite } from "@/components/admin/school-invite";
import { CuratorToggle } from "@/components/dashboard/curator-toggle";
import { RoleSelector } from "@/components/dashboard/role-selector";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getInviteCode, inviteUrl } from "@/lib/invites";

const PAGE_SIZE = 20;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeachersPage(props: Props) {
  const session = await auth();
  if (!session || (session.role !== "SUPERADMIN" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const params = await props.searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const query = typeof params?.query === "string" ? params.query.trim() : "";

  // Superadmins see every user. School admins see only their own school (an admin with no school sees nobody).
  const isSuperAdmin = session.role === "SUPERADMIN";
  const where = {
    ...(isSuperAdmin
      ? {}
      : {
          tenantId: session.tenantId ?? "no-school",
          role: { not: "SUPERADMIN" },
        }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await withDbRetry(() =>
    Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isCurator: true,
          createdAt: true,
          _count: {
            select: {
              schemesOfWork: true,
              lessonPlans: true,
              assessments: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]),
  );

  // School admins get a link that brings teachers into their school.
  const school = isSuperAdmin
    ? null
    : await withDbRetry(() =>
        db.tenant.findUnique({
          where: { id: session.tenantId ?? "no-school" },
          select: { name: true, type: true },
        }),
      );
  const [inviteCode, joined] =
    school?.type === "SCHOOL"
      ? await Promise.all([
          getInviteCode(session.userId).catch(() => null),
          withDbRetry(() =>
            db.user.count({ where: { invitedById: session.userId } }),
          ).catch(() => 0),
        ])
      : [null, 0];

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const s = new URLSearchParams();
    if (query) s.set("query", query);
    if (p > 1) s.set("page", String(p));
    const qs = s.toString();
    return `/dashboard/teachers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={isSuperAdmin ? "Users and roles" : "Teachers"}
        description={
          isSuperAdmin
            ? `${total.toLocaleString("en-KE")} people on Elimu and the role each person has.`
            : "Teachers in your school and how much they have prepared."
        }
      />

      {inviteCode && school && (
        <SchoolInvite
          url={inviteUrl(inviteCode)}
          school={school.name}
          joined={joined}
        />
      )}
      {!isSuperAdmin && school?.type !== "SCHOOL" && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Your account isn't linked to a school yet, so you can't invite
          teachers. Ask Elimu to add your school.
        </p>
      )}

      <form
        method="GET"
        action="/dashboard/teachers"
        className="relative w-full sm:max-w-xs"
      >
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="query"
          defaultValue={query}
          placeholder="Search by name or email"
          aria-label="Search by name or email"
          className="h-11 pl-9"
        />
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={query ? Search : Users}
          title={query ? "Nobody found" : "No teachers yet"}
          description={
            query
              ? `No one matches "${query}".`
              : "Teachers show here once they create an account."
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {users.map((user) => (
            <li key={user.id} className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden
                >
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {user.name || "No name yet"}
                    </p>
                    {user.id === session.userId && (
                      <Badge variant="info">You</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user._count.lessonPlans} lessons ·{" "}
                    {user._count.schemesOfWork} schemes ·{" "}
                    {user._count.assessments} assessments · joined{" "}
                    {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pl-12">
                <RoleSelector
                  userId={user.id}
                  initialRole={user.role}
                  currentSessionRole={session.role}
                />
                {isSuperAdmin && user.role !== "SUPERADMIN" && (
                  <CuratorToggle userId={user.id} isCurator={user.isCurator} />
                )}
              </div>
            </li>
          ))}
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
            render={page > 1 ? <Link href={href(page - 1)} /> : undefined}
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
            render={page < pages ? <Link href={href(page + 1)} /> : undefined}
          >
            <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}

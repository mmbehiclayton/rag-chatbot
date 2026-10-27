import {
  CalendarDays,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Pencil,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canSwitchWorkspace,
  workspaceNav,
} from "@/components/layout/nav-config";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { InviteShare } from "@/components/pilot/invite-share";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { getAllowance, kenyaMonth, PLAN_LABELS } from "@/lib/allowance";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getInviteCode, inviteUrl } from "@/lib/invites";
import { getWorkspace } from "@/lib/workspace";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "long",
  });

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const monthStart = kenyaMonth().start;

  const [user, usage] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: session.userId },
        select: {
          name: true,
          email: true,
          role: true,
          isCurator: true,
          schoolName: true,
          gradesTaught: true,
          subjectsTaught: true,
          tenant: { select: { name: true } },
        },
      }),
    ),
    withDbRetry(() =>
      db.generationLog.aggregate({
        where: { userId: session.userId, createdAt: { gte: monthStart } },
        _count: true,
        _sum: { totalTokens: true },
      }),
    ),
  ]);
  if (!user) redirect("/login");

  // On a phone the sidebar's groups live here, for whichever menus are open.
  const role = session.role ?? null;
  const workspace = await getWorkspace(role);
  const adminGroups = workspaceNav(workspace, role, user.isCurator)
    .groups.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.href !== "/dashboard/profile"),
    }))
    .filter((g) => g.items.length > 0);
  const isTeacher = user.role === "TEACHER";
  const [inviteCode, joined, allowance] = isTeacher
    ? await Promise.all([
        getInviteCode(session.userId).catch(() => null),
        withDbRetry(() =>
          db.user.count({ where: { invitedById: session.userId } }),
        ).catch(() => 0),
        getAllowance(session.userId, user.role).catch(() => null),
      ])
    : [null, 0, null];
  const month = monthStart.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">
          {user.name || "Your account"}
        </h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      {canSwitchWorkspace(role) && (
        <WorkspaceSwitcher
          role={role}
          current={workspace}
          className="md:hidden"
        />
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Teaching profile</h2>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/onboarding?from=profile" />}
          >
            <Pencil /> Edit
          </Button>
        </div>
        <dl className="divide-y rounded-xl border bg-card">
          <Row label="School">
            {user.schoolName || user.tenant?.name || (
              <span className="text-muted-foreground">Not set</span>
            )}
          </Row>
          <Row label="Grades">
            {user.gradesTaught.length ? (
              <span className="flex flex-wrap gap-1.5">
                {user.gradesTaught.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </Row>
          <Row label="Learning areas">
            {user.subjectsTaught.length ? (
              <span className="flex flex-wrap gap-1.5">
                {user.subjectsTaught.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </Row>
        </dl>
      </section>

      <Link
        href="/dashboard/profile/term"
        className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
      >
        <CalendarDays
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            Term dates and timetable
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            When school opens and closes, breaks, and the days you teach each
            class
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>

      {isTeacher && (
        <Link
          href="/dashboard/profile/plan"
          className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60"
        >
          <Ticket
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Term pass</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Your plan, and paying with M-Pesa
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Link>
      )}

      {inviteCode && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Invite a colleague</h2>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Send this link to teachers in your school or subject panel.{" "}
              {joined > 0
                ? `${joined} ${joined === 1 ? "colleague has" : "colleagues have"} joined so far.`
                : "Nobody has joined from your link yet."}
            </p>
            <InviteShare url={inviteUrl(inviteCode)} />
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Usage in {month}</h2>
        {allowance ? (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm">
              <span className="font-semibold">{allowance.used}</span> of{" "}
              {allowance.limit} documents on your {PLAN_LABELS[allowance.plan]}
            </p>
            <div
              className="h-2 overflow-hidden rounded-md bg-muted"
              role="progressbar"
              aria-label="Documents used this month"
              aria-valuemin={0}
              aria-valuemax={allowance.limit}
              aria-valuenow={Math.min(allowance.used, allowance.limit)}
            >
              <div
                className={
                  allowance.used >= allowance.limit
                    ? "h-full bg-destructive"
                    : allowance.used >= allowance.limit * 0.8
                      ? "h-full bg-warning"
                      : "h-full bg-primary"
                }
                style={{
                  width: `${Math.min(100, (allowance.used / allowance.limit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Starts again on {dayLabel(allowance.resetsOn)}. Reusing a lesson
              plan is free. A long document, like a full scheme of work, can
              count as more than one.
            </p>
          </div>
        ) : (
          <dl className="divide-y rounded-xl border bg-card">
            <Row label="Documents created">{usage._count}</Row>
            <Row label="AI tokens used">
              {(usage._sum.totalTokens ?? 0).toLocaleString("en-KE")}
            </Row>
          </dl>
        )}
      </section>

      {adminGroups.map((group) => (
        <section key={group.label} className="space-y-2 md:hidden">
          <h2 className="text-base font-semibold">{group.label}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center gap-3 px-4 text-sm hover:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{item.name}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-2 sm:flex-row">
        {SUPPORT_EMAIL && (
          <Button
            variant="outline"
            size="lg"
            render={
              // biome-ignore lint/a11y/useAnchorContent: the Button supplies the content
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Elimu%20help`} />
            }
          >
            <LifeBuoy /> Get help
          </Button>
        )}
        <form action={logout}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            <LogOut /> Log out
          </Button>
        </form>
      </section>
    </div>
  );
}

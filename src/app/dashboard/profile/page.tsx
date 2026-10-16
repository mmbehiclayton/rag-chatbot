import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LifeBuoy, LogOut, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { db, withDbRetry } from "@/lib/db";
import { adminNavGroups } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [user, usage] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, role: true, schoolName: true, gradesTaught: true, subjectsTaught: true, tenant: { select: { name: true } } },
      })
    ),
    withDbRetry(() =>
      db.generationLog.aggregate({
        where: { userId: session.userId, createdAt: { gte: monthStart } },
        _count: true,
        _sum: { totalTokens: true },
      })
    ),
  ]);
  if (!user) redirect("/login");

  const adminGroups = adminNavGroups(session.role ?? null);
  const month = monthStart.toLocaleDateString("en-KE", { month: "long" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">{user.name || "Your account"}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Teaching profile</h2>
          <Button variant="ghost" size="sm" render={<Link href="/onboarding?from=profile" />}>
            <Pencil /> Edit
          </Button>
        </div>
        <dl className="divide-y rounded-xl border bg-card">
          <Row label="School">{user.schoolName || user.tenant?.name || <span className="text-muted-foreground">Not set</span>}</Row>
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

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Usage in {month}</h2>
        <dl className="divide-y rounded-xl border bg-card">
          <Row label="Documents created">{usage._count}</Row>
          <Row label="AI tokens used">{(usage._sum.totalTokens ?? 0).toLocaleString("en-KE")}</Row>
        </dl>
      </section>

      {adminGroups.map((group) => (
        <section key={group.label} className="space-y-2 md:hidden">
          <h2 className="text-base font-semibold">{group.label}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex min-h-12 items-center gap-3 px-4 text-sm hover:bg-muted">
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
          <Button variant="outline" size="lg" render={<a href={`mailto:${SUPPORT_EMAIL}?subject=Elimu%20help`} />}>
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

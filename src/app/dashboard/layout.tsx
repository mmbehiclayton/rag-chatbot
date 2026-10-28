import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar, MobileMenu } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BackButton, PageTitle } from "@/components/layout/page-title";
import { UserNav } from "@/components/layout/user-nav";
import { AIOutageBanner } from "@/components/shared/ai-outage-banner";
import { LimitDialog } from "@/components/shared/limit-dialog";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { getAIOutage } from "@/lib/ai-health";
import { hasBackup } from "@/lib/ai-models";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const [user, outage, backup, workspace] = await Promise.all([
    withDbRetry(() =>
      db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, onboardedAt: true, isCurator: true },
      }),
    ),
    getAIOutage(),
    hasBackup(),
    getWorkspace(session.role ?? null),
  ]);

  // New teachers set up their grades and learning areas once before using the app.
  if (session.role === "TEACHER" && user && !user.onboardedAt)
    redirect("/onboarding");

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="no-print flex shrink-0">
        <AppSidebar
          role={session.role}
          isCurator={user?.isCurator ?? false}
          workspace={workspace}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
          <div className="group/title flex min-w-0 items-center gap-2">
            <MobileMenu
              role={session.role}
              isCurator={user?.isCurator ?? false}
              workspace={workspace}
            />
            {/* On a phone the back arrow takes the logo's place. */}
            <Logo
              href="/dashboard"
              className="md:hidden group-has-data-back/title:hidden [&>span]:sr-only"
            />
            <BackButton />
            <PageTitle />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="h-11 md:h-10"
              render={<Link href="/dashboard/chat" />}
            >
              <Sparkles /> Ask
            </Button>
            <UserNav
              role={session.role}
              name={user?.name}
              email={user?.email ?? session.email}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 pt-4 pb-24 sm:px-6 md:pt-6 md:pb-8">
          {outage &&
            (session.role === "SUPERADMIN" ||
              !backup ||
              outage.backupError) && (
              <AIOutageBanner
                staff={session.role === "SUPERADMIN"}
                backup={backup}
                backupError={outage.backupError}
                problem={outage.problem}
                since={outage.sinceDate}
              />
            )}
          {children}
        </main>
      </div>
      <LimitDialog />
      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}

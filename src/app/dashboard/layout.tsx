import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageTitle } from "@/components/layout/page-title";
import { UserNav } from "@/components/layout/user-nav";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db, withDbRetry } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const user = await withDbRetry(() =>
    db.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, onboardedAt: true, isCurator: true },
    }),
  );

  // New teachers set up their grades and learning areas once before using the app.
  if (session.role === "TEACHER" && user && !user.onboardedAt)
    redirect("/onboarding");

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="no-print flex shrink-0">
        <AppSidebar role={session.role} isCurator={user?.isCurator ?? false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/dashboard" className="md:hidden [&>span]:sr-only" />
            <PageTitle />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="h-11 md:h-10"
              render={<Link href="/dashboard/chat" />}
            >
              <MessageSquare /> Ask
            </Button>
            <UserNav
              role={session.role}
              name={user?.name}
              email={user?.email ?? session.email}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-4 pt-4 pb-24 sm:px-6 md:pt-6 md:pb-8">
          {children}
        </main>
      </div>
      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  );
}

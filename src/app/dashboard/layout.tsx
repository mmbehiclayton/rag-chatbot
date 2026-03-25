import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { UserNav } from "@/components/layout/user-nav";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  return (
    <div className="flex h-[100dvh] overflow-hidden w-full bg-background text-foreground font-sans">
      <div className="no-print flex shrink-0">
        <AppSidebar role={session.role} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative">
        {/* Compact header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-background/90 backdrop-blur-lg border-b border-border/60 z-10 gap-4 no-print">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <MobileSidebar role={session.role} />
            </div>
            <div className="h-5 w-px bg-border/60 md:hidden" />
            <span className="font-semibold text-[15px] tracking-tight text-foreground/80">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/60 flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary/70 animate-pulse" />
            </Link>
            <UserNav role={session.role} email={session.email ?? ""} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto w-full max-w-screen-2xl mx-auto">
          {children}
        </main>
      </div>
      <div className="no-print">
        <BottomNav role={session.role} />
      </div>
    </div>
  );
}

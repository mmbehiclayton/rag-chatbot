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
    <div className="flex h-[100dvh] overflow-hidden w-full bg-background md:bg-muted/10 text-foreground font-sans">
      <AppSidebar role={session.role} />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 relative">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md border-b border-border/30 z-10">
           <div className="flex items-center">
             <div className="md:hidden pr-4 mr-4 border-r border-border/30">
               <MobileSidebar role={session.role} />
             </div>
             <div className="font-bold text-[17px] sm:text-lg tracking-tight">
               Dashboard
             </div>
           </div>
           <div className="flex items-center gap-4">
              <Link href="/dashboard/notifications" className="relative p-2 text-foreground/70 hover:text-foreground transition-colors rounded-full hover:bg-muted/50 hidden sm:block">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)] animate-pulse" />
              </Link>
              <UserNav role={session.role} />
           </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      <BottomNav role={session.role} />
    </div>
  );
}

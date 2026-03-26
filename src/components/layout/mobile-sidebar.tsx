"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, Users, Home, Settings, Database, GraduationCap, FileText, MessageSquare, Sparkles, ShieldAlert, LogOut, Settings2, ShieldCheck, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetClose } from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function MobileSidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  
  let navigation = [];

  const MOBILE_NAV = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Workstation", href: "/dashboard/workstation", icon: Sparkles },
    { name: "Mwalimu Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Schemes of Work", href: "/dashboard/schemes", icon: BookOpen },
    { name: "Lesson Plans", href: "/dashboard/lessons", icon: FileText },
    { name: "Assessments", href: "/dashboard/assessments", icon: GraduationCap }
  ];

  navigation.push(...MOBILE_NAV);

  if (role === "SUPERADMIN") {
    navigation.push(
      { name: "Knowledge Base", href: "/dashboard/knowledge", icon: Database },
      { name: "Prompt Rules", href: "/dashboard/rules", icon: Settings2 },
      { name: "Verification", href: "/dashboard/verification", icon: ShieldCheck }
    );
  }

  if (role === "ADMIN" || role === "SUPERADMIN") {
    navigation.push(
      { name: "Teachers", href: "/dashboard/teachers", icon: Users },
      { name: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 }
    );
  }

  if (role === "SUPERADMIN") {
    navigation.push(
      { name: "Tenants", href: "/dashboard/tenants", icon: Users },
      { name: "Access Control", href: "/dashboard/rbac", icon: ShieldAlert }
    );
  }

  if (role === "ADMIN" || role === "SUPERADMIN") {
    navigation.push({ name: "Settings", href: "/dashboard/settings", icon: Settings });
  }

  return (
    <Sheet>
      <SheetTrigger className="p-2 -ml-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
        <Menu className="w-6 h-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 border-r border-border/30 bg-card/95 backdrop-blur-3xl flex flex-col">
        <SheetHeader className="p-6 text-left border-b border-border/30 shrink-0">
          <SheetTitle className="flex items-center gap-3 text-xl font-bold">
             <img src="/elimu-logo.png" alt="Elimu Logo" className="w-8 h-8 object-contain" />
             Elimu
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            const Icon = item.icon;
            return (
              <SheetClose 
                key={item.name}
                nativeButton={false}
                render={
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-semibold transition-all duration-300 ${
                      isActive 
                        ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1"
                    }`}
                  />
                }
              >
                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary fill-primary/20" : "text-muted-foreground"}`} />
                {item.name}
              </SheetClose>
            )
          })}
        </div>
        <div className="p-6 border-t border-border/30 shrink-0 bg-background/50">
          <form action={logout}>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10 gap-3 h-12 rounded-xl text-[15px] font-semibold transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

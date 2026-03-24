"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, Users, LayoutDashboard, Settings, Database, GraduationCap, FileText, MessageSquare, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const BASE_NAV = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mwalimu Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Schemes of Work", href: "/dashboard/schemes", icon: BookOpen },
  { name: "Lesson Plans", href: "/dashboard/lessons", icon: FileText },
  { name: "Assessments", href: "/dashboard/assessments", icon: GraduationCap },
];

const ADMIN_EXTRAS = [
  { name: "Teachers", href: "/dashboard/teachers", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const SUPERADMIN_EXTRAS = [
  { name: "Knowledge Base", href: "/dashboard/knowledge", icon: Database },
  { name: "Tenants", href: "/dashboard/tenants", icon: Users },
];

export function MobileSidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  let navigation = [...BASE_NAV];
  
  if (role === "ADMIN" || role === "SUPERADMIN") {
    navigation = [...navigation, ...ADMIN_EXTRAS];
  }
  if (role === "SUPERADMIN") {
    navigation = [...navigation, ...SUPERADMIN_EXTRAS];
  }

  return (
    <Sheet>
      <SheetTrigger className="p-2 -ml-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
        <Menu className="w-6 h-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 border-r-border/30 bg-card/95 backdrop-blur-3xl">
        <SheetHeader className="p-6 text-left border-b border-border/30">
          <SheetTitle className="flex items-center gap-3 text-xl font-bold">
             <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
               <Sparkles className="h-5 w-5" />
             </div>
             Mwalimu AI
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-80px)]">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-semibold transition-all duration-200 ${
                  isActive ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary fill-primary/20" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

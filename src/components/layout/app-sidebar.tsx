"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, LayoutDashboard, Settings, LogOut, Database, GraduationCap, FileText, Sparkles, MessageSquare } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const BASE_NAV = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mwalimu Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Schemes of Work", href: "/dashboard/schemes", icon: BookOpen },
  { name: "Lesson Plans", href: "/dashboard/lessons", icon: FileText },
  { name: "Assessments", href: "/dashboard/assessments", icon: GraduationCap },
];

const ADMIN_EXTRAS = [
  { name: "Teachers", href: "/dashboard/teachers", icon: Users },
];

const SUPERADMIN_EXTRAS = [
  { name: "Tenants", href: "/dashboard/tenants", icon: Users },
  { name: "Knowledge Base", href: "/dashboard/knowledge", icon: Database },
];

export function AppSidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  
  let navigation = [...BASE_NAV];
  if (role === "ADMIN" || role === "SUPERADMIN") {
    navigation.push(...ADMIN_EXTRAS);
  }
  if (role === "SUPERADMIN") {
    navigation.push(...SUPERADMIN_EXTRAS);
  }
  
  if (role === "ADMIN" || role === "SUPERADMIN") {
    navigation.push({ name: "Settings", href: "/dashboard/settings", icon: Settings });
  }

  return (
    <div className="w-64 bg-card border-r border-border/40 flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-border/40">
        <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          Mwalimu AI
        </Link>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navigation.map((item: any) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-border/40">
        <form action={logout}>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10 gap-3">
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}

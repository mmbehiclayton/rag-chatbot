"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Users, Home, Settings, LogOut, Database,
  GraduationCap, FileText, Sparkles, MessageSquare, Edit3,
  ShieldAlert, LayoutGrid, Settings2, ShieldCheck, BarChart3
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const navGroups = (role: string | null) => {
  const groups: { label?: string; items: { name: string; href: string; icon: any }[] }[] = [];

  // Always visible
  groups.push({
    items: [{ name: "Home", href: "/dashboard", icon: Home }],
  });

  // Superadmin system tools
  if (role === "SUPERADMIN") {
    groups.push({
      label: "SYSTEM",
      items: [
        { name: "Structure", href: "/dashboard/structure", icon: LayoutGrid },
        { name: "Knowledge Base", href: "/dashboard/knowledge", icon: Database },
        { name: "Prompt Rules", href: "/dashboard/rules", icon: Settings2 },
        { name: "Verification", href: "/dashboard/verification", icon: ShieldCheck },
      ],
    });
  }

  // Curriculum authoring for all
  groups.push({
    label: "CURRICULUM",
    items: [
      { name: "Workstation", href: "/dashboard/workstation", icon: Sparkles },
      { name: "Elimu Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Schemes of Work", href: "/dashboard/schemes", icon: BookOpen },
      { name: "Lesson Plans", href: "/dashboard/lessons", icon: FileText },
      { name: "Lesson Notes", href: "/dashboard/notes", icon: Edit3 },
      { name: "Assessments", href: "/dashboard/assessments", icon: GraduationCap },
    ],
  });

  // Admin tools
  if (role === "ADMIN" || role === "SUPERADMIN") {
    groups.push({
      label: "ADMIN",
      items: [
        { name: "Teachers", href: "/dashboard/teachers", icon: Users },
        { name: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
        ...(role === "SUPERADMIN" ? [
          { name: "Tenants", href: "/dashboard/tenants", icon: Users },
          { name: "Access Control", href: "/dashboard/rbac", icon: ShieldAlert },
        ] : []),
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    });
  }

  return groups;
};

export function AppSidebar({ role }: { role: string | null }) {
  const pathname = usePathname();
  const groups = navGroups(role);

  return (
    <aside className="w-56 bg-card border-r border-border/50 flex flex-col hidden md:flex shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border/50 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/elimu-logo.png" alt="Elimu Logo" className="w-6 h-6 object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-foreground">Elimu</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto scrollbar-hide">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && (
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group relative",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-r-full" />
                  )}
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Sign Out */}
      <div className="p-3 border-t border-border/50 shrink-0">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/8 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}

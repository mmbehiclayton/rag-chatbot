"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, LayoutDashboard, Settings, Database, GraduationCap, FileText, MessageSquare } from "lucide-react";

const MOBILE_NAV = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Schemes", href: "/dashboard/schemes", icon: BookOpen },
  { name: "Lessons", href: "/dashboard/lessons", icon: FileText }
];

export function BottomNav({ role }: { role: string | null }) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 px-6">
      <nav className="flex items-center justify-between bg-card/90 backdrop-blur-xl border border-border/40 rounded-[28px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] py-2.5 px-6">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-2xl transition-all duration-300 ${
                isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive ? 'bg-primary/15' : 'bg-transparent'}`}>
                <Icon className={`w-5 h-5 ${isActive ? "fill-primary/20 stroke-primary" : "stroke-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

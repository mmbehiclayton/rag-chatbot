"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, BookOpen, FileText, MoreHorizontal } from "lucide-react";

const MOBILE_NAV = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Schemes", href: "/dashboard/schemes", icon: BookOpen },
  { name: "Lessons", href: "/dashboard/lessons", icon: FileText },
  { name: "More", href: "/dashboard/workstation", icon: MoreHorizontal },
];

export function BottomNav({ role }: { role: string | null }) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-0 pointer-events-none">
      <nav className="flex items-center bg-card/95 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-xl shadow-black/10 py-1 px-1 max-w-sm mx-auto pointer-events-auto">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-200 group ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Active pill background */}
              {isActive && (
                <span className="absolute inset-1.5 rounded-xl bg-primary/10" />
              )}
              <Icon className={`w-[18px] h-[18px] relative z-10 transition-all duration-200 ${isActive ? "stroke-primary" : "stroke-muted-foreground group-hover:stroke-foreground"}`} />
              <span className={`text-[10px] font-semibold mt-0.5 relative z-10 tracking-wide ${isActive ? "text-primary" : ""}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

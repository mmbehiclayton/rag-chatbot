"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, PRIMARY_NAV } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {PRIMARY_NAV.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.short ? item.name : undefined}
                className={cn(
                  "flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-xs font-medium leading-tight",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate">
                  {item.short ?? item.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

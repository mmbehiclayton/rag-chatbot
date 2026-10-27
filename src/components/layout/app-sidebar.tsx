"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import {
  canSwitchWorkspace,
  isActivePath,
  type NavItem,
  type Workspace,
  workspaceForPath,
  workspaceNav,
} from "./nav-config";
import { WorkspaceSwitcher } from "./workspace-switcher";

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function AppSidebar({
  role,
  isCurator = false,
  workspace,
}: {
  role: string | null;
  isCurator?: boolean;
  workspace: Workspace;
}) {
  const pathname = usePathname();
  // A page from the other menus shows those menus, so the open page is always highlighted.
  const shown = workspaceForPath(pathname, role) ?? workspace;
  const { top, groups } = workspaceNav(shown, role, isCurator);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Logo href="/dashboard" />
      </div>

      <nav
        aria-label="Main"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
      >
        {canSwitchWorkspace(role) && (
          <WorkspaceSwitcher role={role} current={shown} />
        )}
        <div className="space-y-1">
          {top.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </div>
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

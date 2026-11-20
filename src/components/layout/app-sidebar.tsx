"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm md:min-h-0 font-medium transition-colors",
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

type MenuProps = {
  role: string | null;
  isCurator?: boolean;
  workspace: Workspace;
};

/** The menu links and Log out, shared by the desktop sidebar and the phone's slide-out menu. */
function SidebarNav({
  role,
  isCurator = false,
  workspace,
  onNavigate,
}: MenuProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  // A page from the other menus shows those menus, so the open page is always highlighted.
  const shown = workspaceForPath(pathname, role) ?? workspace;
  const { top, groups } = workspaceNav(shown, role, isCurator);

  return (
    <>
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
              onNavigate={onNavigate}
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
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:min-h-0"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Log out
          </button>
        </form>
      </div>
    </>
  );
}

export function AppSidebar(props: MenuProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Logo href="/dashboard" />
      </div>
      <SidebarNav {...props} />
    </aside>
  );
}

/** Phones: a menu button in the header that slides the full menu in from the left. */
export function MobileMenu(props: MenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 size-11 md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 max-w-[85vw] gap-0 bg-sidebar p-0 text-sm"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b pr-2 pl-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Logo href="/dashboard" />
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Close menu"
            onClick={close}
          >
            <X />
          </Button>
        </div>
        <SidebarNav {...props} onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { ChevronRight, FolderOpen, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CREATE_NAV,
  DOC_NAV,
  isActivePath,
  type NavItem,
  PRIMARY_NAV,
} from "./nav-config";

const [HOME, CLASSES, THIS_WEEK] = PRIMARY_NAV;

/** One tab for the four document lists; they switch between each other with tabs. */
const DOCUMENTS: NavItem = {
  name: "Documents",
  href: "/dashboard/lessons",
  icon: FolderOpen,
};

const tabClass = (active: boolean) =>
  cn(
    "flex h-16 w-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-center text-xs font-medium leading-tight",
    active ? "text-primary" : "text-muted-foreground",
  );

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li className="min-w-0 flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={tabClass(active)}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className="max-w-full truncate">{item.short ?? item.name}</span>
      </Link>
    </li>
  );
}

/** The middle button: a sheet from the bottom with the four things a teacher can make. */
function CreateTab() {
  const [open, setOpen] = useState(false);
  return (
    <li className="min-w-0 flex-1">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={tabClass(false)}
          aria-label="Create a document"
        >
          <span className="-my-1.5 flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plus className="size-5" aria-hidden />
          </span>
          <span>Create</span>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)] text-sm"
        >
          <div className="flex items-center justify-between border-b py-1 pr-2 pl-4">
            <SheetTitle className="text-base font-semibold">
              What do you want to make?
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
          <ul className="divide-y">
            {CREATE_NAV.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <c.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.note}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </li>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const inDocuments = DOC_NAV.some((d) => isActivePath(pathname, d.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        <Tab item={HOME} active={isActivePath(pathname, HOME.href)} />
        <Tab item={CLASSES} active={isActivePath(pathname, CLASSES.href)} />
        <CreateTab />
        <Tab item={DOCUMENTS} active={inDocuments} />
        <Tab item={THIS_WEEK} active={isActivePath(pathname, THIS_WEEK.href)} />
      </ul>
    </nav>
  );
}

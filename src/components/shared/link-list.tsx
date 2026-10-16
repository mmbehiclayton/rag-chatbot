import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type LinkListItem = { href: string; title: string; meta?: string; icon?: LucideIcon; key?: string };

/** A bordered card of tappable rows (title + one line of meta), used for lists of classes and documents. */
export function LinkList({ items, className }: { items: LinkListItem[]; className?: string }) {
  return (
    <ul className={cn("divide-y rounded-xl border bg-card", className)}>
      {items.map((item) => (
        <li key={item.key ?? item.href}>
          <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
            {item.icon && <item.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.title}</span>
              {item.meta && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.meta}</span>}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Small section heading with an optional link or button on the right. */
export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

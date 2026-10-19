"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";

export function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : source.slice(0, 2);
  return letters.toUpperCase() || "?";
}

export function UserNav({
  role,
  name,
  email,
}: {
  role: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {initials(name, email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">
              {name || "Your account"}
            </p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <Settings className="mr-2 h-4 w-4" />
              School settings
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

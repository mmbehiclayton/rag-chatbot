import {
  BarChart3, Building2, Database, FolderOpen, Home, LayoutGrid, MessageSquare,
  PlusCircle, Settings, Settings2, ShieldAlert, ShieldCheck, UserCircle, Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { name: string; href: string; icon: LucideIcon };
export type NavGroup = { label?: string; items: NavItem[] };

/** The five destinations every user sees, on the bottom bar and the sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Create", href: "/dashboard/create", icon: PlusCircle },
  { name: "Library", href: "/dashboard/library", icon: FolderOpen },
  { name: "Ask Elimu", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Me", href: "/dashboard/profile", icon: UserCircle },
];

/** Extra groups for school admins and superadmins (sidebar on desktop, Me page on mobile). */
export function adminNavGroups(role: string | null): NavGroup[] {
  const groups: NavGroup[] = [];
  if (role === "ADMIN" || role === "SUPERADMIN") {
    groups.push({
      label: "School",
      items: [
        { name: "Teachers", href: "/dashboard/teachers", icon: Users },
        { name: "Usage", href: "/dashboard/admin/analytics", icon: BarChart3 },
        { name: "Content review", href: "/dashboard/verification", icon: ShieldCheck },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    });
  }
  if (role === "SUPERADMIN") {
    groups.push({
      label: "Platform",
      items: [
        { name: "Curriculum structure", href: "/dashboard/structure", icon: LayoutGrid },
        { name: "Knowledge base", href: "/dashboard/knowledge", icon: Database },
        { name: "Prompt rules", href: "/dashboard/rules", icon: Settings2 },
        { name: "Tenants", href: "/dashboard/tenants", icon: Building2 },
        { name: "Access control", href: "/dashboard/rbac", icon: ShieldAlert },
      ],
    });
  }
  return groups;
}

export function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const TITLES: [string, string][] = [
  ["/dashboard/create/lesson", "New lesson plan"],
  ["/dashboard/create/scheme", "New scheme of work"],
  ["/dashboard/create", "Create"],
  ["/dashboard/library", "Library"],
  ["/dashboard/schemes", "Scheme of work"],
  ["/dashboard/lessons", "Lesson plan"],
  ["/dashboard/notes", "Lesson notes"],
  ["/dashboard/assessments", "Assessment"],
  ["/dashboard/chat", "Ask Elimu"],
  ["/dashboard/profile", "Me"],
  ["/dashboard/teachers", "Teachers"],
  ["/dashboard/admin/analytics", "Usage"],
  ["/dashboard/verification", "Content review"],
  ["/dashboard/settings", "Settings"],
  ["/dashboard/structure", "Curriculum structure"],
  ["/dashboard/knowledge", "Knowledge base"],
  ["/dashboard/rules", "Prompt rules"],
  ["/dashboard/tenants", "Tenants"],
  ["/dashboard/rbac", "Access control"],
];

export function titleForPath(pathname: string) {
  return TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "Home";
}

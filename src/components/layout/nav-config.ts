import {
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  Database,
  FlaskConical,
  GraduationCap,
  Home,
  LayoutGrid,
  ListChecks,
  type LucideIcon,
  MessageSquare,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";

/** `short` is the label on the phone's bottom bar, where six items share about 360px. */
export type NavItem = {
  name: string;
  short?: string;
  href: string;
  icon: LucideIcon;
};
export type NavGroup = { label?: string; items: NavItem[] };

/** The destinations every user sees, on the bottom bar and the sidebar. Work is organised by class. */
export const PRIMARY_NAV: NavItem[] = [
  { name: "Today", href: "/dashboard", icon: Home },
  {
    name: "My classes",
    short: "Classes",
    href: "/dashboard/classes",
    icon: GraduationCap,
  },
  {
    name: "Curriculum Designs",
    short: "Designs",
    href: "/dashboard/designs",
    icon: BookOpen,
  },
  {
    name: "Syllabus coverage",
    short: "Coverage",
    href: "/dashboard/coverage",
    icon: ListChecks,
  },
  {
    name: "Ask Elimu",
    short: "Ask",
    href: "/dashboard/chat",
    icon: MessageSquare,
  },
  { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

/** Extra groups for school admins and superadmins (sidebar on desktop, Profile page on mobile). */
export function adminNavGroups(
  role: string | null,
  isCurator = false,
): NavGroup[] {
  const groups: NavGroup[] = [];
  const curatorLink = {
    name: "Curriculum maps",
    href: "/dashboard/curriculum",
    icon: BookMarked,
  };
  // Curators are trusted teachers who enter and check curriculum maps.
  if (isCurator && role !== "SUPERADMIN")
    groups.push({ label: "Curriculum", items: [curatorLink] });
  if (role === "ADMIN" || role === "SUPERADMIN") {
    groups.push({
      label: "School",
      items: [
        { name: "Teachers", href: "/dashboard/teachers", icon: Users },
        { name: "Usage", href: "/dashboard/admin/analytics", icon: BarChart3 },
        {
          name: "Content review",
          href: "/dashboard/verification",
          icon: ShieldCheck,
        },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    });
  }
  if (role === "SUPERADMIN") {
    groups.push({
      label: "Platform",
      items: [
        { name: "Pilot", href: "/dashboard/pilot", icon: FlaskConical },
        curatorLink,
        {
          name: "Curriculum structure",
          href: "/dashboard/structure",
          icon: LayoutGrid,
        },
        {
          name: "Knowledge base",
          href: "/dashboard/knowledge",
          icon: Database,
        },
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
  ["/dashboard/create/assessment", "New assessment"],
  ["/dashboard/create", "Create"],
  ["/dashboard/profile/term", "Term dates and timetable"],
  ["/dashboard/timetable", "This week"],
  ["/dashboard/profile/plan", "Term pass"],
  ["/dashboard/pilot", "Pilot"],
  ["/dashboard/classes", "My classes"],
  ["/dashboard/curriculum", "Curriculum maps"],
  ["/dashboard/designs", "Curriculum Designs"],
  ["/dashboard/coverage", "Syllabus coverage"],
  ["/dashboard/library", "Library"],
  ["/dashboard/schemes", "Scheme of work"],
  ["/dashboard/lessons", "Lesson plan"],
  ["/dashboard/notes", "Lesson notes"],
  ["/dashboard/assessments", "Assessment"],
  ["/dashboard/chat", "Ask Elimu"],
  ["/dashboard/profile", "Profile"],
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
  if (/^\/dashboard\/schemes\/[^/]+\/record$/.test(pathname))
    return "Record of work";
  return (
    TITLES.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.[1] ?? "Today"
  );
}

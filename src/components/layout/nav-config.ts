import {
  BarChart3,
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  GraduationCap,
  Home,
  LayoutGrid,
  Library,
  ListChecks,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  NotebookPen,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";

/** `short` is the label on the phone's bottom bar, where five items share about 360px. */
export type NavItem = {
  name: string;
  short?: string;
  href: string;
  icon: LucideIcon;
};
export type NavGroup = { label?: string; items: NavItem[] };

/** The bottom bar and the top of the sidebar: Home, then the four documents teachers keep. */
export const PRIMARY_NAV: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  {
    name: "Schemes of work",
    short: "Schemes",
    href: "/dashboard/schemes",
    icon: BookOpen,
  },
  {
    name: "Lesson plans",
    short: "Lessons",
    href: "/dashboard/lessons",
    icon: FileText,
  },
  {
    name: "Lesson notes",
    short: "Notes",
    href: "/dashboard/notes",
    icon: NotebookPen,
  },
  {
    name: "Assessments",
    short: "Tests",
    href: "/dashboard/assessments",
    icon: ClipboardList,
  },
];

/** Used now and then: on the sidebar under "More", on Home and on the Profile page on a phone. */
export const MORE_NAV: NavItem[] = [
  { name: "My classes", href: "/dashboard/classes", icon: GraduationCap },
  {
    name: "Syllabus coverage",
    href: "/dashboard/coverage",
    icon: ListChecks,
  },
  {
    name: "Curriculum designs",
    href: "/dashboard/designs",
    icon: Library,
  },
  { name: "This week", href: "/dashboard/timetable", icon: CalendarDays },
  { name: "Ask Elimu", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Staffroom", href: "/dashboard/staffroom", icon: MessagesSquare },
  { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
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
        {
          name: "School calendar",
          href: "/dashboard/calendar",
          icon: CalendarRange,
        },
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

/**
 * Admins and staff switch between their own menus and the teacher's, so neither is buried
 * under the other. Teachers only have "teaching". The switch changes menus and Home, not access.
 */
export type Workspace = "teaching" | "admin";
export const WORKSPACE_COOKIE = "elimu_workspace";

export function canSwitchWorkspace(role: string | null) {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function workspaceLabel(workspace: Workspace, role: string | null) {
  if (workspace === "teaching") return "Teaching";
  return role === "SUPERADMIN" ? "Elimu staff" : "School admin";
}

/** The saved choice, falling back to the admin menus for admins and staff. */
export function parseWorkspace(
  value: string | undefined,
  role: string | null,
): Workspace {
  if (!canSwitchWorkspace(role)) return "teaching";
  return value === "teaching" ? "teaching" : "admin";
}

/** The sidebar for a workspace: links at the top, then labelled groups. */
export function workspaceNav(
  workspace: Workspace,
  role: string | null,
  isCurator = false,
): { top: NavItem[]; groups: NavGroup[] } {
  if (workspace === "admin" && canSwitchWorkspace(role))
    return {
      top: [PRIMARY_NAV[0]],
      groups: adminNavGroups(role, isCurator),
    };
  return {
    top: PRIMARY_NAV,
    groups: [
      { label: "More", items: MORE_NAV },
      // Curators keep their one curriculum link; staff have it under their own menus.
      ...(isCurator && role !== "SUPERADMIN"
        ? adminNavGroups("TEACHER", true)
        : []),
    ],
  };
}

/** Which workspace a page belongs to, so the sidebar follows a link into the other one. */
export function workspaceForPath(
  pathname: string,
  role: string | null,
): Workspace | null {
  if (!canSwitchWorkspace(role)) return null;
  const has = (items: NavItem[]) =>
    items.some(
      (i) => i.href !== "/dashboard" && isActivePath(pathname, i.href),
    );
  if (has(adminNavGroups(role).flatMap((g) => g.items))) return "admin";
  if (
    has(
      [...PRIMARY_NAV, ...MORE_NAV].filter(
        (i) => i.href !== "/dashboard/profile",
      ),
    )
  )
    return "teaching";
  return null;
}

export function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const TITLES: [string, string][] = [
  ["/dashboard/create/lesson", "New lesson plan"],
  ["/dashboard/create/scheme", "New scheme of work"],
  ["/dashboard/create/assessment", "New assessment"],
  ["/dashboard/profile/term", "Term dates and timetable"],
  ["/dashboard/timetable", "This week"],
  ["/dashboard/profile/plan", "Term pass"],
  ["/dashboard/pilot", "Pilot"],
  ["/dashboard/calendar", "School calendar"],
  ["/dashboard/classes", "My classes"],
  ["/dashboard/curriculum", "Curriculum maps"],
  ["/dashboard/designs", "Curriculum designs"],
  ["/dashboard/coverage", "Syllabus coverage"],
  ["/dashboard/notes/new", "New lesson notes"],
  ["/dashboard/schemes", "Scheme of work"],
  ["/dashboard/lessons", "Lesson plan"],
  ["/dashboard/notes", "Lesson notes"],
  ["/dashboard/assessments", "Assessment"],
  ["/dashboard/chat", "Ask Elimu"],
  ["/dashboard/staffroom", "Staffroom"],
  ["/dashboard/jobs/new", "Post a job"],
  ["/dashboard/jobs", "Jobs"],
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

/** The four document lists, titled in the plural. */
const LIST_TITLES: Record<string, string> = {
  "/dashboard/schemes": "Schemes of work",
  "/dashboard/lessons": "Lesson plans",
  "/dashboard/notes": "Lesson notes",
  "/dashboard/assessments": "Assessments",
};

export function titleForPath(pathname: string) {
  if (LIST_TITLES[pathname]) return LIST_TITLES[pathname];
  if (/^\/dashboard\/schemes\/[^/]+\/record$/.test(pathname))
    return "Record of work";
  return (
    TITLES.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.[1] ?? "Home"
  );
}

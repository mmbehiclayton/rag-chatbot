/**
 * Who can open which part of the dashboard. src/proxy.ts enforces this table, and the
 * Access control page shows it, so the page always matches what actually happens.
 * A path must pass every prefix it starts with, so "/dashboard" (everyone) sits last.
 */
export type Role = "SUPERADMIN" | "ADMIN" | "TEACHER";

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Elimu staff",
  ADMIN: "School admin",
  TEACHER: "Teacher",
};

export const ROUTE_ACCESS: { prefix: string; area: string; roles: Role[] }[] = [
  { prefix: "/dashboard/knowledge", area: "Curriculum designs (upload and index)", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/pilot", area: "Pilot: payments, price and test mode", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/tenants", area: "Schools and accounts", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/structure", area: "Curriculum structure", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/rules", area: "Generation rules", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/rbac", area: "Access control (this page)", roles: ["SUPERADMIN"] },
  { prefix: "/dashboard/verification", area: "Accuracy checks", roles: ["SUPERADMIN", "ADMIN"] },
  { prefix: "/dashboard/admin", area: "Usage reports", roles: ["SUPERADMIN", "ADMIN"] },
  { prefix: "/dashboard/teachers", area: "Teachers and roles", roles: ["SUPERADMIN", "ADMIN"] },
  { prefix: "/dashboard/settings", area: "Settings", roles: ["SUPERADMIN", "ADMIN"] },
  { prefix: "/dashboard/notifications", area: "Notifications (not live yet)", roles: ["SUPERADMIN", "ADMIN"] },
  { prefix: "/dashboard", area: "Planning: schemes, lessons, records, Ask Elimu, Me", roles: ["SUPERADMIN", "ADMIN", "TEACHER"] },
];

/** Rules that live in the code rather than in the route table above. */
export const OTHER_RULES = [
  "Teachers only see and edit their own schemes, lessons, notes and assessments.",
  "School admins see the teachers in their own school. Elimu staff see everyone.",
  "Only Elimu staff can change someone's role, on the Teachers page. Nobody can change their own role.",
  "A role change signs that person out everywhere, so their menus update straight away.",
  "Curators (set on the Teachers page) can also review curriculum maps.",
];

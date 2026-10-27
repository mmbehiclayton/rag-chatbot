import { redirect } from "next/navigation";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { SuperAdminOverview } from "@/components/dashboard/superadmin-overview";
import { TeacherOverview } from "@/components/dashboard/teacher-overview";
import { auth } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  // Admins and staff who switched to the teacher's menus get the teacher's Home too.
  if ((await getWorkspace(session.role ?? null)) === "teaching")
    return <TeacherOverview session={session} />;

  return (
    <div className="mx-auto max-w-4xl">
      {session.role === "SUPERADMIN" && <SuperAdminOverview />}
      {session.role === "ADMIN" && <AdminOverview session={session} />}
    </div>
  );
}

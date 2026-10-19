import { redirect } from "next/navigation";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { SuperAdminOverview } from "@/components/dashboard/superadmin-overview";
import { TeacherOverview } from "@/components/dashboard/teacher-overview";
import { auth } from "@/lib/auth";

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  return (
    <div
      className={session.role === "TEACHER" ? undefined : "mx-auto max-w-4xl"}
    >
      {session.role === "SUPERADMIN" && <SuperAdminOverview />}
      {session.role === "ADMIN" && <AdminOverview session={session} />}
      {session.role === "TEACHER" && <TeacherOverview session={session} />}
    </div>
  );
}

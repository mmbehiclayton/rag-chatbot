import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherOverview } from "@/components/dashboard/teacher-overview";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { SuperAdminOverview } from "@/components/dashboard/superadmin-overview";

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {session.role === "SUPERADMIN" && <SuperAdminOverview session={session} />}
      {(session.role === "SUPERADMIN" || session.role === "ADMIN") && <AdminOverview session={session} />}
      <TeacherOverview session={session} />
    </div>
  );
}

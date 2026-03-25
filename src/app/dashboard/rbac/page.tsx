import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRolePermissions } from "@/lib/actions/rbac";
import RBACClient from "./rbac-client";
import { ShieldAlert } from "lucide-react";

export default async function RBACPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const permissions = await getRolePermissions();

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <div className="bg-indigo-500/10 text-indigo-500 p-2 rounded-xl border border-indigo-500/20">
            <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          Roles & Permissions
        </h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Granular entity-based access control. Define exactly what actions each role can perform across your application workspace.
        </p>
      </div>

      <RBACClient initialPermissions={permissions} />
    </div>
  );
}

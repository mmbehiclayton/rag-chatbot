import { auth } from "@/lib/auth";
import { getSchoolUsageStats, getDetailedGenerationLog } from "@/lib/actions/analytics";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (session?.role !== "ADMIN" && session?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const stats = await getSchoolUsageStats();
  const logs = await getDetailedGenerationLog();

  return (
    <div className="container mx-auto px-4 py-8">
      <AnalyticsClient stats={stats} logs={logs} />
    </div>
  );
}

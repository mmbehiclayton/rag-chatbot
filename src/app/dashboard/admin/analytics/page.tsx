import { auth } from "@/lib/auth";
import { getSchoolUsageStats, getDetailedGenerationLog } from "@/lib/actions/analytics";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (session?.role !== "ADMIN" && session?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  let stats = null;
  let logs = null;
  let error = false;

  try {
    stats = await getSchoolUsageStats();
    logs = await getDetailedGenerationLog();
  } catch (e) {
    console.error("Failed to load analytics:", e);
    error = true;
  }

  if (error || !stats || !logs) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-[32px] p-12 text-center space-y-4">
           <h2 className="text-2xl font-black">Something went wrong</h2>
           <p className="text-muted-foreground font-medium">We couldn't load the institutional analytics right now. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AnalyticsClient stats={stats} logs={logs} />
    </div>
  );
}

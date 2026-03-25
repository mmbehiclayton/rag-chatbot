import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AssetLibrary } from "@/components/dashboard/asset-library";

export default async function SchemesPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const schemes = await db.schemeOfWork.findMany({
    where: { teacherId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      grade: true,
      subject: true,
      updatedAt: true
    }
  });

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <AssetLibrary 
        assets={schemes}
        type="SCHEMES"
        title="Schemes Library"
        description="Access and manage your KICD-compliant Schemes of Work. View details, export to PDF, or track syllabus coverage."
      />
    </div>
  );
}

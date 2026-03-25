import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AssetLibrary } from "@/components/dashboard/asset-library";

export default async function AssessmentsPage() {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const assessments = await db.assessment.findMany({
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
        assets={assessments}
        type="ASSESSMENTS"
        title="Assessment Bank"
        description="Your bank of generated Bloom-aligned exams and rubrics. Review content, print to PDF, or regenerate exams."
      />
    </div>
  );
}

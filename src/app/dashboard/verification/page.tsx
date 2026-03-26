import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { VerificationClient } from "@/components/dashboard/verification-client";
import { getCurriculumData } from "@/lib/actions/structure";

export default async function VerificationPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN" && session?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all grades, learning areas, and existing content for the matrix
  const [grades, learningAreas, schemes, designs, cbcData] = await Promise.all([
    db.gradeLevel.findMany({
      include: { level: true },
      orderBy: { order: "asc" }
    }),
    db.learningArea.findMany({
      orderBy: { order: "asc" }
    }),
    db.schemeOfWork.findMany({
      select: { grade: true, subject: true }
    }),
    db.curriculumDocument.findMany({
      select: { gradeLevel: true, subject: true }
    }),
    getCurriculumData()
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <VerificationClient 
        grades={grades} 
        learningAreas={learningAreas} 
        schemes={schemes} 
        designs={designs} 
        cbcStructure={cbcData.success ? (cbcData.levels as any) : []}
      />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { VerificationClient } from "@/components/dashboard/verification-client";

export default async function VerificationPage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN" && session?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all grades, learning areas, and existing content for the matrix
  const grades = await db.gradeLevel.findMany({
    include: { level: true },
    orderBy: { order: "asc" }
  });

  const learningAreas = await db.learningArea.findMany({
    orderBy: { order: "asc" }
  });

  const schemes = await db.schemeOfWork.findMany({
    select: { grade: true, subject: true }
  });

  const designs = await db.curriculumDocument.findMany({
    select: { gradeLevel: true, subject: true }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <VerificationClient 
        grades={grades} 
        learningAreas={learningAreas} 
        schemes={schemes} 
        designs={designs} 
      />
    </div>
  );
}

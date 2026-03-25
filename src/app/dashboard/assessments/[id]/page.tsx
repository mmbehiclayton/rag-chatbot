import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { AssessmentHub } from "@/components/dashboard/assessment-hub";
import { getAssessments } from "@/lib/actions/generation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssessmentDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;

  const [assessment, savedAssessments] = await Promise.all([
    db.assessment.findUnique({
      where: { 
        id,
        teacherId: session.userId 
      }
    }),
    getAssessments()
  ]);

  if (!assessment) notFound();

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <AssessmentHub 
        savedAssessments={savedAssessments} 
        initialAssessment={assessment} 
        viewOnly={true}
      />
    </div>
  );
}

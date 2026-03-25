import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SchemeViewer } from "@/components/dashboard/scheme-viewer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SchemeDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.userId) redirect("/login");

  const { id } = await params;

  const scheme = await db.schemeOfWork.findUnique({
    where: { 
      id,
      teacherId: session.userId 
    }
  });

  if (!scheme) notFound();

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      <SchemeViewer 
        scheme={scheme} 
        grade={scheme.grade}
        subject={scheme.subject}
        term={scheme.term}
      />
    </div>
  );
}

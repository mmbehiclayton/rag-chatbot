import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import LessonsClient from "@/components/dashboard/lessons-client";

export default async function LessonsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const schemes = await db.schemeOfWork.findMany({
    where: { teacherId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, grade: true, subject: true }
  });

  return <LessonsClient schemes={schemes} />;
}

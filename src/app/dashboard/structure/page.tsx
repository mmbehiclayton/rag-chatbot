import { redirect } from "next/navigation";
import { StructureClient } from "@/components/dashboard/structure-client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CBCStructurePage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const [levels, learningAreas] = await Promise.all([
    db.curriculumLevel.findMany({
      orderBy: { order: "asc" },
      include: {
        grades: {
          orderBy: { order: "asc" },
          include: {
            learningAreas: {
              include: {
                learningArea: true,
              },
            },
          },
        },
      },
    }),
    db.learningArea.findMany({
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5 pb-20 mt-6 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Curriculum structure
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            The levels, grades and learning areas teachers choose from.
            Curriculum designs and maps follow this structure.
          </p>
        </div>
      </div>

      <StructureClient levels={levels} learningAreas={learningAreas} />
    </div>
  );
}

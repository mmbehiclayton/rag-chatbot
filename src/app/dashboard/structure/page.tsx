import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StructureClient } from "@/components/dashboard/structure-client";
import Link from "next/link";

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
                learningArea: true
              }
            }
          }
        }
      }
    }),
    db.learningArea.findMany({
      orderBy: { order: "asc" }
    })
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
           <div className="relative">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">Curriculum Structure</h1>
              <p className="text-muted-foreground mt-1 text-base font-medium">Configure the core CBC hierarchy for the entire ecosystem.</p>
           </div>
        </div>
      </div>

      <StructureClient levels={levels as any} learningAreas={learningAreas} />
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

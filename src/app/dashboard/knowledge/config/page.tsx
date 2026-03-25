import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Settings, Layers, BookOpen, GraduationCap, ChevronRight, Plus, Info, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CBCConfigPage() {
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
        <div>
           <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Link href="/dashboard/knowledge" className="hover:text-foreground transition-colors font-medium text-sm">Knowledge Base</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-bold text-sm">CBC Configuration</span>
           </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">CBC Hierarchy</h1>
          <p className="text-muted-foreground mt-1 text-base">Manage KICD levels, grades, and shared learning area definitions.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold border-border/50 bg-background/50">
             <Plus className="w-5 h-5" /> Add New Level
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Levels & Grades Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-2">
             <Layers className="w-5 h-5 text-blue-500" />
             <h2 className="text-xl font-bold tracking-tight">Academic Levels & Grades</h2>
          </div>

          <div className="space-y-4">
            {levels.map((level) => (
              <div key={level.id} className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6 border-b border-border/40 flex items-center justify-between bg-muted/20">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black text-lg">
                        {level.order}
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight">{level.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{level.grades.length} Grades Defined</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" className="h-10 rounded-xl px-4 font-bold text-xs uppercase tracking-wider">
                     Edit Level
                   </Button>
                </div>

                <div className="p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {level.grades.map((grade) => (
                        <div key={grade.id} className="p-5 rounded-[24px] border border-border/40 bg-background/40 hover:bg-muted/30 transition-all group">
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <GraduationCap className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="text-base font-bold tracking-tight">{grade.name}</span>
                              </div>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Order: {grade.order}</span>
                           </div>
                           <div className="flex flex-wrap gap-1.5">
                              {grade.learningAreas.map((la) => (
                                <span key={la.learningAreaId} className="px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary/80 truncate max-w-[120px]" title={la.learningArea.name}>
                                  {la.learningArea.name}
                                </span>
                              ))}
                              {grade.learningAreas.length === 0 && (
                                <span className="text-[10px] font-bold text-red-500 italic">No Learning Areas linked</span>
                              )}
                           </div>
                           <div className="mt-4 pt-4 border-t border-border/20 flex justify-end gap-2">
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground">
                                Manage Areas
                              </Button>
                              <Button variant="secondary" size="sm" className="h-8 rounded-lg px-2 text-[10px] font-black uppercase">
                                Edit Grade
                              </Button>
                           </div>
                        </div>
                      ))}
                      <button className="flex flex-col items-center justify-center p-6 rounded-[24px] border-2 border-dashed border-border/40 bg-background/20 hover:bg-muted/20 hover:border-primary/40 transition-all group">
                         <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                         </div>
                         <span className="text-xs font-bold text-muted-foreground group-hover:text-primary">Add Grade</span>
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Base Learning Areas Management */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold tracking-tight">Learning Areas</h2>
              </div>
              <Button size="sm" variant="outline" className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold border-purple-500/20 text-purple-600 bg-purple-500/5 hover:bg-purple-500/10 transition-all">
                 <Plus className="w-4 h-4" /> New Area
              </Button>
           </div>
           
           <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[32px] p-6 shadow-sm">
              <p className="text-sm text-muted-foreground font-medium mb-6">These are globally defined learning areas that can be shared across multiple grades.</p>
              
              <div className="space-y-2">
                 {learningAreas.map((area) => (
                   <div key={area.id} className="flex items-center justify-between p-3 rounded-2xl border border-border/20 bg-background/50 hover:bg-muted/30 hover:border-border/60 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                         <span className="text-sm font-bold tracking-tight truncate">{area.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
                            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                         </Button>
                         <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                         </Button>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                 <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                 <p className="text-xs text-blue-700/80 font-medium leading-relaxed">
                   Changes to Global Learning Areas will propagate to all linked grades in the Coverage Matrix.
                 </p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
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

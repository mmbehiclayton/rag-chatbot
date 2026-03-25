"use client";

import { useState } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Database,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Brain
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface VerificationClientProps {
  grades: any[];
  learningAreas: any[];
  schemes: any[];
  designs: any[];
}

export function VerificationClient({ grades, learningAreas, schemes, designs }: VerificationClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLearningAreas = learningAreas.filter(la => 
    la.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatus = (gradeName: string, subjectName: string) => {
    const hasDesign = designs.some(d => d.gradeLevel === gradeName && d.subject === subjectName);
    const hasScheme = schemes.some(s => s.grade === gradeName && s.subject === subjectName);

    if (hasDesign && hasScheme) return "ready";
    if (hasDesign && !hasScheme) return "design-only";
    if (!hasDesign && hasScheme) return "hallucination-risk";
    return "empty";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
           <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
             <ShieldCheck className="w-3.5 h-3.5" /> Quality Assurance
           </div>
           <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight">
             Zero-Waste Dashboard
           </h1>
           <p className="text-muted-foreground text-base max-w-xl font-medium leading-relaxed">
             A high-fidelity matrix for auditing curriculum coverage. Identify "Waste Zones" where content isn't backed by verified KICD design chunks.
           </p>
        </div>

        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search learning areas..." 
            className="pl-11 h-12 rounded-[20px] bg-card/50 border-border/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-6 bg-muted/30 rounded-[32px] border border-border/40 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-bold">
           <div className="w-4 h-4 rounded-md bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
           <span>Ready (Design + Scheme)</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
           <div className="w-4 h-4 rounded-md bg-indigo-500/40 border border-indigo-500/20" />
           <span>Design Only (Pending Scheme)</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
           <div className="w-4 h-4 rounded-md bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse" />
           <span>Hallucination Risk (Scheme w/o Design)</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
           <div className="w-4 h-4 rounded-md bg-background border border-border/40" />
           <span>Empty</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-card/60 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse border-spacing-0">
          <thead>
            <tr className="bg-background/80 border-b border-border/40">
              <th className="sticky left-0 z-20 bg-background/95 p-6 text-left text-xs font-black uppercase tracking-widest text-muted-foreground border-r border-border/40 min-w-[200px]">
                Learning Area
              </th>
              {grades.map(g => (
                <th key={g.id} className="p-4 text-center text-[10px] font-black uppercase tracking-tighter text-muted-foreground min-w-[80px]">
                  <span className="block text-indigo-500 text-[8px] mb-1">{g.level.name}</span>
                  {g.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filteredLearningAreas.map((la) => (
              <tr key={la.id} className="group hover:bg-indigo-500/5 transition-colors">
                <td className="sticky left-0 z-10 bg-background/95 p-6 border-r border-border/20 font-bold text-sm group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/10">
                  {la.name}
                </td>
                {grades.map(g => {
                  const status = getStatus(g.name, la.name);
                  return (
                    <td key={g.id} className="p-2 text-center">
                      <div className={cn(
                        "w-full h-10 rounded-xl transition-all duration-300 flex items-center justify-center relative",
                        status === "ready" && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                        status === "design-only" && "bg-indigo-500/20 border border-indigo-500/30 text-indigo-500",
                        status === "hallucination-risk" && "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20",
                        status === "empty" && "bg-muted/10 border border-border/20"
                      )}>
                        {status === "ready" && <CheckCircle2 className="w-4 h-4" />}
                        {status === "hallucination-risk" && <AlertTriangle className="w-4 h-4" />}
                        {status === "design-only" && <Database className="w-4 h-4" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex items-center gap-6">
            <div className="w-16 h-16 rounded-[24px] bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
               <FileText className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Verified Layouts</p>
               <h4 className="text-3xl font-black">{schemes.filter(s => designs.some(d => d.gradeLevel === s.grade && d.subject === s.subject)).length}</h4>
            </div>
         </div>
         <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[32px] flex items-center gap-6">
            <div className="w-16 h-16 rounded-[24px] bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Untrusted Schemes</p>
               <h4 className="text-3xl font-black">{schemes.filter(s => !designs.some(d => d.gradeLevel === s.grade && d.subject === s.subject)).length}</h4>
            </div>
         </div>
         <div className="p-8 bg-indigo-500/5 border border-indigo-500/20 rounded-[32px] flex items-center gap-6">
            <div className="w-16 h-16 rounded-[24px] bg-background border border-border/40 flex items-center justify-center text-indigo-500 shadow-sm">
               <Brain className="w-8 h-8" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Design Repository</p>
               <h4 className="text-3xl font-black">{designs.length}</h4>
            </div>
         </div>
      </div>
    </div>
  );
}

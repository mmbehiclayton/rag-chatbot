"use client";

import { useState } from "react";
import { AssessmentGenerator } from "./assessment-generator";
import { AssessmentBank } from "./assessment-bank";
import { Sparkles, Library, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentHubProps {
  savedAssessments: any[];
  initialAssessment?: any;
  viewOnly?: boolean;
}

export function AssessmentHub({ savedAssessments, initialAssessment, viewOnly = false }: AssessmentHubProps) {
  const [activeTab, setActiveTab] = useState<"generator" | "bank">(initialAssessment ? "generator" : "generator"); // Keep as generator to show the content

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      
      {/* Header with Navigation - Hide in viewOnly */}
      {!viewOnly && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 no-print">
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
               <Target className="w-3.5 h-3.5" /> Assessment Suite
             </div>
             <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight">
               {activeTab === "generator" ? "Assessment Engine" : "Assessment Bank"}
             </h1>
             <p className="text-muted-foreground text-base max-w-xl font-medium leading-relaxed">
               {activeTab === "generator" 
                 ? "Instantly generate mathematically balanced, KICD-aligned examination papers featuring strict Bloom's taxonomy distributions." 
                 : "Browse and manage your library of validated KICD assessments. Export marking schemes or print exam papers instantly."}
             </p>
          </div>

          <div className="flex p-1.5 bg-muted/40 backdrop-blur-md rounded-[24px] border border-border/40 w-full sm:w-auto self-stretch sm:self-auto">
             <button
               onClick={() => setActiveTab("generator")}
               className={cn(
                 "flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-[20px] text-sm font-bold transition-all duration-300",
                 activeTab === "generator" 
                   ? "bg-card text-foreground shadow-xl shadow-primary/5 ring-1 ring-border/40" 
                   : "text-muted-foreground hover:text-foreground"
               )}
             >
               <Sparkles className={cn("w-4 h-4", activeTab === "generator" ? "text-indigo-500" : "text-muted-foreground")} />
               Creator
             </button>
             <button
               onClick={() => setActiveTab("bank")}
               className={cn(
                 "flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-[20px] text-sm font-bold transition-all duration-300",
                 activeTab === "bank" 
                   ? "bg-card text-foreground shadow-xl shadow-primary/5 ring-1 ring-border/40" 
                   : "text-muted-foreground hover:text-foreground"
               )}
             >
               <Library className={cn("w-4 h-4", activeTab === "bank" ? "text-indigo-500" : "text-muted-foreground")} />
               Bank
               {savedAssessments.length > 0 && (
                 <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white">
                   {savedAssessments.length}
                 </span>
               )}
             </button>
          </div>
        </div>
      )}

      <div className="relative">
         {activeTab === "generator" ? (
           <AssessmentGenerator key="generator" initialAssessment={initialAssessment} viewOnly={viewOnly} />
         ) : (
           <AssessmentBank key="bank" initialAssessments={savedAssessments} />
         )}
      </div>
    </div>
  );
}

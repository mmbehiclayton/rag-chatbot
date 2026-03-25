"use client";

import { Button } from "@/components/ui/button";
import { Download, CheckCircle2 } from "lucide-react";

interface SchemeViewerProps {
  scheme: any;
  grade: string;
  subject: string;
  term: string;
}

export function SchemeViewer({ scheme, grade, subject, term }: SchemeViewerProps) {
  const result = scheme?.content || scheme;

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full print:bg-white print:border-none print:shadow-none print:rounded-none print-landscape">
      
      {/* Print Only Header */}
      <div className="print-header print-only">
        <h1>{result.title || "Scheme of Work"}</h1>
        <h2>{grade} {subject} - {term}</h2>
      </div>

      <div className="p-8 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 no-print">
        <div>
           <h2 className="text-2xl font-black">{result.title || "Generated Scheme"}</h2>
           <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-primary">
             <span className="px-3 py-1 rounded-full bg-primary/10">{result.termlyOverview?.totalLessons || 0} Lessons Planned</span>
             <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">{result.termlyOverview?.strandsCovered?.length || 0} Strands Covered</span>
             <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">CBC Compliant</span>
           </div>
        </div>
        <Button 
          variant="outline" 
          className="h-11 rounded-[16px] gap-2 font-bold shadow-sm"
          onClick={() => {
            // Force landscape and custom filename
            const style = document.createElement('style');
            style.innerHTML = '@page { size: landscape; margin: 1cm; }';
            document.head.appendChild(style);
            
            const originalTitle = document.title;
            document.title = `${grade} ${subject} - ${result.title || "Scheme"}`;
            
            window.print();
            
            setTimeout(() => {
              document.head.removeChild(style);
              document.title = originalTitle;
            }, 500);
          }}
        >
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <div className="p-8 flex-1 overflow-auto print:overflow-visible print:p-0">
        {/* Termly Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 print-section no-print">
           <div className="p-6 rounded-[24px] bg-background/50 border border-border/50">
             <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Integration Opportunities</h4>
             <ul className="space-y-2 text-sm font-medium">
               {result.termlyOverview?.crossCurricularIntegration?.map((i: string, idx: number) => (
                 <li key={idx} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> {i}</li>
               ))}
             </ul>
           </div>
           <div className="p-6 rounded-[24px] bg-background/50 border border-border/50">
             <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Community & Parents</h4>
             <ul className="space-y-2 text-sm font-medium">
               {result.termlyOverview?.communityServiceActivities?.map((i: string, idx: number) => (
                 <li key={idx} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" /> {i}</li>
               ))}
               {result.termlyOverview?.parentalEngagementStrategies?.map((i: string, idx: number) => (
                 <li key={idx} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> {i}</li>
               ))}
             </ul>
           </div>
        </div>

        <div className="overflow-x-auto rounded-[24px] border border-border/50 bg-background/50 shadow-inner print:border-none print:bg-transparent print:shadow-none print-section">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px] md:whitespace-normal border-collapse print-table">
            <thead className="bg-muted/50 border-b border-border/50 font-black uppercase text-[11px] text-muted-foreground tracking-widest text-center print:bg-gray-100">
              <tr>
                <th className="p-5 border-r border-border/30 w-16">Week</th>
                <th className="p-5 border-r border-border/30 w-[120px]">Strand</th>
                <th className="p-5 border-r border-border/30 w-[120px]">Sub-Strand</th>
                <th className="p-5 border-r border-border/30 w-[200px]">Specific Learning Outcomes</th>
                <th className="p-5 border-r border-border/30 w-[150px]">Key Inquiry Questions</th>
                <th className="p-5 border-r border-border/30 w-[280px]">Learning Experiences</th>
                <th className="p-5 border-r border-border/30 w-[150px]">Learning Resources</th>
                <th className="p-5 border-r border-border/30 w-[150px]">Assessment Methods</th>
                <th className="p-5 w-[100px]">Reflection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 align-top font-medium">
              {result.weeks?.map((week: any) => 
                week.rows?.map((row: any, i: number) => (
                  <tr key={`${week.weekNumber}-${i}`} className="hover:bg-muted/10 transition-colors group">
                    <td className="p-5 border-r border-border/30 text-center font-black text-primary/80">
                      {i === 0 ? week.weekNumber : ""}
                    </td>
                    <td className="p-5 border-r border-border/30 font-bold">{row.strand}</td>
                    <td className="p-5 border-r border-border/30 font-bold text-muted-foreground">{row.subStrand}</td>
                    <td className="p-5 border-r border-border/30">
                      <ul className="list-disc list-inside space-y-1.5">
                        {row.specificLearningOutcomes?.map((o: string, idx: number) => <li key={idx} className="leading-snug">{o}</li>)}
                      </ul>
                    </td>
                    <td className="p-5 border-r border-border/30 text-indigo-500/80 font-bold space-y-2 text-[13px]">
                       {row.keyInquiryQuestions?.map((q: string, idx: number) => <div key={idx}>Q: {q}</div>)}
                    </td>
                    <td className="p-5 border-r border-border/30">
                      <ul className="list-disc list-outside ml-3 space-y-2">
                        {row.learningExperiences?.map((o: string, idx: number) => <li key={idx} className="leading-relaxed text-muted-foreground">{o}</li>)}
                      </ul>
                    </td>
                    <td className="p-5 border-r border-border/30">
                      <div className="flex flex-wrap gap-2">
                        {row.learningResources?.map((o: string, idx: number) => <span key={idx} className="bg-primary/10 text-primary px-2.5 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-wider">{o}</span>)}
                      </div>
                    </td>
                    <td className="p-5 border-r border-border/30 space-y-1.5 text-[13px]">
                       {row.assessmentMethods?.map((m: string, idx: number) => <div key={idx} className="flex items-start gap-2 text-emerald-600/90 font-bold"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0"/>{m}</div>)}
                    </td>
                    <td className="p-5">
                      <div className="w-full h-full min-h-[60px] border-b-2 border-dotted border-border/60 group-hover:border-primary/40 transition-colors"></div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

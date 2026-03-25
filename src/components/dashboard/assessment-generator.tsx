"use client";

import { useState } from "react";
import { generateAssessment } from "@/lib/actions/generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  FileSpreadsheet, 
  Layers, 
  Target, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  Download, 
  AlertCircle, 
  BrainCircuit,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AssessmentGenerator({ initialAssessment, viewOnly = false }: { initialAssessment?: any, viewOnly?: boolean }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(initialAssessment?.content || null);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"exam" | "marking">("exam");

  const [formData, setFormData] = useState({
    grade: initialAssessment?.grade || "Grade 4",
    subject: initialAssessment?.subject || "Mathematics",
    term: initialAssessment?.term || "Term 1",
    type: initialAssessment?.type || "Summative End of Term",
    totalMarks: initialAssessment?.content?.totalMarks || 50,
    durationMinutes: initialAssessment?.content?.durationMinutes || 60
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      
      const assessment = await generateAssessment(formData);
      setResult(assessment.content);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      
      {/* Configuration Panel - Hide in viewOnly */}
      {!viewOnly && (
        <div className="w-full xl:w-[420px] shrink-0 space-y-6 no-print">
          <div className="bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-xl overflow-hidden p-6 sm:p-8 relative">
          
          {/* Ambient Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Testing Matrix
          </h2>

          <div className="space-y-5 relative z-10">
            {/* Core Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Grade</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: e.target.value})}
                  >
                    <option>Grade 1</option><option>Grade 2</option><option>Grade 3</option>
                    <option>Grade 4</option><option>Grade 5</option><option>Grade 6</option>
                    <option>Grade 7</option><option>Grade 8</option><option>Grade 9</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Type</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-indigo-500/50 transition-colors text-sm"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Formative</option>
                    <option>Summative Mid Term</option>
                    <option>Summative End of Term</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Subject</label>
                <Input 
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Term</label>
                <Input 
                  value={formData.term}
                  onChange={e => setFormData({...formData, term: e.target.value})}
                  className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold shadow-sm"
                />
              </div>
            </div>

            <div className="w-full h-[1px] bg-border/40 my-2" />

            {/* Architecture Limits */}
            <div className="grid grid-cols-2 gap-4 pt-2">
               <div className="space-y-2">
                <label className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-1.5 whitespace-nowrap"><Layers className="w-3 h-3" /> Total Marks</label>
                <Input type="number" value={formData.totalMarks} onChange={e => setFormData({...formData, totalMarks: parseInt(e.target.value)})} className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold text-center" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3" /> Time (Mins)</label>
                <Input type="number" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold text-center" />
              </div>
            </div>

          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-14 rounded-[20px] mt-8 text-base font-extrabold shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Building Exam...
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-[20px]" />
                <Sparkles className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Generate Assessment</span>
              </>
            )}
          </Button>
          
          {error && (
            <div className="mt-4 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          </div>
          
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[28px] p-6">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-indigo-500">
              <BrainCircuit className="w-4 h-4" /> Cognitive Distribution Targeting
            </h4>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               The engine enforces Bloom's taxonomy weights specifically tuned for <strong>{formData.grade}</strong> (e.g., heavily weighting Recall & Application for Lower Primary vs Analysis & Evaluation for Junior Secondary).
            </p>
          </div>
        </div>
      )}

      {/* Output Canvas */}
      <div className={cn("flex-1 min-w-0", viewOnly && "max-w-7xl mx-auto w-full")}>
        
        {!result && !isGenerating && (
           <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/30 border-2 border-dashed border-border/50 rounded-[40px] p-8 text-center">
              <div className="w-24 h-24 bg-background shadow-sm rounded-[32px] flex items-center justify-center mb-6">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Awaiting Parameters</h3>
              <p className="text-muted-foreground text-sm max-w-sm">Determine your grade, mark limits, and duration to construct a validated examination paper.</p>
           </div>
        )}

        {isGenerating && (
           <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/60 rounded-[40px] border border-border/40 p-8 text-center space-y-8 shadow-sm">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight animate-pulse">Computing Matrix...</h3>
                <p className="text-muted-foreground">Balancing strands, mapping learning outcomes, generating marking schemas.</p>
              </div>
           </div>
        )}

        {result && !isGenerating && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full print-document">
            
            {/* Print Only Header */}
            <div className="print-header print-only">
              <h1>{result.title}</h1>
              <h2>Examination Paper - {formData.grade} {formData.subject}</h2>
              <div className="flex gap-4 text-sm mt-2 font-bold">
                <span>Subject: {formData.subject}</span>
                <span>Marks: {result.totalMarks}</span>
                <span>Time: {result.durationMinutes} Mins</span>
              </div>
            </div>

            <div className="p-8 border-b border-border/40 bg-background/50 text-center space-y-4 no-print">
              <h2 className="text-3xl font-black uppercase tracking-widest">{result.title}</h2>
              <div className="flex justify-center items-center gap-6 text-sm font-bold text-muted-foreground">
                <span>{formData.grade}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>{formData.subject}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>{result.durationMinutes} Minutes</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span className="text-indigo-500">{result.totalMarks} Marks</span>
              </div>
              
              <div className="mt-6 flex justify-center gap-3">
                <Button 
                  variant="outline" 
                  className="h-[42px] rounded-[16px] gap-2 font-bold shadow-sm print-trigger"
                  onClick={() => {
                    setPrintMode("exam");
                    setTimeout(() => window.print(), 100);
                  }}
                >
                  <Download className="w-4 h-4" /> Print Exam Paper
                </Button>
                <Button 
                   variant="default" 
                   className="h-[42px] rounded-[16px] gap-2 font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm no-print"
                   onClick={() => {
                    setPrintMode("marking");
                    setTimeout(() => window.print(), 100);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Print Marking Scheme
                </Button>
              </div>
            </div>

            <div className={`p-8 flex-1 overflow-auto space-y-12 ${printMode === 'marking' ? 'print:hidden' : ''}`}>
              
              {/* Paper Instructions */}
              <div className="p-6 rounded-[24px] bg-background/30 border-2 border-dashed border-border/50 text-sm font-medium">
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground mb-3 mb-2 underline">Instructions to Learners</h4>
                <ul className="space-y-1 list-decimal list-inside text-muted-foreground">
                  {result.instructions?.map((inst: string, i: number) => <li key={i}>{inst}</li>)}
                </ul>
              </div>

              {/* Exam Sections */}
              {result.sections?.map((section: any, idx: number) => (
                <div key={idx} className="space-y-6 print-section">
                  <div className="flex items-center justify-between border-b-2 border-primary pb-3">
                     <h3 className="text-xl font-bold uppercase tracking-wider">{section.sectionName}</h3>
                     <span className="text-sm font-black bg-primary/10 text-primary px-3 py-1 rounded-[8px] no-print">{section.totalMarks} Marks</span>
                     <span className="text-sm font-black print-only">({section.totalMarks} Marks)</span>
                  </div>
                  {section.instructions && (
                    <p className="font-bold text-sm italic">{section.instructions}</p>
                  )}
                  
                  <div className="space-y-8 mt-6">
                    {section.questions?.map((q: any) => (
                      <div key={q.questionNumber} className="flex gap-4 p-5 rounded-[20px] bg-background/50 hover:bg-muted/30 transition-colors border border-transparent hover:border-border overflow-hidden">
                         <div className="font-black text-lg w-8 shrink-0">{q.questionNumber}.</div>
                         <div className="flex-1 space-y-6">
                           
                           <div className="flex justify-between items-start gap-4">
                             <p className="text-base font-semibold">{q.questionText}</p>
                             <span className="text-sm font-bold tracking-wider shrink-0">({q.marks} {q.marks === 1 ? 'mark' : 'marks'})</span>
                           </div>

                           {/* Answer Box Simulation */}
                           <div className="w-full bg-background rounded-[12px] border border-border/40 p-4 h-24 flex items-end">
                              <div className="w-full border-b border-dashed border-border" />
                           </div>

                           <div className="flex gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                             <span className="px-2 py-0.5 bg-muted rounded-[6px]">{q.questionType}</span>
                             <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-[6px]">{q.bloomsLevel}</span>
                             <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-[6px] truncate max-w-[200px]">{q.learningOutcomeTested}</span>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Marking Scheme Preview */}
              <div className={`mt-16 pt-8 border-t-[8px] border-double border-border/40 ${printMode === 'exam' ? 'print:hidden' : ''}`}>
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 print-only">
                  MARKING SCHEME - {result.title}
                </h3>
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-emerald-500" /> Marking Scheme</h3>
                
                <div className="space-y-6">
                  {result.markingScheme?.map((ms: any, i: number) => (
                    <div key={i} className="p-6 rounded-[24px] bg-emerald-500/5 border border-emerald-500/20 text-sm">
                       <h5 className="font-bold text-base mb-3 border-b border-emerald-500/20 pb-2">Question {ms.questionNumber}</h5>
                       
                       <div className="space-y-4">
                         <div>
                           <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Expected Answers</p>
                           <ul className="list-disc list-inside space-y-1 font-medium">
                             {ms.expectedAnswers?.map((ans: string, i: number) => <li key={i}>{ans}</li>)}
                           </ul>
                         </div>
                         
                         <div>
                           <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Point Allocation</p>
                           <div className="space-y-2">
                             {ms.pointAllocation?.map((pt: any, i: number) => (
                               <div key={i} className="flex justify-between bg-background/50 px-3 py-2 rounded-[12px]">
                                  <span className="font-medium">{pt.component}</span>
                                  <span className="font-bold text-emerald-600">+{pt.marks}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                         {ms.alternativeMethods && (
                           <p className="text-xs bg-amber-500/10 text-amber-600 p-3 rounded-[12px]"><strong className="uppercase">Alternative:</strong> {ms.alternativeMethods}</p>
                         )}
                         {ms.partialCreditCriteria && (
                           <p className="text-xs bg-indigo-500/10 text-indigo-500 p-3 rounded-[12px]"><strong className="uppercase">Partial Credit:</strong> {ms.partialCreditCriteria}</p>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { generateLessonPlan } from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Library, FileText, CheckCircle2, ChevronDown, Download, AlertCircle, Clock, Users, Lightbulb } from "lucide-react";

export default function LessonsClient({ schemes }: { schemes: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    schemeId: schemes[0]?.id || "",
    lessonNumber: 1,
    topic: "Addition of 2-digit numbers"
  });

  const handleGenerate = async () => {
    if (!formData.schemeId) {
      setError("Please select a Scheme of Work first.");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      
      const lesson = await generateLessonPlan(formData.schemeId, formData.lessonNumber, formData.topic);
      setResult(lesson.content);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Lesson Plan Generator</h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Explode your Scheme alignments into granular 3-part CBC lesson plans complete with dialogue scripts, differentiation, and strict 4-level rubrics.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Configuration Panel */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-6">
          <div className="bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-xl overflow-hidden p-6 sm:p-8 relative">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Extraction Source
            </h2>

            <div className="space-y-5 relative z-10">
              
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Parent Scheme of Work</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-emerald-500/50 transition-colors"
                    value={formData.schemeId}
                    onChange={e => setFormData({...formData, schemeId: e.target.value})}
                  >
                    <option value="" disabled>Select a mapped scheme...</option>
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>{s.title || `${s.grade} ${s.subject}`}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Lesson</label>
                  <Input 
                    type="number"
                    value={formData.lessonNumber}
                    onChange={e => setFormData({...formData, lessonNumber: parseInt(e.target.value)})}
                    className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold text-center shadow-sm"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Topic / Focus</label>
                  <Input 
                    placeholder="e.g. Concrete Addition"
                    value={formData.topic}
                    onChange={e => setFormData({...formData, topic: e.target.value})}
                    className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold shadow-sm"
                  />
                </div>
              </div>

            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || schemes.length === 0}
              className="w-full h-14 rounded-[20px] mt-8 text-base font-extrabold shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting Activities...
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-[20px]" />
                  <Sparkles className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Generate Lesson Plan</span>
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
          
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[28px] p-6">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> 3-Part Architecture Enforced
            </h4>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               The engine breaks the 40-minute block strictly into <strong className="text-foreground">15% Intro, 70% Main, 15% Conclusion</strong>, injecting 3-level differentiation (Support, Average, Advanced).
            </p>
          </div>
        </div>

        {/* Output Canvas */}
        <div className="flex-1 min-w-0">
          
          {!result && !isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/30 border-2 border-dashed border-border/50 rounded-[40px] p-8 text-center">
                <div className="w-24 h-24 bg-background shadow-sm rounded-[32px] flex items-center justify-center mb-6">
                  <Library className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">Awaiting Generation</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Connect a Scheme and extract a detailed 40-minute instructional block.</p>
                {schemes.length === 0 && (
                   <div className="mt-6 px-4 py-2 rounded-full bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/20">
                     No Schemes found. Generate a Scheme first!
                   </div>
                )}
             </div>
          )}

          {isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/60 rounded-[40px] border border-border/40 p-8 text-center space-y-8 shadow-sm">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                  <FileText className="absolute inset-0 m-auto w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight animate-pulse">Expanding Script...</h3>
                  <p className="text-muted-foreground">Writing specific dialogue, crafting Rubric Matrix, calculating timings.</p>
                </div>
             </div>
          )}

          {result && !isGenerating && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full">
              
              <div className="p-8 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50">
                <div>
                   <h2 className="text-2xl font-black">{result.topic || "Instructional Block"}</h2>
                   <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-emerald-600">
                     <span className="px-3 py-1 rounded-full bg-emerald-500/10">3-Part CBC Compliant</span>
                     <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">{result.coreCompetencies?.length || 0} Competencies Mapped</span>
                   </div>
                </div>
                <Button variant="outline" className="h-11 rounded-[16px] gap-2 font-bold shadow-sm">
                  <Download className="w-4 h-4" /> Export PDF
                </Button>
              </div>

              <div className="p-8 flex-1 overflow-auto space-y-10">
                
                {/* Header Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-[20px] bg-background/50 border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Strand</p>
                    <p className="text-sm font-bold truncate">{result.strand}</p>
                  </div>
                  <div className="p-4 rounded-[20px] bg-background/50 border border-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sub-strand</p>
                    <p className="text-sm font-bold truncate">{result.subStrand}</p>
                  </div>
                  <div className="col-span-2 p-4 rounded-[20px] bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Learning Intentions</p>
                    <p className="text-xs font-bold text-foreground">"{result.lessonStructure?.introduction?.learningIntentions}"</p>
                  </div>
                </div>

                {/* 3-Part Structure */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2">1. INTRODUCTION ({result.lessonStructure?.introduction?.duration} mins)</h3>
                  <div className="pl-4 border-l-2 border-emerald-500 space-y-3 text-sm">
                    <p><strong className="text-muted-foreground">Recap:</strong> {result.lessonStructure?.introduction?.recap}</p>
                    <p><strong className="text-muted-foreground">Connection to Life:</strong> {result.lessonStructure?.introduction?.connectionToLearnersLives}</p>
                    <p><strong className="text-muted-foreground">Success Criteria:</strong> {result.lessonStructure?.introduction?.successCriteria}</p>
                  </div>

                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2 pt-4">2. MAIN ACTIVITY</h3>
                  <div className="space-y-6">
                     {result.lessonStructure?.mainActivities?.map((act: any, idx: number) => (
                       <div key={idx} className="p-6 rounded-[24px] bg-background/40 border border-border/50">
                         <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-base">{act.activityName}</h4>
                           <div className="flex gap-2">
                             <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md"><Clock className="w-3 h-3"/> {act.duration}m</span>
                             <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md"><Users className="w-3 h-3"/> {act.grouping}</span>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                             <p className="text-xs font-bold text-indigo-500 uppercase">Teacher Script</p>
                             <ul className="space-y-1.5 text-sm font-medium">
                               {act.teacherActions?.map((a: string, i: number) => <li key={i}>• {a}</li>)}
                             </ul>
                           </div>
                           <div className="space-y-2">
                             <p className="text-xs font-bold text-emerald-600 uppercase">Learner Actions</p>
                             <ul className="space-y-1.5 text-sm font-medium text-muted-foreground">
                               {act.learnerActions?.map((a: string, i: number) => <li key={i}>- {a}</li>)}
                             </ul>
                           </div>
                         </div>
                       </div>
                     ))}
                  </div>

                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2 pt-4">3. CONCLUSION ({result.lessonStructure?.conclusion?.duration} mins)</h3>
                  <div className="pl-4 border-l-2 border-indigo-500 space-y-3 text-sm">
                    <p><strong className="text-muted-foreground">Summary:</strong> {result.lessonStructure?.conclusion?.summary}</p>
                    <p><strong className="text-muted-foreground">Exit Ticket:</strong> {result.lessonStructure?.conclusion?.exitTicket}</p>
                  </div>
                </div>

                {/* Rubric */}
                <div className="pt-8 border-t border-border/40">
                  <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> CBC Assessment Rubric</h3>
                  <div className="bg-background/50 rounded-[20px] border border-border/50 overflow-hidden">
                    <div className="grid grid-cols-4 divide-x divide-border/50 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-center p-3 text-muted-foreground">
                       <div>Exceeding (4)</div>
                       <div>Meeting (3)</div>
                       <div>Approaching (2)</div>
                       <div>Below (1)</div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-border/50 text-xs font-medium text-center p-4">
                       <div className="px-2 text-emerald-600">{result.assessmentRubric?.exceeding}</div>
                       <div className="px-2 text-primary">{result.assessmentRubric?.meeting}</div>
                       <div className="px-2 text-amber-600">{result.assessmentRubric?.approaching}</div>
                       <div className="px-2 text-red-500">{result.assessmentRubric?.below}</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

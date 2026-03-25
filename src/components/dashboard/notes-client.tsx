"use client";

import { useState } from "react";
import { generateLessonNotes } from "@/lib/actions/generation";
import { Button } from "@/components/ui/button";
import { Sparkles, Edit3, FileText, CheckCircle2, ChevronDown, Download, AlertCircle, HelpCircle } from "lucide-react";

export default function NotesClient({ lessonPlans }: { lessonPlans: any[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lessonPlanId: lessonPlans[0]?.id || ""
  });

  const handleGenerate = async () => {
    if (!formData.lessonPlanId) {
      setError("Please select a valid Lesson Plan first.");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      
      const notes = await generateLessonNotes(formData.lessonPlanId);
      setResult(notes.resources); // Assuming it returns the full json object stored in 'resources'
      
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
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Teacher Lesson Notes</h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Instantly explode a single lesson plan into the granular, script-level notes needed to deliver a world-class CBC classroom experience. Features detailed questioning sequences and 3-tier worked examples.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Configuration Panel */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-6">
          <div className="bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-xl overflow-hidden p-6 sm:p-8 relative">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              Extraction Source
            </h2>

            <div className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Parent Lesson Plan</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-amber-500/50 transition-colors"
                    value={formData.lessonPlanId}
                    onChange={e => setFormData({...formData, lessonPlanId: e.target.value})}
                  >
                    <option value="" disabled>Select a mapped lesson plan...</option>
                    {lessonPlans.map((p: any) => (
                      <option key={p.id} value={p.id}>L{p.lessonNumber}: {p.topic} ({p.scheme?.subject})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || lessonPlans.length === 0}
              className="w-full h-14 rounded-[20px] mt-8 text-base font-extrabold shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] bg-amber-500 hover:bg-amber-600 text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting Scripts...
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-[20px]" />
                  <Sparkles className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Synthesize Lesson Notes</span>
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
          
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-[28px] p-6">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-amber-600">
              <CheckCircle2 className="w-4 h-4" /> Comprehensive Pedagogy
            </h4>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               The intelligence engine automatically crafts <strong className="text-foreground">3 worked examples per sub-topic</strong>, builds conditional questioning trees, and predicts student misconceptions.
            </p>
          </div>
        </div>

        {/* Output Canvas */}
        <div className="flex-1 min-w-0">
          
          {!result && !isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/30 border-2 border-dashed border-border/50 rounded-[40px] p-8 text-center">
                <div className="w-24 h-24 bg-background shadow-sm rounded-[32px] flex items-center justify-center mb-6">
                  <Edit3 className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">Awaiting Generation</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Connect an existing Lesson Plan to explode it into granular instructional teacher notes.</p>
                {lessonPlans.length === 0 && (
                   <div className="mt-6 px-4 py-2 rounded-full bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/20">
                     No Lesson Plans found. Generate a Lesson Plan first!
                   </div>
                )}
             </div>
          )}

          {isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/60 rounded-[40px] border border-border/40 p-8 text-center space-y-8 shadow-sm">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                  <FileText className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight animate-pulse">Running Pedagogical Injection...</h3>
                  <p className="text-muted-foreground">Writing structured example sequences and formulating cognitive questioning hooks.</p>
                </div>
             </div>
          )}

          {result && !isGenerating && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full">
              
              <div className="p-8 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50">
                <div>
                   <h2 className="text-2xl font-black">{lessonPlans.find(l => l.id === formData.lessonPlanId)?.topic || "Lesson Notes"}</h2>
                   <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-amber-600">
                     <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600">{result.detailedTeachingSequence?.length || 0} Teaching Sequences</span>
                     <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">{result.commonMisconceptions?.length || 0} Misconceptions Traps</span>
                   </div>
                </div>
                <Button variant="outline" className="h-11 rounded-[16px] gap-2 font-bold shadow-sm">
                  <Download className="w-4 h-4" /> Export To PDF
                </Button>
              </div>

              <div className="p-8 flex-1 overflow-auto space-y-12">
                
                {/* Concept Overview */}
                <div className="space-y-4">
                   <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                     <HelpCircle className="w-4 h-4 text-primary" /> Concept Overview
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 bg-background/40 border border-border/50 rounded-[16px]">
                       <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">What Learners Need to Know</span>
                       <p className="text-sm font-medium leading-relaxed">{result.conceptOverview?.whatLearnersNeedToKnow}</p>
                     </div>
                     <div className="p-4 bg-background/40 border border-border/50 rounded-[16px]">
                       <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">Why This is Important</span>
                       <p className="text-sm font-medium leading-relaxed">{result.conceptOverview?.whyThisIsImportant}</p>
                     </div>
                   </div>
                </div>

                {/* Questioning Sequences & Teaching */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2">Detailed Teaching Sequence</h3>
                  
                  {result.detailedTeachingSequence?.map((seq: any, idx: number) => (
                    <div key={idx} className="bg-background/40 border border-border/50 rounded-[24px] p-6 mb-8 overflow-hidden">
                      <h4 className="font-bold text-lg mb-4 text-emerald-600">{seq.step}</h4>
                      <p className="text-sm font-medium leading-relaxed mb-6 bg-muted/30 p-4 rounded-[12px]">{seq.conceptExplanation}</p>
                      
                      {/* Worked Examples */}
                      {seq.workedExamples?.length > 0 && (
                        <div className="mb-8">
                          <span className="text-xs font-black uppercase text-muted-foreground mb-3 block border-b border-border/40 pb-2">Worked Examples Matrix</span>
                          <div className="space-y-4 pl-4 border-l-2 border-indigo-500/30">
                            {seq.workedExamples.map((ex: any, i: number) => (
                              <div key={i} className="text-sm grid grid-cols-1 md:grid-cols-[100px_1fr] gap-4">
                                <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded h-fit w-fit text-xs">{ex.difficulty}</span>
                                <div className="space-y-1">
                                  <p><strong className="text-foreground">Problem:</strong> {ex.problem}</p>
                                  <p><strong className="text-muted-foreground">Solution:</strong> {ex.solution}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Questioning */}
                      {seq.questioningSequence?.length > 0 && (
                        <div>
                          <span className="text-xs font-black uppercase text-muted-foreground mb-3 block border-b border-border/40 pb-2">Cognitive Questioning Script</span>
                          <div className="space-y-6">
                            {seq.questioningSequence.map((q: any, i: number) => (
                              <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-[16px] p-4 text-sm font-medium">
                                <p className="font-bold text-base mb-2 text-foreground">"{q.initialQuestion}"</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground"><strong className="text-emerald-500">Expected:</strong> {q.expectedAnswer}</p>
                                    <p className="text-xs text-muted-foreground"><strong className="text-primary">If Correct:</strong> {q.ifCorrect}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground"><strong className="text-red-500">If Incorrect:</strong> {q.ifIncorrect}</p>
                                    <p className="text-xs text-muted-foreground"><strong className="text-indigo-500">Follow-Up / Challenge:</strong> {q.followUp} {q.challengeQuestion}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                {/* Common Misconceptions */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2 text-red-500">Common Misconceptions Library</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.commonMisconceptions?.map((m: any, idx: number) => (
                      <div key={idx} className="bg-red-500/5 border border-red-500/20 p-5 rounded-[20px]">
                        <p className="font-bold text-sm mb-2 text-red-600">⚠ {m.misconception}</p>
                        <p className="text-sm font-medium text-muted-foreground mb-2"><strong className="text-emerald-600">Correction Strategy:</strong> {m.correction}</p>
                        <p className="text-xs font-semibold text-muted-foreground bg-background/50 p-2 rounded max-w-fit">Practice Form: {m.practice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marking Guide */}
                <div className="space-y-6 pt-4 border-t border-border/40">
                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2">Marking Allocation Guide</h3>
                  <p className="text-sm font-medium text-muted-foreground">{result.markingGuide?.taskDescription}</p>
                  
                  <div className="overflow-x-auto rounded-[16px] border border-border/50">
                    <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal border-collapse">
                      <thead className="bg-muted/50 border-b border-border/50 text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="p-3 border-r border-border/30">Evaluation Component</th>
                          <th className="p-3 border-r border-border/30 w-24 text-center">Marks</th>
                          <th className="p-3">Observational Target (What to look for)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {result.markingGuide?.pointAllocation?.map((pt: any, idx: number) => (
                          <tr key={idx} className="font-medium text-[13px]">
                            <td className="p-3 border-r border-border/30">{pt.component}</td>
                            <td className="p-3 border-r border-border/30 text-center font-black text-emerald-600 bg-emerald-500/5">{pt.marks}</td>
                            <td className="p-3 text-muted-foreground">{pt.whatToLookFor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

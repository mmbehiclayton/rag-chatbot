"use client";

import { useState } from "react";
import { generateSchemeOfWork } from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Calendar, Clock, BookOpen, Layers, CheckCircle2, ChevronDown, Download, AlertCircle } from "lucide-react";

export default function SchemesPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    grade: "Grade 4",
    subject: "Mathematics",
    term: "Term 1",
    weeks: 14,
    holidays: 2,
    lessonsPerWeek: 5,
    durationMinutes: 40
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      
      const scheme = await generateSchemeOfWork(null, formData);
      setResult(scheme.content);
      
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
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Scheme of Work Generator</h1>
        <p className="text-muted-foreground mt-2 text-base max-w-2xl">
          Instantly synthesize KICD CBC compliant curriculum mappings with perfect time allocations, cross-curricular integrations, and Bloom's difficulty progression.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Configuration Panel */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-6">
          <div className="bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-xl overflow-hidden p-6 sm:p-8 relative">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Parameters
            </h2>

            <div className="space-y-5 relative z-10">
              {/* Core Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Grade</label>
                  <div className="relative">
                    <select 
                      className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-primary/50 transition-colors"
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
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Term</label>
                  <div className="relative">
                    <select 
                      className="w-full h-12 rounded-[16px] bg-background/50 border border-border/50 px-4 appearance-none font-bold outline-none focus:border-primary/50 transition-colors"
                      value={formData.term}
                      onChange={e => setFormData({...formData, term: e.target.value})}
                    >
                      <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Learning Area</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="pl-11 h-12 rounded-[16px] bg-background/50 border-border/50 font-bold shadow-sm"
                  />
                </div>
              </div>

              <div className="w-full h-[1px] bg-border/40 my-2" />

              {/* Time Architecture */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Total Weeks
                  </label>
                  <span className="font-bold text-sm bg-muted px-2 py-0.5 rounded-md">{formData.weeks}</span>
                </div>
                <input type="range" min="8" max="16" value={formData.weeks} onChange={e => setFormData({...formData, weeks: parseInt(e.target.value)})} className="w-full accent-primary" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[12px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Holidays/Events (Weeks)
                  </label>
                  <span className="font-bold text-sm bg-muted px-2 py-0.5 rounded-md">{formData.holidays}</span>
                </div>
                <input type="range" min="0" max="4" value={formData.holidays} onChange={e => setFormData({...formData, holidays: parseInt(e.target.value)})} className="w-full accent-primary" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div className="space-y-2">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3" /> Lessons/Week</label>
                  <Input type="number" value={formData.lessonsPerWeek} onChange={e => setFormData({...formData, lessonsPerWeek: parseInt(e.target.value)})} className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-muted-foreground ml-1 flex items-center gap-1.5 whitespace-nowrap"><Clock className="w-3 h-3" /> Mins/Lesson</label>
                  <Input type="number" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="h-12 rounded-[16px] bg-background/50 border-border/50 font-bold text-center" />
                </div>
              </div>

            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-14 rounded-[20px] mt-8 text-base font-extrabold shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synthesizing Curriculum...
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-[20px]" />
                  <Sparkles className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Generate Scheme</span>
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
          
          <div className="bg-primary/5 border border-primary/20 rounded-[28px] p-6">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-4 h-4" /> Zero-Waste Math
            </h4>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               The engine will automatically distribute your syllabus across <strong className="text-foreground">{(formData.weeks - formData.holidays) * formData.lessonsPerWeek}</strong> available lessons this term, strictly ensuring chronological skill progression.
            </p>
          </div>
        </div>

        {/* Output Canvas */}
        <div className="flex-1 min-w-0">
          
          {!result && !isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/30 border-2 border-dashed border-border/50 rounded-[40px] p-8 text-center">
                <div className="w-24 h-24 bg-background shadow-sm rounded-[32px] flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-2">Awaiting Generation</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Configure your term constraints on the left and initialize the intelligence engine to build your scheme.</p>
             </div>
          )}

          {isGenerating && (
             <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-card/60 rounded-[40px] border border-border/40 p-8 text-center space-y-8 shadow-sm">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight animate-pulse">Running CBC Alignment...</h3>
                  <p className="text-muted-foreground">Reading vector database, extracting KICD logic, mapping competencies.</p>
                </div>
             </div>
          )}

          {result && !isGenerating && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full">
              
              <div className="p-8 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50">
                <div>
                   <h2 className="text-2xl font-black">{result.title || "Generated Scheme"}</h2>
                   <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-primary">
                     <span className="px-3 py-1 rounded-full bg-primary/10">{result.termlyOverview?.totalLessons || 0} Lessons Planned</span>
                     <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">{result.termlyOverview?.strandsCovered?.length || 0} Strands Covered</span>
                     <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">CBC Compliant</span>
                   </div>
                </div>
                <Button variant="outline" className="h-11 rounded-[16px] gap-2 font-bold shadow-sm">
                  <Download className="w-4 h-4" /> Export PDF
                </Button>
              </div>

              <div className="p-8 flex-1 overflow-auto">
                {/* Termly Overview Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
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

                <div className="space-y-12">
                  {result.weeks?.map((week: any) => (
                    <div key={week.weekNumber} className="relative">
                      
                      <div className="sticky top-0 z-10 backdrop-blur-md bg-card/80 py-3 mb-6 border-b border-border/40 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black">
                          {week.weekNumber}
                        </div>
                        <h3 className="text-lg font-bold">Week {week.weekNumber}</h3>
                      </div>

                      <div className="space-y-6">
                        {week.lessons?.map((lesson: any, i: number) => (
                          <div key={i} className="p-6 rounded-[24px] bg-background/40 border border-border/50 hover:bg-muted/20 hover:border-border transition-all">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-[6px]">Lesson {lesson.lessonNumber}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{lesson.strand}</span>
                                  </div>
                                  <h4 className="font-bold text-lg">{lesson.subStrand}</h4>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-muted-foreground">Resources: {lesson.learningResources?.length || 0}</span>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                               <div>
                                 <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Learning Outcomes</h5>
                                 <ul className="space-y-1 text-sm font-medium">
                                   {lesson.specificLearningOutcomes?.map((o: string, idx: number) => <li key={idx}>• {o}</li>)}
                                 </ul>
                               </div>
                               <div>
                                 <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Learning Experiences</h5>
                                 <ul className="space-y-1 text-sm font-medium text-muted-foreground">
                                   {lesson.learningExperiences?.map((o: string, idx: number) => <li key={idx}>- {o}</li>)}
                                 </ul>
                               </div>
                             </div>

                             <div className="mt-4 pt-4 border-t border-border/30 flex flex-wrap gap-2">
                               {lesson.coreCompetencies?.map((c: string, idx: number) => (
                                 <span key={idx} className="px-2.5 py-1 rounded-[8px] bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">{c}</span>
                               ))}
                             </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { generateLessonPlan, updateLessonPlan } from "@/lib/actions/generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Library, FileText, CheckCircle2, ChevronDown, Download, AlertCircle, Clock, Users, Lightbulb, Edit3, Save, X, Presentation, ChevronLeft, ChevronRight, Maximize2, Loader2, PlayCircle, Image as ImageIcon, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TeacherCopilot } from "./teacher-copilot";

export default function LessonsClient({ schemes, initialLesson, viewOnly = false }: { schemes: any[], initialLesson?: any, viewOnly?: boolean }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(initialLesson?.content || null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(initialLesson?.id || null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => {
    if (!result) return [];
    const items = [
      { type: "title", title: result.topic, strand: result.strand, subStrand: result.subStrand, intentions: result.lessonStructure?.introduction?.learningIntentions },
      { type: "intro", recap: result.lessonStructure?.introduction?.recap, life: result.lessonStructure?.introduction?.connectionToLearnersLives },
      ...(result.lessonStructure?.mainActivities?.map((a: any) => ({ type: "activity", ...a })) || []),
      { type: "conclusion", summary: result.lessonStructure?.conclusion?.summary, exit: result.lessonStructure?.conclusion?.exitTicket },
      { type: "rubric", rubric: result.assessmentRubric }
    ];
    return items;
  }, [result]);

  const renderSlide = (slide: any) => {
    switch (slide.type) {
      case "title":
        return (
          <div className="space-y-8">
            <h1 className="text-6xl sm:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">{slide.title}</h1>
            <div className="flex gap-4">
               <span className="px-6 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-black uppercase tracking-widest border border-emerald-500/20">{slide.strand}</span>
               <span className="px-6 py-2 rounded-full bg-white/5 text-white/60 text-sm font-black uppercase tracking-widest border border-white/10">{slide.subStrand}</span>
            </div>
            <p className="text-2xl text-white/50 font-medium max-w-3xl italic">"{slide.intentions}"</p>
          </div>
        );
      case "intro":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/20">
                   <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-5xl font-black">Settling In</h2>
                <div className="space-y-4">
                   <div className="p-6 rounded-[24px] bg-white/5 border border-white/10 relative">
                      <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Recap Reflection</p>
                      <p className="text-xl font-medium text-white/80">{slide.recap}</p>
                   </div>
                </div>
             </div>
             <div className="p-10 rounded-[40px] bg-emerald-600 shadow-2xl shadow-emerald-900/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-2xl font-black mb-4">Why this matters?</h3>
                <p className="text-xl font-bold leading-relaxed">{slide.life}</p>
                <div className="mt-8 flex items-center gap-3 text-white/60">
                   <Users className="w-6 h-6" />
                   <span className="text-sm font-black uppercase tracking-widest">Connect to Learners Lives</span>
                </div>
             </div>
          </div>
        );
      case "activity":
        return (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <div className="flex items-center gap-3">
                   <h2 className="text-5xl font-black">{slide.activityName}</h2>
                   <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">{slide.duration} mins</div>
                 </div>
                 <p className="text-xl text-white/40 font-bold uppercase tracking-widest">{slide.grouping}</p>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 relative">
                  <div className="absolute top-6 right-6 opacity-20"><Edit3 className="w-8 h-8" /></div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6">Learning Sequence</h4>
                  <div className="space-y-4">
                     {slide.teacherActions?.slice(0, 3).map((a: string, i: number) => (
                       <div key={i} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-black shrink-0">{i+1}</div>
                          <p className="text-lg font-bold text-white/80">{a}</p>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 relative">
                  <div className="absolute top-6 right-6 opacity-20"><Users className="w-8 h-8" /></div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6">Learner Exploration</h4>
                  <div className="space-y-4">
                     {slide.learnerActions?.slice(0, 3).map((a: string, i: number) => (
                       <div key={i} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-black shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
                          <p className="text-lg font-bold text-white/50">{a}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        );
      case "conclusion":
        return (
          <div className="space-y-12 max-w-4xl">
             <div className="space-y-4">
                <h2 className="text-6xl font-black tracking-tighter">Wrapping Up</h2>
                <p className="text-3xl font-bold text-white/60 leading-tight underline decoration-emerald-500/50 underline-offset-8">"{slide.summary}"</p>
             </div>
             <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 flex items-center gap-10">
                <div className="w-24 h-24 rounded-[32px] bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-900/50 shrink-0">
                   <Maximize2 className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-emerald-400">Exit Ticket</h3>
                   <p className="text-3xl font-bold">{slide.exit}</p>
                </div>
             </div>
          </div>
        );
      case "rubric":
        return (
          <div className="space-y-10">
             <h2 className="text-5xl font-black">Success Matrix</h2>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[400px]">
                {[
                   { label: "Exceeding", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400", bg: "bg-emerald-500", text: slide.rubric.exceeding },
                   { label: "Meeting", color: "bg-blue-500/20 border-blue-500/40 text-blue-400", bg: "bg-blue-500", text: slide.rubric.meeting },
                   { label: "Approaching", color: "bg-amber-500/20 border-amber-500/40 text-amber-400", bg: "bg-amber-500", text: slide.rubric.approaching },
                   { label: "Below", color: "bg-red-500/20 border-red-500/40 text-red-500", bg: "bg-red-500", text: slide.rubric.below },
                ].map((r, i) => (
                  <div key={i} className={cn("p-8 rounded-[32px] border flex flex-col justify-between", r.color)}>
                     <div className="space-y-2">
                       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-black", r.bg)}>{4-i}</div>
                       <h3 className="text-lg font-black uppercase tracking-widest mt-2">{r.label}</h3>
                     </div>
                     <p className="text-sm font-bold leading-relaxed">{r.text}</p>
                  </div>
                ))}
             </div>
          </div>
        )
      default:
        return null;
    }
  };

  const [formData, setFormData] = useState({
    schemeId: initialLesson?.schemeId || schemes[0]?.id || "",
    lessonNumber: initialLesson?.lessonNumber || 1,
    topic: initialLesson?.topic || "Addition of 2-digit numbers"
  });

  const currentScheme = useMemo(() => 
    schemes.find(s => s.id === formData.schemeId),
    [schemes, formData.schemeId]
  );

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
      setCurrentLessonId(lesson.id);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentLessonId) return;
    try {
      setIsSaving(true);
      await updateLessonPlan(currentLessonId, result);
      toast.success("Lesson plan synced to database");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Failed to sync changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header - Hide in viewOnly */}
      {!viewOnly && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lesson Plan Generator</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Expand your Scheme alignments into granular 3-part CBC lesson plans with dialogue scripts, differentiation, and 4-level rubrics.
          </p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Configuration Panel - Hide in viewOnly */}
        {!viewOnly && (
          <div className="w-full xl:w-[380px] shrink-0 space-y-4 no-print">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden p-5 relative">
              
              {/* Ambient Background Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
              
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Extraction Source
              </h2>

              <div className="space-y-4 relative z-10">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Parent Scheme of Work</label>
                  <div className="relative">
                    <select 
                      className="w-full h-10 rounded-xl bg-background/50 border border-border/50 px-3 appearance-none font-medium text-sm outline-none focus:border-primary/50 transition-colors"
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

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Lesson #</label>
                    <Input 
                      type="number"
                      value={formData.lessonNumber}
                      onChange={e => setFormData({...formData, lessonNumber: parseInt(e.target.value)})}
                      className="h-10 rounded-xl bg-background/50 border-border/50 font-medium text-sm text-center shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground ml-1">Topic / Focus</label>
                    <Input 
                      placeholder="e.g. Concrete Addition"
                      value={formData.topic}
                      onChange={e => setFormData({...formData, topic: e.target.value})}
                      className="h-10 rounded-xl bg-background/50 border-border/50 font-medium text-sm shadow-sm"
                    />
                  </div>
                </div>

              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || schemes.length === 0}
                className="w-full h-10 rounded-xl mt-5 text-sm font-semibold transition-all hover:shadow-md hover:shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group"
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
        )}

        {/* Output Canvas */}
        <div className={cn("flex-1 min-w-0", viewOnly && "max-w-7xl mx-auto w-full")}>
          
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
            <div className="animate-in slide-in-from-bottom-8 duration-700 bg-card/80 backdrop-blur-2xl rounded-[40px] border border-border/40 shadow-xl overflow-hidden flex flex-col h-full print-document">
              
              {/* Print Only Header */}
              <div className="print-header print-only p-4">
                <h1 className="text-xl font-bold">{result.topic}</h1>
                <h2 className="text-lg">Lesson Plan - {currentScheme?.grade} {currentScheme?.subject}</h2>
              </div>

              {/* Desktop Actions Header */}
              <div className="p-8 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 no-print">
                <div>
                   <h2 className="text-2xl font-black">{result.topic || "Instructional Block"}</h2>
                   <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-emerald-600">
                     <span className="px-3 py-1 rounded-full bg-emerald-500/10">3-Part CBC Compliant</span>
                     <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">{result.coreCompetencies?.length || 0} Competencies Mapped</span>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => { setIsPresenting(true); setCurrentSlide(0); }}
                    className="h-11 rounded-[16px] gap-2 font-black bg-slate-900 border-slate-800 text-white hover:bg-slate-800 shadow-xl"
                  >
                    <Presentation className="w-4 h-4" /> Present
                  </Button>
                  <Button 
                    variant={isEditing ? "default" : "outline"} 
                    className={cn("h-11 rounded-[16px] gap-2 font-bold shadow-sm", isEditing && "bg-amber-500 hover:bg-amber-600")}
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : (isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />)}
                    {isEditing ? "Save Changes" : "Edit Designer"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-11 rounded-[16px] gap-2 font-bold shadow-sm print-trigger"
                    onClick={() => window.print()}
                  >
                    <Download className="w-4 h-4" /> Export PDF
                  </Button>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-auto space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-section">
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

                <div className="space-y-6">
                  <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2">1. INTRODUCTION ({result.lessonStructure?.introduction?.duration} mins)</h3>
                  <div className="pl-4 border-l-2 border-emerald-500 space-y-3 text-sm">
                    <p><strong className="text-muted-foreground mr-1">Recap:</strong> {result.lessonStructure?.introduction?.recap}</p>
                    <p><strong className="text-muted-foreground mr-1">Connection to Life:</strong> {result.lessonStructure?.introduction?.connectionToLearnersLives}</p>
                    <p><strong className="text-muted-foreground mr-1">Success Criteria:</strong> {result.lessonStructure?.introduction?.successCriteria}</p>
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
                             <div className="space-y-2">
                               {act.teacherActions?.map((a: string, i: number) => (
                                 <div key={i} className="flex gap-2 items-start">
                                   <span className="mt-2 text-muted-foreground">•</span>
                                   <span className="text-sm font-medium">{a}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                           <div className="space-y-2">
                             <p className="text-xs font-bold text-emerald-600 uppercase">Learner Actions</p>
                             <div className="space-y-2">
                               {act.learnerActions?.map((a: string, i: number) => (
                                 <div key={i} className="flex gap-2 items-start">
                                   <span className="mt-2 text-muted-foreground">-</span>
                                   <span className="text-sm font-medium text-muted-foreground">{a}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>

                   {result.lessonStructure?.differentiation && (
                     <div className="mt-8 p-6 rounded-[24px] bg-primary/5 border border-primary/10">
                       <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                         <Users className="w-3.5 h-3.5" /> Differentiation Strategies
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="p-4 rounded-[16px] bg-background border border-border/50">
                           <p className="text-[10px] uppercase font-bold text-amber-500 mb-2">Support</p>
                           <p className="text-xs font-medium">{result.lessonStructure.differentiation.learnersNeedingSupport}</p>
                         </div>
                         <div className="p-4 rounded-[16px] bg-background border border-border/50">
                           <p className="text-[10px] uppercase font-bold text-emerald-500 mb-2">Average</p>
                           <p className="text-xs font-medium">{result.lessonStructure.differentiation.averageLearners}</p>
                         </div>
                         <div className="p-4 rounded-[16px] bg-background border border-border/50">
                           <p className="text-[10px] uppercase font-bold text-indigo-500 mb-2">Advanced</p>
                           <p className="text-xs font-medium">{result.lessonStructure.differentiation.advancedLearners}</p>
                         </div>
                       </div>
                     </div>
                   )}

                    <p><strong className="text-muted-foreground">Exit Ticket:</strong> {result.lessonStructure?.conclusion?.exitTicket}</p>
                  </div>

                  {/* Multimedia Suggestions */}
                  {result.multimediaSuggestions && result.multimediaSuggestions.length > 0 && (
                    <div className="mt-8 space-y-4 no-print">
                      <h3 className="text-lg font-black tracking-tight border-b border-border/40 pb-2 flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-indigo-500" /> Multimedia Enrichment
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.multimediaSuggestions.map((m: any, i: number) => (
                          <div key={i} className="p-4 rounded-[20px] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                               {m.type === "IMAGE" && <ImageIcon className="w-5 h-5 text-indigo-500" />}
                               {m.type === "VIDEO" && <PlayCircle className="w-5 h-5 text-indigo-500" />}
                               {m.type === "DIAGRAM" && <Box className="w-5 h-5 text-indigo-500" />}
                               {m.type === "EXPERIMENT" && <Sparkles className="w-5 h-5 text-indigo-500" />}
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase text-indigo-600 mb-1">{m.type}</p>
                               <p className="text-sm font-bold">{m.description}</p>
                               <p className="text-[10px] text-muted-foreground mt-1 font-medium">{m.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Professional Branding & Signatures (Print Only) */}
                  <div className="mt-20 print-only space-y-12">
                     <div className="grid grid-cols-2 gap-20">
                        <div className="border-t border-black pt-4">
                           <p className="font-bold text-sm">Teacher's Signature</p>
                           <p className="text-xs text-muted-foreground mt-1">Date: ____________________</p>
                        </div>
                        <div className="border-t border-black pt-4">
                           <p className="font-bold text-sm">Head of Department / Headteacher</p>
                           <p className="text-xs text-muted-foreground mt-1">Date: ____________________</p>
                        </div>
                     </div>
                     <div className="text-center pt-8 border-t border-dashed border-black/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Pedagogically Verified & Generated via KICD Instructional Engine</p>
                     </div>
                  </div>
                </div>

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
          )}
        </div>
      </div>

      {/* Presentation Mode Overlay */}
      <AnimatePresence>
        {isPresenting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                     <Presentation className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black truncate max-w-[300px]">{result.topic}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Classroom Presentation Mode</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 text-xs font-bold">
                     <span className="text-white/40">Slide</span>
                     <span className="text-emerald-400">{currentSlide + 1}</span>
                     <span className="text-white/20">/</span>
                     <span>{slides.length}</span>
                  </div>
                  <button onClick={() => setIsPresenting(false)} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
               </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 sm:p-20">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={currentSlide}
                   initial={{ opacity: 0, scale: 0.9, x: 20 }}
                   animate={{ opacity: 1, scale: 1, x: 0 }}
                   exit={{ opacity: 0, scale: 1.1, x: -20 }}
                   transition={{ duration: 0.5, ease: "circOut" }}
                   className="w-full max-w-5xl aspect-video bg-white/5 border border-white/10 rounded-[40px] p-12 sm:p-20 flex flex-col justify-center relative overflow-hidden"
                 >
                    {renderSlide(slides[currentSlide])}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                 </motion.div>
               </AnimatePresence>

               <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(prev => prev - 1)} className="w-16 h-16 rounded-[24px] bg-white/5 hover:bg-emerald-600 disabled:opacity-20 flex items-center justify-center border border-white/10 text-white">
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(prev => prev + 1)} className="w-16 h-16 rounded-[24px] bg-white/5 hover:bg-emerald-600 disabled:opacity-20 flex items-center justify-center border border-white/10 text-white">
                    <ChevronRight className="w-8 h-8" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && <TeacherCopilot lessonPlan={result} />}
    </div>
  );
}

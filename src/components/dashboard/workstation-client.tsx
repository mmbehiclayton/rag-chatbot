"use client";

import { useState, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Plus, 
  ChevronRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Search, 
  Library,
  ArrowRight,
  Database,
  LayoutGrid,
  Loader2,
  X,
  AlertCircle
} from "lucide-react";
import { AssetLibrary } from "./asset-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import * as actions from "@/lib/actions/generation";

interface WorkstationClientProps {
  initialSchemes: any[];
  initialLessons: any[];
  initialAssessments: any[];
  availableCurriculum: { gradeLevel: string; subject: string }[];
  cbcStructure: any[];
}

export function WorkstationClient({ 
  initialSchemes, 
  initialLessons, 
  initialAssessments,
  availableCurriculum,
  cbcStructure
}: WorkstationClientProps) {
  const [activeTab, setActiveTab] = useState<"SCHEMES" | "LESSONS" | "ASSESSMENTS">("SCHEMES");
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"SCHEME" | "LESSON" | "ASSESSMENT">("SCHEME");
  
  // Generation Params
  const [params, setParams] = useState({
    grade: "Grade 4",
    subject: "Mathematics",
    term: "Term 1",
    weeks: 14,
    holidays: 2,
    lessonsPerWeek: 5,
    durationMinutes: 40,
    schemeId: ""
  });
  const [bulkLessons, setBulkLessons] = useState<{ lessonNumber: number; topic: string; exists: boolean }[]>([]);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);

  // Cascading Logic
  const availableGrades = useMemo(() => {
    return cbcStructure.flatMap(level => level.grades);
  }, [cbcStructure]);

  const selectedGradeObj = useMemo(() => {
    return availableGrades.find(g => g.name === params.grade);
  }, [availableGrades, params.grade]);

  const filteredLearningAreas = useMemo(() => {
    if (!selectedGradeObj) return [];
    return selectedGradeObj.learningAreas.map((la: any) => la.learningArea.name);
  }, [selectedGradeObj]);

  const handleGenerate = async () => {
    startTransition(async () => {
      try {
        let result;
        if (modalType === "SCHEME") {
           result = await actions.generateSchemeOfWork(params);
        } else if (modalType === "ASSESSMENT") {
           result = await actions.generateAssessment({
             ...params,
             type: "End of Term Examination",
             totalMarks: 50
           });
        } else if (modalType === "LESSON") {
           // For bulk, let's just generate the first missing one for now or a loop
           const missing = bulkLessons.filter(l => !l.exists);
           if (missing.length === 0) {
             toast.info("All lessons generated for this scheme!");
             return;
           }
           
           toast.loading(`Generating ${missing.length} lessons...`);
           for (const l of missing) {
             await actions.generateLessonPlan(params.schemeId, l.lessonNumber, l.topic);
           }
           result = true;
        }
        
        if (result) {
          toast.success(`${modalType} generated successfully!`);
          setIsModalOpen(false);
          window.location.reload(); 
        }
      } catch (error: any) {
        toast.error(error.message || "Generation failed");
      }
    });
  };

  const handleSchemeSelect = async (schemeId: string) => {
    setParams({ ...params, schemeId });
    if (modalType === "LESSON" && schemeId) {
      setIsFetchingStatus(true);
      try {
        const lessons = await actions.getSchemeLessonsStatus(schemeId);
        setBulkLessons(lessons);
      } catch (e) {
        toast.error("Failed to fetch scheme lessons");
      } finally {
        setIsFetchingStatus(false);
      }
    }
  };

  const currentItems = useMemo(() => {
    if (activeTab === "SCHEMES") return initialSchemes;
    if (activeTab === "LESSONS") return initialLessons;
    return initialAssessments;
  }, [activeTab, initialSchemes, initialLessons, initialAssessments]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 mt-0">
      
      {/* 1. Header */}
      <div className="flex flex-col xl:flex-row gap-5 items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">Teacher Workstation</div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Engine Active</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Content Generation Hub
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Design KICD-compliant curriculum assets with precise time allocations and CBC alignment.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 w-full xl:w-auto xl:shrink-0">
           {[
             { label: "Schemes", count: initialSchemes.length, icon: BookOpen, color: "text-blue-500" },
             { label: "Lessons", count: initialLessons.length, icon: FileText, color: "text-emerald-500" },
             { label: "Assessments", count: initialAssessments.length, icon: GraduationCap, color: "text-violet-500" },
           ].map((stat, i) => (
             <div key={i} className="p-3.5 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all flex flex-col justify-between gap-3 min-w-[90px]">
               <div className={cn("w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center", stat.color)}>
                 <stat.icon className="w-4 h-4" />
               </div>
               <div>
                 <div className="text-xl font-bold">{stat.count}</div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* 2. Generation Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => { setModalType("SCHEME"); setIsModalOpen(true); }}
          className="group p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">New Scheme</h3>
              <p className="text-white/70 text-xs font-medium mt-0.5 leading-snug">Generate a full termly mapping for any grade &amp; subject.</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest group-hover:gap-3 transition-all opacity-80">
              Generate <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        <Link 
          href="/dashboard/lessons"
          className="group p-5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-xl translate-x-1/4 -translate-y-1/4 group-hover:bg-white/10 transition-colors" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Lesson Plan</h3>
              <p className="text-white/70 text-xs font-medium mt-0.5 leading-snug">Expand schemes into detailed 3-part CBC lesson structures.</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest group-hover:gap-3 transition-all opacity-80">
              Open Designer <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>

        <button 
          onClick={() => { setModalType("ASSESSMENT"); setIsModalOpen(true); }}
          className="group p-5 rounded-2xl bg-foreground text-background shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left relative overflow-hidden ring-1 ring-white/10"
        >
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/20">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Assessments</h3>
              <p className="text-background/60 text-xs font-medium mt-0.5 leading-snug">Bloom-aligned exams and automated marking rubrics.</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/80 group-hover:gap-3 transition-all group-hover:text-primary">
              Build Exam <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      </div>

      {/* Bulk Action */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/30 shrink-0">
               <Database className="w-5 h-5" />
            </div>
            <div>
               <h3 className="text-base font-bold tracking-tight">Bulk Generation Pipeline</h3>
               <p className="text-muted-foreground text-xs font-medium mt-0.5">Generate all 40+ lesson plans for an entire term automatically.</p>
            </div>
         </div>
         <Button 
           onClick={() => { setModalType("LESSON"); setIsModalOpen(true); }}
           size="sm"
           className="h-9 px-5 rounded-xl font-semibold text-xs uppercase tracking-widest shrink-0 gap-2"
         >
           <Plus className="w-3.5 h-3.5" /> Initialize Workflow
         </Button>
      </div>

      {/* 3. Assets Library & Search */}
      <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[45px] overflow-hidden shadow-sm">
        {/* Tab bar */}
        <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border/30">
              {["SCHEMES", "LESSONS", "ASSESSMENTS"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                    activeTab === tab 
                      ? "bg-background text-primary shadow-sm border border-border/50" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
           </div>
        </div>

        <div className="p-4 sm:p-5">
          <AssetLibrary 
            assets={currentItems.map(item => ({
              ...item,
              title: item.title || item.topic
            }))}
            type={activeTab}
            title={`${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Library`}
            description={`Manage your generated ${activeTab.toLowerCase()} below.`}
          />
        </div>
      </div>

      {/* 4. Curriculum Status (The Vector Hub) */}
      <div className="p-10 rounded-[45px] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />
          
          <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
             <div className="max-w-xl space-y-4">
               <div className="w-16 h-16 rounded-[22px] bg-blue-500/20 backdrop-blur-md flex items-center justify-center border border-blue-400/20">
                 <Sparkles className="w-8 h-8 text-blue-300" />
               </div>
               <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">AI-Context Readiness</h2>
               <p className="text-lg text-slate-400 font-medium leading-relaxed">
                 The IQ Engine is powered by official KICD PDF volumes. We've mapped <strong className="text-white">{availableCurriculum.length} official designs</strong> across your hierarchy to eliminate AI hallucinations.
               </p>
               <div className="flex flex-wrap gap-2 pt-2">
                  {availableCurriculum.slice(0, 10).map((c, i) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/10">{c.gradeLevel}: {c.subject}</span>
                  ))}
                  {availableCurriculum.length > 10 && <span className="text-[10px] font-black text-slate-500 mt-2">+{availableCurriculum.length - 10} more...</span>}
               </div>
             </div>
             
             <div className="w-full xl:w-96 p-8 rounded-[35px] bg-white/5 border border-white/10 backdrop-blur-2xl space-y-8">
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-blue-300">
                     <span>Intelligence Sync</span>
                     <span>100%</span>
                   </div>
                   <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                      />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                   <div>
                      <div className="text-3xl font-black italic">±0.2s</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vector Latency</div>
                   </div>
                   <div>
                      <div className="text-3xl font-black italic">GPT-4o</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Oracle</div>
                   </div>
                </div>
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/20 hover:bg-white/5 font-extrabold uppercase tracking-widest text-xs gap-2">
                   <Library className="w-4 h-4" /> View Knowledge Base
                </Button>
             </div>
          </div>
      </div>

      {/* Shared Generation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPending && setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-card border border-border/40 shadow-2xl rounded-[40px] overflow-hidden"
            >
              {/* Generation Modal */}
              <div className="p-5 border-b border-border/50 bg-muted/30 relative">
                 <button onClick={() => !isPending && setIsModalOpen(false)} className="absolute right-4 top-4 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
                    <X className="w-4 h-4" />
                 </button>
                  <div className="flex items-center gap-3 mb-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                       <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold tracking-tight">
                         {modalType === "SCHEME" ? "New Scheme of Work" : 
                          modalType === "LESSON" ? "Bulk Lesson Designer" : 
                          "New End-term Assessment"}
                       </h2>
                       <p className="text-xs font-medium text-muted-foreground">
                         {modalType === "LESSON" ? "Automated Batch Workflow" : "AI Workflow Configuration"}
                       </p>
                    </div>
                  </div>
              </div>
               <div className="p-5 space-y-4">
                 {isPending ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                       <div className="relative w-14 h-14">
                          <div className="absolute inset-0 rounded-full border-3 border-primary/10" />
                          <div className="absolute inset-0 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                          <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary animate-pulse" />
                       </div>
                       <div className="space-y-1">
                         <h3 className="text-base font-bold tracking-tight">Synthesizing {modalType}...</h3>
                         <p className="text-xs text-muted-foreground max-w-xs mx-auto">Querying vector nodes and mapping competencies.</p>
                       </div>
                    </div>                  ) : (

                    <div className="space-y-6">
                       {modalType === "LESSON" ? (
                         <div className="space-y-6">
                            <div className="space-y-2">
                               <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Source Scheme</label>
                               <select 
                                className="w-full h-12 rounded-[16px] bg-muted/50 border border-border/50 px-4 font-bold outline-none focus:border-primary/50"
                                value={params.schemeId}
                                onChange={e => handleSchemeSelect(e.target.value)}
                               >
                                 <option value="">Choose a scheme...</option>
                                 {initialSchemes.map(s => (
                                   <option key={s.id} value={s.id}>{s.grade} {s.subject} - {s.term}</option>
                                 ))}
                               </select>
                            </div>

                            {isFetchingStatus ? (
                              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : bulkLessons.length > 0 && (
                              <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Term Roadmap Coverage</label>
                                <div className="max-h-48 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                                   {bulkLessons.map((l, i) => (
                                     <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20 text-xs font-bold">
                                       <div className="flex items-center gap-3">
                                          <span className="text-muted-foreground w-6">L{l.lessonNumber}</span>
                                          <span className="truncate max-w-[200px]">{l.topic}</span>
                                       </div>
                                       {l.exists ? (
                                         <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                                       ) : (
                                         <span className="text-amber-500 font-black tracking-widest">PENDING</span>
                                       )}
                                     </div>
                                   ))}
                                </div>
                              </div>
                            )}
                         </div>
                       ) : (                        <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                                 <Select 
                                   value={params.grade} 
                                   onValueChange={(val: string | null) => {
                                     setParams({ ...params, grade: val || "", subject: "" });
                                   }}
                                 >
                                    <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
                                       <SelectValue placeholder="Select Grade" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                                      {cbcStructure.map((level: any) => (
                                        <SelectGroup key={level.id}>
                                          <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-2 italic">{level.name}</SelectLabel>
                                          {level.grades.map((grade: any) => (
                                            <SelectItem key={grade.id} value={grade.name} className="rounded-lg text-xs font-bold my-0.5">{grade.name}</SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Academic Term</label>
                                 <Select 
                                    value={params.term} 
                                    onValueChange={(val: string | null) => setParams({ ...params, term: val || "" })}
                                 >
                                    <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
                                       <SelectValue placeholder="Select Term" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                                       <SelectItem value="Term 1" className="rounded-lg text-xs font-bold my-0.5">Term 1</SelectItem>
                                       <SelectItem value="Term 2" className="rounded-lg text-xs font-bold my-0.5">Term 2</SelectItem>
                                       <SelectItem value="Term 3" className="rounded-lg text-xs font-bold my-0.5">Term 3</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                               <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Learning Area</label>
                               <Select 
                                 value={params.subject} 
                                 onValueChange={(val: string | null) => setParams({ ...params, subject: val || "" })}
                                 disabled={!params.grade}
                               >
                                  <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
                                     <SelectValue placeholder={params.grade ? "Select Subject" : "Select a grade first"} />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                                     {filteredLearningAreas.length > 0 ? (
                                       filteredLearningAreas.map((subj: string) => (
                                         <SelectItem key={subj} value={subj} className="rounded-lg text-xs font-bold my-0.5">{subj}</SelectItem>
                                       ))
                                     ) : (
                                       <div className="p-4 text-center text-[10px] font-bold text-muted-foreground uppercase italic pb-4">
                                          {params.grade ? "No areas defined for this grade" : "Select a grade first"}
                                       </div>
                                     )}
                                  </SelectContent>
                               </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between">
                                    Term Weeks <span className="text-primary font-bold">{params.weeks}</span>
                                 </label>
                                 <input type="range" min="8" max="16" value={params.weeks} onChange={e => setParams({...params, weeks: parseInt(e.target.value)})} className="w-full accent-primary h-1.5" />
                               </div>
                               <div className="space-y-1.5">
                                 <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between">
                                    Holidays <span className="text-primary font-bold">{params.holidays}</span>
                                 </label>
                                 <input type="range" min="0" max="4" value={params.holidays} onChange={e => setParams({...params, holidays: parseInt(e.target.value)})} className="w-full accent-primary h-1.5" />
                               </div>
                            </div>
                          </>
                       )}
                       
                       <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3">
                          <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                          <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic">
                            {modalType === "LESSON" 
                              ? "The Bulk Pipeline will systematically generate all remaining lessons using the Scheme context to ensure sequential cohesion."
                              : `Ensure that the KICD Curriculum Design for "${params.grade} ${params.subject}" has been indexed by the Superadmin.`}
                          </p>
                       </div>
                    </div>
                  )}

              </div>

              {!isPending && (
                <div className="p-4 bg-muted/30 border-t border-border/50 flex gap-2">
                   <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-10 rounded-xl font-semibold text-xs uppercase tracking-widest border border-border/40">Cancel</Button>
                   <Button 
                    onClick={handleGenerate}
                    className="flex-[2] h-10 rounded-xl font-semibold text-xs uppercase tracking-widest"
                   >
                     Initialize IQ Engine
                   </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

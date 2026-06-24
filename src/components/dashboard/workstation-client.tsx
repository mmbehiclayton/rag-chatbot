"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  FileText,
  GraduationCap,
  StickyNote,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Database,
  Library,
  X,
} from "lucide-react";
import { AssetLibrary } from "./asset-library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import * as actions from "@/lib/actions/generation";
import { checkCurriculumCoverage } from "@/lib/actions/curriculum";

interface WorkstationClientProps {
  initialSchemes: any[];
  initialLessons: any[];
  initialNotes: any[];
  initialAssessments: any[];
  availableCurriculum: { gradeLevel: string; subject: string }[];
  cbcStructure: any[];
}

type ModalType = "SCHEME" | "LESSON" | "NOTES" | "ASSESSMENT";
type Tab = "SCHEMES" | "LESSONS" | "NOTES" | "ASSESSMENTS";

export function WorkstationClient({
  initialSchemes,
  initialLessons,
  initialNotes,
  initialAssessments,
  availableCurriculum,
  cbcStructure,
}: WorkstationClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("SCHEMES");
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("SCHEME");

  // Generation Params
  const [params, setParams] = useState({
    grade: "Grade 4",
    subject: "Mathematics",
    term: "Term 1",
    weeks: 14,
    holidays: 2,
    lessonsPerWeek: 5,
    durationMinutes: 40,
    schemeId: "",
  });
  const [bulkLessons, setBulkLessons] = useState<{ lessonNumber: number; topic: string; exists: boolean }[]>([]);
  const [notesLessons, setNotesLessons] = useState<{ id: string; lessonNumber: number; topic: string; hasNotes: boolean }[]>([]);
  const [isFetchingStatus, setIsFetchingStatus] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [coverageWarning, setCoverageWarning] = useState<string | null>(null);
  const [isCoverageChecking, setIsCoverageChecking] = useState(false);

  // Cascading Logic
  const availableGrades = useMemo(() => cbcStructure.flatMap((level) => level.grades), [cbcStructure]);
  const selectedGradeObj = useMemo(() => availableGrades.find((g) => g.name === params.grade), [availableGrades, params.grade]);
  const filteredLearningAreas = useMemo(() => {
    if (!selectedGradeObj) return [];
    return selectedGradeObj.learningAreas.map((la: any) => la.learningArea.name);
  }, [selectedGradeObj]);

  const hasSchemes = initialSchemes.length > 0;
  const hasLessons = initialLessons.length > 0;
  const hasDesigns = availableCurriculum.length > 0;

  const GENERATION_STEPS = [
    "Checking curriculum coverage...",
    "Retrieving context from knowledge base...",
    "AI is synthesizing content...",
    "Verifying pedagogical accuracy...",
    "Saving to library...",
  ];

  const MODAL_META: Record<ModalType, { title: string; subtitle: string }> = {
    SCHEME: { title: "New Scheme of Work", subtitle: "From a curriculum design" },
    LESSON: { title: "Bulk Lesson Designer", subtitle: "Expand a scheme into lessons" },
    NOTES: { title: "Generate Lesson Notes", subtitle: "From a scheme's lesson plans" },
    ASSESSMENT: { title: "New End-term Assessment", subtitle: "Bloom-aligned exam & rubric" },
  };

  const openModal = (type: ModalType) => {
    setModalType(type);
    setParams((p) => ({ ...p, schemeId: "" }));
    setBulkLessons([]);
    setNotesLessons([]);
    setProgressStep(0);
    setIsModalOpen(true);
  };

  const handleGenerate = async () => {
    setProgressStep(0);
    startTransition(async () => {
      try {
        // Step 1: coverage check (only for curriculum-grounded artifacts)
        setProgressStep(1);
        if (modalType === "SCHEME" || modalType === "ASSESSMENT") {
          const coverage = await checkCurriculumCoverage(params.grade, params.subject);
          if (!coverage.hasCurriculum || coverage.chunkCount === 0) {
            toast.error(`No curriculum found for ${params.grade} ${params.subject}. Ask your Admin to upload the PDF first.`);
            setProgressStep(0);
            return;
          }
        }

        // Step 2: RAG retrieval (inside server action)
        setProgressStep(2);
        await new Promise((r) => setTimeout(r, 400));

        // Step 3: AI generation
        setProgressStep(3);
        let result: any;
        if (modalType === "SCHEME") {
          result = await actions.generateSchemeOfWork(params);
        } else if (modalType === "ASSESSMENT") {
          result = await actions.generateAssessment({ ...params, type: "End of Term Examination", totalMarks: 50 });
        } else if (modalType === "LESSON") {
          const missing = bulkLessons.filter((l) => !l.exists);
          if (missing.length === 0) {
            toast.info("All lessons already generated for this scheme!");
            setProgressStep(0);
            return;
          }
          for (const l of missing) {
            await actions.generateLessonPlan(params.schemeId, l.lessonNumber, l.topic);
          }
          result = true;
        } else if (modalType === "NOTES") {
          const missing = notesLessons.filter((l) => !l.hasNotes);
          if (missing.length === 0) {
            toast.info("All lesson plans already have notes!");
            setProgressStep(0);
            return;
          }
          for (const l of missing) {
            await actions.generateLessonNotes(l.id);
          }
          result = true;
        }

        // Step 4 & 5: verification + save (handled in server action)
        setProgressStep(4);
        await new Promise((r) => setTimeout(r, 300));
        setProgressStep(5);

        if (result) {
          const label =
            modalType === "SCHEME" ? "Scheme" : modalType === "ASSESSMENT" ? "Assessment" : modalType === "NOTES" ? "Lesson notes" : "Lessons";
          toast.success(`${label} generated successfully!`);
          setIsModalOpen(false);
          setProgressStep(0);
          router.refresh();
        }
      } catch (error: any) {
        toast.error(error.message || "Generation failed");
        setProgressStep(0);
      }
    });
  };

  const handleGradeSubjectChange = async (grade: string, subject: string) => {
    if (!grade || !subject) {
      setCoverageWarning(null);
      return;
    }
    setIsCoverageChecking(true);
    setCoverageWarning(null);
    try {
      const coverage = await checkCurriculumCoverage(grade, subject);
      if (!coverage.hasCurriculum || coverage.chunkCount === 0) {
        setCoverageWarning(`No curriculum indexed for ${grade} ${subject}. Generation may hallucinate without it.`);
      } else {
        setCoverageWarning(null);
      }
    } catch {}
    setIsCoverageChecking(false);
  };

  const handleSchemeSelect = async (schemeId: string) => {
    setParams({ ...params, schemeId });
    if (!schemeId) return;
    setIsFetchingStatus(true);
    try {
      if (modalType === "LESSON") {
        setNotesLessons([]);
        const lessons = await actions.getSchemeLessonsStatus(schemeId);
        setBulkLessons(lessons);
      } else if (modalType === "NOTES") {
        setBulkLessons([]);
        const plans = await actions.getSchemeLessonPlans(schemeId);
        setNotesLessons(plans);
      }
    } catch (e) {
      toast.error("Failed to fetch scheme lessons");
    } finally {
      setIsFetchingStatus(false);
    }
  };

  const currentItems = useMemo(() => {
    if (activeTab === "SCHEMES") return initialSchemes;
    if (activeTab === "LESSONS") return initialLessons;
    if (activeTab === "NOTES") return initialNotes;
    return initialAssessments;
  }, [activeTab, initialSchemes, initialLessons, initialNotes, initialAssessments]);

  const tabToModal: Record<Tab, ModalType> = {
    SCHEMES: "SCHEME",
    LESSONS: "LESSON",
    NOTES: "NOTES",
    ASSESSMENTS: "ASSESSMENT",
  };

  const isSchemeBased = modalType === "LESSON" || modalType === "NOTES";
  const submitDisabled = isSchemeBased && !params.schemeId;

  // Unified status list for the scheme-based stages (Lesson Plans / Notes)
  const statusItems = useMemo(() => {
    if (modalType === "LESSON") {
      return bulkLessons.map((l) => ({ key: String(l.lessonNumber), lessonNumber: l.lessonNumber, topic: l.topic, done: l.exists }));
    }
    if (modalType === "NOTES") {
      return notesLessons.map((l) => ({ key: l.id, lessonNumber: l.lessonNumber, topic: l.topic, done: l.hasNotes }));
    }
    return [];
  }, [modalType, bulkLessons, notesLessons]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 mt-6 sm:mt-0">

      {/* ── Header ── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
            Teacher Workstation
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Generation Hub</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Each stage builds on the one before it — design, scheme, lesson plan, then notes &amp; assessment.
        </p>
      </div>

      {/* ── Generation Pipeline ── */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">

        {/* Stage 1 — Curriculum Design (source) */}
        <PipelineStage
          step={1}
          icon={<Database className="w-4 h-4" />}
          accent="blue"
          title="Curriculum Design"
          subtitle="Official KICD designs indexed in the Knowledge Base."
          count={availableCurriculum.length}
          countLabel="designs"
        >
          <Link href="/dashboard/knowledge" className="w-full">
            <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs font-bold gap-1.5">
              Open Knowledge Base <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </PipelineStage>

        <Connector />

        {/* Stage 2 — Scheme of Work */}
        <PipelineStage
          step={2}
          icon={<BookOpen className="w-4 h-4" />}
          accent="indigo"
          title="Scheme of Work"
          subtitle="Map a design into a week-by-week term plan."
          count={initialSchemes.length}
          countLabel="schemes"
          disabled={!hasDesigns}
          disabledHint="Index a design first"
        >
          <Button
            onClick={() => openModal("SCHEME")}
            disabled={!hasDesigns}
            size="sm"
            className="w-full h-9 rounded-xl text-xs font-bold gap-1.5"
          >
            Generate <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </PipelineStage>

        <Connector />

        {/* Stage 3 — Lesson Plans */}
        <PipelineStage
          step={3}
          icon={<FileText className="w-4 h-4" />}
          accent="emerald"
          title="Lesson Plans"
          subtitle="Expand each scheme row into a 3-part lesson."
          count={initialLessons.length}
          countLabel="lessons"
          disabled={!hasSchemes}
          disabledHint="Create a scheme first"
        >
          <Button
            onClick={() => openModal("LESSON")}
            disabled={!hasSchemes}
            size="sm"
            className="w-full h-9 rounded-xl text-xs font-bold gap-1.5"
          >
            Generate <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </PipelineStage>

        <Connector />

        {/* Stage 4 — Notes & Assessment */}
        <PipelineStage
          step={4}
          icon={<GraduationCap className="w-4 h-4" />}
          accent="violet"
          title="Notes & Assessment"
          subtitle="Derive a teacher guide and an exam from your work."
          count={initialNotes.length + initialAssessments.length}
          countLabel="artifacts"
        >
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              onClick={() => openModal("NOTES")}
              disabled={!hasLessons}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-[11px] font-bold gap-1 px-2"
            >
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </Button>
            <Button
              onClick={() => openModal("ASSESSMENT")}
              disabled={!hasDesigns}
              size="sm"
              className="h-9 rounded-xl text-[11px] font-bold gap-1 px-2"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Exam
            </Button>
          </div>
        </PipelineStage>
      </div>

      {/* ── Assets Library ── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border/30 overflow-x-auto">
            {(["SCHEMES", "LESSONS", "NOTES", "ASSESSMENTS"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
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

        <div className="p-4">
          <AssetLibrary
            assets={currentItems.map((item) => ({ ...item, title: item.title || item.topic }))}
            type={activeTab}
            title={`Recent ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}`}
            description=""
            compact
            limit={4}
            viewAllHref={`/dashboard/${activeTab.toLowerCase()}`}
            onCreateNew={() => openModal(tabToModal[activeTab])}
          />
        </div>
      </div>

      {/* ── Curriculum coverage strip ── */}
      <div className="rounded-2xl border border-border/40 bg-card/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Curriculum coverage</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {availableCurriculum.length} official KICD design{availableCurriculum.length === 1 ? "" : "s"} indexed for grounded, hallucination-free generation.
              </p>
            </div>
          </div>
          <Link href="/dashboard/knowledge" className="shrink-0">
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 text-xs font-bold">
              <Library className="w-4 h-4" /> Manage in Knowledge Base
            </Button>
          </Link>
        </div>

        {availableCurriculum.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border/30">
            {availableCurriculum.slice(0, 12).map((c, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {c.gradeLevel}: {c.subject}
              </span>
            ))}
            {availableCurriculum.length > 12 && (
              <span className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground/60">+{availableCurriculum.length - 12} more</span>
            )}
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground font-medium">
            No curriculum designs indexed yet. Upload KICD PDFs in the Knowledge Base to ground generation.
          </div>
        )}
      </div>

      {/* ── Shared Generation Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o && isPending) return; setIsModalOpen(o); }}>
        <DialogContent
          showCloseButton={false}
          className="p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] rounded-3xl border border-border/40 bg-card sm:max-w-xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-border/50 bg-muted/30 relative shrink-0">
            <button
              onClick={() => !isPending && setIsModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{MODAL_META[modalType].title}</h2>
                <p className="text-xs font-medium text-muted-foreground">{MODAL_META[modalType].subtitle}</p>
              </div>
            </div>
          </div>

          {/* Body (scrolls) */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {isPending ? (
              <div className="py-10 flex flex-col items-center gap-6">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="w-full space-y-2 max-w-xs">
                  {GENERATION_STEPS.map((step, i) => {
                    const stepNum = i + 1;
                    const done = progressStep > stepNum;
                    const active = progressStep === stepNum;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 text-xs font-semibold transition-all ${done ? "text-emerald-500" : active ? "text-primary" : "text-muted-foreground/40"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${done ? "bg-emerald-500 border-emerald-500" : active ? "border-primary animate-pulse bg-primary/10" : "border-border/40"}`}
                        >
                          {done ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span className="text-[9px] font-black">{stepNum}</span>}
                        </div>
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {isSchemeBased ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Select Source Scheme</label>
                      <Select value={params.schemeId} onValueChange={(val: string | null) => handleSchemeSelect(val || "")}>
                        <SelectTrigger className="h-11 w-full rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
                          <SelectValue placeholder="Choose a scheme..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
                          {initialSchemes.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="rounded-lg text-xs font-bold my-0.5">
                              {s.grade} {s.subject} - {s.term}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isFetchingStatus ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : params.schemeId ? (
                      statusItems.length > 0 ? (
                        <div className="space-y-3">
                          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                            {modalType === "LESSON" ? "Term Roadmap Coverage" : "Lesson Plans"}
                          </label>
                          <div className="max-h-48 overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                            {statusItems.map((l) => (
                              <div key={l.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/20 text-xs font-bold">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-muted-foreground w-6 shrink-0">L{l.lessonNumber}</span>
                                  <span className="truncate">{l.topic}</span>
                                </div>
                                {l.done ? (
                                  <span className="text-emerald-500 flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                                ) : (
                                  <span className="text-amber-500 font-black tracking-widest shrink-0">PENDING</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold border bg-amber-500/10 border-amber-500/30 text-amber-600">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          {modalType === "NOTES"
                            ? "No lesson plans generated for this scheme yet. Generate lessons first."
                            : "This scheme has no lessons to generate."}
                        </div>
                      )
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                        <Select
                          value={params.grade}
                          onValueChange={(val: string | null) => {
                            const g = val || "";
                            setParams({ ...params, grade: g, subject: "" });
                            setCoverageWarning(null);
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
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
                        <Select value={params.term} onValueChange={(val: string | null) => setParams({ ...params, term: val || "" })}>
                          <SelectTrigger className="h-10 w-full rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
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
                        onValueChange={(val: string | null) => {
                          const s = val || "";
                          setParams({ ...params, subject: s });
                          handleGradeSubjectChange(params.grade, s);
                        }}
                        disabled={!params.grade}
                      >
                        <SelectTrigger className="h-10 w-full rounded-xl bg-muted/50 border-border/50 text-sm font-medium">
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

                    {(coverageWarning || isCoverageChecking) && (
                      <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold border ${coverageWarning ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "bg-muted/50 border-border/30 text-muted-foreground"}`}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {isCoverageChecking ? "Checking curriculum coverage..." : coverageWarning}
                      </div>
                    )}

                    {modalType === "SCHEME" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between">
                            Term Weeks <span className="text-primary font-bold">{params.weeks}</span>
                          </label>
                          <input type="range" min="8" max="16" value={params.weeks} onChange={(e) => setParams({ ...params, weeks: parseInt(e.target.value) })} className="w-full accent-primary h-1.5" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ml-1 flex items-center justify-between">
                            Holidays <span className="text-primary font-bold">{params.holidays}</span>
                          </label>
                          <input type="range" min="0" max="4" value={params.holidays} onChange={(e) => setParams({ ...params, holidays: parseInt(e.target.value) })} className="w-full accent-primary h-1.5" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic">
                    {modalType === "LESSON"
                      ? "Generates every remaining lesson from the scheme so the whole term stays sequential and cohesive."
                      : modalType === "NOTES"
                      ? "Generates a teacher delivery guide for every lesson plan that doesn't have notes yet, using each plan as the source."
                      : `Ensure the KICD Curriculum Design for "${params.grade} ${params.subject}" has been indexed by the Superadmin.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isPending && (
            <div className="p-4 bg-muted/30 border-t border-border/50 flex gap-2 shrink-0">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-10 rounded-xl font-semibold text-xs uppercase tracking-widest border border-border/40">
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={submitDisabled} className="flex-[2] h-10 rounded-xl font-semibold text-xs uppercase tracking-widest">
                Generate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Pipeline sub-components ── */

const ACCENTS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

function PipelineStage({
  step,
  icon,
  accent,
  title,
  subtitle,
  count,
  countLabel,
  disabled,
  disabledHint,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  accent: string;
  title: string;
  subtitle: string;
  count: number;
  countLabel: string;
  disabled?: boolean;
  disabledHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 p-4 rounded-2xl border bg-card flex flex-col gap-3 transition-all",
        disabled ? "opacity-60 border-dashed border-border/50" : "border-border/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-muted text-[10px] font-black flex items-center justify-center text-muted-foreground">{step}</span>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", ACCENTS[accent])}>{icon}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums leading-none">{count}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{countLabel}</div>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-snug">
          {disabled && disabledHint ? disabledHint : subtitle}
        </p>
      </div>

      {children}
    </div>
  );
}

function Connector() {
  return (
    <div className="hidden lg:flex items-center justify-center text-muted-foreground/30 shrink-0">
      <ChevronRight className="w-5 h-5" />
    </div>
  );
}

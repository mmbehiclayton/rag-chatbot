"use client";

import { useTransition, useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, Loader2, FileText, X, Sparkles, BookOpen, AlertCircle, ChevronDown } from "lucide-react";
import { ingestCurriculum } from "@/lib/actions/curriculum";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface CbcLevel {
  id: string;
  name: string;
  grades: {
    id: string;
    name: string;
    learningAreas: {
      learningArea: {
        id: string;
        name: string;
      };
    }[];
  }[];
}

export function UploadCurriculumModal({
  cbcStructure = [],
}: {
  cbcStructure: CbcLevel[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [duplicateFound, setDuplicateFound] = useState<{
    id: string;
    uploadDate: Date;
    chunks: number;
  } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableGrades = useMemo(
    () => cbcStructure.flatMap((level) => level.grades),
    [cbcStructure]
  );

  const selectedGradeObj = useMemo(
    () => availableGrades.find((g) => g.name === gradeLevel),
    [availableGrades, gradeLevel]
  );

  const filteredLearningAreas = useMemo(() => {
    if (!selectedGradeObj) return [];
    return selectedGradeObj.learningAreas.map((la: any) => la.learningArea.name);
  }, [selectedGradeObj]);

  useEffect(() => {
    if (gradeLevel && subject && !filteredLearningAreas.includes(subject)) {
      setSubject("");
    }
  }, [gradeLevel, filteredLearningAreas, subject]);

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
    setFile(null);
    setGradeLevel("");
    setSubject("");
    setDuplicateFound(null);
    setConfirmOverwrite(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error("Please upload a KICD PDF document.");
    if (!gradeLevel || !subject) return toast.error("Please select a Grade and Learning Area.");

    const formData = new FormData();
    formData.append("file", file);
    formData.set("gradeLevel", gradeLevel);
    formData.set("subject", subject);
    formData.set("title", `${gradeLevel} - ${subject}`);
    if (confirmOverwrite) formData.set("overwrite", "true");

    startTransition(async () => {
      const result = await ingestCurriculum(formData);
      if (result.success) {
        toast.success(
          confirmOverwrite
            ? "Curriculum overwritten and queued for indexing."
            : "Curriculum uploaded and queued for indexing."
        );
        handleClose();
      } else if (result.duplicate) {
        setDuplicateFound(result.existingDoc);
        toast.warning("A document already exists for this grade and subject.");
      } else {
        toast.error(result.error);
      }
    });
  };

  const isReady = !!file && !!gradeLevel && !!subject;
  const step = !file ? 1 : !gradeLevel ? 2 : !subject ? 3 : 4;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105"
      >
        <UploadCloud className="w-5 h-5" />
        <span className="hidden sm:inline">Upload Curriculum</span>
        <span className="sm:hidden">Upload</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[28px] p-0 border-border/40 bg-card shadow-2xl overflow-hidden gap-0 max-h-[95vh] flex flex-col">

          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-border/40 bg-muted/20 shrink-0 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl" />
            <DialogHeader className="relative z-10 space-y-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center border border-blue-500/20 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <DialogTitle className="text-xl font-black leading-tight">
                  Upload Curriculum PDF
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground font-medium leading-snug ml-12">
                KICD-verified document · extracted, chunked &amp; embedded for AI routing
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mt-4 ml-12">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    s < step ? "bg-blue-500 flex-1" :
                    s === step ? "bg-blue-500/60 flex-[2]" :
                    "bg-border/60 flex-1"
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1.5 ml-12">
              <span>File</span>
              <span>Grade</span>
              <span>Subject</span>
              <span>Ready</span>
            </div>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4 flex-1">

              {/* ── Compact Dropzone ── */}
              <div>
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5" /> PDF Document <span className="text-red-500">*</span>
                </label>
                <div
                  className={cn(
                    "relative flex items-center gap-4 px-4 py-3.5 rounded-[16px] border-2 border-dashed transition-all duration-200 group",
                    isDragging
                      ? "border-blue-500 bg-blue-500/5 scale-[1.01]"
                      : file
                      ? "border-green-500/50 bg-green-500/5 border-solid"
                      : "border-border/50 hover:border-blue-400/60 hover:bg-muted/30 cursor-pointer"
                  )}
                  onClick={!file ? () => fileInputRef.current?.click() : undefined}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped?.type === "application/pdf") setFile(dropped);
                    else toast.error("Only PDF files are accepted.");
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {file ? (
                    <>
                      <div className="w-10 h-10 rounded-[12px] bg-green-500/10 text-green-500 flex items-center justify-center shrink-0 border border-green-500/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate leading-tight">
                          {file.name}
                        </p>
                        <p className="text-[11px] font-bold text-green-600 dark:text-green-500 mt-0.5 tracking-wide">
                          {formatBytes(file.size)} &middot; PDF Ready
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="shrink-0 w-8 h-8 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-[12px] bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 border border-border/40 group-hover:bg-blue-500/10 group-hover:text-blue-500 group-hover:border-blue-400/40 transition-all">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors">
                          {isDragging ? "Drop to upload" : "Click to browse or drag & drop"}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                          PDF only · Max 50 MB
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 border border-border/40 px-2.5 py-1 rounded-full hidden sm:block">
                        Browse
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* ── Grade Level (full width) ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Grade Level <span className="text-red-500">*</span>
                </label>
                <Select value={gradeLevel} onValueChange={(val) => setGradeLevel(val || "")}>
                  <SelectTrigger className="h-12 rounded-[14px] bg-background border-border/50 text-sm font-bold shadow-sm focus:ring-blue-500/20 w-full">
                    <SelectValue placeholder="Select a grade level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[20px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl max-h-[280px]">
                    {cbcStructure.map((level) => (
                      <div key={level.id} className="p-1">
                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-muted/30 rounded-lg mb-1">
                          {level.name}
                        </div>
                        {level.grades.map((grade: any) => (
                          <SelectItem
                            key={grade.id}
                            value={grade.name}
                            className="text-sm font-bold rounded-xl focus:bg-primary/10 transition-colors my-0.5"
                          >
                            {grade.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Learning Area (full width, cascades from grade) ── */}
              <div className="space-y-2">
                <label className={cn(
                  "text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                  gradeLevel ? "text-muted-foreground" : "text-muted-foreground/40"
                )}>
                  <FileText className="w-3.5 h-3.5" /> Learning Area <span className="text-red-500">*</span>
                </label>
                <Select
                  value={subject}
                  onValueChange={(val) => setSubject(val || "")}
                  disabled={!gradeLevel}
                >
                  <SelectTrigger
                    className={cn(
                      "h-12 rounded-[14px] border text-sm font-bold shadow-sm w-full transition-all",
                      gradeLevel
                        ? "bg-background border-border/50 focus:ring-blue-500/20"
                        : "bg-muted/30 border-border/20 text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    <SelectValue
                      placeholder={gradeLevel ? "Select a learning area" : "Select a grade first"}
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-[20px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl max-h-[240px]">
                    {filteredLearningAreas.length > 0 ? (
                      filteredLearningAreas.map((subj: string) => (
                        <SelectItem
                          key={subj}
                          value={subj}
                          className="text-sm font-bold rounded-xl focus:bg-primary/10 transition-colors my-0.5"
                        >
                          {subj}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-muted-foreground italic">
                        No learning areas defined for this grade
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {gradeLevel && filteredLearningAreas.length > 0 && !subject && (
                  <p className="text-[11px] text-blue-500/70 font-bold flex items-center gap-1 ml-1">
                    <ChevronDown className="w-3 h-3" />
                    {filteredLearningAreas.length} area{filteredLearningAreas.length !== 1 ? "s" : ""} available for {gradeLevel}
                  </p>
                )}
              </div>

              {/* ── Duplicate Warning ── */}
              {duplicateFound && (
                <div className="p-4 rounded-[16px] bg-orange-500/10 border border-orange-500/20 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                        Document already exists
                      </p>
                      <p className="text-[11px] text-orange-600/80 font-medium mt-0.5">
                        Uploaded {new Date(duplicateFound.uploadDate).toLocaleDateString()} &middot; {duplicateFound.chunks} chunks indexed
                      </p>
                      <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                        <div
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                            confirmOverwrite
                              ? "bg-orange-500 border-orange-500"
                              : "border-orange-400/50 bg-background"
                          )}
                          onClick={() => setConfirmOverwrite(!confirmOverwrite)}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={confirmOverwrite}
                            onChange={(e) => setConfirmOverwrite(e.target.checked)}
                          />
                          {confirmOverwrite && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-[11px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                          Replace existing curriculum
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Submit ── sticky at bottom */}
            <div className="px-6 pb-6 pt-3 shrink-0 border-t border-border/30 bg-background/80">
              <Button
                type="submit"
                disabled={isPending || !isReady}
                className={cn(
                  "w-full h-12 rounded-[16px] font-black text-[15px] shadow-lg transition-all duration-200 relative overflow-hidden group",
                  isReady && !isPending
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-500/30 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing &amp; Vectorising…
                  </span>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.8s_infinite]" />
                    <span className="relative flex items-center justify-center gap-2">
                      Inject into Pipeline
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  </>
                )}
              </Button>

              {!isReady && !isPending && (
                <p className="text-center text-[11px] text-muted-foreground/60 font-medium mt-2">
                  {!file ? "Upload a PDF to continue" : !gradeLevel ? "Select a grade level" : "Select a learning area"}
                </p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ingestCurriculum } from "@/lib/actions/curriculum";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/utils/uploadthing";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
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
  // The PDF goes straight from the browser to file storage; we keep its link so a
  // "Replace" confirmation doesn't upload it twice.
  const [uploaded, setUploaded] = useState<{ file: File; url: string } | null>(
    null,
  );
  const { startUpload } = useUploadThing("curriculumUploader");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableGrades = useMemo(
    () => cbcStructure.flatMap((level) => level.grades),
    [cbcStructure],
  );

  const selectedGradeObj = useMemo(
    () => availableGrades.find((g) => g.name === gradeLevel),
    [availableGrades, gradeLevel],
  );

  const filteredLearningAreas = useMemo(() => {
    if (!selectedGradeObj) return [];
    return selectedGradeObj.learningAreas.map((la) => la.learningArea.name);
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
    setUploaded(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error("Choose the curriculum design PDF.");
    if (!gradeLevel || !subject)
      return toast.error("Choose a grade and learning area.");

    startTransition(async () => {
      let fileUrl = uploaded?.file === file ? uploaded.url : "";
      if (!fileUrl) {
        const res = await startUpload([file]).catch((e: Error) => {
          console.error("[upload]", e);
          return undefined;
        });
        fileUrl = res?.[0]?.ufsUrl ?? "";
        if (!fileUrl)
          return void toast.error(
            "The PDF didn't upload. Check your connection and try again.",
          );
        setUploaded({ file, url: fileUrl });
      }
      const result = await ingestCurriculum({
        gradeLevel,
        subject,
        fileUrl,
        overwrite: confirmOverwrite,
      });
      if (result.success) {
        toast.success(
          confirmOverwrite
            ? "Design replaced. Elimu is reading it now."
            : "Design uploaded. Elimu is reading it and will draft its curriculum map.",
        );
        handleClose();
      } else if (result.duplicate) {
        setDuplicateFound(result.existingDoc);
        toast.warning(
          "A design for this grade and learning area is already uploaded.",
        );
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
        className="h-12 rounded-xl px-6 gap-2 text-sm font-semibold shadow-sm bg-primary hover:bg-primary text-primary-foreground transition-all "
      >
        <UploadCloud className="w-5 h-5" />
        <span className="hidden sm:inline">Upload design</span>
        <span className="sm:hidden">Upload</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-xl p-0 border-border/40 bg-card shadow-sm overflow-hidden gap-0 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-border/40 bg-muted/20 shrink-0 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-info/10 rounded-full " />
            <DialogHeader className="relative z-10 space-y-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-info/15 text-info flex items-center justify-center border border-info/20 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <DialogTitle className="text-xl font-semibold leading-tight">
                  Upload a curriculum design
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground font-medium leading-snug ml-12">
                The KICD curriculum design PDF for one grade and learning area
              </DialogDescription>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mt-4 ml-12">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    s < step
                      ? "bg-primary flex-1"
                      : s === step
                        ? "bg-info/60 flex-[2]"
                        : "bg-border/60 flex-1",
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs font-semibold text-muted-foreground/60 mt-1.5 ml-12">
              <span>File</span>
              <span>Grade</span>
              <span>Learning area</span>
              <span>Ready</span>
            </div>
          </div>

          {/* Scrollable body */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="px-6 py-5 space-y-4 flex-1">
              {/* ── Compact Dropzone ── */}
              <div>
                <label
                  htmlFor="curriculum-pdf"
                  className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> PDF Document{" "}
                  <span className="text-destructive">*</span>
                </label>
                <label
                  htmlFor={file ? undefined : "curriculum-pdf"}
                  className={cn(
                    "relative flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-dashed transition-all duration-200 group block",
                    isDragging
                      ? "border-info bg-info/5 scale-[1.01]"
                      : file
                        ? "border-success/50 bg-success/5 border-solid"
                        : "border-border/50 hover:border-info/60 hover:bg-muted/30 cursor-pointer",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
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
                    id="curriculum-pdf"
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {file ? (
                    <>
                      <div className="w-10 h-10 rounded-md bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                          {file.name}
                        </p>
                        <p className="text-xs font-semibold text-success mt-0.5 ">
                          {formatBytes(file.size)} &middot; PDF Ready
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="shrink-0 w-8 h-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 border border-border/40 group-hover:bg-info/10 group-hover:text-info group-hover:border-info/40 transition-all">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-info transition-colors">
                          {isDragging
                            ? "Drop to upload"
                            : "Click to browse or drag & drop"}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                          PDF only · Max 64 MB
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground/50 border border-border/40 px-2.5 py-1 rounded-full hidden sm:block">
                        Browse
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* ── Grade Level (full width) ── */}
              <div className="space-y-2">
                <label
                  htmlFor="grade-level"
                  className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Grade Level{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={gradeLevel}
                  onValueChange={(val) => setGradeLevel(val || "")}
                >
                  <SelectTrigger
                    id="grade-level"
                    className="h-12 rounded-xl bg-background border-border/50 text-sm font-semibold shadow-sm focus:ring-info/20 w-full"
                  >
                    <SelectValue placeholder="Select a grade level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-card/95 shadow-sm max-h-[280px]">
                    {cbcStructure.map((level) => (
                      <div key={level.id} className="p-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/60 bg-muted/30 rounded-lg mb-1">
                          {level.name}
                        </div>
                        {level.grades.map((grade) => (
                          <SelectItem
                            key={grade.id}
                            value={grade.name}
                            className="text-sm font-semibold rounded-xl focus:bg-primary/10 transition-colors my-0.5"
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
                <label
                  htmlFor="learning-area"
                  className={cn(
                    "text-xs font-semibold   flex items-center gap-1.5 transition-colors",
                    gradeLevel
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40",
                  )}
                >
                  <FileText className="w-3.5 h-3.5" /> Learning Area{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={subject}
                  onValueChange={(val) => setSubject(val || "")}
                  disabled={!gradeLevel}
                >
                  <SelectTrigger
                    id="learning-area"
                    className={cn(
                      "h-12 rounded-xl border text-sm font-semibold shadow-sm w-full transition-all",
                      gradeLevel
                        ? "bg-background border-border/50 focus:ring-info/20"
                        : "bg-muted/30 border-border/20 text-muted-foreground/50 cursor-not-allowed",
                    )}
                  >
                    <SelectValue
                      placeholder={
                        gradeLevel
                          ? "Select a learning area"
                          : "Select a grade first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-card/95 shadow-sm max-h-[240px]">
                    {filteredLearningAreas.length > 0 ? (
                      filteredLearningAreas.map((subj: string) => (
                        <SelectItem
                          key={subj}
                          value={subj}
                          className="text-sm font-semibold rounded-xl focus:bg-primary/10 transition-colors my-0.5"
                        >
                          {subj}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs font-semibold text-muted-foreground italic">
                        No learning areas defined for this grade
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {gradeLevel && filteredLearningAreas.length > 0 && !subject && (
                  <p className="text-xs text-info/70 font-semibold flex items-center gap-1 ml-1">
                    <ChevronDown className="w-3 h-3" />
                    {filteredLearningAreas.length} area
                    {filteredLearningAreas.length !== 1 ? "s" : ""} available
                    for {gradeLevel}
                  </p>
                )}
              </div>

              {/* ── Duplicate Warning ── */}
              {duplicateFound && (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-warning ">
                        Document already exists
                      </p>
                      <p className="text-xs text-warning/80 font-medium mt-0.5">
                        Uploaded{" "}
                        {new Date(
                          duplicateFound.uploadDate,
                        ).toLocaleDateString()}{" "}
                        &middot; {duplicateFound.chunks} chunks indexed
                      </p>
                      <label className="mt-2 flex min-h-11 cursor-pointer select-none items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-[var(--warning)]"
                          checked={confirmOverwrite}
                          onChange={(e) =>
                            setConfirmOverwrite(e.target.checked)
                          }
                        />
                        <span className="text-xs font-semibold text-warning">
                          Replace the existing design
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
                  "w-full h-12 rounded-xl font-semibold text-sm shadow-sm transition-all duration-200 relative overflow-hidden group",
                  isReady && !isPending
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground shadow-none cursor-not-allowed",
                )}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  <span className="relative flex items-center justify-center gap-2">
                    Upload
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                )}
              </Button>

              {!isReady && !isPending && (
                <p className="text-center text-xs text-muted-foreground/60 font-medium mt-2">
                  {!file
                    ? "Upload a PDF to continue"
                    : !gradeLevel
                      ? "Select a grade level"
                      : "Select a learning area"}
                </p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useTransition, useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, Loader2, FileText, X, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { ingestCurriculum } from "@/lib/actions/curriculum";
import { cn } from "@/lib/utils";

// Format file size
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      }
    }[]
  }[]
}

export function UploadCurriculumModal({ 
  cbcStructure = [] 
}: { 
  cbcStructure: CbcLevel[] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [duplicateFound, setDuplicateFound] = useState<{id: string, uploadDate: Date, chunks: number} | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableGrades = useMemo(() => {
    return cbcStructure.flatMap(level => level.grades);
  }, [cbcStructure]);

  const selectedGradeObj = useMemo(() => {
    return availableGrades.find(g => g.name === gradeLevel);
  }, [availableGrades, gradeLevel]);

  const filteredLearningAreas = useMemo(() => {
    if (!selectedGradeObj) return [];
    return selectedGradeObj.learningAreas.map((la: any) => la.learningArea.name);
  }, [selectedGradeObj]);

  // Reset subject if it's no longer valid for the new grade
  useEffect(() => {
    if (gradeLevel && subject && !filteredLearningAreas.includes(subject)) {
      setSubject("");
    }
  }, [gradeLevel, filteredLearningAreas, subject]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error("Please implicitly upload a KICD PDF document.");
    if (!gradeLevel || !subject) return toast.error("Please select a Grade and Subject.");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.set("gradeLevel", gradeLevel);
    formData.set("subject", subject);
    formData.set("title", `${gradeLevel} - ${subject}`);
    if (confirmOverwrite) {
      formData.set("overwrite", "true");
    }

    startTransition(async () => {
      const result = await ingestCurriculum(formData);
      
      if (result.success) {
        toast.success(confirmOverwrite ? "Curriculum overwritten and synchronized." : "Curriculum synchronized.");
        setIsOpen(false);
        setFile(null);
        setGradeLevel("");
        setSubject("");
        setDuplicateFound(null);
        setConfirmOverwrite(false);
      } else if (result.duplicate) {
        setDuplicateFound(result.existingDoc);
        toast.warning(result.error + " Choose to overwrite if you want to replace it.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105">
        <UploadCloud className="w-5 h-5" />
        Upload Curriculum
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-[32px] p-0 border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden gap-0">
          
          <div className="bg-muted/30 p-6 sm:p-8 border-b border-border/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                   <Sparkles className="w-5 h-5" />
                 </div>
                 Vector Database Ingestion
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-2 leading-relaxed">
                Upload a verified KICD Curriculum Design PDF. The system will extract, chunk, and embed the document for AI routing.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-background/50 relative">
            
            {/* Interactive Dropzone */}
            <div 
              className={cn(
                "relative flex flex-col items-center justify-center py-10 px-6 rounded-[24px] border-2 border-dashed transition-all duration-300",
                isDragging ? "border-blue-500 bg-blue-500/5 scale-[1.02]" : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
                file ? "border-solid border-green-500/50 bg-green-500/5" : ""
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  setFile(e.dataTransfer.files[0]);
                }
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
                 <div className="flex flex-col items-center text-center w-full animate-in zoom-in-95 duration-300">
                   <div className="w-16 h-16 rounded-[22px] bg-green-500/10 text-green-500 flex items-center justify-center mb-4 border border-green-500/20 shadow-inner">
                     <FileText className="w-8 h-8" />
                   </div>
                   <h3 className="text-base font-extrabold text-foreground truncate w-full px-4">{file.name}</h3>
                   <p className="text-xs font-bold text-green-600 dark:text-green-500 mt-1.5 uppercase tracking-wider">{formatBytes(file.size)} • PDF Ready</p>
                   
                   <Button 
                     type="button" 
                     variant="ghost" 
                     size="sm" 
                     onClick={(e) => { e.stopPropagation(); setFile(null); }}
                     className="mt-4 h-8 rounded-full px-4 text-xs font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                   >
                     <X className="w-3 h-3 mr-1.5" /> Remove File
                   </Button>
                 </div>
               ) : (
                 <div 
                   className="flex flex-col items-center text-center cursor-pointer w-full group"
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <div className="w-16 h-16 rounded-[22px] bg-muted/50 text-muted-foreground flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:text-blue-500 shadow-sm border border-border/40 group-hover:border-blue-500/30">
                     <UploadCloud className="w-8 h-8 mt-1" />
                   </div>
                   <h3 className="text-[15px] font-extrabold text-foreground mb-1 group-hover:text-blue-500 transition-colors">Click to upload or drag & drop</h3>
                   <p className="text-[13px] font-medium text-muted-foreground">Strictly PDF documents supported (Max 50MB)</p>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Grade Level <span className="text-red-500 font-black">*</span>
                </label>
                <Select value={gradeLevel} onValueChange={(val) => setGradeLevel(val || "")}>
                  <SelectTrigger className="h-12 rounded-[16px] bg-background border-border/50 text-sm font-bold shadow-sm focus:ring-blue-500/30">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[24px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl max-h-[400px]">
                    {cbcStructure.map(level => (
                      <div key={level.id} className="p-1">
                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-muted/20 rounded-lg mb-1">{level.name}</div>
                        {level.grades.map((grade: any) => (
                          <SelectItem key={grade.id} value={grade.name} className="text-sm font-bold rounded-xl focus:bg-primary/10 transition-colors my-0.5">{grade.name}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Learning Area <span className="text-red-500 font-black">*</span>
                </label>
                <Select value={subject} onValueChange={(val) => setSubject(val || "")}>
                  <SelectTrigger className="h-12 rounded-[16px] bg-background border-border/50 text-sm font-bold shadow-sm focus:ring-blue-500/30">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[24px] border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl h-[280px]">
                    {filteredLearningAreas.length > 0 ? (
                      filteredLearningAreas.map((subj: string) => (
                        <SelectItem key={subj} value={subj} className="text-sm font-bold rounded-xl focus:bg-primary/10 transition-colors my-0.5">{subj}</SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-muted-foreground uppercase italic pb-6">
                        {gradeLevel ? "No areas defined for this grade" : "Select a grade first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {duplicateFound && (
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-orange-700">Existing Document Found</p>
                    <p className="text-[11px] text-orange-600/80 font-medium leading-tight mt-0.5">
                      Uploaded {new Date(duplicateFound.uploadDate).toLocaleDateString()} with {duplicateFound.chunks} chunks.
                    </p>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        confirmOverwrite ? "bg-orange-500 border-orange-500" : "border-orange-500/40 bg-background"
                      )}>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={confirmOverwrite}
                          onChange={(e) => setConfirmOverwrite(e.target.checked)}
                        />
                        {confirmOverwrite && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-xs font-black text-orange-700 uppercase tracking-tighter">I want to OVERWRITE this curriculum</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit"
              disabled={isPending || !file || !gradeLevel || !subject} 
              className={cn(
                "w-full h-[56px] rounded-[20px] font-black text-[15px] shadow-xl transition-all duration-300 relative overflow-hidden group mt-2",
                !file || !gradeLevel || !subject ? "bg-muted text-muted-foreground shadow-none" : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isPending ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Vectors...
                </div>
              ) : (
                 <>
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-white/20 to-blue-400/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                   <div className="relative flex items-center justify-center gap-2">
                     Inject into Pipeline <CheckCircle2 className="w-5 h-5 ml-1" />
                   </div>
                 </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

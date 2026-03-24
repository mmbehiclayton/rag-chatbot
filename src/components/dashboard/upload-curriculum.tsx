"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, CheckCircle2, ArrowRight, Loader2, File } from "lucide-react";
import { ingestCurriculum } from "@/lib/actions/curriculum";

export function UploadCurriculumModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [gradeLevel, setGradeLevel] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast.error("Please explicitly upload a KICD PDF document.");
    if (!gradeLevel || !subject) return toast.error("Please select a Grade and Subject.");
    
    const formData = new FormData(e.currentTarget);
    formData.append("file", file);
    formData.set("gradeLevel", gradeLevel);
    formData.set("subject", subject);
    formData.set("title", `${gradeLevel} - ${subject}`);

    console.log("Submitting formData:", {
      title: formData.get("title"),
      gradeLevel: formData.get("gradeLevel"),
      subject: formData.get("subject"),
      file: file.name
    });

    startTransition(async () => {
      const result = await ingestCurriculum(formData);
      console.log("Ingest response:", result);
      
      if (result.success) {
        toast.success("Curriculum synchronized. Background AI ingestion routine initialized.");
        setIsOpen(false);
        setFile(null);
        setGradeLevel("");
        setSubject("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="h-12 rounded-[20px] px-6 gap-2 text-sm font-bold shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] transition-all hover:scale-105">
        <UploadCloud className="w-5 h-5" />
        Upload Curriculum Design
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] p-8 border-border/40 bg-card/95 backdrop-blur-2xl px-8 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black">Vector Upload</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Upload a strict KICD Curriculum Design PDF to train the central models.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 relative group">
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">Grade Level</label>
              <Select value={gradeLevel} onValueChange={(val) => setGradeLevel(val || "")}>
                <SelectTrigger className="h-12 rounded-[16px] bg-background/50 border-border/50 text-sm font-bold">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-xl">
                  {["Pre-Primary 1", "Pre-Primary 2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"].map(grade => (
                    <SelectItem key={grade} value={grade} className="text-sm font-bold focus:bg-primary/10">{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">Learning Area (Subject)</label>
              <Select value={subject} onValueChange={(val) => setSubject(val || "")}>
                <SelectTrigger className="h-12 rounded-[16px] bg-background/50 border-border/50 text-sm font-bold">
                  <SelectValue placeholder="Select Learning Area" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl shadow-xl h-[250px]">
                  {["Mathematics", "English", "Kiswahili", "Science & Technology", "Social Studies", "Creative Arts", "Agriculture & Nutrition", "CRE", "IRE", "HRE"].map(subj => (
                    <SelectItem key={subj} value={subj} className="text-sm font-bold focus:bg-primary/10">{subj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5 pt-2">
              <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider ml-1">PDF File</label>
              <div className="border-2 border-dashed border-border/50 rounded-[20px] p-6 hover:bg-muted/10 transition-colors flex flex-col items-center justify-center gap-3 relative overflow-hidden bg-background/30">
                 <input 
                   type="file" 
                   accept="application/pdf"
                   onChange={(e) => setFile(e.target.files?.[0] || null)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                 />
                 {file ? (
                   <div className="flex flex-col items-center gap-2 text-primary">
                     <File className="w-8 h-8" />
                     <span className="text-sm font-bold truncate max-w-[200px] text-foreground">{file.name}</span>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-2">
                     <UploadCloud className="w-8 h-8 text-muted-foreground" />
                     <span className="text-sm font-bold text-muted-foreground">Select PDF File</span>
                   </div>
                 )}
              </div>
            </div>

            <Button disabled={isPending || !file} className="w-full h-12 rounded-[20px] font-bold mt-4 shadow-lg group">
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <div className="flex items-center gap-2">
                  Initialize Pipeline <CheckCircle2 className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                </div>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

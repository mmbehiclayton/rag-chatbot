"use client";

import { useState } from "react";
import { 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  ExternalLink, 
  Download, 
  Clock, 
  Target, 
  CheckCircle2,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAssessment } from "@/lib/actions/generation";
import { toast } from "sonner";
import { format } from "date-fns";

interface AssessmentBankProps {
  initialAssessments: any[];
}

export function AssessmentBank({ initialAssessments }: AssessmentBankProps) {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredAssessments = assessments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      setIsDeleting(id);
      await deleteAssessment(id);
      setAssessments(assessments.filter(a => a.id !== id));
      toast.success("Assessment deleted");
    } catch (error) {
      toast.error("Failed to delete assessment");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search saved assessments..." 
            className="pl-11 h-12 rounded-2xl bg-card/50 border-border/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map((a) => (
            <div 
              key={a.id} 
              className="group bg-card/60 backdrop-blur-xl border border-border/40 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => handleDelete(a.id)}
                    disabled={isDeleting === a.id}
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{a.title}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{a.subject} • {a.grade}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-muted/40 rounded-2xl border border-border/40">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Marks
                  </p>
                  <p className="font-bold text-sm">{(a.content as any)?.totalMarks || "N/A"}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-2xl border border-border/40">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duration
                  </p>
                  <p className="font-bold text-sm">{(a.content as any)?.durationMinutes || "N/A"}m</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">{format(new Date(a.createdAt), 'MMM d, yyyy')}</span>
                <Button variant="outline" className="h-9 px-4 rounded-xl gap-2 text-xs font-bold shadow-sm">
                  Preview <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-muted/20 border-2 border-dashed border-border/40 rounded-[40px] flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground/30" />
             </div>
             <h4 className="text-lg font-bold">No assessments found</h4>
             <p className="text-sm text-muted-foreground max-w-xs mt-1">
               Generate your first assessment using the creator tab to build your bank.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

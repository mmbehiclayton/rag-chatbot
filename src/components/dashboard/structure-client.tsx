"use client";

import { useState, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, 
  BookOpen, 
  Settings, 
  Plus, 
  Search, 
  ChevronRight, 
  Layers, 
  Info, 
  MoreVertical,
  Edit2,
  Trash2,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
  Loader2,
  X,
  PlusCircle,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import * as actions from "@/lib/actions/structure";

interface CbcLevel {
  id: string;
  name: string;
  order: number;
  grades: {
    id: string;
    name: string;
    order: number;
    learningAreas: {
      learningArea: {
        id: string;
        name: string;
      }
    }[]
  }[]
}

interface LearningArea {
  id: string;
  name: string;
}

export function StructureClient({ 
  levels, 
  learningAreas 
}: { 
  levels: CbcLevel[], 
  learningAreas: LearningArea[] 
}) {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(levels[0]?.id || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // State for Modals
  const [modalState, setModalState] = useState<{
    type: "LEVEL" | "GRADE" | "AREA" | "LINK";
    mode: "CREATE" | "EDIT" | "DELETE";
    data?: any;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", order: 1 });

  const selectedLevel = useMemo(() => 
    levels.find(l => l.id === selectedLevelId), 
  [levels, selectedLevelId]);

  const filteredLearningAreas = useMemo(() => 
    learningAreas.filter(la => la.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [learningAreas, searchTerm]);

  // Utility to handle actions
  const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    startTransition(async () => {
      const result = await actionFn();
      if (result.success) {
        toast.success(successMsg);
        setModalState(null);
        setFormData({ name: "", order: 1 });
      } else {
        toast.error(result.error || "An error occurred");
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[700px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Left Sidebar: Levels Navigator */}
      <div className="w-full lg:w-72 space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-black uppercase tracking-widest text-foreground/80">Levels</span>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => {
              setFormData({ name: "", order: levels.length + 1 });
              setModalState({ type: "LEVEL", mode: "CREATE" });
            }}
            className="w-8 h-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {levels.map((level) => (
            <div key={level.id} className="group relative">
              <button
                onClick={() => setSelectedLevelId(level.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-[22px] transition-all duration-300 relative overflow-hidden text-left",
                  selectedLevelId === level.id 
                    ? "bg-blue-600 text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]" 
                    : "bg-card/40 border border-border/40 hover:bg-muted/50 hover:border-border/80 text-foreground/70 hover:text-foreground"
                )}
              >
                {selectedLevelId === level.id && (
                  <motion.div 
                    layoutId="active-level-bg"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 z-0"
                  />
                )}
                
                <div className="relative z-10 flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 mb-0.5">Hierarchy {level.order}</span>
                  <span className="text-sm font-bold tracking-tight">{level.name}</span>
                </div>
                
                <div className="relative z-10 flex items-center gap-3">
                  <div className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                    selectedLevelId === level.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {level.grades.length}G
                  </div>
                </div>
              </button>
              
              {/* Floating Edit/Delete for Levels */}
              <div className={cn(
                "absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-x-1/2",
                selectedLevelId === level.id && "opacity-100"
              )}>
                 <Button 
                   size="icon" 
                   variant="secondary" 
                   onClick={() => {
                     setFormData({ name: level.name, order: level.order });
                     setModalState({ type: "LEVEL", mode: "EDIT", data: level });
                   }}
                   className="w-8 h-8 rounded-full shadow-lg border border-border/40 hover:scale-110 transition-transform"
                 >
                   <Edit2 className="w-3 h-3" />
                 </Button>
                 <Button 
                   size="icon" 
                   variant="destructive" 
                   onClick={() => setModalState({ type: "LEVEL", mode: "DELETE", data: level })}
                   className="w-8 h-8 rounded-full shadow-lg border border-red-500/20 hover:scale-110 transition-transform"
                 >
                   <Trash2 className="w-3 h-3" />
                 </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/40">
           <div className="p-4 rounded-[24px] bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2 text-blue-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-widest">KICD Standards</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                The current 2-6-3-3-3 structure is verified for the 2026 academic cycle.
              </p>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8">
        
        {/* Level Detail View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLevelId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                   {selectedLevel?.name}
                   <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level Definition</span>
                </h2>
                <p className="text-muted-foreground text-sm font-medium mt-1">Configure individual grades for this level.</p>
              </div>
              <Button 
                onClick={() => {
                  setFormData({ name: "", order: (selectedLevel?.grades.length || 0) + 1 });
                  setModalState({ type: "GRADE", mode: "CREATE", data: { levelId: selectedLevel?.id } });
                }}
                className="h-11 rounded-[18px] px-6 gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Grade
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {selectedLevel?.grades.map((grade) => (
                <div 
                  key={grade.id} 
                  className="group bg-card/60 backdrop-blur-xl border border-border/40 rounded-[30px] p-6 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors" />
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/5 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                         <GraduationCap className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="text-lg font-black tracking-tight">{grade.name}</h3>
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Priority {grade.order}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setFormData({ name: grade.name, order: grade.order });
                          setModalState({ type: "GRADE", mode: "EDIT", data: grade });
                        }}
                        className="w-9 h-9 rounded-xl hover:bg-muted"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setModalState({ type: "GRADE", mode: "DELETE", data: grade })}
                        className="w-9 h-9 rounded-xl hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Learning Areas</span>
                       <span className="text-[10px] font-bold text-blue-600 px-2 py-0.5 rounded-lg bg-blue-500/5">{grade.learningAreas.length} Linked</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {grade.learningAreas.map((la) => (
                         <div key={la.learningArea.id} className="relative group/tag">
                           <div className="px-3 py-1.5 rounded-xl bg-background/50 border border-border/40 text-[11px] font-bold text-foreground/80 hover:border-blue-500/30 transition-all cursor-default flex items-center gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-blue-500" />
                             {la.learningArea.name}
                           </div>
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(() => actions.unlinkAreaFromGrade(grade.id, la.learningArea.id), "Unlinked area");
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center scale-0 group-hover/tag:scale-100 transition-transform shadow-md hover:bg-red-600 z-20"
                           >
                            <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                       {grade.learningAreas.length === 0 && (
                         <div className="text-[11px] italic text-muted-foreground">No areas linked</div>
                       )}
                       <button 
                         onClick={() => setModalState({ type: "LINK", mode: "CREATE", data: grade })}
                         className="px-3 py-1.5 rounded-xl border border-dashed border-border/80 text-[11px] font-bold text-muted-foreground hover:bg-blue-500/5 hover:border-blue-500/50 hover:text-blue-600 transition-all"
                       >
                         + Link Area
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Global Learning Areas Palette */}
        <div className="pt-8 border-t border-border/40 mt-12">
          <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[35px] overflow-hidden">
             
             <div className="p-8 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Global Learning Areas</h2>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">Core blocks of the KICD curriculum.</p>
                  </div>
                </div>
                <div className="relative w-full md:w-64">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <Input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search areas..." 
                      className="pl-11 h-11 rounded-xl bg-background/50 border-border/50 text-xs font-bold"
                   />
                </div>
             </div>
             
             <div className="p-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredLearningAreas.map((area) => (
                  <div key={area.id} className="p-4 rounded-[22px] bg-background/50 border border-border/40 hover:shadow-lg hover:border-purple-500/30 transition-all group flex flex-col justify-between min-h-[100px]">
                     <div className="flex items-start justify-between">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setFormData({ name: area.name, order: area.order });
                              setModalState({ type: "AREA", mode: "EDIT", data: area });
                            }}
                            className="w-7 h-7 rounded-lg"
                          >
                             <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setModalState({ type: "AREA", mode: "DELETE", data: area })}
                            className="w-7 h-7 rounded-lg hover:text-red-500"
                          >
                             <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                     </div>
                     <span className="text-sm font-bold tracking-tight text-foreground/90 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{area.name}</span>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    setFormData({ name: "", order: learningAreas.length + 1 });
                    setModalState({ type: "AREA", mode: "CREATE" });
                  }}
                  className="p-4 rounded-[22px] border-2 border-dashed border-border/40 bg-background/20 hover:bg-purple-500/5 hover:border-purple-500/40 transition-all group flex flex-col items-center justify-center min-h-[100px] gap-2 text-muted-foreground hover:text-purple-600"
                >
                   <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest ">New Area</span>
                </button>
             </div>

             <div className="px-8 py-5 bg-purple-500/5 border-t border-purple-500/10 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <p className="text-[11px] font-bold text-purple-700/80 uppercase tracking-wider">
                  {learningAreas.length} Total Unique Learning Areas identified.
                </p>
             </div>
          </div>
        </div>

      </div>

      {/* Shared Management Dialog */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] p-0 border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden gap-0">
          <div className="bg-muted/30 p-6 sm:p-8 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  {modalState?.mode === "DELETE" ? <Trash2 className="w-5 h-5 text-red-500" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                {modalState?.mode === "DELETE" ? "Confirm Deletion" : `${modalState?.mode} ${modalState?.type}`}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1 uppercase tracking-tight text-[11px]">
                {modalState?.mode === "DELETE" ? "This action cannot be undone." : "Submit the details below to proceed."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {modalState?.mode === "DELETE" ? (
                <p className="text-sm font-bold text-foreground/80 leading-relaxed italic">
                  Are you sure you want to delete <span className="text-red-500 underline underline-offset-4 font-black">"{modalState.data?.name}"</span>? 
                  This will also remove all associations.
                </p>
            ) : modalState?.type === "LINK" ? (
                <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Learning Areas Palette</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {learningAreas.map((area) => {
                          const isLinked = modalState.data?.learningAreas.some((la: any) => la.learningArea.id === area.id);
                          return (
                            <button
                              key={area.id}
                              onClick={() => {
                                if (isLinked) {
                                  handleAction(() => actions.unlinkAreaFromGrade(modalState.data?.id, area.id), "Unlinked area");
                                } else {
                                  handleAction(() => actions.linkAreaToGrade(modalState.data?.id, area.id), "Linked area");
                                }
                              }}
                              disabled={isPending}
                              className={cn(
                                "p-3 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between",
                                isLinked 
                                  ? "border-primary/40 bg-primary/5 text-primary" 
                                  : "border-border/40 bg-background/50 text-muted-foreground hover:border-primary/20"
                              )}
                            >
                              <span className="truncate pr-2">{area.name}</span>
                              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isLinked ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                          );
                      })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Name</label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Grade 1 or Mathematics"
                      className="h-12 rounded-[16px] bg-background text-sm font-bold border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest ml-1">Display Order</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input 
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                        className="h-12 rounded-[16px] bg-background text-sm font-bold border-border/50 pl-11"
                      />
                    </div>
                  </div>
                </div>
            )}
          </div>

          <DialogFooter className="p-6 sm:p-8 bg-muted/20 border-t border-border/40 sm:justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalState(null)} className="h-12 rounded-2xl px-6 font-bold text-xs uppercase tracking-wider">Cancel</Button>
              <Button 
                disabled={isPending || (modalState?.mode !== "DELETE" && modalState?.type !== "LINK" && !formData.name)}
                onClick={() => {
                  if (modalState?.mode === "DELETE") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.deleteLevel(modalState.data.id), "Level deleted");
                    if (modalState.type === "GRADE") handleAction(() => actions.deleteGrade(modalState.data.id), "Grade deleted");
                    if (modalState.type === "AREA") handleAction(() => actions.deleteLearningArea(modalState.data.id), "Area deleted");
                  } else if (modalState?.mode === "EDIT") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.updateLevel(modalState.data.id, formData), "Level updated");
                    if (modalState.type === "GRADE") handleAction(() => actions.updateGrade(modalState.data.id, formData), "Grade updated");
                    if (modalState.type === "AREA") handleAction(() => actions.updateLearningArea(modalState.data.id, formData), "Area updated");
                  } else if (modalState?.mode === "CREATE") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.createLevel(formData), "Level created");
                    if (modalState.type === "GRADE") handleAction(() => actions.createGrade({ ...formData, levelId: modalState.data.levelId }), "Grade created");
                    if (modalState.type === "AREA") handleAction(() => actions.createLearningArea(formData), "Area created");
                  }
                }}
                className={cn(
                  "h-12 rounded-[20px] px-8 font-black text-xs uppercase tracking-widest shadow-lg transition-all",
                  modalState?.mode === "DELETE" ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                )}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {modalState?.mode === "DELETE" ? "Delete Forever" : modalState?.type === "LINK" ? "Done Linking" : "Confirm & Save"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

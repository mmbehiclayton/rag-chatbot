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
        toast.error(result.error || "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[700px] ">
      
      {/* Left Sidebar: Levels Navigator */}
      <div className="w-full lg:w-72 space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-info" />
            <span className="text-sm font-semibold text-foreground/80">Levels</span>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => {
              setFormData({ name: "", order: levels.length + 1 });
              setModalState({ type: "LEVEL", mode: "CREATE" });
            }}
            className="w-8 h-8 rounded-full hover:bg-info/10 hover:text-info"
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
 "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 relative overflow-hidden text-left",
                  selectedLevelId === level.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card/40 border border-border/40 hover:bg-muted/50 hover:border-border/80 text-foreground/70 hover:text-foreground"
                )}
              >
                {selectedLevelId === level.id && (
                  <motion.div
                    layoutId="active-level-bg"
                    className="absolute inset-0 bg-primary z-0"
                  />
                )}

                <div className="relative z-10 flex flex-col">
                  <span className="text-sm font-semibold ">{level.name}</span>
                </div>

                <div className="relative z-10 flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({ name: level.name, order: level.order });
                        setModalState({ type: "LEVEL", mode: "EDIT", data: level });
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalState({ type: "LEVEL", mode: "DELETE", data: level });
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className={cn(
 "px-2 py-0.5 rounded-lg text-xs font-semibold   transition-colors",
                    selectedLevelId === level.id ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {level.grades.length}G
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/40">
           <div className="p-4 rounded-xl border bg-card">
              <p className="text-sm font-medium">Next step</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload the curriculum design for each grade and learning area in the{" "}
                <a href="/dashboard/knowledge" className="font-medium text-primary underline-offset-4 hover:underline">knowledge base</a>.
                Elimu then drafts its curriculum map.
              </p>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-5">
        
        {/* Level Detail View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLevelId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold ">
                  {selectedLevel?.name}
                </h2>
                <p className="text-muted-foreground text-sm font-medium mt-1">Grades in this level and the learning areas each one has.</p>
              </div>
              <Button 
                onClick={() => {
                  setFormData({ name: "", order: (selectedLevel?.grades.length || 0) + 1 });
                  setModalState({ type: "GRADE", mode: "CREATE", data: { levelId: selectedLevel?.id } });
                }}
                className="h-11 rounded-xl px-6 gap-2 text-sm font-semibold shadow-sm shadow-info/20 bg-primary hover:bg-primary"
              >
                <Plus className="w-4 h-4" /> Add Grade
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedLevel?.grades.map((grade) => (
                <div 
                  key={grade.id} 
                  className="group bg-card/60 border border-border/40 rounded-xl p-4 shadow-sm hover:border-info/30 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-info/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-info/10 transition-colors" />
                  
                  <div className="flex items-start justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-9 h-9 rounded-xl text-info flex items-center justify-center border border-info/20 transition-transform">
                         <GraduationCap className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="text-sm font-semibold ">{grade.name}</h3>
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
                        className="w-9 h-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-semibold text-muted-foreground/60">Learning Areas</span>
                       <span className="text-xs font-semibold text-info px-2 py-0.5 rounded-lg bg-info/5">{grade.learningAreas.length} learning areas</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {grade.learningAreas.map((la) => (
                         <div key={la.learningArea.id} className="relative group/tag">
                           <div className="px-3 py-1.5 rounded-xl bg-background/50 border border-border/40 text-xs font-semibold text-foreground/80 hover:border-info/30 transition-all cursor-default flex items-center gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-primary" />
                             {la.learningArea.name}
                           </div>
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(() => actions.unlinkAreaFromGrade(grade.id, la.learningArea.id), "Learning area removed from the grade");
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-primary-foreground flex items-center justify-center group-hover/ transition-transform shadow-sm hover:bg-destructive z-20"
                           >
                            <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                       {grade.learningAreas.length === 0 && (
                         <div className="text-xs italic text-muted-foreground">No learning areas yet</div>
                       )}
                       <button 
                         onClick={() => setModalState({ type: "LINK", mode: "CREATE", data: grade })}
                         className="px-3 py-1.5 rounded-xl border border-dashed border-border/80 text-xs font-semibold text-muted-foreground hover:bg-info/5 hover:border-info/50 hover:text-info transition-all"
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
        <div className="pt-5 border-t border-border/40 mt-8">
          <div className="bg-card/40 border border-border/40 rounded-xl overflow-hidden">

             <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold ">All learning areas</h2>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">Add a learning area here, then add it to the grades that teach it.</p>
                  </div>
                </div>
                <div className="relative w-full md:w-64">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <Input 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search learning areas" 
                      className="pl-11 h-11 rounded-xl bg-background/50 border-border/50 text-xs font-semibold"
                   />
                </div>
             </div>
             
             <div className="p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredLearningAreas.map((area) => (
                  <div key={area.id} className="p-3 rounded-xl bg-background/50 border border-border/40 hover:border-primary/30 transition-all group flex flex-col justify-between min-h-[72px]">
                     <div className="flex items-start justify-between">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setFormData({ name: area.name, order: (area as any).order || 1 });
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
                            className="w-7 h-7 rounded-lg hover:text-destructive"
                          >
                             <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                     </div>
                     <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors ">{area.name}</span>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    setFormData({ name: "", order: learningAreas.length + 1 });
                    setModalState({ type: "AREA", mode: "CREATE" });
                  }}
                  className="p-3 rounded-xl border-2 border-dashed border-border/40 bg-background/20 hover:bg-primary/5 hover:border-primary/40 transition-all group flex flex-col items-center justify-center min-h-[72px] gap-2 text-muted-foreground hover:text-primary"
                >
                   <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center transition-transform">
                      <Plus className="w-4 h-4" />
                   </div>
                   <span className="text-xs font-semibold ">New Area</span>
                </button>
             </div>

             <div className="px-5 py-4 bg-primary/5 border-t border-primary/10 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-primary/80 ">
                  {learningAreas.length} Total Unique Learning Areas identified.
                </p>
             </div>
          </div>
        </div>

      </div>

      {/* Shared Management Dialog */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-xl p-0 border-border/40 bg-card/95 shadow-sm overflow-hidden gap-0">
          <div className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  {modalState?.mode === "DELETE" ? <Trash2 className="w-5 h-5 text-destructive" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                {modalState?.mode === "DELETE" ? "Delete this?" : `${modalState?.mode} ${modalState?.type}`}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1 text-xs">
                {modalState?.mode === "DELETE" ? "This action cannot be undone." : "Fill in the details below."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {modalState?.mode === "DELETE" ? (
                <p className="text-sm font-semibold text-foreground/80 leading-relaxed italic">
                  Are you sure you want to delete <span className="text-destructive underline underline-offset-4 font-semibold">"{modalState.data?.name}"</span>? 
                  This will also remove all associations.
                </p>
            ) : modalState?.type === "LINK" ? (
                <div className="space-y-4">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Learning Areas Palette</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {learningAreas.map((area) => {
                          const isLinked = modalState.data?.learningAreas.some((la: any) => la.learningArea.id === area.id);
                          return (
                            <button
                              key={area.id}
                              onClick={() => {
                                if (isLinked) {
                                  handleAction(() => actions.unlinkAreaFromGrade(modalState.data?.id, area.id), "Learning area removed from the grade");
                                } else {
                                  handleAction(() => actions.linkAreaToGrade(modalState.data?.id, area.id), "Learning area added to the grade");
                                }
                              }}
                              disabled={isPending}
                              className={cn(
 "p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between",
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
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Name</label>
                    <Input 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Grade 1 or Mathematics"
                      className="h-12 rounded-xl bg-background text-sm font-semibold border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground ml-1">Display Order</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input 
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                        className="h-12 rounded-xl bg-background text-sm font-semibold border-border/50 pl-11"
                      />
                    </div>
                  </div>
                </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-5 bg-muted/20 border-t border-border/40 sm:justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalState(null)} className="h-12 rounded-xl px-6 font-semibold text-xs ">Cancel</Button>
              <Button 
                disabled={isPending || (modalState?.mode !== "DELETE" && modalState?.type !== "LINK" && !formData.name)}
                onClick={() => {
                  if (modalState?.mode === "DELETE") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.deleteLevel(modalState.data.id), "Level deleted");
                    if (modalState.type === "GRADE") handleAction(() => actions.deleteGrade(modalState.data.id), "Grade deleted");
                    if (modalState.type === "AREA") handleAction(() => actions.deleteLearningArea(modalState.data.id), "Learning area deleted");
                  } else if (modalState?.mode === "EDIT") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.updateLevel(modalState.data.id, formData), "Level updated");
                    if (modalState.type === "GRADE") handleAction(() => actions.updateGrade(modalState.data.id, formData), "Grade updated");
                    if (modalState.type === "AREA") handleAction(() => actions.updateLearningArea(modalState.data.id, formData), "Learning area updated");
                  } else if (modalState?.mode === "CREATE") {
                    if (modalState.type === "LEVEL") handleAction(() => actions.createLevel(formData), "Level created");
                    if (modalState.type === "GRADE") handleAction(() => actions.createGrade({ ...formData, levelId: modalState.data.levelId }), "Grade created");
                    if (modalState.type === "AREA") handleAction(() => actions.createLearningArea(formData), "Learning area added");
                  }
                }}
                className={cn(
 "h-12 rounded-xl px-8 font-semibold text-xs   shadow-sm transition-all",
                  modalState?.mode === "DELETE" ? "bg-destructive hover:bg-destructive text-primary-foreground shadow-destructive/20" : "bg-primary hover:bg-primary text-primary-foreground shadow-info/20"
                )}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {modalState?.mode === "DELETE" ? "Delete" : modalState?.type === "LINK" ? "Done" : "Save"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

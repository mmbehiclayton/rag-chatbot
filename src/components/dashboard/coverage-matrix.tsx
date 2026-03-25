"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  ServerCrash, 
  AlertCircle, 
  ChevronRight, 
  LayoutGrid,
  Filter,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Grade {
  id: string;
  name: string;
  order: number;
  learningAreas: {
    learningArea: {
      id: string;
      name: string;
    }
  }[];
}

interface Level {
  id: string;
  name: string;
  order: number;
  grades: Grade[];
}

interface Doc {
  id: string;
  status: string;
  _count: { chunks: number };
}

interface CoverageMatrixProps {
  cbcStructure: Level[];
  coverageMap: Record<string, Record<string, Doc>>;
}

export function CoverageMatrix({ cbcStructure, coverageMap }: CoverageMatrixProps) {
  const [activeLevelId, setActiveLevelId] = useState<string>(cbcStructure[0]?.id || "");
  const [searchTerm, setSearchTerm] = useState("");

  const activeLevel = useMemo(() => 
    cbcStructure.find(l => l.id === activeLevelId), 
    [cbcStructure, activeLevelId]
  );

  const filteredGrades = useMemo(() => {
    if (!activeLevel) return [];
    return activeLevel.grades.filter(grade => 
      grade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.learningAreas.some(la => la.learningArea.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeLevel, searchTerm]);

  const stats = useMemo(() => {
    if (!activeLevel) return { total: 0, covered: 0, percentage: 0 };
    const total = activeLevel.grades.reduce((acc, g) => acc + g.learningAreas.length, 0);
    const covered = activeLevel.grades.reduce((acc, g) => {
      return acc + g.learningAreas.filter(la => 
        coverageMap[g.name]?.[la.learningArea.name]?.status === 'completed'
      ).length;
    }, 0);
    return { total, covered, percentage: Math.round((covered / total) * 100) || 0 };
  }, [activeLevel, coverageMap]);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Search & Level Tabs */}
      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/30 backdrop-blur-md border border-border/40 rounded-[24px]">
          {cbcStructure.map((level) => (
            <button
              key={level.id}
              onClick={() => setActiveLevelId(level.id)}
              className={cn(
                "px-5 py-2.5 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all",
                activeLevelId === level.id 
                  ? "bg-background text-primary shadow-sm scale-105 border border-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              {level.name}
            </button>
          ))}
        </div>

        <div className="relative w-full xl:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter grades or areas..." 
            className="pl-11 pr-10 h-12 rounded-[20px] bg-background/50 border-border/40 shadow-sm focus:ring-primary/20"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* active Level Summary */}
      {activeLevel && (
        <div className="p-6 rounded-[32px] bg-gradient-to-br from-primary/10 via-background/40 to-muted/20 border border-primary/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{activeLevel.name} Status</h2>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {stats.covered} of {stats.total} Learning Areas Synchronized
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-primary leading-none">{stats.percentage}%</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Total Coverage</span>
             </div>
             <div className="w-32 h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out" 
                  style={{ width: `${stats.percentage}%` }} 
                />
             </div>
          </div>
        </div>
      )}

      {/* Grid of Grades */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredGrades.map((grade) => (
          <div key={grade.id} className="group bg-card/40 backdrop-blur-xl border border-border/40 rounded-[32px] overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col">
            <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
              <h3 className="font-black text-lg tracking-tight">{grade.name}</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/60 border border-border/40 text-[10px] font-black uppercase tracking-tighter">
                <Filter className="w-3 h-3 text-muted-foreground" />
                {grade.learningAreas.length} Areas
              </div>
            </div>

            <div className="p-6 flex-1 space-y-3">
              {grade.learningAreas.map((la) => {
                const doc = coverageMap[grade.name]?.[la.learningArea.name];
                return (
                  <div 
                    key={la.learningArea.id}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-[20px] border transition-all hover:scale-[1.02]",
                      doc?.status === 'completed' ? "bg-green-500/5 border-green-500/20" :
                      doc?.status === 'processing' ? "bg-blue-500/5 border-blue-500/20 animate-pulse" :
                      doc?.status === 'error' ? "bg-red-500/5 border-red-500/20" :
                      "bg-muted/10 border-border/20 grayscale opacity-70"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold tracking-tight truncate pr-2">{la.learningArea.name}</span>
                      {doc?.status === 'completed' && (
                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">{doc._count.chunks} Chunks Indexing</span>
                      )}
                    </div>
                    
                    <div className="shrink-0">
                      {doc?.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500 shadow-sm" />}
                      {doc?.status === 'processing' && <Clock className="w-5 h-5 text-blue-500 animate-spin-slow" />}
                      {doc?.status === 'error' && <ServerCrash className="w-5 h-5 text-red-500" />}
                      {!doc && <div className="w-5 h-5 rounded-full border-2 border-dashed border-border/60" />}
                    </div>
                  </div>
                );
              })}
              
              {grade.learningAreas.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                   <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Learning Areas</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-muted/5 mt-auto">
               <Button variant="ghost" className="w-full h-10 rounded-xl justify-between px-4 group/btn hover:bg-primary/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover/btn:text-primary transition-colors">Manage Grade Vectors</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/btn:text-primary group-hover/btn:translate-x-1 transition-all" />
               </Button>
            </div>
          </div>
        ))}

        {filteredGrades.length === 0 && (
          <div className="md:col-span-2 2xl:col-span-3 py-20 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-[40px] bg-muted/10">
            <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-2">No results for "{searchTerm}"</h3>
            <p className="text-sm font-semibold text-muted-foreground">Try adjusting your filter or switching levels.</p>
          </div>
        )}
      </div>

    </div>
  );
}

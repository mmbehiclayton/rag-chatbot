"use client";

import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  ServerCrash,
  ChevronDown,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Grade {
  id: string;
  name: string;
  order: number;
  learningAreas: {
    learningArea: { id: string; name: string };
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
  const [openGradeId, setOpenGradeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const activeLevel = useMemo(
    () => cbcStructure.find((l) => l.id === activeLevelId),
    [cbcStructure, activeLevelId]
  );

  // Per-grade coverage stats
  const gradeStats = useMemo(() => {
    if (!activeLevel) return [];
    return activeLevel.grades.map((grade) => {
      const covered = grade.learningAreas.filter(
        (la) => coverageMap[grade.name]?.[la.learningArea.name]?.status === "completed"
      ).length;
      return { ...grade, covered, total: grade.learningAreas.length };
    });
  }, [activeLevel, coverageMap]);

  // Level-wide totals
  const levelStats = useMemo(() => {
    const total = gradeStats.reduce((a, g) => a + g.total, 0);
    const covered = gradeStats.reduce((a, g) => a + g.covered, 0);
    return { total, covered, percentage: total ? Math.round((covered / total) * 100) : 0 };
  }, [gradeStats]);

  // Filter grades by search (grade name OR any learning area name)
  const filteredGradeStats = useMemo(() => {
    if (!searchTerm) return gradeStats;
    const q = searchTerm.toLowerCase();
    return gradeStats.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.learningAreas.some((la) => la.learningArea.name.toLowerCase().includes(q))
    );
  }, [gradeStats, searchTerm]);

  const handleLevelChange = (levelId: string) => {
    setActiveLevelId(levelId);
    setOpenGradeId(null);
    setSearchTerm("");
  };

  const toggleGrade = (gradeId: string) => {
    setOpenGradeId((prev) => (prev === gradeId ? null : gradeId));
  };

  // For the open accordion, find the grade and filter its areas if searched
  const openGrade = useMemo(() => {
    if (!openGradeId) return null;
    const grade = filteredGradeStats.find((g) => g.id === openGradeId);
    if (!grade) return null;
    const gradeNameMatches = grade.name.toLowerCase().includes(searchTerm.toLowerCase());
    const filteredAreas = searchTerm && !gradeNameMatches
      ? grade.learningAreas.filter((la) =>
          la.learningArea.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : grade.learningAreas;
    return { ...grade, filteredAreas };
  }, [openGradeId, filteredGradeStats, searchTerm]);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">

      {/* ── Level tabs + search bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-1 p-1 bg-muted/30 border border-border/30 rounded-2xl w-fit">
          {cbcStructure.map((level) => (
            <button
              key={level.id}
              onClick={() => handleLevelChange(level.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                activeLevelId === level.id
                  ? "bg-background text-primary shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {level.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter grades or subjects…"
            className="pl-9 pr-8 h-9 rounded-xl text-sm bg-background/60 border-border/40 focus-visible:ring-primary/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Level summary strip ── */}
      {activeLevel && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold text-foreground">{activeLevel.name}</span>
              <span className="text-xs text-muted-foreground">
                {levelStats.covered} of {levelStats.total} learning areas synchronized
              </span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${levelStats.percentage}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xl font-black text-primary tabular-nums">
            {levelStats.percentage}%
          </span>
        </div>
      )}

      {/* ── Grade pills — horizontal clickable chips ── */}
      {filteredGradeStats.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredGradeStats.map((grade) => {
            const isOpen = openGradeId === grade.id;
            const isComplete = grade.total > 0 && grade.covered === grade.total;
            const isPartial = grade.covered > 0 && grade.covered < grade.total;

            return (
              <button
                key={grade.id}
                onClick={() => toggleGrade(grade.id)}
                className={cn(
                  "group flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl border text-left transition-all duration-150 select-none",
                  isOpen
                    ? "bg-primary/10 border-primary/40 shadow-sm"
                    : isComplete
                    ? "bg-green-500/10 border-green-500/20 hover:border-green-500/40 hover:bg-green-500/15"
                    : isPartial
                    ? "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/35 hover:bg-blue-500/10"
                    : "bg-background border-border/40 hover:border-border/70 hover:bg-muted/30"
                )}
              >
                <span className={cn(
                  "text-[13px] font-semibold whitespace-nowrap leading-none",
                  isOpen ? "text-primary" : "text-foreground"
                )}>
                  {grade.name}
                </span>

                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none tabular-nums",
                  isComplete
                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                    : isPartial
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {grade.covered}/{grade.total}
                </span>

                <ChevronDown className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
                  isOpen ? "rotate-180 text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                )} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Search className="w-4 h-4 shrink-0" />
          No grades match &ldquo;{searchTerm}&rdquo;
        </div>
      )}

      {/* ── Accordion panel for the open grade ── */}
      {openGrade && (
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">

          {/* Accordion header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">{openGrade.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {openGrade.covered} of {openGrade.total} synchronized
              </span>
              {openGrade.covered > 0 && (
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full",
                  openGrade.covered === openGrade.total
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                )}>
                  {Math.round((openGrade.covered / openGrade.total) * 100)}%
                </span>
              )}
            </div>
            <Link
              href={`/dashboard/knowledge?grade=${encodeURIComponent(openGrade.name)}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              View documents
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Learning area rows */}
          <div className="divide-y divide-border/20">
            {openGrade.filteredAreas.map((la) => {
              const doc = coverageMap[openGrade.name]?.[la.learningArea.name];
              const isCompleted = doc?.status === "completed";
              const isProcessing = doc?.status === "processing" || doc?.status === "pending";
              const isError = doc?.status === "error";

              return (
                <div
                  key={la.learningArea.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 transition-colors",
                    isCompleted ? "hover:bg-green-500/5" :
                    isError ? "hover:bg-red-500/5" :
                    "hover:bg-muted/20"
                  )}
                >
                  {/* Status dot */}
                  <div className="shrink-0">
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {isProcessing && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                    {isError && <ServerCrash className="w-4 h-4 text-red-500" />}
                    {!doc && (
                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-border/50" />
                    )}
                  </div>

                  {/* Name */}
                  <span className={cn(
                    "flex-1 text-sm truncate",
                    isCompleted ? "font-semibold text-foreground" :
                    isError ? "font-semibold text-foreground" :
                    "font-normal text-muted-foreground"
                  )}>
                    {la.learningArea.name}
                  </span>

                  {/* Chunk count badge */}
                  {isCompleted && (
                    <span className="shrink-0 text-[10px] font-bold text-green-600 dark:text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {doc._count.chunks.toLocaleString()} chunks
                    </span>
                  )}
                  {isProcessing && (
                    <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full animate-pulse">
                      Indexing…
                    </span>
                  )}
                  {isError && (
                    <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, BookOpen, FileText, GraduationCap, StickyNote,
  ChevronRight, ChevronDown, ArrowRight, Download, Trash2, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { deleteAsset } from "@/lib/actions/generation";

interface Asset {
  id: string;
  title?: string;
  topic?: string;
  grade: string;
  subject: string;
  updatedAt: Date | string;
}

type AssetType = "SCHEMES" | "LESSONS" | "NOTES" | "ASSESSMENTS";

interface AssetLibraryProps {
  assets: Asset[];
  type: AssetType;
  title: string;
  description: string;
  onCreateNew?: () => void;
  /** Compact "recent" mode — a short capped list with a "View all" link. Used on the workstation hub. */
  compact?: boolean;
  viewAllHref?: string;
  limit?: number;
}

const TYPE_LABEL: Record<AssetType, string> = {
  SCHEMES: "scheme",
  LESSONS: "lesson plan",
  NOTES: "note",
  ASSESSMENTS: "assessment",
};

export function AssetLibrary({ assets, type, title, description, onCreateNew, compact = false, viewAllHref, limit = 4 }: AssetLibraryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const filteredAssets = assets.filter((asset) => {
    const searchStr = `${asset.title || ""} ${asset.topic || ""} ${asset.grade} ${asset.subject}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const getIcon = () => {
    switch (type) {
      case "SCHEMES": return <BookOpen className="w-5 h-5" />;
      case "LESSONS": return <FileText className="w-5 h-5" />;
      case "NOTES": return <StickyNote className="w-5 h-5" />;
      case "ASSESSMENTS": return <GraduationCap className="w-5 h-5" />;
    }
  };

  // Notes have no [id] detail route — link to the notes list instead
  const getPath = (id: string) =>
    type === "NOTES" ? "/dashboard/notes" : `/dashboard/${type.toLowerCase()}/${id}`;

  const exportType = type === "SCHEMES" ? "scheme" : type === "LESSONS" ? "lesson" : type === "NOTES" ? "notes" : "assessment";
  const singular = TYPE_LABEL[type];

  // Group by Grade → Learning Area (subject) → items, numeric-aware grade sort
  const groups = useMemo(() => {
    const byGrade = new Map<string, Map<string, Asset[]>>();
    for (const a of filteredAssets) {
      const g = a.grade || "Other";
      const s = a.subject || "Other";
      if (!byGrade.has(g)) byGrade.set(g, new Map());
      const bySub = byGrade.get(g)!;
      if (!bySub.has(s)) bySub.set(s, []);
      bySub.get(s)!.push(a);
    }
    return [...byGrade.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([grade, subs]) => ({
        grade,
        count: [...subs.values()].reduce((n, arr) => n + arr.length, 0),
        subjects: [...subs.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([subject, items]) => ({ subject, items })),
      }));
  }, [filteredAssets]);

  const toggleGrade = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const handleDelete = (id: string) => {
    startDelete(async () => {
      try {
        await deleteAsset(type, id);
        toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} deleted.`);
        setPendingDelete(null);
        router.refresh();
      } catch (e: any) {
        toast.error(e.message || "Delete failed");
      }
    });
  };

  // ── Compact "recent" mode (workstation hub) ──
  if (compact) {
    const items = filteredAssets.slice(0, limit);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-tight">{title}</p>
          {viewAllHref && assets.length > 0 && (
            <Link href={viewAllHref} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {items.length > 0 ? (
          <div className="rounded-xl border border-border/40 bg-background/30 divide-y divide-border/30 overflow-hidden">
            {items.map((asset) => (
              <Link
                key={asset.id}
                href={getPath(asset.id)}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-primary border border-border/40 shrink-0 [&_svg]:w-4 [&_svg]:h-4">
                  {getIcon()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {asset.title || asset.topic || `${asset.grade} ${asset.subject}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {asset.grade} · {asset.subject}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium shrink-0 hidden sm:block">
                  {new Date(asset.updatedAt).toLocaleDateString()}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2.5 py-8 rounded-xl border border-dashed border-border/50 bg-background/20 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground/40">
              {getIcon()}
            </div>
            <p className="text-sm font-medium text-muted-foreground">No {type.toLowerCase()} yet.</p>
            {onCreateNew && (
              <Button onClick={onCreateNew} size="sm" variant="outline" className="rounded-lg text-xs font-bold gap-1.5">
                Generate <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full management mode: grouped Grade → Learning Area → records ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm max-w-2xl font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{assets.length} Assets</span>
          </div>
          {onCreateNew ? (
            <Button onClick={onCreateNew} className="rounded-xl h-9 px-5 font-bold uppercase tracking-widest text-[11px] gap-2 shadow-sm">
              Create New <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Link href="/dashboard/workstation">
              <Button className="rounded-xl h-9 px-5 font-bold uppercase tracking-widest text-[11px] gap-2 shadow-sm">
                Create New <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={`Search your ${type.toLowerCase()} by grade, subject or title...`}
          className="pl-11 h-11 rounded-xl bg-card/50 backdrop-blur-xl border-border/40 text-sm shadow-sm focus:ring-primary/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grouped accordion */}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map(({ grade, count, subjects }) => {
            const open = !collapsed.has(grade);
            return (
              <div key={grade} className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
                {/* Grade header */}
                <button
                  onClick={() => toggleGrade(grade)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 [&_svg]:w-4 [&_svg]:h-4">
                      {getIcon()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold tracking-tight">{grade}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {count} {count === 1 ? singular : `${singular}s`} · {subjects.length} learning area{subjects.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>

                {/* Learning areas */}
                {open && (
                  <div className="border-t border-border/30 divide-y divide-border/20">
                    {subjects.map(({ subject, items }) => (
                      <div key={subject} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{subject}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded-md">{items.length}</span>
                          </div>
                          {type !== "NOTES" && items.length >= 2 && (
                            <button
                              onClick={() =>
                                window.open(
                                  `/api/export?type=${exportType}&grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`,
                                  "_blank"
                                )
                              }
                              title={`Download all ${grade} ${subject} ${singular}s as one PDF`}
                              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" /> Download all
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-colors group"
                            >
                              <Link href={getPath(item.id)} className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                  {item.title || item.topic || `${item.grade} ${item.subject}`}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                  {new Date(item.updatedAt).toLocaleDateString()}
                                </p>
                              </Link>

                              {pendingDelete === item.id ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Delete?</span>
                                  <Button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={isDeleting}
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1"
                                  >
                                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Yes
                                  </Button>
                                  <Button
                                    onClick={() => setPendingDelete(null)}
                                    disabled={isDeleting}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold border border-border/40"
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Link href={getPath(item.id)}>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] font-bold rounded-lg hover:bg-primary/5 hover:text-primary">
                                      View <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                  </Link>
                                  <button
                                    onClick={() => window.open(`/api/export?type=${exportType}&id=${item.id}`, "_blank")}
                                    title="Export PDF"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setPendingDelete(item.id)}
                                    title={`Delete ${singular}`}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center space-y-4 bg-card/20 rounded-2xl border border-dashed border-border/60">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/40">
            {getIcon()}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold">{searchQuery ? `No matching ${type.toLowerCase()}` : `No ${type.toLowerCase()} found`}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {searchQuery
                ? "Try a different grade, subject or title."
                : `You haven’t generated any ${type.toLowerCase()} yet.`}
            </p>
          </div>
          {!searchQuery &&
            (onCreateNew ? (
              <Button onClick={onCreateNew} variant="outline" className="rounded-xl px-7 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]">
                Generate
              </Button>
            ) : (
              <Link href="/dashboard/workstation">
                <Button variant="outline" className="rounded-xl px-7 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]">
                  Launch Workstation
                </Button>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import {
  Database,
  Search,
  CheckCircle2,
  Clock,
  ServerCrash,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { UploadCurriculumModal } from "@/components/dashboard/upload-curriculum";
import {
  KnowledgeRefreshButton,
  DeleteCurriculumButton,
  RetryButton,
  AutoRefresh,
} from "@/components/dashboard/knowledge-actions";
import { CoverageMatrix } from "@/components/dashboard/coverage-matrix";
import Link from "next/link";
import { cn } from "@/lib/utils";

// CBC structure is effectively static KICD data — cache for 1 hour
const getCbcStructure = unstable_cache(
  async () =>
    db.curriculumLevel.findMany({
      orderBy: { order: "asc" },
      include: {
        grades: {
          orderBy: { order: "asc" },
          include: { learningAreas: { include: { learningArea: true } } },
        },
      },
    }),
  ["cbc-structure"],
  { revalidate: 3600, tags: ["cbc-structure"] }
);

// Total chunk count is an expensive full-table-scan on the vector table.
// Cache for 60 seconds — a small lag on this aggregate stat is acceptable.
const getTotalNodes = unstable_cache(
  async () => db.curriculumChunk.count(),
  ["chunk-count"],
  { revalidate: 60 }
);

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function KnowledgePage(props: Props) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = 15;
  const searchQuery =
    typeof searchParams?.query === "string" ? searchParams.query : "";
  const statusFilter =
    typeof searchParams?.status === "string" ? searchParams.status : "";
  const gradeFilter =
    typeof searchParams?.grade === "string" ? searchParams.grade : "";

  // Build the paginated doc filter
  const whereClause: Record<string, unknown> = {};
  if (searchQuery) whereClause.title = { contains: searchQuery, mode: "insensitive" };
  if (statusFilter === "active") whereClause.status = "completed";
  else if (statusFilter === "indexing") whereClause.status = { in: ["processing", "pending"] };
  else if (statusFilter === "error") whereClause.status = "error";
  if (gradeFilter) whereClause.gradeLevel = gradeFilter;

  const [documents, totalCount, totalNodes, cbcStructure, allDocs] =
    await Promise.all([
      db.curriculumDocument.findMany({
        where: whereClause,
        orderBy: { uploadDate: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { chunks: true } } },
      }),
      db.curriculumDocument.count({ where: whereClause }),
      getTotalNodes(),
      getCbcStructure(),
      // Lightweight aggregate for stats + coverage map
      db.curriculumDocument.findMany({
        select: {
          id: true,
          gradeLevel: true,
          subject: true,
          status: true,
          uploadDate: true,
          _count: { select: { chunks: true } },
        },
      }),
    ]);

  // Derive stats from allDocs (no extra queries)
  const totalDocs = allDocs.length;
  const activeDocs = allDocs.filter((d) => d.status === "completed").length;
  const errorDocs = allDocs.filter((d) => d.status === "error").length;
  const processingDocs = allDocs.filter(
    (d) => d.status === "processing" || d.status === "pending"
  ).length;
  const hasProcessing = processingDocs > 0;

  // Build coverage map for the matrix
  const coverageMap: Record<string, Record<string, (typeof allDocs)[0]>> = {};
  for (const doc of allDocs) {
    if (!coverageMap[doc.gradeLevel]) coverageMap[doc.gradeLevel] = {};
    coverageMap[doc.gradeLevel][doc.subject] = doc;
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const isFiltered = searchQuery || statusFilter || gradeFilter;

  // Build a clean URL for filter links (strips page, preserves other params)
  function filterUrl(overrides: Record<string, string>) {
    const p: Record<string, string> = {};
    if (searchQuery) p.query = searchQuery;
    if (statusFilter) p.status = statusFilter;
    if (gradeFilter) p.grade = gradeFilter;
    Object.assign(p, overrides);
    // Remove empty values
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    const qs = new URLSearchParams(p).toString();
    return `/dashboard/knowledge${qs ? `?${qs}` : ""}`;
  }

  const STATUS_CHIPS = [
    { label: "All", value: "" },
    { label: "Active", value: "active" },
    { label: "Indexing", value: "indexing" },
    { label: "Failed", value: "error" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 mt-6 sm:mt-0">
      {/* Background auto-refresh when documents are indexing */}
      <AutoRefresh hasProcessing={hasProcessing} />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Global vector database &amp; KICD curriculum ingestion pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <KnowledgeRefreshButton />
          <UploadCurriculumModal cbcStructure={cbcStructure} />
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card/40 border border-border/40 flex items-center gap-3 hover:bg-card/60 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{totalDocs}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              Documents
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/40 border border-border/40 flex items-center gap-3 hover:bg-card/60 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{activeDocs}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              Active
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/40 border border-border/40 flex items-center gap-3 hover:bg-card/60 transition-colors">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/10 text-violet-500">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{totalNodes.toLocaleString()}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              Vector Nodes
            </p>
          </div>
        </div>

        <div
          className={cn(
            "p-4 rounded-2xl border flex items-center gap-3 transition-colors",
            errorDocs > 0
              ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
              : "bg-card/40 border-border/40 hover:bg-card/60"
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              errorDocs > 0 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
            )}
          >
            <ServerCrash className="w-4 h-4" />
          </div>
          <div>
            <p className={cn("text-lg font-bold tabular-nums", errorDocs > 0 && "text-red-500")}>
              {errorDocs}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              Errors
            </p>
          </div>
        </div>
      </div>

      {/* ── CBC Coverage Matrix ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">CBC Coverage Matrix</h2>
          <span className="text-xs text-muted-foreground">
            {activeDocs} of {totalDocs} synchronized
          </span>
        </div>
        <CoverageMatrix cbcStructure={cbcStructure} coverageMap={coverageMap as any} />
      </div>

      {/* ── Document List ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold tracking-tight">Curriculum Documents</h2>
            {gradeFilter && (
              <div className="flex items-center gap-1.5">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black border border-primary/20">
                  {gradeFilter}
                </span>
                <Link
                  href={filterUrl({ grade: "" })}
                  className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear grade filter"
                >
                  <X className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
          {totalCount > 0 && (
            <span className="text-sm font-semibold text-muted-foreground">
              {totalCount} {isFiltered ? "matching" : "total"} document{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="w-full bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm overflow-hidden p-4 sm:p-6">

          {/* Search + Status Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <form method="GET" action="/dashboard/knowledge" className="relative w-full max-w-sm">
                {gradeFilter && <input type="hidden" name="grade" value={gradeFilter} />}
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  name="query"
                  defaultValue={searchQuery}
                  placeholder="Search documents..."
                  className="pl-12 h-12 rounded-[20px] bg-background/50 border-border/50 shadow-sm"
                />
              </form>
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2">
              {STATUS_CHIPS.map((chip) => (
                <Link
                  key={chip.value}
                  href={filterUrl({ status: chip.value, page: "1" })}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border",
                    statusFilter === chip.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {chip.label}
                </Link>
              ))}
              {isFiltered && (
                <Link
                  href="/dashboard/knowledge"
                  className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </Link>
              )}
            </div>
          </div>

          {/* Processing banner */}
          {hasProcessing && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {processingDocs} document{processingDocs > 1 ? "s" : ""} currently indexing — this page auto-refreshes every 5 seconds.
              </p>
            </div>
          )}

          {/* Error count banner */}
          {errorDocs > 0 && !statusFilter && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {errorDocs} document{errorDocs > 1 ? "s" : ""} failed ingestion.{" "}
                <Link href={filterUrl({ status: "error" })} className="underline underline-offset-2">
                  View failed documents
                </Link>{" "}
                and use the retry button to re-ingest.
              </p>
            </div>
          )}

          {/* Document rows */}
          <div className="space-y-3">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border border-border/40 rounded-2xl bg-background/40 hover:bg-muted/30 transition-all group shadow-sm hover:shadow-md hover:border-border/80"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold tracking-tight text-foreground truncate">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mt-0.5 flex-wrap">
                        <span>{doc.gradeLevel}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{doc.subject}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{formatDistanceToNow(doc.uploadDate)} ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end shrink-0 pl-13 md:pl-0">
                    <div className="flex flex-col items-start md:items-end">
                      <span className="text-base font-black tabular-nums">
                        {doc._count.chunks.toLocaleString()}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Vector Chunks
                      </span>
                    </div>

                    <div className="w-[120px] flex justify-end">
                      {doc.status === "completed" && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-[11px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4" /> Active
                        </div>
                      )}
                      {(doc.status === "processing" || doc.status === "pending") && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[11px] font-bold uppercase tracking-wider">
                          <Clock className="w-4 h-4 animate-spin" /> Indexing
                        </div>
                      )}
                      {doc.status === "error" && (
                        <div className="flex flex-col items-center md:items-end gap-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-bold uppercase tracking-wider">
                            <ServerCrash className="w-4 h-4" /> Failed
                          </div>
                          {doc.errorMessage && (
                            <div
                              className="text-[10px] text-red-500 font-bold max-w-[150px] text-right leading-tight truncate px-1"
                              title={doc.errorMessage}
                            >
                              {doc.errorMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center border-l border-border/40 pl-4 py-1 gap-1">
                      {doc.status === "error" && <RetryButton documentId={doc.id} />}
                      <DeleteCurriculumButton documentId={doc.id} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border/40 rounded-2xl bg-background/20">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
                  <Database className="w-7 h-7 opacity-50" />
                </div>
                <h3 className="text-base font-bold tracking-tight mb-1.5">
                  {isFiltered ? "No matching documents" : "No Curriculum Data"}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm mb-5 text-sm font-medium">
                  {isFiltered
                    ? "Try adjusting your filters or clearing them to see all documents."
                    : "Upload KICD documents to vectorize and distribute to all tenant language models."}
                </p>
                {isFiltered && (
                  <Link
                    href="/dashboard/knowledge"
                    className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Clear Filters
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 sm:p-5 mt-5 border border-border/40 rounded-[24px] bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="text-[13px] font-bold text-muted-foreground tracking-wide">
                Showing{" "}
                <span className="text-foreground">
                  {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="text-foreground">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{" "}
                of <span className="text-foreground">{totalCount}</span> entries
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href={filterUrl({ page: String(currentPage - 1) })}
                  className={cn(
                    "h-10 px-4 rounded-[16px] flex items-center justify-center text-xs font-black transition-all",
                    currentPage <= 1
                      ? "pointer-events-none opacity-50 bg-muted text-muted-foreground"
                      : "bg-background border border-border/50 hover:bg-muted text-foreground shadow-sm hover:scale-105"
                  )}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Link>
                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <Link
                        key={pageNum}
                        href={filterUrl({ page: String(pageNum) })}
                        className={cn(
                          "w-10 h-10 rounded-[14px] flex items-center justify-center text-sm font-black transition-all",
                          currentPage === pageNum
                            ? "bg-primary text-primary-foreground shadow-md scale-110"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href={filterUrl({ page: String(currentPage + 1) })}
                  className={cn(
                    "h-10 px-4 rounded-[16px] flex items-center justify-center text-xs font-black transition-all",
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50 bg-muted text-muted-foreground"
                      : "bg-background border border-border/50 hover:bg-muted text-foreground shadow-sm hover:scale-105"
                  )}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

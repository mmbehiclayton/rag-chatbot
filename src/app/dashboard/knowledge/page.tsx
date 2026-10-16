import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UploadCurriculumModal } from "@/components/dashboard/upload-curriculum";
import { KnowledgeRefreshButton, DeleteCurriculumButton, RetryButton, AutoRefresh } from "@/components/dashboard/knowledge-actions";
import { CoverageMatrix } from "@/components/dashboard/coverage-matrix";
import { MapStatusBadge, mapHref } from "@/components/curriculum/map-status-badge";
import { cn } from "@/lib/utils";

// Indexing a design and drafting its map run after the upload responds, within this limit.
export const maxDuration = 300;

// The CBC structure rarely changes, so cache it for an hour.
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

const STATUS_CHIPS = [
  { label: "All", value: "" },
  { label: "Ready", value: "active" },
  { label: "Indexing", value: "indexing" },
  { label: "Failed", value: "error" },
];

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function KnowledgePage(props: Props) {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = 15;
  const searchQuery = typeof searchParams?.query === "string" ? searchParams.query : "";
  const statusFilter = typeof searchParams?.status === "string" ? searchParams.status : "";
  const gradeFilter = typeof searchParams?.grade === "string" ? searchParams.grade : "";

  const whereClause: Record<string, unknown> = {};
  if (searchQuery) whereClause.title = { contains: searchQuery, mode: "insensitive" };
  if (statusFilter === "active") whereClause.status = "completed";
  else if (statusFilter === "indexing") whereClause.status = { in: ["processing", "pending"] };
  else if (statusFilter === "error") whereClause.status = "error";
  if (gradeFilter) whereClause.gradeLevel = gradeFilter;

  const [documents, totalCount, cbcStructure, allDocs, maps] = await Promise.all([
    db.curriculumDocument.findMany({
      where: whereClause,
      orderBy: { uploadDate: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { chunks: true } } },
    }),
    db.curriculumDocument.count({ where: whereClause }),
    getCbcStructure(),
    db.curriculumDocument.findMany({
      select: { id: true, gradeLevel: true, subject: true, status: true, uploadDate: true, _count: { select: { chunks: true } } },
    }),
    db.curriculumMap.findMany({ select: { grade: true, subject: true, status: true } }),
  ]);

  // Designs indexed before page numbers were recorded need indexing again for page citations.
  const withoutPages = new Set(
    (
      await db.curriculumChunk.groupBy({
        by: ["curriculumId"],
        where: { curriculumId: { in: documents.map((d) => d.id) }, pageNumber: null },
      })
    ).map((r) => r.curriculumId)
  );

  const activeDocs = allDocs.filter((d) => d.status === "completed").length;
  const errorDocs = allDocs.filter((d) => d.status === "error").length;
  const processingDocs = allDocs.filter((d) => d.status === "processing" || d.status === "pending").length;
  const mapStatus = new Map(maps.map((m) => [`${m.grade}|${m.subject}`, m.status]));

  const coverageMap: Record<string, Record<string, (typeof allDocs)[0]>> = {};
  for (const doc of allDocs) {
    coverageMap[doc.gradeLevel] ??= {};
    coverageMap[doc.gradeLevel][doc.subject] = doc;
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const isFiltered = Boolean(searchQuery || statusFilter || gradeFilter);

  function filterUrl(overrides: Record<string, string>) {
    const p: Record<string, string> = {};
    if (searchQuery) p.query = searchQuery;
    if (statusFilter) p.status = statusFilter;
    if (gradeFilter) p.grade = gradeFilter;
    Object.assign(p, overrides);
    for (const k of Object.keys(p)) if (!p[k]) delete p[k];
    const qs = new URLSearchParams(p).toString();
    return `/dashboard/knowledge${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <AutoRefresh hasProcessing={processingDocs > 0} />

      <PageHeader
        title="Knowledge base"
        description="Upload KICD curriculum designs. Elimu reads each one, uses it to answer teachers, and drafts its curriculum map for curators to check."
        action={
          <div className="flex items-center gap-2">
            <KnowledgeRefreshButton />
            <UploadCurriculumModal cbcStructure={cbcStructure} />
          </div>
        }
      />

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { step: "1. Upload", text: "Add the curriculum design PDF for a grade and learning area." },
          { step: "2. Elimu reads it", text: "It is indexed for Ask Elimu, and a draft map is made if the class has none." },
          { step: "3. Curators check", text: "A curator checks the draft map, and a second curator approves it." },
        ].map((s) => (
          <li key={s.step} className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">{s.step}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Coverage</h2>
          <span className="text-sm text-muted-foreground">
            {activeDocs} of {allDocs.length} designs ready
          </span>
        </div>
        <CoverageMatrix cbcStructure={cbcStructure} coverageMap={coverageMap as any} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Curriculum designs</h2>
            {gradeFilter && (
              <Badge variant="outline" className="gap-1">
                {gradeFilter}
                <Link href={filterUrl({ grade: "" })} aria-label="Clear grade filter" className="-mr-1 rounded-md p-0.5 hover:bg-muted">
                  <X className="size-3" />
                </Link>
              </Badge>
            )}
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {totalCount} {isFiltered ? "matching" : "in total"}
            </span>
          )}
        </div>

        <form method="GET" action="/dashboard/knowledge" className="relative max-w-sm">
          {gradeFilter && <input type="hidden" name="grade" value={gradeFilter} />}
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="query" defaultValue={searchQuery} placeholder="Search designs" aria-label="Search designs" className="h-11 pl-9" />
        </form>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => (
            <Link
              key={chip.value}
              href={filterUrl({ status: chip.value, page: "1" })}
              aria-current={statusFilter === chip.value ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium",
                statusFilter === chip.value ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
            </Link>
          ))}
          {isFiltered && (
            <Link href="/dashboard/knowledge" className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground">
              <X className="size-4" /> Clear
            </Link>
          )}
        </nav>

        {processingDocs > 0 && (
          <p role="status" className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
            <Spinner className="text-info" />
            {processingDocs} design{processingDocs > 1 ? "s are" : " is"} being read. This page updates every few seconds.
          </p>
        )}
        {errorDocs > 0 && statusFilter !== "error" && (
          <p className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
            <span>
              {errorDocs} design{errorDocs > 1 ? "s" : ""} couldn't be read.{" "}
              <Link href={filterUrl({ status: "error" })} className="font-medium text-primary underline-offset-4 hover:underline">
                Show them
              </Link>{" "}
              and try again.
            </span>
          </p>
        )}

        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={isFiltered ? "No matching designs" : "No curriculum designs yet"}
            description={isFiltered ? "Try other filters or clear them." : "Upload a KICD curriculum design to get started."}
          />
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => {
              const map = mapStatus.get(`${doc.gradeLevel}|${doc.subject}`);
              const busy = doc.status === "processing" || doc.status === "pending";
              return (
                <li key={doc.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.gradeLevel} · {doc.subject} · uploaded {formatDistanceToNow(doc.uploadDate, { addSuffix: true })}
                          {doc.status === "completed" && ` · ${doc._count.chunks.toLocaleString()} sections`}
                        </p>
                        {doc.status === "error" && doc.errorMessage && (
                          <p className="line-clamp-2 text-xs text-destructive" title={doc.errorMessage}>
                            {doc.errorMessage}
                          </p>
                        )}
                        {doc.status === "completed" && doc.errorMessage && (
                          <p className="line-clamp-2 text-xs text-destructive" title={doc.errorMessage}>
                            Reading it again failed, so the earlier version is still in use. {doc.errorMessage}
                          </p>
                        )}
                        {doc.status === "completed" && withoutPages.has(doc.id) && (
                          <p className="text-xs text-muted-foreground">No page numbers yet. Index it again so Ask Elimu can cite pages.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {doc.status === "completed" && <Badge variant="success">Ready</Badge>}
                        {busy && (
                          <Badge variant="info" className="gap-1">
                            <Spinner className="size-3" /> Indexing
                          </Badge>
                        )}
                        {doc.status === "error" && <Badge variant="destructive">Failed</Badge>}
                        {doc.status === "completed" && (
                          <Link
                            href={mapHref(doc.gradeLevel, doc.subject)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-primary hover:bg-muted"
                          >
                            Map {map ? <MapStatusBadge status={map} /> : <span className="text-muted-foreground">not started</span>}
                          </Link>
                        )}
                        {doc.status === "error" && <RetryButton documentId={doc.id} />}
                        {doc.status === "completed" && withoutPages.has(doc.id) && <RetryButton documentId={doc.id} label="Index again" />}
                        {!busy && <DeleteCurriculumButton documentId={doc.id} title={doc.title} />}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-2">
              <Link
                href={filterUrl({ page: String(currentPage - 1) })}
                aria-disabled={currentPage <= 1}
                className={cn("inline-flex min-h-11 items-center gap-1 rounded-md border bg-card px-3", currentPage <= 1 && "pointer-events-none opacity-50")}
              >
                <ChevronLeft className="size-4" /> Previous
              </Link>
              <Link
                href={filterUrl({ page: String(currentPage + 1) })}
                aria-disabled={currentPage >= totalPages}
                className={cn("inline-flex min-h-11 items-center gap-1 rounded-md border bg-card px-3", currentPage >= totalPages && "pointer-events-none opacity-50")}
              >
                Next <ChevronRight className="size-4" />
              </Link>
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

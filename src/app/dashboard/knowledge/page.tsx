import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Database, UploadCloud, Search, CheckCircle2, AlertCircle, Clock, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { UploadCurriculumModal } from "@/components/dashboard/upload-curriculum";

export default async function KnowledgePage() {
  const session = await auth();
  if (session?.role !== "SUPERADMIN") redirect("/dashboard");

  const documents = await db.curriculumDocument.findMany({
    orderBy: { uploadDate: "desc" },
    include: {
      _count: {
        select: { chunks: true }
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 mt-6 sm:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1 text-base">Manage the global vector database and curriculum ingestion pipeline.</p>
        </div>
        <UploadCurriculumModal />
      </div>

      <div className="w-full bg-card/60 backdrop-blur-2xl rounded-[32px] border border-border/40 shadow-sm overflow-hidden p-6 sm:p-8">
        
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-12 h-12 rounded-[20px] bg-background/50 border-border/50 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 rounded-full border border-border/50 bg-background/50 text-sm font-bold text-muted-foreground">
               Total Nodes: <span className="text-foreground">{documents.reduce((acc, curr) => acc + curr._count.chunks, 0)}</span>
             </div>
          </div>
        </div>

        <div className="space-y-3">
          {documents.length > 0 ? documents.map((doc) => (
            <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 border border-border/40 rounded-[28px] bg-background/40 hover:bg-muted/30 transition-all group shadow-sm hover:shadow-md hover:border-border/80">
              
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">{doc.title}</h3>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground font-semibold mt-1 flex-wrap">
                    <span>Grade {doc.gradeLevel}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{doc.subject}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>Uploaded {formatDistanceToNow(doc.uploadDate)} ago</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 justify-between md:justify-end shrink-0 pl-19 md:pl-0">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xl sm:text-2xl font-black">{doc._count.chunks}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Vector Chunks</span>
                </div>
                
                <div className="w-[120px] flex justify-end">
                  {doc.status === 'completed' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-[11px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </div>
                  )}
                  {doc.status === 'processing' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[11px] font-bold uppercase tracking-wider">
                      <Clock className="w-4 h-4 animate-spin-slow" /> Indexing
                    </div>
                  )}
                  {doc.status === 'pending' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 text-[11px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4" /> Queued
                    </div>
                  )}
                  {doc.status === 'error' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-bold uppercase tracking-wider">
                      <ServerCrash className="w-4 h-4" /> Failed
                    </div>
                  )}
                </div>
              </div>

            </div>
          )) : (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border/40 rounded-[32px] bg-background/20">
              <div className="w-20 h-20 bg-muted rounded-[28px] flex items-center justify-center text-muted-foreground mb-6">
                <Database className="w-10 h-10 opacity-50" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">No Curriculum Data</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6 font-medium">Upload KICD documents to vectorize and distribute to all tenant language models.</p>
              <Button className="h-12 rounded-[20px] px-8 font-bold">Upload First Document</Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

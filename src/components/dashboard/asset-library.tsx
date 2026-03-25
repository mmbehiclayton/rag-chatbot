"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, BookOpen, FileText, GraduationCap, 
  ChevronRight, Calendar, User, ArrowRight,
  MoreVertical, Download, Trash2, ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Asset {
  id: string;
  title?: string;
  topic?: string;
  grade: string;
  subject: string;
  updatedAt: Date | string;
}

interface AssetLibraryProps {
  assets: Asset[];
  type: "SCHEMES" | "LESSONS" | "ASSESSMENTS";
  title: string;
  description: string;
}

export function AssetLibrary({ assets, type, title, description }: AssetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = assets.filter(asset => {
    const searchStr = `${asset.title || ""} ${asset.topic || ""} ${asset.grade} ${asset.subject}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const getIcon = () => {
    switch (type) {
      case "SCHEMES": return <BookOpen className="w-5 h-5" />;
      case "LESSONS": return <FileText className="w-5 h-5" />;
      case "ASSESSMENTS": return <GraduationCap className="w-5 h-5" />;
    }
  };

  const getPath = (id: string) => `/dashboard/${type.toLowerCase()}/${id}`;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl font-medium">
            {description}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{assets.length} Assets</span>
             </div>
             <Link href="/dashboard/workstation">
               <Button className="rounded-2xl h-10 px-6 font-bold uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-primary/20">
                 Create New <ArrowRight className="w-4 h-4" />
               </Button>
             </Link>
        </div>
      </div>

      {/* Control Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder={`Search your ${type.toLowerCase()} by grade, subject or title...`}
          className="pl-11 h-14 rounded-2xl bg-card/50 backdrop-blur-xl border-border/40 text-base shadow-sm focus:ring-primary/20"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssets.map((asset) => (
            <div 
              key={asset.id}
              className="group relative bg-card/40 backdrop-blur-sm border border-border/40 rounded-[32px] p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between min-h-[180px]"
            >
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/40">
                    {type === "SCHEMES" ? <BookOpen className="w-5 h-5" /> : type === "LESSONS" ? <FileText className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                      Synced
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 rounded-full border border-border/40 bg-background/50 flex items-center justify-center hover:bg-muted transition-colors outline-none focus:ring-2 focus:ring-primary/20">
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 border-border/40">
                        <DropdownMenuItem className="flex items-center gap-2 font-semibold text-xs cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors">
                          <Link href={getPath(asset.id)} className="flex items-center gap-2 w-full">
                            <ExternalLink className="w-4 h-4" /> Open Full View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2 font-semibold text-xs text-destructive focus:text-destructive cursor-pointer focus:bg-destructive/5 transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete Asset
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <Link href={getPath(asset.id)} className="block space-y-2">
                  <h4 className="font-bold text-lg tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {asset.title || asset.topic || `${asset.grade} ${asset.subject}`}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                     <span>{asset.grade}</span>
                     <span className="w-1.5 h-1.5 rounded-full bg-border" />
                     <span>{asset.subject}</span>
                  </div>
                </Link>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                </div>
                <Link href={getPath(asset.id)}>
                   <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-bold hover:bg-primary/5 hover:text-primary rounded-xl">
                      View <ChevronRight className="w-4 h-4" />
                   </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 bg-card/20 rounded-[45px] border border-dashed border-border/60">
           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/40">
              {getIcon()}
           </div>
           <div className="space-y-1">
             <h3 className="text-xl font-bold">No {type.toLowerCase()} found</h3>
             <p className="text-sm text-muted-foreground max-w-xs mx-auto">
               You haven't generated any {type.toLowerCase()} for this selection yet. Head over to the workstation to get started.
             </p>
           </div>
           <Link href="/dashboard/workstation">
             <Button variant="outline" className="rounded-2xl px-8 border-primary/20 text-primary hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]">
               Launch Workstation
             </Button>
           </Link>
        </div>
      )}
    </div>
  );
}

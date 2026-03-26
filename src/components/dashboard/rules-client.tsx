"use client";

import { useState, useTransition } from "react";
import { 
  Settings2, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Edit3,
  Terminal,
  RotateCcw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateGenerationRule } from "@/lib/actions/rules";
import { cn } from "@/lib/utils";

interface RulesClientProps {
  initialRules: any[];
}

const CONTENT_TYPES = [
  { id: "SCHEME_OF_WORK", label: "Scheme of Work", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "LESSON_PLAN", label: "Lesson Plan", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "LESSON_NOTES", label: "Lesson Notes", icon: Edit3, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "ASSESSMENT", label: "Assessment", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
];

export function RulesClient({ initialRules }: RulesClientProps) {
  const [activeType, setActiveType] = useState("SCHEME_OF_WORK");
  const [isPending, startTransition] = useTransition();
  
  const [rules, setRules] = useState<{ [key: string]: string }>(
    initialRules.reduce((acc, rule) => ({ ...acc, [rule.contentType]: rule.customPrompt }), {})
  );

  const handleUpdate = async () => {
    startTransition(async () => {
      try {
        await updateGenerationRule(activeType, rules[activeType] || "");
        toast.success("Generation rule updated successfully");
      } catch (error: any) {
        toast.error(error.message || "Update failed");
      }
    });
  };

  const currentRule = rules[activeType] || "";

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 mt-6 sm:mt-0">
      
      {/* 1. Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
           <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">Superadmin Console</div>
           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global IQ Configuration</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground leading-tight">
          AI Generation Rules
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl font-medium tracking-tight leading-relaxed">
          Inject global pedagogical instructions and compliance rules into the AI prompts. These systemic guidelines take priority over user-defined parameters to ensure KICD conformity.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-10">
        
        {/* 2. Selector Sidebar */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-4">
           {CONTENT_TYPES.map((type) => (
             <button
               key={type.id}
               onClick={() => setActiveType(type.id)}
               className={cn(
                 "w-full flex items-center gap-4 p-5 rounded-[24px] border transition-all text-left group",
                 activeType === type.id 
                   ? "bg-card border-primary/40 shadow-xl shadow-primary/5" 
                   : "bg-card/40 border-border/40 hover:border-border/80"
               )}
             >
               <div className={cn("w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-110", activeType === type.id ? type.bg : "bg-muted/50")}>
                  <type.icon className={cn("w-6 h-6", activeType === type.id ? type.color : "text-muted-foreground")} />
               </div>
               <div>
                  <h3 className="font-bold text-[15px] leading-none mb-1">{type.label}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{activeType === type.id ? "Editing Now" : "Manage Rules"}</p>
               </div>
             </button>
           ))}

           <div className="p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 mt-8">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                 <AlertCircle className="w-4 h-4" />
                 <span className="text-xs font-black uppercase tracking-widest">Global Context</span>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic">
                Changes here affect the <strong className="text-foreground">System Prompt</strong> for all teachers globally. Use variable tags carefully.
              </p>
           </div>
        </div>

        {/* 3. Editor Canvas */}
        <div className="flex-1 space-y-6">
           <div className="bg-card border border-border/40 rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                     <Terminal className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="text-xl font-extrabold tracking-tight">System Prompt Injection</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Appended to base AI instructions</p>
                   </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <Button variant="ghost" className="h-11 rounded-[16px] text-xs font-bold gap-2 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                       <RotateCcw className="w-4 h-4" /> Revert
                    </Button>
                    <Button 
                      onClick={handleUpdate}
                      disabled={isPending}
                      className="h-11 px-6 rounded-[16px] bg-primary hover:bg-primary/90 text-white font-extrabold text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
                    >
                       {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                       Save Rule
                    </Button>
                 </div>
              </div>

              <div className="flex-1 p-8 bg-slate-950 font-mono text-sm leading-relaxed text-slate-200 relative group">
                 <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-white/20 pointer-events-none">RAW Prompt Fragment</div>
                 <textarea 
                   className="w-full h-full bg-transparent border-none outline-none resize-none placeholder:text-white/5"
                   placeholder="Enter global generation rules here... (e.g. Ensure all learning outcomes are verbatim from KICD)"
                   value={currentRule}
                   onChange={e => setRules({...rules, [activeType]: e.target.value})}
                   spellCheck={false}
                 />
              </div>

              <div className="p-8 border-t border-border/40 bg-muted/20 space-y-4">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-primary" /> Supported Prompt Tokens
                 </h4>
                 <div className="flex flex-wrap gap-2">
                   {["{grade}", "{subject}", "{term}", "{curriculum_context}", "{week_number}", "{learning_outcome}"].map(token => (
                     <span key={token} className="px-3 py-1.5 rounded-xl bg-background border border-border/60 text-[10px] font-black text-primary font-mono">{token}</span>
                   ))}
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

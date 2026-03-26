"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Sparkles, Bot, User, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function TeacherCopilot({ lessonPlan }: { lessonPlan: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const { messages, sendMessage, status, setMessages } = useChat({
    // @ts-ignore
    api: "/api/chat/copilot",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: `Hello! I'm your Pedagogical Co-pilot. I've analyzed your lesson on **"${lessonPlan?.topic}"**. How can I help you refine it today? I can suggest activity variations, help with timing, or brainstorm more inclusive assessments.` }]
      } as any
    ],
    body: {
      lessonContext: lessonPlan
    }
  });

  const onLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] no-print">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 20 }}
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-slate-950 text-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center group hover:bg-emerald-600 transition-all duration-500"
          >
            <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-bounce" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? "80px" : "600px" 
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "w-[400px] max-w-[calc(100vw-48px)] bg-slate-950 border border-white/10 rounded-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden transition-all duration-300",
              isMinimized && "rounded-[40px]"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                    <Bot className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-black text-white">Pedagogical Co-pilot</h4>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Active Lesson Context</p>
                 </div>
              </div>
              <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="text-white/40 hover:text-white" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                 </Button>
                 <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-red-500/20" onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                 </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                >
                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        m.role === "user" ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        m.role === "user" ? "bg-emerald-600 text-white" : "bg-white/10 text-white/60"
                      )}>
                        {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-xs font-medium leading-relaxed",
                        m.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white/5 text-white/80 border border-white/10 rounded-tl-none"
                      )}>
                        {m.parts?.map((part: any, i: number) => (
                           <div key={i}>
                              {part.type === "text" && part.text}
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(status === "submitted" || status === "streaming") && (
                    <div className="flex gap-3 max-w-[85%]">
                       <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-white/60">
                          <Bot className="w-4 h-4 animate-pulse" />
                       </div>
                       <div className="p-3 rounded-2xl text-xs font-medium leading-relaxed bg-white/5 text-white/80 border border-white/10 rounded-tl-none italic opacity-50">
                          Thinking...
                       </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <form 
                  onSubmit={onLocalSubmit}
                  className="p-4 border-t border-white/10 bg-white/5 flex gap-2"
                >
                  <Input 
                    placeholder="Ask co-pilot..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-2xl placeholder:text-white/20 font-medium"
                  />
                  <Button type="submit" disabled={!input || status === "submitted" || status === "streaming"} className="h-12 w-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

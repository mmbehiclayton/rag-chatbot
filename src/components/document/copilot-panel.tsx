"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Make the main activity work for a class of 60",
  "Suggest a version with no printed materials",
  "How do I support learners who are struggling?",
  "Give me three more exit ticket questions",
];

export function CopilotPanel({ lessonId }: { lessonId: string }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/copilot", body: { lessonId } }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ask for changes or ideas for this lesson. For example:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
          </div>
        ))}
        {status === "submitted" && <p className="text-sm text-muted-foreground">Thinking…</p>}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            Something went wrong.
            <Button variant="outline" size="sm" onClick={() => regenerate()}>
              <RotateCw /> Try again
            </Button>
          </div>
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about this lesson…"
          aria-label="Message"
          rows={1}
          className="max-h-32 min-h-11 resize-none"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" disabled={!input.trim() || busy} aria-label="Send">
          <Send />
        </Button>
      </form>
    </>
  );
}

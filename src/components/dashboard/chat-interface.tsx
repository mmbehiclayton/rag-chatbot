"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ChevronDown,
  History,
  MessageSquare,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { createChatSession, deleteChatSession } from "@/lib/actions/chat";
import { cn } from "@/lib/utils";

type SessionRow = { id: string; title: string; updatedAt: Date };

const SUGGESTIONS = [
  "What are the specific learning outcomes for Grade 5 Science, Living Things?",
  "Give me a group activity for teaching fractions with local materials",
  "How do I assess the core competency of critical thinking?",
  "Explain the CBC rubric levels in simple terms for parents",
];

function SessionList({
  sessions,
  activeId,
  onNavigate,
}: {
  sessions: SessionRow[];
  activeId: string | null;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  const remove = async (id: string) => {
    try {
      await deleteChatSession(id);
      if (id === activeId) router.push("/dashboard/chat");
      router.refresh();
    } catch {
      toast.error("Could not delete the conversation");
    }
  };

  if (sessions.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No conversations yet
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {sessions.map((s) => (
        <li key={s.id} className="group flex items-center gap-1">
          <Link
            href={`/dashboard/chat?c=${s.id}`}
            onClick={onNavigate}
            aria-current={s.id === activeId ? "page" : undefined}
            className={cn(
              "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-3 text-sm hover:bg-muted",
              s.id === activeId
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <MessageSquare className="size-4 shrink-0" />
            <span className="truncate">{s.title}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            aria-label={`Delete ${s.title}`}
            onClick={() => remove(s.id)}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ChatInterface({
  sessions,
  activeId,
  initialMessages,
}: {
  sessions: SessionRow[];
  activeId: string | null;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState(activeId);
  const [list, setList] = useState(sessions);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    let sid = sessionId;
    if (!sid) {
      try {
        const created = await createChatSession();
        sid = created.id;
        setSessionId(sid);
        setList((l) => [{ ...created, title: t.slice(0, 60) }, ...l]);
        // Update the address without a navigation so the stream isn't interrupted.
        window.history.replaceState(null, "", `/dashboard/chat?c=${sid}`);
      } catch {
        toast.error("Could not start a conversation. Check your connection.");
        return;
      }
    }
    sendMessage({ text: t }, { body: { sessionId: sid } });
  };

  const onSubmit = (msg: PromptInputMessage) => send(msg.text);
  const newChat = () => {
    setHistoryOpen(false);
    router.push("/dashboard/chat");
  };

  return (
    <div className="-mx-4 -mt-4 -mb-24 flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] sm:-mx-6 md:m-0 md:h-[calc(100dvh-7rem)] md:gap-4">
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border bg-card md:flex">
        <div className="border-b p-3">
          <Button className="w-full" onClick={newChat}>
            <Plus /> New conversation
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <SessionList sessions={list} activeId={sessionId} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-card md:rounded-xl md:border">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History /> History
          </Button>
          <Button variant="ghost" size="sm" onClick={newChat}>
            <Plus /> New
          </Button>
        </div>

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="p-4 sm:p-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-lg space-y-4 py-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Ask Elimu</h2>
                  <p className="text-sm text-muted-foreground">
                    Ask about the CBC curriculum, lesson ideas or assessment.
                    Answers use KICD curriculum designs where available.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      className="h-auto min-h-11 justify-start whitespace-normal py-2 text-left font-normal"
                      onClick={() => send(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const sources = m.parts.filter(
                (p) => p.type === "source-document",
              );
              // A reply that failed before any text arrived would show as an empty bubble.
              if (
                m.role === "assistant" &&
                !m.parts.some((p) => p.type === "text" && p.text)
              )
                return null;
              return (
                <Message key={m.id} from={m.role}>
                  <MessageContent>
                    {m.parts.map((p) =>
                      p.type === "text" ? (
                        <MessageResponse key={`${m.id}-${p.text}`}>
                          {p.text}
                        </MessageResponse>
                      ) : null,
                    )}
                    {sources.length > 0 && (
                      <Sources className="mt-3 mb-0">
                        <SourcesTrigger
                          count={sources.length}
                          className="min-h-11"
                        >
                          <span className="font-medium">
                            From {sources.length} curriculum document
                            {sources.length === 1 ? "" : "s"}
                          </span>
                          <ChevronDown className="size-4" aria-hidden />
                        </SourcesTrigger>
                        <SourcesContent>
                          {sources.map((s) => (
                            <Source key={s.sourceId} title={s.title} />
                          ))}
                        </SourcesContent>
                      </Sources>
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {status === "submitted" && (
              <output
                aria-live="polite"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Spinner /> Thinking…
              </output>
            )}
            {error && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
                {/^(Failed to fetch|NetworkError|Load failed)/i.test(
                  error.message,
                ) || !error.message
                  ? "Elimu could not answer. Check your connection."
                  : error.message}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerate({ body: { sessionId } })}
                >
                  <RotateCw /> Try again
                </Button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t p-3">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask Elimu…"
                className="text-base"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                status={busy ? status : undefined}
                disabled={busy}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-2">
            <SessionList
              sessions={list}
              activeId={sessionId}
              onNavigate={() => setHistoryOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

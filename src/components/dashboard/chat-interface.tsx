"use client";

import { useState, Fragment, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Spinner as Loader } from "@/components/ui/spinner";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, MessageSquareIcon, Trash2Icon, BookOpenIcon } from "lucide-react";
import { createChatSession, appendChatMessage, deleteChatSession } from "@/lib/actions/chat";
import type { ChatSession, ChatMessage } from "@prisma/client";

type SessionWithMessages = ChatSession & { messages: ChatMessage[] };
type UIMessageInit = { id: string; role: "user" | "assistant"; content: string; parts: { type: "text"; text: string }[] };

interface Props {
  initialSessions: SessionWithMessages[];
}

// Inner chat area — receives a `key` so it fully remounts when the session changes
function ChatArea({
  sessionId,
  initialMessages,
  onNewSession,
}: {
  sessionId: string | null;
  initialMessages: UIMessageInit[];
  onNewSession: (id: string) => void;
}) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId);

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages as any,
    onFinish: async ({ message }: { message: any }) => {
      const sid = activeSessionId;
      if (!sid) return;
      const textPart = message.parts?.find((p: any) => p.type === "text");
      const content = textPart?.text ?? message.content ?? "";
      if (content) await appendChatMessage(sid, "assistant", content);
    },
  });

  const handleSubmit = useCallback(
    async (promptMsg: PromptInputMessage) => {
      if (!promptMsg.text.trim()) return;

      let sid = activeSessionId;
      if (!sid) {
        const newSession = await createChatSession();
        setActiveSessionId(newSession.id);
        onNewSession(newSession.id);
        sid = newSession.id;
      }

      await appendChatMessage(sid, "user", promptMsg.text);
      // @ts-ignore
      await sendMessage({ text: promptMsg.text });
    },
    [activeSessionId, sendMessage, onNewSession]
  );

  return (
    <>
      <Conversation className="flex-1 min-h-0 bg-background/40 rounded-2xl border border-border/40 shadow-inner overflow-hidden relative">
        <ConversationContent className="h-full p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
              <BookOpenIcon className="size-12 opacity-30" />
              <p className="text-lg font-medium">Ask Elimu AI anything</p>
              <p className="text-sm max-w-sm opacity-70">
                Ask about CBC curriculum, lesson ideas, assessment strategies, or KICD guidelines.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id}>
              {message.parts.map((part: any, i: number) => {
                if (part.type !== "text") return null;
                return (
                  <Fragment key={`${message.id}-${i}`}>
                    <Message from={message.role}>
                      <MessageContent>
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  </Fragment>
                );
              })}
            </div>
          ))}
          {(status === "submitted" || status === "streaming") && (
            <div className="flex justify-center my-4">
              <Loader />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        onSubmit={handleSubmit}
        className="shrink-0 mt-2 bg-background/90 backdrop-blur-xl border border-border/40 rounded-[32px] shadow-2xl shadow-primary/5 transition-all focus-within:shadow-primary/10 focus-within:border-primary/40 p-1"
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="Message Elimu AI..."
            className="resize-none bg-transparent placeholder:text-muted-foreground/70"
          />
        </PromptInputBody>
        <PromptInputFooter className="px-4 py-3 border-t border-border/40">
          <PromptInputTools />
          <PromptInputSubmit className="transition-transform active:scale-95 shadow-sm" />
        </PromptInputFooter>
      </PromptInput>
    </>
  );
}

export function ChatInterface({ initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithMessages[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessions[0]?.id ?? null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const initialMessages: UIMessageInit[] =
    activeSession?.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      parts: [{ type: "text" as const, text: m.content }],
    })) ?? [];

  const handleNewChat = async () => {
    const newSession = await createChatSession();
    setSessions((prev) => [{ ...newSession, messages: [] }, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (session: SessionWithMessages) => {
    setActiveSessionId(session.id);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteChatSession(sessionId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0]?.id ?? null);
    }
    router.refresh();
  };

  const handleNewSessionCreated = (id: string) => {
    // When a session is auto-created on first message, update the list
    setSessions((prev) => prev.map((s) => (s.id === id ? s : s)));
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-3 p-2 sm:p-4">
      {/* Session Sidebar */}
      <div className="hidden md:flex flex-col w-64 shrink-0 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border/40">
          <Button onClick={handleNewChat} className="w-full gap-2" variant="default" size="sm">
            <PlusIcon className="size-4" />
            New Conversation
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <MessageSquareIcon className="size-8 opacity-40" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSession(s)}
                  className={`group w-full flex items-start gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors hover:bg-accent/60 ${
                    activeSessionId === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <MessageSquareIcon className="size-4 mt-0.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <Trash2Icon
                    className="size-3.5 shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity mt-0.5"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpenIcon className="size-3.5" />
          <span>Powered by KICD curriculum</span>
        </div>
      </div>

      {/* Chat Area — key forces remount when session changes */}
      <div className="flex flex-col flex-1 min-w-0 bg-card/60 backdrop-blur-3xl border border-border/50 rounded-[2rem] shadow-2xl p-4 sm:p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        {/* Mobile new chat button */}
        <div className="md:hidden flex justify-end mb-3">
          <Button onClick={handleNewChat} size="sm" variant="outline" className="gap-2">
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>

        <ChatArea
          key={activeSessionId ?? "new"}
          sessionId={activeSessionId}
          initialMessages={initialMessages}
          onNewSession={handleNewSessionCreated}
        />
      </div>
    </div>
  );
}

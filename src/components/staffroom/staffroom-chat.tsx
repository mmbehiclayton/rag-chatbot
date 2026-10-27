"use client";

import { Flag, Send, Trash2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  muteTeacher,
  removeMessage,
  reportMessage,
  roomMessages,
  sendMessage,
} from "@/lib/actions/staffroom";
import {
  MESSAGE_MAX,
  POLL_MS,
  roomLabel,
  type StaffroomMessageView,
} from "@/lib/staffroom";

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString("en-KE", {
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

/** One Staffroom room: messages, a box to post, and report or remove buttons. */
export function StaffroomChat({
  room,
  initial,
  isStaff,
}: {
  room: string;
  initial: StaffroomMessageView[];
  isStaff: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [isSending, startSend] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.createdAt;

  const fetchNew = useCallback(async () => {
    const fresh = await roomMessages({ room, after: last }).catch(() => []);
    if (fresh.length)
      setMessages((m) => {
        const seen = new Set(m.map((x) => x.id));
        return [...m, ...fresh.filter((x) => !seen.has(x.id))];
      });
  }, [room, last]);

  // Check for new messages only while the page is on screen, to save data.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void fetchNew();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fetchNew]);

  const count = messages.length;
  useEffect(() => {
    if (count) bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = () =>
    startSend(async () => {
      const result = await sendMessage({ room, body: text }).catch(() => ({
        success: false as const,
        error: "We lost contact with Elimu. Try again.",
      }));
      if (!result.success) return void toast.error(result.error);
      setText("");
      await fetchNew();
    });

  const act = async (
    run: () => Promise<{ success: boolean; error?: string }>,
    done: string,
  ) => {
    const result = await run().catch(() => ({
      success: false,
      error: "We lost contact with Elimu. Try again.",
    }));
    if (!result.success) return void toast.error(result.error);
    toast.success(done);
  };

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <ol
        aria-label={`Messages in ${roomLabel(room)}`}
        className="flex max-h-[60dvh] min-h-64 flex-col gap-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <li className="m-auto text-center text-sm text-muted-foreground">
            No messages yet. Say hello and start the conversation.
          </li>
        )}
        {messages.map((m) => (
          <li key={m.id} className="group space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-medium text-foreground">
                {m.mine ? "You" : m.author}
              </span>
              {m.isStaff && <Badge variant="info">Elimu staff</Badge>}
              <span className="text-muted-foreground">{when(m.createdAt)}</span>
            </div>
            <div className="flex items-start gap-2">
              <p
                className={`min-w-0 flex-1 whitespace-pre-wrap break-words rounded-md px-3 py-2 text-sm ${m.mine ? "bg-primary/10" : "bg-muted"}`}
              >
                {m.body}
              </p>
              <div className="flex shrink-0">
                {!m.mine && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground"
                    aria-label={`Report message from ${m.author}`}
                    onClick={() =>
                      act(
                        () => reportMessage(m.id),
                        "Thanks. Elimu staff will look at it.",
                      )
                    }
                  >
                    <Flag />
                  </Button>
                )}
                {isStaff && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-destructive"
                      aria-label="Remove this message"
                      onClick={() =>
                        act(async () => {
                          const r = await removeMessage(m.id);
                          if (r.success)
                            setMessages((all) =>
                              all.filter((x) => x.id !== m.id),
                            );
                          return r;
                        }, "Message removed")
                      }
                    >
                      <Trash2 />
                    </Button>
                    {!m.mine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-foreground"
                        aria-label={`Pause ${m.author} from posting for 7 days`}
                        onClick={() =>
                          act(
                            () => muteTeacher({ userId: m.authorId, days: 7 }),
                            `${m.author} can't post for 7 days`,
                          )
                        }
                      >
                        <VolumeX />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
        <div ref={bottom} />
      </ol>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Textarea
          aria-label={`Message ${roomLabel(room)}`}
          placeholder="Ask a question or share an idea"
          value={text}
          maxLength={MESSAGE_MAX}
          rows={2}
          disabled={isSending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && text.trim()) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-11 flex-1 resize-none text-sm"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11"
          aria-label="Send"
          disabled={isSending || !text.trim()}
        >
          {isSending ? <Spinner /> : <Send />}
        </Button>
      </form>
    </div>
  );
}

"use client"

import { useState, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
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

export default function RAGChatBot() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  
  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    
    setInput("");
    // @ts-ignore
    await sendMessage({ text: message.text });
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-2 sm:p-4 h-[calc(100dvh-8rem)]">
      <div className="flex flex-col gap-4 w-full h-full bg-card/60 backdrop-blur-3xl border border-border/50 rounded-[2rem] shadow-2xl p-4 sm:p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* Subtle top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <Conversation className="flex-1 min-h-0 bg-background/40 rounded-2xl border border-border/40 shadow-inner overflow-hidden relative">
          <ConversationContent className="h-full p-4 sm:p-6">
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <MessageResponse>
                                {part.text}
                              </MessageResponse>
                            </MessageContent>
                          </Message>
                        </Fragment>
                      );

                    default:
                      return null;
                  }
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Elimu..."
              className="resize-none bg-transparent placeholder:text-muted-foreground/70" 
            />
          </PromptInputBody>
          <PromptInputFooter className="px-4 py-3 border-t border-border/40">
            <PromptInputTools>
              {/* Optional enhancements can be added here */}
            </PromptInputTools>
            <PromptInputSubmit className="transition-transform active:scale-95 shadow-sm" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
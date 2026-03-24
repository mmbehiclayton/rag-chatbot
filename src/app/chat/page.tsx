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
import { Message, MessageContent } from "@/components/ai-elements/message";

export default function RAGChatBot() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
    setInput("");
  }

  return <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh)]">
    <div className="flex flex-col gap-4 h-full">
      <Conversation className="h-full">
        <ConversationContent className="h-full">
          {messages.map((message) => (
            <div key={message.id}>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <Fragment key={`${message.id}-${i}`}>
                        <Message from={message.role}>
                          <MessageContent>
                            {part.text}
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
          {(status === "submitted" || status === "streaming") && <Loader />}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..." />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            {/* Model Selector, web seacrh, file upload, etc. can go here */}
          </PromptInputTools>
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>
    </div>
  </div>
}
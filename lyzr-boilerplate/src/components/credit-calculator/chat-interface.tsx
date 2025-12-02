"use client";

import * as React from "react";
import { IconSend, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const LYZR_LOGO = "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  streamingContent?: string;
}

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  streamingContent,
}: ChatInterfaceProps) {
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex h-[calc(100vh-250px)] items-center justify-center">
              <div className="text-center">
                <Avatar className="mx-auto mb-4 h-16 w-16">
                  <AvatarImage src={LYZR_LOGO} alt="Lyzr" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">L</AvatarFallback>
                </Avatar>
                <h2 className="mb-2 text-xl font-semibold">Lyzr Credit Calculator</h2>
                <p className="text-muted-foreground">
                  Describe your use case and I&apos;ll calculate the credits and ROI
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={LYZR_LOGO} alt="Lyzr" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">L</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {streamingContent && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={LYZR_LOGO} alt="Lyzr" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">L</AvatarFallback>
              </Avatar>
              <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-muted">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={LYZR_LOGO} alt="Lyzr" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">L</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2">
                <IconLoader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your use case..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
            <IconSend className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

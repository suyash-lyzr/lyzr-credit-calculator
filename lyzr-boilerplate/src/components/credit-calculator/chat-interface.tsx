"use client";

import * as React from "react";
import { IconSend, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import Image from "next/image";
import { Questionnaire, parseQuestionnaire } from "./questionnaire";

const LYZR_ICON = "https://cdn2.futurepedia.io/2024-09-18T20-25-23.994Z-lyyk.png?w=256";
const LYZR_LOGO = "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  streamingContent?: string;
  hasArtifacts?: boolean;
}

function removeQuestionnaireJson(content: string): string {
  return content.replace(/```json\s*\{[\s\S]*?"type":\s*"questionnaire"[\s\S]*?\}\s*```/g, '').trim();
}

function isStreamingQuestionnaire(content: string): boolean {
  const jsonStart = content.includes('```json') && content.includes('"type"');
  const hasQuestionnaireMarker = content.includes('"questionnaire"') || content.includes('"questions"');
  const isIncomplete = !content.includes('```\n') || (content.match(/```/g) || []).length < 2;
  return jsonStart && (hasQuestionnaireMarker || isIncomplete);
}

function getPreQuestionnaireText(content: string): string {
  const jsonIndex = content.indexOf('```json');
  if (jsonIndex > 0) {
    return content.substring(0, jsonIndex).trim();
  }
  return '';
}

export function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  streamingContent,
  hasArtifacts = false,
}: ChatInterfaceProps) {
  const [input, setInput] = React.useState("");
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleQuestionnaireSubmit = (responses: Record<string, string | string[]>) => {
    const formattedParts: string[] = [];
    Object.entries(responses).forEach(([, value]) => {
      if (Array.isArray(value)) {
        formattedParts.push(value.join(", "));
      } else {
        formattedParts.push(value);
      }
    });
    const message = `My selections: ${formattedParts.join(" | ")}`;
    onSendMessage(message);
  };

  const renderMessageContent = (message: ChatMessage, isLastAssistantMessage: boolean) => {
    if (message.role === "user") {
      return <p className="text-sm">{message.content}</p>;
    }

    const questionnaire = parseQuestionnaire(message.content);
    const textContent = removeQuestionnaireJson(message.content);

    return (
      <div className="space-y-3">
        {textContent && (
          <div className="text-sm">
            <Streamdown>{textContent}</Streamdown>
          </div>
        )}
        {questionnaire && isLastAssistantMessage && !isLoading && !hasArtifacts && (
          <div className="mt-3">
            <Questionnaire
              data={questionnaire}
              onSubmit={handleQuestionnaireSubmit}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    );
  };

  const lastAssistantMessageIndex = messages.reduce((lastIndex, msg, idx) => 
    msg.role === "assistant" ? idx : lastIndex, -1);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 pt-8"
      >
        <div className="space-y-4">
          {messages.length === 0 && !streamingContent && (
            <div className="flex h-[calc(100vh-250px)] items-center justify-center">
              <div className="text-center">
                <Image
                  src={LYZR_LOGO}
                  alt="Lyzr"
                  width={64}
                  height={64}
                  className="mx-auto mb-4 object-contain"
                  unoptimized
                />
                <h2 className="mb-2 text-xl font-semibold">Lyzr Credit Calculator</h2>
                <p className="text-muted-foreground">
                  Describe your use case and I&apos;ll calculate the credits and ROI
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <Image
                    src={LYZR_ICON}
                    alt="Lyzr"
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 overflow-hidden",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="overflow-x-auto break-words">
                  {renderMessageContent(message, index === lastAssistantMessageIndex)}
                </div>
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
              <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={LYZR_ICON}
                  alt="Lyzr"
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-muted">
                {isStreamingQuestionnaire(streamingContent) ? (
                  <div className="space-y-2">
                    {getPreQuestionnaireText(streamingContent) && (
                      <div className="text-sm">
                        <Streamdown>{getPreQuestionnaireText(streamingContent)}</Streamdown>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Preparing follow-up questions...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <Streamdown>{removeQuestionnaireJson(streamingContent)}</Streamdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={LYZR_ICON}
                  alt="Lyzr"
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2">
                <IconLoader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
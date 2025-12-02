"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/credit-calculator/chat-sidebar";
import { ChatInterface } from "@/components/credit-calculator/chat-interface";
import { ArtifactPanel } from "@/components/credit-calculator/artifact-panel";
import { LandingPage } from "@/components/credit-calculator/landing-page";
import {
  ChatSession,
  ChatMessage,
  ArtifactState,
  ArchitectureData,
  CreditCalculation,
  ROICalculation,
} from "@/lib/types";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function CreditCalculatorPage() {
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const [artifactState, setArtifactState] = React.useState<ArtifactState>({
    architecture: null,
    credits: null,
    roi: null,
    isLoading: {
      architecture: false,
      credits: false,
      roi: false,
    },
  });
  const [hasStartedConversation, setHasStartedConversation] = React.useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const createNewSession = React.useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setArtifactState({
      architecture: null,
      credits: null,
      roi: null,
      isLoading: { architecture: false, credits: false, roi: false },
    });
  }, []);

  const selectSession = React.useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setHasStartedConversation(true);
    setArtifactState({
      architecture: null,
      credits: null,
      roi: null,
      isLoading: { architecture: false, credits: false, roi: false },
    });
  }, []);

  const deleteSession = React.useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setHasStartedConversation(false);
        }
      }
    },
    [activeSessionId, sessions]
  );

  const sendMessage = React.useCallback(
    async (content: string) => {
      let currentSessionId = activeSessionId;
      
      if (!currentSessionId) {
        const newSession: ChatSession = {
          id: generateId(),
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        currentSessionId = newSession.id;
        setArtifactState({
          architecture: null,
          credits: null,
          roi: null,
          isLoading: { architecture: false, credits: false, roi: false },
        });
      }

      setHasStartedConversation(true);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === currentSessionId) {
            const updatedMessages = [...session.messages, userMessage];
            const title =
              session.messages.length === 0
                ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                : session.title;
            return {
              ...session,
              messages: updatedMessages,
              title,
              updatedAt: new Date(),
            };
          }
          return session;
        })
      );

      setIsLoading(true);
      setStreamingContent("");

      const currentSession = sessions.find((s) => s.id === currentSessionId);
      const messages = [
        ...(currentSession?.messages || []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content },
      ];

      let accumulatedContent = "";
      let buffer = "";

      const processEvent = (eventData: { event: string; data: unknown }) => {
        switch (eventData.event) {
          case "text":
            accumulatedContent += (eventData.data as { content: string }).content;
            setStreamingContent(accumulatedContent);
            break;

          case "tool_start":
            const toolName = (eventData.data as { tool: string }).tool;
            if (toolName === "generate_architecture") {
              setArtifactState((prev) => ({
                ...prev,
                isLoading: { ...prev.isLoading, architecture: true },
              }));
            } else if (toolName === "calculate_credits") {
              setArtifactState((prev) => ({
                ...prev,
                isLoading: { ...prev.isLoading, credits: true },
              }));
            } else if (toolName === "calculate_roi") {
              setArtifactState((prev) => ({
                ...prev,
                isLoading: { ...prev.isLoading, roi: true },
              }));
            }
            break;

          case "tool_result":
            const toolResult = eventData.data as { tool: string; data: unknown };
            if (toolResult.tool === "generate_architecture") {
              setArtifactState((prev) => ({
                ...prev,
                architecture: toolResult.data as ArchitectureData,
                isLoading: { ...prev.isLoading, architecture: false },
              }));
            } else if (toolResult.tool === "calculate_credits") {
              setArtifactState((prev) => ({
                ...prev,
                credits: toolResult.data as CreditCalculation,
                isLoading: { ...prev.isLoading, credits: false },
              }));
            } else if (toolResult.tool === "calculate_roi") {
              setArtifactState((prev) => ({
                ...prev,
                roi: toolResult.data as ROICalculation,
                isLoading: { ...prev.isLoading, roi: false },
              }));
            }
            break;

          case "error":
            console.error("Chat error:", (eventData.data as { message: string }).message);
            break;
        }
      };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                processEvent(data);
              } catch (e) {
                console.error("Error parsing SSE data:", e, line);
              }
            }
          }
        }

        if (buffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.slice(6));
            processEvent(data);
          } catch (e) {
            console.error("Error parsing final SSE data:", e);
          }
        }

        if (accumulatedContent) {
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: accumulatedContent,
            timestamp: new Date(),
          };
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === currentSessionId) {
                return {
                  ...session,
                  messages: [...session.messages, assistantMessage],
                  updatedAt: new Date(),
                };
              }
              return session;
            })
          );
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
      }
    },
    [activeSessionId, sessions]
  );

  if (!hasStartedConversation) {
    return (
      <LandingPage
        onSubmit={sendMessage}
        isLoading={isLoading}
      />
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewSession={createNewSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          className="w-64 shrink-0"
        />
        <div className="flex flex-1 min-w-0">
          <div className="w-[40%] min-w-0 border-r">
            <ChatInterface
              messages={activeSession?.messages || []}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              streamingContent={streamingContent}
            />
          </div>
          <div className="w-[60%] min-w-0 p-2">
            <ArtifactPanel artifactState={artifactState} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

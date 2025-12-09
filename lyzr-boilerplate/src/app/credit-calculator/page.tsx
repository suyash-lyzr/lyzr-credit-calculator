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

let idCounter = 0;
function generateId() {
  if (typeof window !== 'undefined') {
    idCounter += 1;
    return `id-${idCounter}-${Date.now()}`;
  }
  return `server-id-${idCounter++}`;
}

const STORAGE_KEY = 'lyzr-credit-calculator-sessions';

function loadSessionsFromStorage(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((s: ChatSession) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map((m: ChatMessage) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
        })),
      }));
    }
  } catch (e) {
    console.error('Failed to load sessions from storage:', e);
  }
  return [];
}

function saveSessionsToStorage(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions to storage:', e);
  }
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
    review: null,
    isLoading: {
      architecture: false,
      credits: false,
      roi: false,
      review: false,
    },
  });
  const [hasStartedConversation, setHasStartedConversation] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    const loaded = loadSessionsFromStorage();
    if (loaded.length > 0) {
      setSessions(loaded);
    }
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (isHydrated && sessions.length > 0) {
      saveSessionsToStorage(sessions);
    }
  }, [sessions, isHydrated]);

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
      review: null,
      isLoading: { architecture: false, credits: false, roi: false, review: false },
    });
  }, []);

  const selectSession = React.useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setHasStartedConversation(true);
    setArtifactState({
      architecture: null,
      credits: null,
      roi: null,
      review: null,
      isLoading: { architecture: false, credits: false, roi: false, review: false },
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

  const goToHome = React.useCallback(() => {
    setActiveSessionId(null);
    setHasStartedConversation(false);
    setArtifactState({
      architecture: null,
      credits: null,
      roi: null,
      review: null,
      isLoading: { architecture: false, credits: false, roi: false, review: false },
    });
  }, []);

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
          review: null,
          isLoading: { architecture: false, credits: false, roi: false, review: false },
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
        console.log(`[FE] Received event: ${eventData.event} at ${new Date().toISOString()}`, eventData.data);
        
        switch (eventData.event) {
          case "text":
            accumulatedContent += (eventData.data as { content: string }).content;
            setStreamingContent(accumulatedContent);
            break;

          case "tool_start":
            const toolName = (eventData.data as { tool: string }).tool;
            console.log(`[FE] tool_start: ${toolName}`);
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
            console.log(`[FE] tool_result: ${toolResult.tool}`, Object.keys(toolResult.data as object || {}));
            if (toolResult.tool === "generate_architecture") {
              console.log(`[FE] Setting architecture data`);
              setArtifactState((prev) => ({
                ...prev,
                architecture: toolResult.data as ArchitectureData,
                isLoading: { ...prev.isLoading, architecture: false },
              }));
            } else if (toolResult.tool === "calculate_credits") {
              console.log(`[FE] Setting credits data`);
              setArtifactState((prev) => ({
                ...prev,
                credits: toolResult.data as CreditCalculation,
                isLoading: { ...prev.isLoading, credits: false },
              }));
            } else if (toolResult.tool === "calculate_roi") {
              console.log(`[FE] Setting ROI data`);
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

        console.log("[FE] Starting stream read...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[FE] Stream done");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log(`[FE] Received chunk (${chunk.length} chars)`);
          buffer += chunk;
          
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
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden">
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewSession={createNewSession}
            onSelectSession={selectSession}
            onDeleteSession={deleteSession}
            onLogoClick={goToHome}
            className="w-64 shrink-0"
          />
          <div className="flex-1 flex items-center justify-center">
            <LandingPage
              onSubmit={sendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </SidebarProvider>
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
          onLogoClick={goToHome}
          className="w-64 shrink-0"
        />
        <div className="flex flex-1 min-w-0 h-screen overflow-hidden">
          <div className="w-[40%] min-w-0 border-r h-full overflow-hidden">
            <ChatInterface
              messages={activeSession?.messages || []}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              streamingContent={streamingContent}
              hasArtifacts={!!(artifactState.architecture || artifactState.credits || artifactState.roi)}
            />
          </div>
          <div className="w-[60%] min-w-0 p-1.5">
            <ArtifactPanel artifactState={artifactState} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  ReviewValidation,
  SavedTemplate,
} from "@/lib/types";
import { SaveTemplateModal } from "@/components/credit-calculator/save-template-modal";
import { TemplateManagerModal } from "@/components/credit-calculator/template-manager-modal";

let idCounter = 0;
function generateId() {
  if (typeof window !== "undefined") {
    idCounter += 1;
    return `id-${idCounter}-${Date.now()}`;
  }
  return `server-id-${idCounter++}`;
}

interface ServerChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  artifacts: {
    architecture: ArchitectureData | null;
    credits: CreditCalculation | null;
    roi: ROICalculation | null;
    review: ReviewValidation | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthUser {
  id: number;
  email: string;
}

const EMPTY_ARTIFACTS: ArtifactState = {
  architecture: null,
  credits: null,
  roi: null,
  review: null,
  isLoading: { architecture: false, credits: false, roi: false, review: false },
};

export default function CreditCalculatorPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [sessionArtifacts, setSessionArtifacts] = React.useState<
    Record<string, { architecture: ArchitectureData | null; credits: CreditCalculation | null; roi: ROICalculation | null; review: ReviewValidation | null }>
  >({});
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const [artifactState, setArtifactState] = React.useState<ArtifactState>(EMPTY_ARTIFACTS);
  const [hasStartedConversation, setHasStartedConversation] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [templates, setTemplates] = React.useState<SavedTemplate[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = React.useState(false);
  const [showTemplateManager, setShowTemplateManager] = React.useState(false);

  // --- Auth + initial data load ---
  React.useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) {
          router.replace("/login?next=/credit-calculator");
          return;
        }
        const meJson = await meRes.json();
        if (cancelled) return;
        setUser(meJson.user);

        const [sessionsRes, templatesRes] = await Promise.all([
          fetch("/api/chat-sessions"),
          fetch("/api/templates"),
        ]);
        if (cancelled) return;

        if (sessionsRes.ok) {
          const rows: ServerChatSession[] = await sessionsRes.json();
          const loaded: ChatSession[] = rows.map((r) => ({
            id: r.id,
            title: r.title,
            messages: (r.messages || []).map((m) => ({
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
            })),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          }));
          const artifactsMap: typeof sessionArtifacts = {};
          for (const r of rows) {
            if (r.artifacts) {
              artifactsMap[r.id] = {
                architecture: r.artifacts.architecture ?? null,
                credits: r.artifacts.credits ?? null,
                roi: r.artifacts.roi ?? null,
                review: r.artifacts.review ?? null,
              };
            }
          }
          setSessions(loaded);
          setSessionArtifacts(artifactsMap);
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(
            data.map((t: SavedTemplate) => ({
              ...t,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt),
            }))
          );
        }
      } catch (e) {
        console.error("Failed to bootstrap:", e);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // --- Cmd+Shift+S shortcut ---
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!hasStartedConversation) {
          setShowTemplateManager(true);
        } else if (artifactState.architecture && artifactState.credits && artifactState.roi) {
          setShowSaveTemplateModal(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artifactState, hasStartedConversation]);

  // --- Persist active session to DB (debounced) ---
  const persistSession = React.useCallback(
    async (sessionId: string) => {
      const s = sessions.find((x) => x.id === sessionId);
      if (!s) return;
      const arts =
        activeSessionId === sessionId
          ? {
              architecture: artifactState.architecture,
              credits: artifactState.credits,
              roi: artifactState.roi,
              review: artifactState.review,
            }
          : sessionArtifacts[sessionId] || null;
      try {
        const res = await fetch("/api/chat-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: s.id,
            title: s.title,
            messages: s.messages,
            artifacts: arts,
          }),
        });
        if (res.status === 401) {
          router.replace("/login?next=/credit-calculator");
        }
      } catch (e) {
        console.error("Failed to persist session:", e);
      }
    },
    [sessions, activeSessionId, artifactState, sessionArtifacts, router]
  );

  // Keep sessionArtifacts cache in sync with the live artifactState for the
  // currently active session, so re-selecting it later doesn't show stale data.
  React.useEffect(() => {
    if (!activeSessionId) return;
    if (
      !artifactState.architecture &&
      !artifactState.credits &&
      !artifactState.roi &&
      !artifactState.review
    )
      return;
    setSessionArtifacts((prev) => ({
      ...prev,
      [activeSessionId]: {
        architecture: artifactState.architecture,
        credits: artifactState.credits,
        roi: artifactState.roi,
        review: artifactState.review,
      },
    }));
  }, [
    activeSessionId,
    artifactState.architecture,
    artifactState.credits,
    artifactState.roi,
    artifactState.review,
  ]);

  // Debounced save when active session changes. Tracks the session id the
  // pending save belongs to so a session switch flushes immediately rather
  // than dropping the save.
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveSessionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isHydrated || !activeSessionId) return;

    // If there's a pending save for a *different* session, flush it now.
    if (
      pendingSaveSessionIdRef.current &&
      pendingSaveSessionIdRef.current !== activeSessionId
    ) {
      const idToFlush = pendingSaveSessionIdRef.current;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      pendingSaveSessionIdRef.current = null;
      void persistSession(idToFlush);
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingSaveSessionIdRef.current = activeSessionId;
    const idToSave = activeSessionId;
    saveTimerRef.current = setTimeout(() => {
      pendingSaveSessionIdRef.current = null;
      void persistSession(idToSave);
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    isHydrated,
    activeSessionId,
    sessions,
    artifactState.architecture,
    artifactState.credits,
    artifactState.roi,
    artifactState.review,
    persistSession,
  ]);

  // Flush pending save before unload.
  React.useEffect(() => {
    const handler = () => {
      if (pendingSaveSessionIdRef.current) {
        const id = pendingSaveSessionIdRef.current;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        void persistSession(id);
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [persistSession]);

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
    setArtifactState(EMPTY_ARTIFACTS);
    setHasStartedConversation(false);
  }, []);

  const selectSession = React.useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setHasStartedConversation(true);
      const saved = sessionArtifacts[sessionId];
      setArtifactState({
        architecture: saved?.architecture ?? null,
        credits: saved?.credits ?? null,
        roi: saved?.roi ?? null,
        review: saved?.review ?? null,
        isLoading: { architecture: false, credits: false, roi: false, review: false },
      });
    },
    [sessionArtifacts]
  );

  const deleteSession = React.useCallback(
    async (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionArtifacts((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setHasStartedConversation(false);
        }
      }
      try {
        await fetch(`/api/chat-sessions/${sessionId}`, { method: "DELETE" });
      } catch (e) {
        console.error("Failed to delete session:", e);
      }
    },
    [activeSessionId, sessions]
  );

  const goToHome = React.useCallback(() => {
    setActiveSessionId(null);
    setHasStartedConversation(false);
    setArtifactState(EMPTY_ARTIFACTS);
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      router.replace("/login");
    }
  }, [router]);

  const saveTemplate = React.useCallback(
    async (name: string, description: string) => {
      if (!artifactState.architecture || !artifactState.credits || !artifactState.roi) return;

      const activeSessionData = sessions.find((s) => s.id === activeSessionId);
      const useCase = activeSessionData?.messages[0]?.content || name;
      const allMessages = activeSessionData?.messages || [];

      const chatHistory = allMessages.filter((msg) => {
        if (msg.role === "user" && msg.content.startsWith("My selections:")) return false;
        if (msg.role === "assistant" && msg.content.includes('"questions"')) return false;
        return true;
      });

      try {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            useCase,
            architecture: artifactState.architecture,
            credits: artifactState.credits,
            roi: artifactState.roi,
            chatHistory,
          }),
        });

        if (response.ok) {
          const newTemplate = await response.json();
          setTemplates((prev) => [
            {
              ...newTemplate,
              createdAt: new Date(newTemplate.createdAt),
              updatedAt: new Date(newTemplate.updatedAt),
            },
            ...prev,
          ]);
        }
      } catch (e) {
        console.error("Failed to save template:", e);
      }
    },
    [artifactState, activeSessionId, sessions]
  );

  const loadTemplate = React.useCallback((template: SavedTemplate) => {
    const newSession: ChatSession = {
      id: generateId(),
      title: template.name,
      messages: template.chatHistory || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setHasStartedConversation(true);
    setArtifactState({
      architecture: template.architecture,
      credits: template.credits,
      roi: template.roi,
      review: null,
      isLoading: { architecture: false, credits: false, roi: false, review: false },
    });
  }, []);

  const deleteTemplate = React.useCallback(async (templateId: number) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      }
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
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
        setArtifactState(EMPTY_ARTIFACTS);
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
            return { ...session, messages: updatedMessages, title, updatedAt: new Date() };
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

          case "tool_start": {
            const toolName = (eventData.data as { tool: string }).tool;
            if (toolName === "generate_architecture") {
              setArtifactState((prev) => ({ ...prev, isLoading: { ...prev.isLoading, architecture: true } }));
            } else if (toolName === "calculate_credits") {
              setArtifactState((prev) => ({ ...prev, isLoading: { ...prev.isLoading, credits: true } }));
            } else if (toolName === "calculate_roi") {
              setArtifactState((prev) => ({ ...prev, isLoading: { ...prev.isLoading, roi: true } }));
            } else if (toolName === "review_and_validate") {
              setArtifactState((prev) => ({ ...prev, isLoading: { ...prev.isLoading, review: true } }));
            }
            break;
          }

          case "tool_result": {
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
            } else if (toolResult.tool === "review_and_validate") {
              setArtifactState((prev) => ({
                ...prev,
                review: toolResult.data as ReviewValidation,
                isLoading: { ...prev.isLoading, review: false },
              }));
            }
            break;
          }

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

        if (response.status === 401) {
          router.replace("/login?next=/credit-calculator");
          return;
        }
        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
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
    [activeSessionId, sessions, router]
  );

  // Don't render UI until we know the user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

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
            user={user}
            onLogout={handleLogout}
            className="w-64 shrink-0"
          />
          <div className="flex-1 flex items-center justify-center">
            <LandingPage
              onSubmit={sendMessage}
              isLoading={isLoading}
              templates={templates}
              onLoadTemplate={loadTemplate}
            />
          </div>
        </div>
        <TemplateManagerModal
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          templates={templates}
          onLoadTemplate={loadTemplate}
          onDeleteTemplate={deleteTemplate}
        />
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
          user={user}
          onLogout={handleLogout}
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
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        onSave={saveTemplate}
        defaultName={artifactState.architecture?.title || ""}
      />
    </SidebarProvider>
  );
}

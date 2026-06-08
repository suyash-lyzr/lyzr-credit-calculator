"use client";

import * as React from "react";
import { IconPlus, IconMessage, IconTrash, IconLogout, IconUser } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChatSession } from "@/lib/types";
import Image from "next/image";

const LYZR_LOGO = "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png";

// Full title for the hover tooltip — derived from the first user message so older sessions
// (whose stored titles were hard-sliced) also show their real text.
function fullTitle(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  if (firstUser) return firstUser.content.split("\n")[0].trim();
  return (session.title || "New Conversation").replace(/\.{3,}$/, "");
}

// The sidebar is a fixed narrow column, so we truncate the string itself: a few starting words,
// then "…" — guaranteed to fit within the width and always show the ellipsis, leaving room for
// the hover delete icon on the right.
function displayTitle(session: ChatSession): string {
  const full = fullTitle(session);
  const MAX = 26;
  return full.length > MAX ? `${full.slice(0, MAX).trimEnd()}…` : full;
}

interface ChatSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onLogoClick?: () => void;
  user?: { id: number; email: string } | null;
  onLogout?: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onLogoClick,
  user,
  onLogout,
  ...props
}: ChatSidebarProps) {
  return (
    <Sidebar collapsible="none" className="border-r" {...props}>
      <SidebarHeader className="p-4">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image
            src={LYZR_LOGO}
            alt="Lyzr"
            width={56}
            height={56}
            className="object-contain"
            unoptimized
          />
          <span className="text-base font-semibold">Credit Calculator</span>
        </button>
        <Button onClick={onNewSession} className="mt-4 w-full" size="sm">
          <IconPlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="h-[calc(100vh-260px)] overflow-y-auto overflow-x-hidden">
              <SidebarMenu>
                {sessions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No conversations yet
                  </div>
                ) : (
                  sessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        isActive={session.id === activeSessionId}
                        onClick={() => onSelectSession(session.id)}
                      >
                        <IconMessage className="h-4 w-4 shrink-0" />
                        <span className="truncate min-w-0 flex-1" title={fullTitle(session)}>
                          {displayTitle(session)}
                        </span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        showOnHover
                        title="Delete conversation"
                        aria-label="Delete conversation"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <IconTrash className="h-4 w-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter className="border-t p-3">
          <div className="flex items-center gap-2 px-1 mb-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconUser className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-muted-foreground">Signed in</span>
              <span className="text-xs font-medium truncate" title={user.email}>{user.email}</span>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <IconLogout className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

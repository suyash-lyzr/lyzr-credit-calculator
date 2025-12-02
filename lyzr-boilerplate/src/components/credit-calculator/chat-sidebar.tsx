"use client";

import * as React from "react";
import { IconPlus, IconMessage, IconTrash } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSession } from "@/lib/types";
import Image from "next/image";

const LYZR_LOGO = "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png";

interface ChatSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  ...props
}: ChatSidebarProps) {
  return (
    <Sidebar collapsible="none" className="border-r" {...props}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Image
            src={LYZR_LOGO}
            alt="Lyzr"
            width={48}
            height={48}
            className="object-contain"
            unoptimized
          />
          <span className="text-lg font-semibold">Credit Calculator</span>
        </div>
        <Button onClick={onNewSession} className="mt-4 w-full" size="sm">
          <IconPlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-180px)]">
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
                        <span className="truncate">{session.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        showOnHover
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <IconTrash className="h-4 w-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

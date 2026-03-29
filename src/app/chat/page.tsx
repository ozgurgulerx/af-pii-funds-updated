"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FileSearch,
  LayoutPanelLeft,
  Layers,
  Menu,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { SourcesPanel } from "@/components/layout/sources-panel";
import { ChatThread } from "@/components/chat/chat-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { FollowUpChips } from "@/components/chat/follow-up-chips";
import { ToggleGroup } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateId } from "@/lib/utils";
import {
  ENHANCED_FOLLOW_UP_SUGGESTIONS,
  SAMPLE_CONVERSATIONS,
} from "@/data/seed";
import type { Citation, Message } from "@/types";

type RetrievalMode = "code-rag" | "foundry-iq";

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sourcesPanelCollapsed, setSourcesPanelCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileEvidenceOpen, setMobileEvidenceOpen] = useState(false);
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("code-rag");

  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    SAMPLE_CONVERSATIONS[0]?.id || null
  );
  const [messages, setMessages] = useState<Message[]>(
    SAMPLE_CONVERSATIONS[0]?.messages || []
  );
  const [citations, setCitations] = useState<Citation[]>(
    SAMPLE_CONVERSATIONS[0]?.messages
      .flatMap((message) => message.citations || [])
      .filter((citation, index, array) => array.findIndex((item) => item.id === citation.id) === index) || []
  );
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [queryProgress, setQueryProgress] = useState<{ stage: string; message: string }[]>([]);
  const [showFollowUps, setShowFollowUps] = useState(true);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setCitations([]);
    setActiveCitationId(null);
    setShowFollowUps(false);
    setStreamingContent("");
    setMobileSidebarOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    const conversation = SAMPLE_CONVERSATIONS.find((item) => item.id === id);
    if (!conversation) return;

    setActiveConversationId(id);
    setMessages(conversation.messages);
    setCitations(
      conversation.messages
        .flatMap((message) => message.citations || [])
        .filter((citation, index, array) => array.findIndex((item) => item.id === citation.id) === index)
    );
    setActiveCitationId(null);
    setShowFollowUps(true);
    setMobileSidebarOpen(false);
  }, []);

  const handleCitationClick = useCallback((id: number) => {
    setActiveCitationId((previous) => (previous === id ? null : id));
    setMobileEvidenceOpen(true);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      createdAt: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setIsLoading(true);
    setStreamingContent("");
    setQueryProgress([]);
    setShowFollowUps(false);
    setMobileSidebarOpen(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
          retrievalMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let nextCitations: Citation[] = [];
      let isVerified = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              switch (data.type) {
                case "progress":
                  setQueryProgress((previous) => [...previous, { stage: data.stage, message: data.message }]);
                  break;
                case "text":
                  fullContent += data.content;
                  setStreamingContent(fullContent);
                  break;
                case "citations":
                  nextCitations = data.citations;
                  break;
                case "done":
                  isVerified = data.isVerified;
                  break;
                case "error":
                  throw new Error(data.message);
              }
            } catch (error) {
              if (error instanceof Error && !error.message.includes("JSON")) {
                throw error;
              }
            }
          }
        }
      }

      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "done") isVerified = data.isVerified;
            if (data.type === "citations") nextCitations = data.citations;
          } catch {
            // Ignore trailing parse issues from partial frames.
          }
        }
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: fullContent,
        createdAt: new Date(),
        citations: nextCitations,
        isVerified,
      };

      setMessages((previous) => [...previous, assistantMessage]);

      if (nextCitations.length > 0) {
        setCitations((previous) => {
          const existingRowIds = new Set(previous.map((citation) => citation.rowId));
          const uniqueNew = nextCitations
            .filter((citation) => !existingRowIds.has(citation.rowId))
            .map((citation, index) => ({
              ...citation,
              id: previous.length + index + 1,
            }));
          return [...previous, ...uniqueNew];
        });
      }

      setShowFollowUps(true);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((previous) => [
        ...previous,
        {
          id: generateId(),
          role: "assistant",
          content: "I hit an error while processing the request. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      setQueryProgress([]);
    }
  }, [messages, retrievalMode]);

  const quickPrompts = useMemo(
    () => ENHANCED_FOLLOW_UP_SUGGESTIONS.slice(0, 4).map((suggestion) => suggestion.text),
    []
  );

  const metricCards = useMemo(
    () => [
      {
        label: "Protection",
        value: "PII on",
        detail: "message gate active",
        icon: ShieldCheck,
      },
      {
        label: "Retrieval",
        value: retrievalMode === "code-rag" ? "Code RAG" : "Foundry IQ",
        detail: retrievalMode === "code-rag" ? "full routing surface" : "managed retrieval path",
        icon: Layers,
      },
      {
        label: "Conversation",
        value: messages.length > 0 ? `${messages.length} msgs` : "new thread",
        detail: activeConversationId ? "loaded from session rail" : "draft workspace",
        icon: MessageSquareText,
      },
      {
        label: "Evidence",
        value: `${citations.length} cites`,
        detail: activeCitationId ? `focus #${activeCitationId}` : "citation rail ready",
        icon: FileSearch,
      },
    ],
    [activeCitationId, activeConversationId, citations.length, messages.length, retrievalMode]
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />

      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((previous) => !previous)}
        onSelectConversation={handleSelectConversation}
        activeConversationId={activeConversationId ?? undefined}
        onNewChat={handleNewChat}
        quickPrompts={quickPrompts}
        onQuickPromptSelect={handleSendMessage}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border/70 px-3 py-3 md:px-5">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setMobileSidebarOpen(true)} className="gap-2">
                <Menu className="h-4 w-4" />
                Sessions
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMobileEvidenceOpen(true)} className="gap-2">
                <LayoutPanelLeft className="h-4 w-4" />
                Evidence
              </Button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold" className="gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  Protected chat
                </Badge>
                <Badge variant="outline">{activeConversationId ? "Saved session" : "Fresh draft"}</Badge>
              </div>

              <ToggleGroup
                value={retrievalMode}
                onValueChange={(value) => setRetrievalMode(value as RetrievalMode)}
                options={[
                  { value: "code-rag", label: "Code-based RAG" },
                  { value: "foundry-iq", label: "Foundry IQ" },
                ]}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-[22px] border border-border/75 bg-card/90 px-4 py-3 shadow-subtle"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {card.label}
                        </div>
                        <div className="mt-1 font-display text-lg font-semibold">{card.value}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{card.detail}</div>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <ChatThread
          messages={messages}
          isLoading={isLoading}
          streamingContent={streamingContent}
          queryProgress={queryProgress}
          onCitationClick={handleCitationClick}
          activeCitationId={activeCitationId}
          onSendMessage={handleSendMessage}
        />

        <FollowUpChips
          suggestions={ENHANCED_FOLLOW_UP_SUGGESTIONS}
          onSelect={handleSendMessage}
          isVisible={showFollowUps && !isLoading && messages.length > 0}
        />

        <div className="px-3 pb-3 md:px-5">
          <div className="mx-auto w-full max-w-5xl rounded-[28px] border border-border/80 bg-card/88 px-3 py-3 shadow-panel backdrop-blur-sm md:px-4">
            <MessageComposer onSubmit={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <SourcesPanel
        isCollapsed={sourcesPanelCollapsed}
        onToggle={() => setSourcesPanelCollapsed((previous) => !previous)}
        citations={citations}
        activeCitationId={activeCitationId}
        onCitationClick={handleCitationClick}
        mobileOpen={mobileEvidenceOpen}
        onMobileClose={() => setMobileEvidenceOpen(false)}
      />
    </div>
  );
}

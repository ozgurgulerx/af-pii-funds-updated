"use client";

import { useCallback, useMemo, useState } from "react";
import {
  FileSearch,
  LayoutPanelLeft,
  Layers,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
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
        <div className="chat-hero-shell border-b border-border/70 px-3 py-3 md:px-5">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <div className="chat-hero-card relative overflow-hidden rounded-[28px] border border-border/70 p-4 backdrop-blur-sm md:p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              <div className="pointer-events-none absolute -left-14 top-5 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-8 top-10 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative flex flex-col gap-4">
                <div className="flex items-center gap-2 lg:hidden">
                  <Button variant="outline" size="sm" onClick={() => setMobileSidebarOpen(true)} className="gap-2 bg-background/82">
                    <Menu className="h-4 w-4" />
                    Sessions
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMobileEvidenceOpen(true)} className="gap-2 bg-background/82">
                    <LayoutPanelLeft className="h-4 w-4" />
                    Evidence
                  </Button>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.92fr)]">
                  <div className="rounded-[24px] border border-border/60 bg-background/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="gold" className="gap-1.5">
                        <ShieldCheck className="h-3 w-3" />
                        Protected chat
                      </Badge>
                      <Badge variant="outline" className="bg-background/78">
                        {activeConversationId ? "Saved session" : "Fresh draft"}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">
                        <Sparkles className="h-3.5 w-3.5" />
                        Research workspace
                      </div>
                      <h2 className="max-w-2xl text-[22px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[25px]">
                        Fund research, protected by the existing PII gate and anchored to evidence.
                      </h2>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Keep the same backend flow, switch retrieval modes when needed, and review citations in the rail without leaving the conversation.
                      </p>
                    </div>

                    <div className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      Start from the overview here, then move straight into the conversation and source rails below.
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border/60 bg-card/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <div className="flex h-full flex-col gap-4">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Retrieval mode
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

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Workspace state
                          </div>
                          <div className="mt-1 font-display text-lg font-semibold text-foreground">
                            {activeConversationId ? "Session loaded" : "Ready to brief"}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {messages.length > 0 ? "Conversation context is preserved in the center pane." : "Open with a prompt or start a fresh request."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Evidence rail
                          </div>
                          <div className="mt-1 font-display text-lg font-semibold text-foreground">
                            {citations.length > 0 ? `${citations.length} citations ready` : "Waiting for sources"}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {activeCitationId ? `Citation #${activeCitationId} is in focus on the right rail.` : "Source cards appear here as answers stream in."}
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] leading-5 text-muted-foreground">
                        Use the session rail for history, the center for streaming answers, and the evidence rail for source inspection.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {metricCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="rounded-[22px] border border-border/70 bg-background/76 px-4 py-3 shadow-subtle"
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

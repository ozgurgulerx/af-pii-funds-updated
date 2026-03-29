"use client";

import { useCallback, useMemo, useState } from "react";
import {
  EyeOff,
  FileSearch,
  Globe2,
  LayoutPanelLeft,
  Landmark,
  Layers,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { SourcesPanel } from "@/components/layout/sources-panel";
import { ChatThread } from "@/components/chat/chat-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { FollowUpChips } from "@/components/chat/follow-up-chips";
import { ToggleGroup } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { upsertToolTrace } from "@/lib/tool-trace";
import { generateId } from "@/lib/utils";
import {
  ENHANCED_FOLLOW_UP_SUGGESTIONS,
  SAMPLE_CONVERSATIONS,
} from "@/data/seed";
import type { Citation, Message, ToolTraceStep } from "@/types";

type RetrievalMode = "code-rag" | "foundry-iq";

const HERO_FUND_TYPES = [
  {
    id: "bond",
    label: "Bond Funds",
    detail: "Duration, credit quality, and carry stay in the foreground.",
    icon: Landmark,
  },
  {
    id: "equity",
    label: "Equity Funds",
    detail: "Holdings concentration and sector exposure matter more than headlines.",
    icon: TrendingUp,
  },
  {
    id: "macro",
    label: "Macro-linked",
    detail: "Rate cuts, inflation, and growth assumptions are still setting the tone.",
    icon: Globe2,
  },
  {
    id: "income",
    label: "Defensive Income",
    detail: "Liquidity and downside control remain part of the screen.",
    icon: ShieldCheck,
  },
] as const;

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
  const [queryProgress, setQueryProgress] = useState<ToolTraceStep[]>([]);
  const [showFollowUps, setShowFollowUps] = useState(true);
  const [heroDismissed, setHeroDismissed] = useState(false);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setCitations([]);
    setActiveCitationId(null);
    setShowFollowUps(false);
    setStreamingContent("");
    setMobileSidebarOpen(false);
    setHeroDismissed(false);
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
                  if (data.step?.id && data.step?.toolName) {
                    setQueryProgress((previous) => upsertToolTrace(previous, data.step as ToolTraceStep));
                  } else if (data.stage || data.message) {
                    setQueryProgress((previous) => [
                      ...previous,
                      {
                        id: `legacy-${previous.length + 1}`,
                        toolName: data.stage || "Progress",
                        status: "completed",
                        durationMs: 0,
                        inputSummary: "message inspection",
                        outputSummary: data.message || "",
                      },
                    ]);
                  }
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

  const marketView = useMemo(() => {
    const context = messages
      .slice(-4)
      .map((message) => message.content.toLowerCase())
      .join(" ");

    if (context.includes("bond") || context.includes("duration") || context.includes("rate")) {
      return {
        activeType: "bond",
        eyebrow: "Market status",
        headline: "Rate expectations are still doing most of the work right now.",
        comment:
          "That keeps bond funds in focus, with duration, credit quality, and carry deciding which products can actually hold up as the tape shifts.",
      };
    }

    if (context.includes("nvidia") || context.includes("equity") || context.includes("growth") || context.includes("ai")) {
      return {
        activeType: "equity",
        eyebrow: "Market status",
        headline: "Equity leadership still looks concentrated rather than broad.",
        comment:
          "AI-heavy exposures continue to pull attention, so fund selection is less about headline performance and more about what is actually inside the portfolio.",
      };
    }

    if (context.includes("imf") || context.includes("inflation") || context.includes("macro") || context.includes("growth")) {
      return {
        activeType: "macro",
        eyebrow: "Market status",
        headline: "Macro expectations are steering allocation calls more than single-name noise.",
        comment:
          "Inflation, rate-cut timing, and global growth assumptions are still the first filter, which is why flexible and macro-linked fund buckets are staying relevant.",
      };
    }

    return {
      activeType: "income",
      eyebrow: "Market status",
      headline: "The backdrop is still mixed enough to reward structure over momentum.",
      comment:
        "Investors are still weighing easing-rate optimism against concentration risk, which makes it useful to compare fund type, mandate, and downside behavior before chasing winners.",
    };
  }, [messages]);

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

  const showHero = !heroDismissed && !activeConversationId && messages.length === 0;

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
        {showHero && (
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="gold" className="gap-1.5">
                            <ShieldCheck className="h-3 w-3" />
                            Protected chat
                          </Badge>
                          <Badge variant="outline" className="bg-background/78">
                            Fresh draft
                          </Badge>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHeroDismissed(true)}
                          className="gap-2 bg-background/82"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Hide overview
                        </Button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/75">
                          <Sparkles className="h-3.5 w-3.5" />
                          {marketView.eyebrow}
                        </div>
                        <h2 className="max-w-2xl text-[22px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[25px]">
                          {marketView.headline}
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                          {marketView.comment}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                        Scan the fund types on the right, then move into the conversation and source rails below.
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-border/60 bg-card/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      <div className="flex h-full flex-col gap-3">
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Fund types in focus
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {HERO_FUND_TYPES.map((fundType) => {
                            const Icon = fundType.icon;
                            const isActive = marketView.activeType === fundType.id;
                            return (
                              <div
                                key={fundType.id}
                                className={`rounded-[20px] border px-3 py-3 transition-colors ${
                                  isActive
                                    ? "border-primary/30 bg-primary/10 shadow-subtle"
                                    : "border-border/60 bg-background/70"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] font-semibold text-foreground">{fundType.label}</div>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{fundType.detail}</p>
                                  </div>
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                                      isActive ? "bg-primary/14 text-primary" : "bg-primary/8 text-primary/80"
                                    }`}
                                  >
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
        )}

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
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <div className="rounded-[22px] border border-border/70 bg-background/76 px-4 py-3 shadow-subtle">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Retrieval mode
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Switch between `Code-based RAG` and `Foundry IQ` without bringing the empty-state hero back.
                  </p>
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
            </div>

            <div className="rounded-[28px] border border-border/80 bg-card/88 px-3 py-3 shadow-panel backdrop-blur-sm md:px-4">
              <MessageComposer onSubmit={handleSendMessage} isLoading={isLoading} />
            </div>
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

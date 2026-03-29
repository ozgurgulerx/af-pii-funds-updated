"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutPanelLeft,
  Menu,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
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
  HERO_PROFILE_SUGGESTIONS,
  SAMPLE_CONVERSATIONS,
  type HeroProfileId,
} from "@/data/seed";
import type { Citation, Message, ToolTraceStep } from "@/types";

type RetrievalMode = "code-rag" | "foundry-iq";
type HeroDisplayMode = "expanded" | "compact";

const HERO_SESSION_KEY = "af-pii-funds-updated:chat-hero-mode";
const HERO_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

const HERO_PROFILE_META: Record<
  HeroProfileId,
  {
    icon: LucideIcon;
    badgeClassName: string;
    iconClassName: string;
    activeClassName: string;
    compactClassName: string;
  }
> = {
  balanced: {
    icon: Layers,
    badgeClassName: "bg-primary/10 text-primary",
    iconClassName: "text-primary",
    activeClassName: "border-primary/30 bg-primary/[0.08] shadow-[0_24px_44px_-34px_hsl(var(--primary)/0.42)]",
    compactClassName: "border-primary/18 bg-primary/[0.08] text-primary",
  },
  momentum: {
    icon: TrendingUp,
    badgeClassName: "bg-signal-positive/12 text-signal-positive",
    iconClassName: "text-signal-positive",
    activeClassName:
      "border-signal-positive/30 bg-signal-positive/[0.08] shadow-[0_24px_44px_-34px_rgba(22,163,74,0.34)]",
    compactClassName: "border-signal-positive/20 bg-signal-positive/10 text-signal-positive",
  },
  defensive: {
    icon: ShieldCheck,
    badgeClassName: "bg-primary/10 text-primary",
    iconClassName: "text-primary",
    activeClassName: "border-primary/24 bg-primary/[0.06] shadow-[0_24px_44px_-34px_hsl(var(--primary)/0.32)]",
    compactClassName: "border-primary/18 bg-primary/[0.08] text-primary",
  },
  aggressive: {
    icon: AlertTriangle,
    badgeClassName: "bg-amber-500/12 text-amber-600",
    iconClassName: "text-amber-500",
    activeClassName:
      "border-amber-500/28 bg-amber-500/[0.08] shadow-[0_24px_44px_-34px_rgba(245,158,11,0.32)]",
    compactClassName: "border-amber-500/18 bg-amber-500/10 text-amber-600",
  },
};

export default function ChatPage() {
  const prefersReducedMotion = useReducedMotion();
  const requestInFlightRef = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sourcesPanelCollapsed, setSourcesPanelCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileEvidenceOpen, setMobileEvidenceOpen] = useState(false);
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("code-rag");
  const [heroMode, setHeroMode] = useState<HeroDisplayMode>("expanded");
  const [hasPlayedHeroEntry, setHasPlayedHeroEntry] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHeroMode(window.sessionStorage.getItem(HERO_SESSION_KEY) === "compact" ? "compact" : "expanded");
    setHasPlayedHeroEntry(true);
  }, []);

  const persistHeroMode = useCallback((nextMode: HeroDisplayMode) => {
    setHeroMode(nextMode);
    if (typeof window === "undefined") return;

    if (nextMode === "compact") {
      window.sessionStorage.setItem(HERO_SESSION_KEY, "compact");
    } else {
      window.sessionStorage.removeItem(HERO_SESSION_KEY);
    }
  }, []);

  const compactHero = useCallback(() => {
    persistHeroMode("compact");
  }, [persistHeroMode]);

  const expandHero = useCallback(() => {
    persistHeroMode("expanded");
  }, [persistHeroMode]);

  const normalizeCitations = useCallback((existing: Citation[], incoming: Citation[]) => {
    const knownByRowId = new Map(existing.map((citation) => [citation.rowId, citation]));
    const seenRowIds = new Set(existing.map((citation) => citation.rowId));
    let nextCitationId = existing.reduce((maxId, citation) => Math.max(maxId, citation.id), 0) + 1;
    const appendedCitations: Citation[] = [];

    const messageCitations = incoming.map((citation) => {
      const existingCitation = knownByRowId.get(citation.rowId);
      if (existingCitation) {
        return existingCitation;
      }

      const normalizedCitation: Citation = {
        ...citation,
        id: nextCitationId++,
      };

      knownByRowId.set(citation.rowId, normalizedCitation);

      if (!seenRowIds.has(citation.rowId)) {
        seenRowIds.add(citation.rowId);
        appendedCitations.push(normalizedCitation);
      }

      return normalizedCitation;
    });

    return { messageCitations, appendedCitations };
  }, []);

  const handleNewChat = useCallback(() => {
    if (requestInFlightRef.current) return;

    setActiveConversationId(null);
    setMessages([]);
    setCitations([]);
    setActiveCitationId(null);
    setShowFollowUps(false);
    setStreamingContent("");
    setMobileSidebarOpen(false);
    expandHero();
  }, [expandHero]);

  const handleSelectConversation = useCallback((id: string) => {
    if (requestInFlightRef.current) return;

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
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;

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
    compactHero();

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
        citations: [],
        isVerified,
      };

      const { messageCitations, appendedCitations } = normalizeCitations(citations, nextCitations);
      assistantMessage.citations = messageCitations;

      setMessages((previous) => [...previous, assistantMessage]);

      if (appendedCitations.length > 0) {
        setCitations((previous) => {
          const existingRowIds = new Set(previous.map((citation) => citation.rowId));
          const uniqueNew = appendedCitations.filter((citation) => !existingRowIds.has(citation.rowId));
          return uniqueNew.length > 0 ? [...previous, ...uniqueNew] : previous;
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
      requestInFlightRef.current = false;
      setIsLoading(false);
      setStreamingContent("");
      setQueryProgress([]);
    }
  }, [citations, compactHero, messages, normalizeCitations, retrievalMode]);

  const handleHeroProfileSelect = useCallback((query: string) => {
    if (isLoading) return;
    void handleSendMessage(query);
  }, [handleSendMessage, isLoading]);

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
        focusProfile: "balanced" as const,
        eyebrow: "Market status",
        headline: "Rate expectations are still doing most of the work right now.",
        comment:
          "That keeps bond funds in focus, with duration, credit quality, and carry deciding which products can actually hold up as the tape shifts.",
        supportPoints: [
          "Duration remains the cleanest way to express the easing-rate view.",
          "Credit quality matters more than headline yield once positioning gets crowded.",
          "Use the profile cards to separate core exposure from purely defensive posture.",
        ],
      };
    }

    if (context.includes("nvidia") || context.includes("equity") || context.includes("growth") || context.includes("ai")) {
      return {
        focusProfile: "momentum" as const,
        eyebrow: "Market status",
        headline: "Equity leadership still looks concentrated rather than broad.",
        comment:
          "AI-heavy exposures continue to pull attention, so fund selection is less about headline performance and more about what is actually inside the portfolio.",
        supportPoints: [
          "Momentum works best when you understand how concentrated the winners really are.",
          "Look for whether the fund owns the same leadership names or a wider second line.",
          "The card grid is meant to separate participation, protection, and higher-beta expressions.",
        ],
      };
    }

    if (context.includes("imf") || context.includes("inflation") || context.includes("macro") || context.includes("growth")) {
      return {
        focusProfile: "defensive" as const,
        eyebrow: "Market status",
        headline: "Macro expectations are steering allocation calls more than single-name noise.",
        comment:
          "Inflation, rate-cut timing, and global growth assumptions are still the first filter, which is why flexible and more defensive fund buckets stay relevant.",
        supportPoints: [
          "Macro uncertainty still argues for cleaner downside control than aggressive chasing.",
          "Defensive funds become more useful when the growth path is uneven rather than broken.",
          "Compare the cards by how much risk each profile asks you to carry into the same backdrop.",
        ],
      };
    }

    return {
      focusProfile: "balanced" as const,
      eyebrow: "Market status",
      headline: "The backdrop is still mixed enough to reward structure over momentum.",
      comment:
        "Investors are still weighing easing-rate optimism against concentration risk, which makes it useful to compare fund type, mandate, and downside behavior before chasing winners.",
      supportPoints: [
        "Balanced exposure remains the default until breadth improves decisively.",
        "The card stack gives you a fast read on where to lean without leaving the chat workflow.",
        "Use the evidence rail after each query to verify why a suggested profile actually fits.",
      ],
    };
  }, [messages]);

  const heroIntroMotion = !hasPlayedHeroEntry && !prefersReducedMotion;
  const heroCompactLead = marketView.supportPoints[0] || marketView.comment;

  const heroMobileActions = (
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
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />

      <Sidebar
        isCollapsed={sidebarCollapsed}
        isLoading={isLoading}
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
        <motion.div
          initial={heroIntroMotion ? { opacity: 0, x: 42 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="chat-hero-shell border-b border-border/70 px-3 py-3 md:px-5"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
            <AnimatePresence initial={false} mode="wait">
              {heroMode === "expanded" ? (
                <motion.div
                  key="hero-expanded"
                  initial={heroIntroMotion ? { opacity: 0, y: 16, scale: 0.992 } : { opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.988 }}
                  transition={HERO_TRANSITION}
                  className="chat-hero-card relative overflow-hidden rounded-[28px] border border-border/70 p-4 backdrop-blur-sm md:p-5"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  <div className="pointer-events-none absolute -left-14 top-5 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
                  <div className="pointer-events-none absolute -right-8 top-10 h-24 w-24 rounded-full bg-accent/10 blur-3xl" />

                  <div className="relative flex flex-col gap-4">
                    {heroMobileActions}

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,1fr)]">
                      <motion.div
                        initial={heroIntroMotion ? { opacity: 0, x: 18 } : false}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.34, delay: heroIntroMotion ? 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-[24px] border border-border/60 bg-background/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="gold" className="gap-1.5">
                            <ShieldCheck className="h-3 w-3" />
                            Protected chat
                          </Badge>
                          <Badge variant="outline" className="bg-background/78">
                            Session overview
                          </Badge>
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

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {marketView.supportPoints.map((point, index) => (
                            <motion.div
                              key={point}
                              initial={heroIntroMotion ? { opacity: 0, x: 12 } : false}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.28,
                                delay: heroIntroMotion ? 0.14 + index * 0.05 : 0,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="rounded-2xl border border-border/60 bg-card/72 px-3 py-3 text-[12px] leading-5 text-foreground/78"
                            >
                              <span className="mb-2 block h-1.5 w-1.5 rounded-full bg-primary/65" />
                              {point}
                            </motion.div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-end sm:justify-between">
                          <p className="max-w-xl text-[11px] leading-5 text-muted-foreground">
                            Use the profile cards to launch a fund-specific prompt in the current chat, then verify the answer against the evidence rail.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={compactHero}
                            className="gap-2 self-end bg-background/82 sm:self-auto"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                            Collapse overview
                          </Button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={heroIntroMotion ? { opacity: 0, x: 26 } : false}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.36, delay: heroIntroMotion ? 0.14 : 0, ease: [0.22, 1, 0.36, 1] }}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        {HERO_PROFILE_SUGGESTIONS.map((profile, index) => {
                          const meta = HERO_PROFILE_META[profile.id];
                          const Icon = meta.icon;
                          const isActive = marketView.focusProfile === profile.id;

                          return (
                            <motion.button
                              key={profile.id}
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleHeroProfileSelect(profile.query)}
                              initial={heroIntroMotion ? { opacity: 0, x: 34, scale: 0.985 } : false}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{
                                duration: 0.32,
                                delay: heroIntroMotion ? 0.18 + index * 0.06 : 0,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              whileHover={!prefersReducedMotion && !isLoading ? { y: -4 } : undefined}
                              whileTap={!prefersReducedMotion && !isLoading ? { y: -1, scale: 0.99 } : undefined}
                              aria-label={`Ask in chat about ${profile.fundName}`}
                              className={`hero-profile-card group text-left ${
                                isActive
                                  ? meta.activeClassName
                                  : "border-border/60 bg-background/70 hover:border-primary/24 hover:bg-primary/[0.04]"
                              } ${isLoading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                            >
                              <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                <span>{profile.label}</span>
                                <Icon className={`h-3.5 w-3.5 ${meta.iconClassName}`} />
                              </div>

                              <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="block font-mono text-[29px] font-semibold tracking-[-0.03em] text-foreground">
                                    {profile.code}
                                  </span>
                                  <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                                    {profile.fundName}
                                  </span>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badgeClassName}`}>
                                  {profile.badge}
                                </span>
                              </div>

                              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                                {profile.summary}
                              </p>

                              <div className="mt-4 flex items-center justify-end">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/75 transition-colors group-hover:text-primary">
                                  Ask in chat
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-compact"
                  initial={{ opacity: 0, y: -8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.99 }}
                  transition={HERO_TRANSITION}
                  className="chat-hero-compact relative overflow-hidden rounded-[24px] border border-border/70 p-3.5 shadow-[0_18px_38px_-28px_hsl(var(--primary)/0.22)] backdrop-blur-sm"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

                  <div className="relative flex flex-col gap-3">
                    {heroMobileActions}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/18 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          <Activity className="h-3 w-3" />
                          {marketView.eyebrow}
                        </span>
                        <span className="rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Compact overview
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {marketView.headline}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {heroCompactLead}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {HERO_PROFILE_SUGGESTIONS.map((profile) => {
                          const meta = HERO_PROFILE_META[profile.id];
                          return (
                            <span
                              key={profile.id}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${meta.compactClassName}`}
                            >
                              <span>{profile.label}</span>
                              <span className="font-mono">{profile.code}</span>
                            </span>
                          );
                        })}
                        <Button variant="outline" size="sm" onClick={expandHero} className="gap-2 bg-background/82">
                          <ChevronUp className="h-3.5 w-3.5" />
                          Show overview
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

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
                    Switch between `Code-based RAG` and `Foundry IQ` without changing the hero summary state.
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

"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  localizeToolName,
  localizeTraceInputSummary,
  localizeTraceOutputSummary,
} from "@/lib/tool-trace";
import { Message } from "./message";
import { ENHANCED_FOLLOW_UP_SUGGESTIONS } from "@/data/seed";
import type { Message as MessageType, ToolTraceStep } from "@/types";

interface ChatThreadProps {
  messages: MessageType[];
  isLoading: boolean;
  streamingContent?: string;
  queryProgress?: ToolTraceStep[];
  onCitationClick?: (id: number) => void;
  activeCitationId?: number | null;
  onSendMessage?: (message: string) => void;
}

export function ChatThread({
  messages,
  isLoading,
  streamingContent,
  queryProgress = [],
  onCitationClick,
  activeCitationId,
  onSendMessage,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingContent, queryProgress]);

  const openingPrompts = useMemo(
    () => ENHANCED_FOLLOW_UP_SUGGESTIONS.slice(0, 5),
    []
  );

  return (
    <ScrollArea className="flex-1 min-h-0" viewportClassName="h-full">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-3 py-4 md:px-5 md:py-5">
        {messages.length === 0 ? (
          <EmptyState prompts={openingPrompts.map((prompt) => prompt.text)} onSendMessage={onSendMessage} />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onCitationClick={onCitationClick}
                  activeCitationId={activeCitationId}
                />
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-subtle">
                    {streamingContent ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <div className="w-full max-w-3xl rounded-[28px] border border-border/80 bg-card/90 px-4 py-4 shadow-subtle">
                    {queryProgress.length > 0 && (
                      <div className="mb-3 rounded-[22px] border border-border/75 bg-background/68 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                        <div className="space-y-2.5">
                          {queryProgress.map((step) => (
                            <div key={step.id} className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                {step.status === "completed" ? (
                                  <CheckCircle2 className="h-4 w-4 text-signal-positive" />
                                ) : step.status === "error" ? (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[13px] text-foreground">
                                    {localizeToolName(step.toolName)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {step.durationMs}ms
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {localizeTraceInputSummary(step.inputSummary)}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground/88">
                                  &rarr; {localizeTraceOutputSummary(step.outputSummary)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {streamingContent ? (
                      <div className="markdown-content text-sm">
                        {streamingContent}
                        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-primary/45 align-middle" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/55" />
                        <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted/45" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
}

function EmptyState({
  prompts,
  onSendMessage,
}: {
  prompts: string[];
  onSendMessage?: (message: string) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-4xl">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-border/80 bg-card/90 px-6 py-7 shadow-panel">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected fund workflow
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Ask the fund backend anything, in a cleaner shell.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              The backend and streaming contract stay intact. This workspace only changes the way the product looks,
              organizes evidence, and guides the next query.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="gold">SEC + IMF sources</Badge>
              <Badge variant="outline">Citation-first answers</Badge>
              <Badge variant="success">PII gate enabled</Badge>
            </div>
          </div>

          <div className="rounded-[32px] border border-border/80 bg-card/90 px-5 py-5 shadow-subtle">
            <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Suggested opening prompts
            </div>
            <div className="mt-4 space-y-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage?.(prompt)}
                  className="group flex w-full items-start justify-between rounded-[22px] border border-border/75 bg-background/75 px-4 py-3 text-left transition-all hover:border-primary/25 hover:bg-primary/[0.05]"
                >
                  <span className="pr-3 text-sm leading-6 text-foreground/88">{prompt}</span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

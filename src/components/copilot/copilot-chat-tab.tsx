"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopilotMessageComponent } from "./copilot-message";
import type { CopilotMessage, ToolTraceStep } from "@/types";

interface CopilotChatTabProps {
  messages: CopilotMessage[];
  isLoading: boolean;
  streamingContent: string;
  streamingMeta: { intent?: string; policyName?: string } | null;
  progressSteps: ToolTraceStep[];
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

function StreamingText({ content }: { content: string }) {
  return (
    <div className="streaming-container markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => {
            if (typeof children === "string") {
              const wordParts = children.split(/(\s+)/);
              return (
                <p>
                  {wordParts.map((word, i) => (
                    <span key={i} className="stream-word" style={{ animationDelay: `${Math.max(0, i - wordParts.length + 6) * 30}ms` }}>
                      {word}
                    </span>
                  ))}
                </p>
              );
            }
            return <p>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function CopilotChatTab({
  messages,
  isLoading,
  streamingContent,
  streamingMeta,
  progressSteps,
  activeCitationId,
  onCitationClick,
}: CopilotChatTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, streamingContent, progressSteps]);

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-48 gap-4 rounded-xl border border-border/70 bg-card/70 shadow-subtle">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground font-medium">Fund Copilot is ready</p>
              <p className="text-xs text-muted-foreground mt-1">Ask for allocation, risk posture, or performance context.</p>
            </div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Institutional Workflow
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <CopilotMessageComponent
            key={msg.id}
            message={msg}
            activeCitationId={activeCitationId}
            onCitationClick={onCitationClick}
          />
        ))}

        {/* Progress steps during loading */}
        <AnimatePresence>
          {isLoading && progressSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card/80 border border-border/80 rounded-xl px-4 py-3 space-y-1.5 shadow-subtle"
            >
              {progressSteps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className="flex items-center gap-2 text-xs"
                >
                  {step.status === "completed" ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    </motion.div>
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  )}
                  <span className="text-muted-foreground font-mono">{step.toolName}</span>
                  {step.status === "completed" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-muted-foreground/60"
                    >
                      {step.durationMs}ms
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        {isLoading && !streamingContent && progressSteps.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/80 border border-border/80 rounded-xl px-4 py-3 shadow-subtle inline-block"
          >
            <div className="thinking-dots flex items-center gap-0.5">
              <span />
              <span />
              <span />
            </div>
          </motion.div>
        )}

        {/* Streaming content with modern animation */}
        {isLoading && streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card/80 border border-border/80 rounded-xl px-4 py-3 shadow-subtle streaming-shimmer"
          >
            {streamingMeta?.intent && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 mb-2"
              >
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {streamingMeta.intent}
                </span>
              </motion.div>
            )}
            <StreamingText content={streamingContent} />
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
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
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Ask the Copilot a question or use a Quick Action.
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card border rounded-xl px-4 py-3 space-y-1.5"
            >
              {progressSteps.map((step) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-xs"
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  )}
                  <span className="text-muted-foreground font-mono">{step.toolName}</span>
                  {step.status === "completed" && (
                    <span className="text-[10px] text-muted-foreground/60">{step.durationMs}ms</span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming content */}
        {isLoading && streamingContent && (
          <div className="bg-card border rounded-xl px-4 py-3">
            {streamingMeta?.intent && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {streamingMeta.intent}
                </span>
              </div>
            )}
            <div className="markdown-content streaming-cursor">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

"use client";

import { Children } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IntentBadge } from "./intent-badge";
import { PolicySummary } from "./policy-summary";
import { cn } from "@/lib/utils";
import type { CopilotMessage as CopilotMessageType } from "@/types";

interface CopilotMessageProps {
  message: CopilotMessageType;
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

export function CopilotMessageComponent({ message, activeCitationId, onCitationClick }: CopilotMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[86%] rounded-xl px-4 py-3 transition-shadow duration-200 border",
          isUser
            ? "bg-primary/10 border-primary/35 text-foreground shadow-subtle"
            : "bg-card/90 border-border/80 shadow-subtle hover:shadow-elevated"
        )}
      >
        {/* Intent + Policy header for assistant messages */}
        {!isUser && message.intent && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-2 pb-2 border-b border-border/70"
          >
            <IntentBadge intent={message.intent} />
            <PolicySummary policyName={message.policyName} />
          </motion.div>
        )}

        {/* Message content */}
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children, ...props }) => {
                const textNodes = Children.toArray(children);
                if (textNodes.every((node) => typeof node === "string")) {
                  const text = textNodes.join("");
                  const parts = text.split(/(\[\d+\])/g);
                  return (
                    <p {...props}>
                      {parts.map((part, i) => {
                        const match = part.match(/^\[(\d+)\]$/);
                        if (match) {
                          const id = Number.parseInt(match[1], 10);
                          return (
                            <span
                              key={i}
                              className={`citation-chip${activeCitationId === id ? " active" : ""}`}
                              onClick={() => onCitationClick(id)}
                            >
                              {id}
                            </span>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </p>
                  );
                }
                return <p {...props}>{children}</p>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}

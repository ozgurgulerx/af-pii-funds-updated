"use client";

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
    <div className={cn("flex gap-3 animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3",
          isUser
            ? "bg-brand/10 text-foreground"
            : "bg-card border"
        )}
      >
        {/* Intent + Policy header for assistant messages */}
        {!isUser && message.intent && (
          <div className="flex items-center gap-2 mb-2">
            <IntentBadge intent={message.intent} />
            <PolicySummary policyName={message.policyName} />
          </div>
        )}

        {/* Message content */}
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children, ...props }) => {
                if (typeof children === "string") {
                  const parts = children.split(/(\[\d+\])/g);
                  return (
                    <p {...props}>
                      {parts.map((part, i) => {
                        const match = part.match(/^\[(\d+)\]$/);
                        if (match) {
                          const id = parseInt(match[1]);
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
    </div>
  );
}

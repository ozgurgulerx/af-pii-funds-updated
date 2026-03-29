"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, CheckCircle2, ShieldAlert, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import type { Citation, Message as MessageType } from "@/types";

interface MessageProps {
  message: MessageType;
  onCitationClick?: (id: number) => void;
  activeCitationId?: number | null;
}

export function Message({
  message,
  onCitationClick,
  activeCitationId,
}: MessageProps) {
  const isUser = message.role === "user";
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const Container = isHydrated ? motion.div : "div";
  const containerProps = isHydrated
    ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22 },
      }
    : {};

  return (
    <Container
      {...containerProps}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <Avatar className="mt-1 h-10 w-10 shrink-0 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("max-w-3xl space-y-2", isUser && "items-end")}>
        <div className={cn("flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground", isUser && "justify-end")}>
          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          <span>{isUser ? "Analyst" : "Assistant"}</span>
          <span className="font-mono normal-case tracking-normal">{formatDateTime(message.createdAt)}</span>
        </div>

        <div
          className={cn(
            "rounded-[28px] border px-4 py-4 shadow-subtle",
            isUser
              ? "border-primary/22 bg-primary/[0.08] text-foreground"
              : "border-border/80 bg-card/92 text-card-foreground"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-7">{message.content}</p>
          ) : (
            <div className="markdown-content text-sm">
              <MarkdownContent
                content={message.content}
                citations={message.citations}
                onCitationClick={onCitationClick}
                activeCitationId={activeCitationId}
              />
            </div>
          )}
        </div>

        {!isUser && (
          <div className="flex flex-wrap items-center gap-2">
            {message.citations && message.citations.length > 0 ? (
              <>
                <Badge variant="success" className="gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  {message.citations.length} cited
                </Badge>
                {message.citations.map((citation, index) => (
                  <button
                    key={citation.id}
                    type="button"
                    onClick={() => onCitationClick?.(citation.id)}
                    className={cn(
                      "citation-chip",
                      activeCitationId === citation.id && "active"
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </>
            ) : (
              <Badge variant={message.isVerified ? "success" : "warning"} className="gap-1.5">
                {message.isVerified ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {message.isVerified ? "Verified" : "No explicit citations"}
              </Badge>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="mt-1 h-10 w-10 shrink-0 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </Container>
  );
}

function MarkdownContent({
  content,
  citations,
  onCitationClick,
  activeCitationId,
}: {
  content: string;
  citations?: Citation[];
  onCitationClick?: (id: number) => void;
  activeCitationId?: number | null;
}) {
  const processContent = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (!match) return part;

      const citationIndex = Number.parseInt(match[1], 10);
      const citationId = citations?.[citationIndex - 1]?.id ?? citationIndex;
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={() => onCitationClick?.(citationId)}
          className={cn(
            "citation-chip mx-0.5 align-middle",
            activeCitationId === citationId && "active"
          )}
        >
          {citationIndex}
        </button>
      );
    });
  };

  const renderChildren = (children: React.ReactNode) =>
    typeof children === "string" ? processContent(children) : children;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p>{renderChildren(children)}</p>,
        td: ({ children }) => <td>{renderChildren(children)}</td>,
        th: ({ children }) => <th>{renderChildren(children)}</th>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        h2: ({ children }) => <h2>{renderChildren(children)}</h2>,
        h3: ({ children }) => <h3>{renderChildren(children)}</h3>,
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full">{children}</table>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

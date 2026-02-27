"use client";

import { Children } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RefreshCw } from "lucide-react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./severity-badge";
import type { BriefSection as BriefSectionType } from "@/types";

interface BriefSectionProps {
  section: BriefSectionType;
  onToggleReviewed: (sectionId: string) => void;
  onRegenerate: (sectionId: string) => void;
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function BriefSectionComponent({
  section,
  onToggleReviewed,
  onRegenerate,
  activeCitationId,
  onCitationClick,
}: BriefSectionProps) {
  return (
    <AccordionItem value={section.id} className="mb-3 rounded-xl border border-border/80 bg-card/80 shadow-subtle">
      <AccordionTrigger className="hover:no-underline px-4 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SeverityBadge severity={section.severity} />
          <span className="text-sm font-medium truncate">{section.title}</span>
          <span className="text-[10px] text-muted-foreground ml-auto mr-2 shrink-0 font-mono">
            {timeAgo(section.lastUpdated)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Render [N] as clickable citation chips
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
            {section.content}
          </ReactMarkdown>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/70">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={section.isReviewed}
              onCheckedChange={() => onToggleReviewed(section.id)}
            />
            Reviewed
          </label>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 border-primary/35 bg-primary/5 hover:bg-primary/10"
            onClick={() => onRegenerate(section.id)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

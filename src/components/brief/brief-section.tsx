"use client";

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
    <AccordionItem value={section.id}>
      <AccordionTrigger className="hover:no-underline px-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SeverityBadge severity={section.severity} />
          <span className="text-sm font-medium truncate">{section.title}</span>
          <span className="text-[10px] text-muted-foreground ml-auto mr-2 shrink-0">
            {timeAgo(section.lastUpdated)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3">
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Render [N] as clickable citation chips
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
            {section.content}
          </ReactMarkdown>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={section.isReviewed}
              onCheckedChange={() => onToggleReviewed(section.id)}
            />
            Reviewed
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
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

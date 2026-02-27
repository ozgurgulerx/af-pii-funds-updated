"use client";

import { Cloud, AlertTriangle, BookOpen, FileText, Shield, Radio, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation, SourceType } from "@/types";

const sourceIcons: Record<SourceType, React.ElementType> = {
  METAR: Cloud,
  TAF: Cloud,
  NOTAM: AlertTriangle,
  SOP: BookOpen,
  ASRS: Shield,
  ATIS: Radio,
  CHART: Map,
};

interface CitationCardProps {
  citation: Citation;
  isActive: boolean;
  onClick: () => void;
}

export function CitationCard({ citation, isActive, onClick }: CitationCardProps) {
  const Icon = sourceIcons[citation.sourceType] || FileText;

  return (
    <button
      onClick={onClick}
        className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isActive
          ? "border-primary bg-primary/10 shadow-subtle"
          : "border-border/80 bg-card/70 hover:border-primary/35 hover:bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium">[{citation.id}]</span>
            <span className="text-[10px] text-muted-foreground uppercase">{citation.sourceType}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {Math.round(citation.confidence * 100)}%
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5 truncate">{citation.title}</p>
          <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-2">{citation.excerpt}</p>
          {citation.timestamp && (
            <span className="text-[10px] text-muted-foreground mt-1 block">{citation.timestamp}</span>
          )}
        </div>
      </div>
    </button>
  );
}

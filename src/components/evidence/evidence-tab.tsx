"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CitationCard } from "./citation-card";
import type { Citation, Artifact } from "@/types";

interface EvidenceTabProps {
  citations: Citation[];
  sourcesUsed: string[];
  artifacts: Artifact[];
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

const sourceColors: Record<string, string> = {
  METAR: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  TAF: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  NOTAM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  SOP: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  ASRS: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  ATIS: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  CHART: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

export function EvidenceTab({
  citations,
  sourcesUsed,
  artifacts,
  activeCitationId,
  onCitationClick,
}: EvidenceTabProps) {
  if (citations.length === 0 && sourcesUsed.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        No evidence yet. Ask a question to see sources.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Sources chips */}
        {sourcesUsed.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Sources Used
            </h4>
            <div className="flex flex-wrap gap-1">
              {sourcesUsed.map((src) => (
                <Badge
                  key={src}
                  variant="outline"
                  className={sourceColors[src] || "bg-gray-100 text-gray-700"}
                >
                  {src}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Artifacts
            </h4>
            <div className="flex gap-2">
              {artifacts.map((a) => (
                <span key={a.type} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {a.label}: {a.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Citations list */}
        {citations.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Citations ({citations.length})
            </h4>
            <div className="space-y-2">
              {citations.map((c) => (
                <CitationCard
                  key={c.id}
                  citation={c}
                  isActive={activeCitationId === c.id}
                  onClick={() => onCitationClick(c.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

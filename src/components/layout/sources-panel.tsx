"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  MenuSquare,
  Workflow,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { localizeSourceLabel } from "@/lib/tool-trace";
import { ToolTraceTab } from "@/components/evidence/tool-trace-tab";
import type { Citation, ToolTraceStep } from "@/types";

type RightRailTab = "evidence" | "tooltrace";

interface SourcesPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  citations: Citation[];
  sourcesUsed?: string[];
  isStreaming?: boolean;
  toolTrace?: ToolTraceStep[];
  activeTab?: RightRailTab;
  onTabChange?: (tab: RightRailTab) => void;
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SourcesPanelBody({
  isCollapsed,
  onToggle,
  citations,
  sourcesUsed = [],
  isStreaming = false,
  toolTrace = [],
  activeTab = "evidence",
  onTabChange,
  activeCitationId,
  onCitationClick,
  mobile = false,
  onMobileClose,
}: Omit<SourcesPanelProps, "mobileOpen"> & { mobile?: boolean }) {
  const showCollapsed = !mobile && isCollapsed;
  const activeCitation = citations.find((citation) => citation.id === activeCitationId) ?? null;
  const uniqueSourcesUsed = [...new Set(sourcesUsed.filter(Boolean))];
  const evidenceSourceCount = new Set([
    ...uniqueSourcesUsed,
    ...citations.map((citation) => citation.provider).filter(Boolean),
  ]).size;
  const focusedCount = activeTab === "tooltrace" ? toolTrace.length : (activeCitation ? activeCitation.id : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("min-w-0", showCollapsed && "hidden")}>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              {activeTab === "tooltrace" ? <Workflow className="h-3.5 w-3.5" /> : <FileSearch className="h-3.5 w-3.5" />}
              Evidence Intelligence
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {activeTab === "tooltrace" ? "Tool trace" : "Sources and provenance"}
            </p>
          </div>
          {mobile && onMobileClose ? (
            <Button variant="outline" size="icon-sm" onClick={onMobileClose} aria-label="Close evidence">
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="icon-sm" onClick={onToggle} aria-label={isCollapsed ? "Expand evidence rail" : "Collapse evidence rail"}>
              {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className={cn("mt-3 grid grid-cols-3 gap-2", showCollapsed && "hidden")}>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Citations</div>
            <div className="mt-1 font-display text-lg font-semibold">{citations.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {activeTab === "tooltrace" ? "Trace steps" : "Sources"}
            </div>
            <div className="mt-1 font-display text-lg font-semibold">
              {activeTab === "tooltrace"
                ? toolTrace.length
                : evidenceSourceCount}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Focused</div>
            <div className="mt-1 font-display text-lg font-semibold">{focusedCount}</div>
          </div>
        </div>

        <div className={cn("mt-3 grid grid-cols-2 gap-2", showCollapsed && "hidden")}>
          <button
            type="button"
            onClick={() => onTabChange?.("evidence")}
            className={cn(
              "rounded-full border px-3 py-2 text-[11px] font-medium transition-colors",
              activeTab === "evidence"
                ? "border-primary/24 bg-primary/[0.08] text-primary"
                : "border-border/70 bg-background/75 text-muted-foreground hover:text-foreground",
            )}
          >
            Evidence
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.("tooltrace")}
            className={cn(
              "rounded-full border px-3 py-2 text-[11px] font-medium transition-colors",
              activeTab === "tooltrace"
                ? "border-primary/24 bg-primary/[0.08] text-primary"
                : "border-border/70 bg-background/75 text-muted-foreground hover:text-foreground",
            )}
          >
            Tool trace
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1" viewportClassName="px-3 py-3">
        {showCollapsed ? (
          <div className="space-y-2">
            {citations.map((citation) => (
              <button
                key={citation.id}
                type="button"
                onClick={() => onCitationClick(citation.id)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-2xl border text-xs font-semibold transition-colors",
                  citation.id === activeCitationId
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border/80 hover:bg-background/70 hover:text-foreground"
                )}
              >
                {citation.id}
              </button>
            ))}
          </div>
        ) : activeTab === "tooltrace" ? (
          <ToolTraceTab steps={toolTrace} />
        ) : citations.length === 0 && uniqueSourcesUsed.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-background/70 px-4 py-8 text-center">
            <MenuSquare className="mx-auto h-8 w-8 text-muted-foreground/55" />
            <p className="mt-3 text-sm font-medium text-foreground">No evidence yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Run a chat query to populate the evidence rail.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueSourcesUsed.length > 0 && (
              <div className="rounded-[24px] border border-border/75 bg-background/78 px-4 py-3 shadow-subtle">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {isStreaming ? "Active sources" : "Sources used"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {uniqueSourcesUsed.map((source) => (
                    <Badge key={source} variant="outline" className="bg-background/80">
                      {localizeSourceLabel(source)}
                    </Badge>
                  ))}
                </div>
                {isStreaming && citations.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Waiting for cited rows from the active retrieval path.
                  </p>
                )}
              </div>
            )}

            {activeCitation && (
              <div className="rounded-[24px] border border-primary/20 bg-primary/[0.05] px-4 py-3 shadow-subtle">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  <Quote className="h-3.5 w-3.5" />
                  Active excerpt
                </div>
                <p className="mt-2 text-[13px] leading-6 text-foreground/85">
                  {activeCitation.excerpt ?? "Select a citation to inspect its excerpt."}
                </p>
              </div>
            )}

            {citations.map((citation) => (
              <button
                key={citation.id}
                type="button"
                onClick={() => {
                  onCitationClick(citation.id);
                  onMobileClose?.();
                }}
                className={cn(
                  "w-full rounded-[24px] border px-4 py-3 text-left transition-all",
                  citation.id === activeCitationId
                    ? "border-primary/28 bg-primary/[0.06] shadow-subtle"
                    : "border-border/75 bg-background/75 hover:border-primary/20 hover:bg-primary/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="citation-chip">{citation.id}</span>
                      <span className="truncate text-sm font-semibold text-foreground">{citation.provider}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>{citation.dataset}</div>
                      <div className="truncate font-mono">{citation.rowId}</div>
                      <div>{formatDateTime(citation.timestamp)}</div>
                    </div>
                  </div>
                  <Badge variant="success">{Math.round(citation.confidence * 100)}%</Badge>
                </div>

                {citation.excerpt && (
                  <p className="mt-3 line-clamp-3 text-[12.5px] leading-5 text-foreground/78">
                    {citation.excerpt}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function SourcesPanel({
  mobileOpen = false,
  onMobileClose,
  ...props
}: SourcesPanelProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      <motion.aside
        initial={prefersReducedMotion ? false : { x: 28, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.38, delay: prefersReducedMotion ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="hidden h-full w-[332px] shrink-0 border-l border-border/70 panel-glass lg:block"
      >
        <SourcesPanelBody {...props} />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
            onClick={onMobileClose}
          >
            <motion.aside
              initial={{ x: 36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 36, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="panel-glass ml-auto h-full w-[88vw] max-w-sm border-l border-border/70"
              onClick={(event) => event.stopPropagation()}
            >
              <SourcesPanelBody {...props} mobile={true} onMobileClose={onMobileClose} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

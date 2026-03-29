"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  MenuSquare,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import type { Citation } from "@/types";

interface SourcesPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  citations: Citation[];
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SourcesPanelBody({
  isCollapsed,
  onToggle,
  citations,
  activeCitationId,
  onCitationClick,
  mobile = false,
  onMobileClose,
}: Omit<SourcesPanelProps, "mobileOpen"> & { mobile?: boolean }) {
  const showCollapsed = !mobile && isCollapsed;
  const activeCitation = citations.find((citation) => citation.id === activeCitationId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("min-w-0", showCollapsed && "hidden")}>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              <FileSearch className="h-3.5 w-3.5" />
              Evidence Intelligence
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">Sources and provenance</p>
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
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Sources</div>
            <div className="mt-1 font-display text-lg font-semibold">
              {new Set(citations.map((citation) => citation.provider)).size}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Focused</div>
            <div className="mt-1 font-display text-lg font-semibold">{activeCitation ? activeCitation.id : 0}</div>
          </div>
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
        ) : citations.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-background/70 px-4 py-8 text-center">
            <MenuSquare className="mx-auto h-8 w-8 text-muted-foreground/55" />
            <p className="mt-3 text-sm font-medium text-foreground">No evidence yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Run a chat query to populate the evidence rail.</p>
          </div>
        ) : (
          <div className="space-y-3">
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
  return (
    <>
      <aside className="hidden h-full w-[332px] shrink-0 border-l border-border/70 panel-glass lg:block">
        <SourcesPanelBody {...props} />
      </aside>

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

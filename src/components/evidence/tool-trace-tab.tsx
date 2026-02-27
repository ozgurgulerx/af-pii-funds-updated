"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolTraceItem } from "./tool-trace-item";
import type { ToolTraceStep } from "@/types";

interface ToolTraceTabProps {
  steps: ToolTraceStep[];
  auditMode: boolean;
}

export function ToolTraceTab({ steps, auditMode }: ToolTraceTabProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        No tool trace available. Ask a question to see the trace.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="relative rounded-lg border border-border/80 bg-background/55 p-3">
          <div className="absolute left-[19px] top-5 bottom-6 w-px bg-border" />

          <div className="space-y-4">
            {steps.map((step) => (
              <ToolTraceItem key={step.id} step={step} showTokens={auditMode} />
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{steps.length} steps</span>
          <span>{steps.reduce((acc, s) => acc + s.durationMs, 0)}ms total</span>
          {auditMode && (
            <span>{steps.reduce((acc, s) => acc + (s.tokensUsed || 0), 0)} tokens</span>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

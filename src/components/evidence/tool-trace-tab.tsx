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
        {/* Vertical timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {steps.map((step) => (
              <ToolTraceItem key={step.id} step={step} showTokens={auditMode} />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
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

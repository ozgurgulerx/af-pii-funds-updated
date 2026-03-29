"use client";

import { ToolTraceItem } from "./tool-trace-item";
import type { ToolTraceStep } from "@/types";

interface ToolTraceTabProps {
  steps: ToolTraceStep[];
}

export function ToolTraceTab({ steps }: ToolTraceTabProps) {
  if (steps.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/80 bg-background/70 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No tool trace yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Run a chat query to watch backend steps stream here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-[24px] border border-border/75 bg-background/75 p-3">
        <div className="absolute bottom-6 left-[18px] top-5 w-px bg-border" />
        <div className="space-y-3">
          {steps.map((step) => (
            <ToolTraceItem key={step.id} step={step} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
        <span>{steps.length} steps</span>
        <span>{steps.reduce((total, step) => total + step.durationMs, 0)} ms total</span>
        <span>{steps.reduce((total, step) => total + (step.tokensUsed || 0), 0)} tok</span>
      </div>
    </div>
  );
}

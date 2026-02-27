import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolTraceStep } from "@/types";

interface ToolTraceItemProps {
  step: ToolTraceStep;
  showTokens: boolean;
}

export function ToolTraceItem({ step, showTokens }: ToolTraceItemProps) {
  return (
    <div className="flex items-start gap-3 relative">
      <div className="shrink-0 mt-0.5">
        {step.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : step.status === "error" ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        )}
      </div>

      <div className="flex-1 min-w-0 rounded-md border border-border/70 bg-card/70 p-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium">{step.toolName}</span>
          <span className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded",
            step.status === "completed" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}>
            {step.durationMs}ms
          </span>
          {showTokens && step.tokensUsed !== undefined && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {step.tokensUsed} tok
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{step.inputSummary}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">&rarr; {step.outputSummary}</p>
      </div>
    </div>
  );
}

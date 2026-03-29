import {
  CheckCircle2,
  Loader2,
  Shield,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  localizeRouteLabel,
  localizeToolName,
  localizeTraceInputSummary,
  localizeTraceOutputSummary,
} from "@/lib/tool-trace";
import type { ToolTraceStep } from "@/types";

interface ToolTraceItemProps {
  step: ToolTraceStep;
}

function parseRouteFromOutput(output: string): { route?: string; confidence?: number; rest: string } {
  const match = output.match(/route=(\w+)\s+confidence=([\d.]+);?\s*(.*)/i);
  if (!match) return { rest: output };
  return { route: match[1], confidence: Number.parseFloat(match[2]), rest: match[3] || "" };
}

function OutputSummary({ step }: { step: ToolTraceStep }) {
  const summary = localizeTraceOutputSummary(step.outputSummary);

  if (step.id === "pii-check") {
    const hasPii = /blocked/i.test(step.outputSummary);
    const categoryMatch = step.outputSummary.match(/categories:\s*([^|]+)/i);
    const categories = categoryMatch ? categoryMatch[1].trim() : "";

    return (
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/78">
        <span>&rarr;</span>
        {hasPii ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800">
              <ShieldAlert className="h-3 w-3" />
              PII detected
            </span>
            {categories && <span className="text-[10px] opacity-75">{categories}</span>}
          </>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700">
            <Shield className="h-3 w-3" />
            Clean input
          </span>
        )}
      </p>
    );
  }

  if (step.id === "intent-router-v2") {
    const { route, confidence, rest } = parseRouteFromOutput(step.outputSummary);
    if (route) {
      return (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/78">
          <span>&rarr;</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
            {localizeRouteLabel(route)}
            {confidence !== undefined && <span className="opacity-70">{Math.round(confidence * 100)}%</span>}
          </span>
          {rest && <span>{localizeTraceOutputSummary(rest)}</span>}
        </p>
      );
    }
  }

  if (step.id === "query-analysis") {
    const signals = summary.split(" | ").filter(Boolean);
    return (
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/78">
        <span>&rarr;</span>
        {signals.map((signal) => (
          <span
            key={signal}
            className="inline-flex items-center rounded-full border border-primary/14 bg-primary/[0.06] px-1.5 py-px text-[10px] font-medium text-primary/85"
          >
            {signal}
          </span>
        ))}
      </p>
    );
  }

  return <p className="mt-0.5 text-[11px] text-muted-foreground/78">&rarr; {summary}</p>;
}

export function ToolTraceItem({ step }: ToolTraceItemProps) {
  return (
    <div className="relative flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {step.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4 text-signal-positive" />
        ) : step.status === "error" ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>

      <div className="min-w-0 flex-1 rounded-[18px] border border-border/70 bg-background/72 p-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-foreground">
            {localizeToolName(step.toolName)}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-mono",
              step.status === "completed"
                ? "bg-muted text-muted-foreground"
                : step.status === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
            )}
          >
            {step.durationMs}ms
          </span>
          {step.tokensUsed !== undefined && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {step.tokensUsed} tokens
            </span>
          )}
        </div>

        <p className="mt-1 text-[11px] text-muted-foreground">
          {localizeTraceInputSummary(step.inputSummary)}
        </p>
        <OutputSummary step={step} />
      </div>
    </div>
  );
}

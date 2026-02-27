import { cn } from "@/lib/utils";
import type { Severity } from "@/types";

const severityConfig: Record<Severity, { label: string; className: string }> = {
  green: { label: "OK", className: "severity-green border" },
  amber: { label: "CAUTION", className: "severity-amber border" },
  red: { label: "WARNING", className: "severity-red border" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = severityConfig[severity];
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide", config.className)}>
      {config.label}
    </span>
  );
}

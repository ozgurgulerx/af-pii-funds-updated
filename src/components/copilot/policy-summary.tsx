import { FileText } from "lucide-react";

export function PolicySummary({ policyName }: { policyName?: string }) {
  if (!policyName) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
      <FileText className="h-3 w-3" />
      Policy: {policyName}
    </span>
  );
}

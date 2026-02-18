import { FileText } from "lucide-react";

export function PolicySummary({ policyName }: { policyName?: string }) {
  if (!policyName) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <FileText className="h-3 w-3" />
      Policy: {policyName}
    </span>
  );
}

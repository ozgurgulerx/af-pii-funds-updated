import { AlertTriangle, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-surface-panel/85 px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Not investment advice. Responses are informational and should be reviewed before use.</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Frontend redesign only. Backend behavior preserved.</span>
        </div>
      </div>
    </footer>
  );
}

import { Cloud, AlertTriangle, BookOpen, GitBranch, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Intent } from "@/types";

const intentConfig: Record<Intent, { label: string; icon: React.ElementType; className: string }> = {
  WX: { label: "Weather", icon: Cloud, className: "bg-sky-100 text-sky-800 border border-sky-300/70 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700" },
  NOTAM_AIRPORT: { label: "NOTAM", icon: AlertTriangle, className: "bg-amber-100 text-amber-900 border border-amber-300/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700" },
  SOP: { label: "SOP", icon: BookOpen, className: "bg-violet-100 text-violet-800 border border-violet-300/70 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-700" },
  OP_DECISION: { label: "Ops Decision", icon: GitBranch, className: "bg-emerald-100 text-emerald-800 border border-emerald-300/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700" },
  SAFETY: { label: "Safety", icon: Shield, className: "bg-rose-100 text-rose-800 border border-rose-300/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700" },
  GENERAL: { label: "General", icon: MessageCircle, className: "bg-slate-100 text-slate-700 border border-slate-300/70 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
};

export function IntentBadge({ intent }: { intent: Intent }) {
  const config = intentConfig[intent];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

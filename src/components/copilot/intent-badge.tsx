import { Cloud, AlertTriangle, BookOpen, GitBranch, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Intent } from "@/types";

const intentConfig: Record<Intent, { label: string; icon: React.ElementType; className: string }> = {
  WX: { label: "Weather", icon: Cloud, className: "bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800" },
  NOTAM_AIRPORT: { label: "NOTAM", icon: AlertTriangle, className: "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  SOP: { label: "SOP", icon: BookOpen, className: "bg-violet-50 text-violet-700 border border-violet-200/60 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800" },
  OP_DECISION: { label: "Ops Decision", icon: GitBranch, className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  SAFETY: { label: "Safety", icon: Shield, className: "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800" },
  GENERAL: { label: "General", icon: MessageCircle, className: "bg-slate-50 text-slate-600 border border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
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

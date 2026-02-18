import { Cloud, AlertTriangle, BookOpen, GitBranch, Shield, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Intent } from "@/types";

const intentConfig: Record<Intent, { label: string; icon: React.ElementType; className: string }> = {
  WX: { label: "Weather", icon: Cloud, className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  NOTAM_AIRPORT: { label: "NOTAM", icon: AlertTriangle, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  SOP: { label: "SOP", icon: BookOpen, className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
  OP_DECISION: { label: "Ops Decision", icon: GitBranch, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  SAFETY: { label: "Safety", icon: Shield, className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  GENERAL: { label: "General", icon: MessageCircle, className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
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

"use client";

import { motion } from "framer-motion";
import { PanelRightClose, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EvidenceTab } from "@/components/evidence/evidence-tab";
import { ToolTraceTab } from "@/components/evidence/tool-trace-tab";
import type { Citation, ToolTraceStep, Artifact } from "@/types";

interface RightRailProps {
  isCollapsed: boolean;
  onToggle: () => void;
  citations: Citation[];
  toolTrace: ToolTraceStep[];
  sourcesUsed: string[];
  artifacts: Artifact[];
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
  auditMode: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function RightRail({
  isCollapsed,
  onToggle,
  citations,
  toolTrace,
  sourcesUsed,
  artifacts,
  activeCitationId,
  onCitationClick,
  auditMode,
  activeTab,
  onTabChange,
}: RightRailProps) {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 56 : 360 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full border-l bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Toggle button */}
      <div className="h-10 flex items-center justify-center shrink-0 border-b">
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          {isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="px-3 pt-2 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="evidence" className="flex-1 text-xs">Evidence</TabsTrigger>
              <TabsTrigger value="tooltrace" className="flex-1 text-xs">Tool Trace</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="evidence" className="flex-1 min-h-0 mt-0">
            <EvidenceTab
              citations={citations}
              sourcesUsed={sourcesUsed}
              artifacts={artifacts}
              activeCitationId={activeCitationId}
              onCitationClick={onCitationClick}
            />
          </TabsContent>
          <TabsContent value="tooltrace" className="flex-1 min-h-0 mt-0">
            <ToolTraceTab steps={toolTrace} auditMode={auditMode} />
          </TabsContent>
        </Tabs>
      )}
    </motion.aside>
  );
}

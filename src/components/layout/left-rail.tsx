"use client";

import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeft, Clock, Zap, Radar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Flight, DemoMacro } from "@/types";

export interface RecentBriefing {
  id: string;
  flightNumber: string;
  timestamp: string;
}

interface LeftRailProps {
  isCollapsed: boolean;
  onToggle: () => void;
  flights: Flight[];
  selectedFlightId: string;
  onSelectFlight: (id: string) => void;
  recentBriefings: RecentBriefing[];
  macros: DemoMacro[];
  onMacroClick: (query: string) => void;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-emerald-500",
  boarding: "bg-blue-500",
  departed: "bg-sky-500",
  arrived: "bg-gray-400",
  delayed: "bg-amber-500",
  cancelled: "bg-red-500",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function LeftRail({
  isCollapsed,
  onToggle,
  flights,
  selectedFlightId,
  onSelectFlight,
  recentBriefings,
  macros,
  onMacroClick,
}: LeftRailProps) {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 58 : 300 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full border-r border-border/70 bg-card/90 flex flex-col shrink-0 overflow-hidden"
    >
      <div className="h-11 flex items-center justify-center shrink-0 border-b border-border/70">
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            <div className="rounded-xl border border-border/80 bg-gradient-to-br from-card to-secondary/40 p-3 shadow-subtle">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                  Market Pulse
                </h3>
                <Radar className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-mono text-xl font-semibold text-foreground">72</span>
                <span className="text-xs text-muted-foreground mb-0.5">tracked instruments</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                <TrendingUp className="h-3 w-3" />
                Data feed healthy
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] mb-2">
                Coverage Universe
              </h3>
              <div className="space-y-1">
                {flights.map((flight) => (
                  <button
                    key={flight.id}
                    onClick={() => onSelectFlight(flight.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-all",
                      flight.id === selectedFlightId
                        ? "bg-primary/10 text-foreground border-primary/45 shadow-subtle"
                        : "bg-background/60 border-border/70 hover:border-primary/30 hover:bg-primary/5 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusColors[flight.status])} />
                      <span className="font-mono font-medium text-xs tracking-wide">{flight.flightNumber}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 ml-4">
                      <span className="text-[11px] text-muted-foreground">
                        {flight.departure.iata}&rarr;{flight.arrival.iata}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTime(flight.std)}Z
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {recentBriefings.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] mb-2">
                  Recent Sessions
                </h3>
                <div className="space-y-1">
                  {recentBriefings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground rounded-md bg-background/60 border border-border/70"
                    >
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="font-mono">{b.flightNumber}</span>
                      <span className="ml-auto text-[10px]">
                        {new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] mb-2 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Quick Actions
              </h3>
              <div className="space-y-1">
                {macros.map((macro) => (
                  <button
                    key={macro.id}
                    onClick={() => onMacroClick(macro.query)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs border border-border/70 hover:border-primary/35 hover:bg-primary/5 transition-colors text-foreground bg-background/60"
                  >
                    {macro.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </motion.aside>
  );
}

"use client";

import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeft, Clock, Zap } from "lucide-react";
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
      animate={{ width: isCollapsed ? 56 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full border-r bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Toggle button */}
      <div className="h-10 flex items-center justify-center shrink-0 border-b">
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Flights Section */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Flights
              </h3>
              <div className="space-y-0.5">
                {flights.map((flight) => (
                  <button
                    key={flight.id}
                    onClick={() => onSelectFlight(flight.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors",
                      flight.id === selectedFlightId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusColors[flight.status])} />
                      <span className="font-mono font-medium text-xs">{flight.flightNumber}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 ml-4">
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

            {/* Recent Briefings */}
            {recentBriefings.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recent
                </h3>
                <div className="space-y-1">
                  {recentBriefings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground"
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

            {/* Demo Macros */}
            <div>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Quick Actions
              </h3>
              <div className="space-y-0.5">
                {macros.map((macro) => (
                  <button
                    key={macro.id}
                    onClick={() => onMacroClick(macro.query)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-foreground"
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

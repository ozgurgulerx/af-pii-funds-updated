"use client";

import { Plane, RefreshCw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Flight } from "@/types";

interface HeaderProps {
  selectedFlight: Flight | null;
  auditMode: boolean;
  onToggleAudit: (checked: boolean) => void;
  onRefreshData: () => void;
  onExportPdf: () => void;
}

function formatZulu(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

export function Header({ selectedFlight, auditMode, onToggleAudit, onRefreshData, onExportPdf }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0 shadow-subtle">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
          <Plane className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="font-semibold text-foreground text-sm leading-tight">Briefing Copilot</span>
          <span className="text-[10px] text-muted-foreground leading-tight">Fund Intelligence</span>
        </div>
      </div>

      {/* Center: Flight Context Bar */}
      {selectedFlight && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-mono font-bold text-sm text-primary">{selectedFlight.flightNumber}</span>
            <span className="text-sm text-muted-foreground">
              {selectedFlight.departure.icao}
              <span className="mx-1.5 text-primary/40">&rarr;</span>
              {selectedFlight.arrival.icao}
            </span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              STD {formatZulu(selectedFlight.std)}
              {selectedFlight.std !== selectedFlight.etd && (
                <span className="text-amber-600 ml-1">ETD {formatZulu(selectedFlight.etd)}</span>
              )}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 hidden lg:inline-flex border-primary/20 text-primary">
              {selectedFlight.aircraftType}
            </Badge>
          </div>
        </>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={onRefreshData} title="Refresh data" className="hover:bg-primary/10 hover:text-primary">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onExportPdf} title="Export PDF" className="hover:bg-primary/10 hover:text-primary">
          <FileDown className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          Audit
          <Switch checked={auditMode} onCheckedChange={onToggleAudit} />
        </label>
      </div>
    </header>
  );
}

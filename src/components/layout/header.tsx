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
    <header className="h-14 border-b bg-card flex items-center px-4 gap-4 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Plane className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-primary text-lg hidden sm:inline">Briefing Copilot</span>
      </div>

      {/* Center: Flight Context Bar */}
      {selectedFlight && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-mono font-bold text-sm">{selectedFlight.flightNumber}</span>
            <span className="text-sm text-muted-foreground">
              {selectedFlight.departure.icao}
              <span className="mx-1">&rarr;</span>
              {selectedFlight.arrival.icao}
            </span>
            <span className="text-xs text-muted-foreground hidden md:inline">
              STD {formatZulu(selectedFlight.std)}
              {selectedFlight.std !== selectedFlight.etd && (
                <span className="text-amber-600 ml-1">ETD {formatZulu(selectedFlight.etd)}</span>
              )}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 hidden lg:inline-flex">
              {selectedFlight.aircraftType}
            </Badge>
          </div>
        </>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={onRefreshData} title="Refresh data">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onExportPdf} title="Export PDF">
          <FileDown className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          Audit
          <Switch checked={auditMode} onCheckedChange={onToggleAudit} />
        </label>
      </div>
    </header>
  );
}

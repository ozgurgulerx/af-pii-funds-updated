"use client";

import { Activity, LineChart, RefreshCw, FileDown, ShieldCheck } from "lucide-react";
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
    <header className="h-16 border-b border-border/70 bg-card/85 backdrop-blur-md flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-subtle">
          <LineChart className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="font-semibold text-foreground text-sm leading-tight tracking-tight">Fund Assistant</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/90 leading-tight">Institutional Intelligence</span>
        </div>
      </div>

      {selectedFlight && (
        <>
          <Separator orientation="vertical" className="h-7 bg-border/70" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Badge variant="outline" className="h-6 rounded-md border-primary/40 bg-primary/10 text-primary font-mono">
              {selectedFlight.flightNumber}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedFlight.departure.icao}
              <span className="mx-1.5 text-primary/40">&rarr;</span>
              {selectedFlight.arrival.icao}
            </span>
            <span className="text-xs text-muted-foreground hidden md:inline font-mono">
              LIVE {formatZulu(selectedFlight.std)}
              {selectedFlight.std !== selectedFlight.etd && (
                <span className="text-primary ml-1">REV {formatZulu(selectedFlight.etd)}</span>
              )}
            </span>
            <Badge variant="outline" className="text-[10px] h-5 hidden lg:inline-flex border-accent/40 text-accent bg-accent/10">
              {selectedFlight.aircraftType}
            </Badge>
          </div>
        </>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className="hidden md:inline-flex h-6 rounded-md border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Activity className="mr-1 h-3 w-3" />
          Market Live
        </Badge>
        <Button variant="ghost" size="icon-sm" onClick={onRefreshData} title="Refresh data" className="hover:bg-primary/10 hover:text-primary">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onExportPdf} title="Export PDF" className="hover:bg-primary/10 hover:text-primary">
          <FileDown className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1 bg-border/70" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Audit
          <Switch checked={auditMode} onCheckedChange={onToggleAudit} />
        </label>
      </div>
    </header>
  );
}

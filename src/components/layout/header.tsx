"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Building2,
  Database,
  LogOut,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DATA_PROVIDERS } from "@/data/seed";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setTimestamp(
      new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date())
    );
  }, []);

  const providerLabel = useMemo(
    () => DATA_PROVIDERS.map((provider) => provider.name).join(" + "),
    []
  );

  return (
    <header className="border-b border-border/80 bg-gradient-to-r from-surface-panel/95 via-surface-elevated/55 to-surface-panel/95 px-3 py-3 backdrop-blur-sm md:px-4">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-blue">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-semibold leading-none md:text-base">
              AF PII Funds Updated
            </h1>
            <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">
              Fund intelligence workspace with protected search
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <Badge variant="gold" className="gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            PII Protected
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Database className="h-3 w-3" />
            {providerLabel}
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-mono">
            <Sparkles className="h-3 w-3" />
            {mounted ? timestamp : "loading"}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle theme"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{mounted ? (theme === "dark" ? "Switch to light" : "Switch to dark") : "Toggle theme"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}

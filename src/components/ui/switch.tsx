"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function ToggleGroup({
  value,
  onValueChange,
  options,
  className,
}: ToggleGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/80 bg-background/80 p-1 shadow-subtle backdrop-blur-sm",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-subtle"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

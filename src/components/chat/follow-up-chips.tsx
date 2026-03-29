"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { QueryType } from "@/data/seed";

interface FollowUpSuggestion {
  text: string;
  type: QueryType;
}

interface FollowUpChipsProps {
  suggestions: string[] | FollowUpSuggestion[];
  onSelect: (suggestion: string) => void;
  isVisible: boolean;
}

export function FollowUpChips({
  suggestions,
  onSelect,
  isVisible,
}: FollowUpChipsProps) {
  if (!isVisible || suggestions.length === 0) return null;

  const normalizedSuggestions = suggestions.map((suggestion) =>
    typeof suggestion === "string" ? suggestion : suggestion.text
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-border/70 px-3 py-3 md:px-5"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Suggested follow-ups
        </div>
        <div className="flex flex-wrap gap-2">
          {normalizedSuggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="group inline-flex items-center gap-2 rounded-full border border-border/75 bg-background/78 px-3 py-2 text-[12px] text-foreground/88 transition-all hover:border-primary/24 hover:bg-primary/[0.05]"
            >
              <span>{suggestion}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

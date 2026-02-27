"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect: (query: string) => void;
  isVisible: boolean;
}

export function FollowUpChips({ suggestions, onSelect, isVisible }: FollowUpChipsProps) {
  return (
    <AnimatePresence>
      {isVisible && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap gap-1.5 px-3 pb-2"
        >
          {suggestions.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-full border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/15 hover:text-primary transition-all duration-200"
                onClick={() => onSelect(s)}
              >
                {s}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

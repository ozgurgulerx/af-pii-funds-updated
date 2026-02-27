"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageComposerProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function MessageComposer({ onSubmit, isLoading, disabled }: MessageComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, disabled, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="border-t border-border/70 bg-card/80 backdrop-blur-sm px-3 py-3 shrink-0">
      <div className="flex items-end gap-2 max-w-none">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about allocations, performance, risk, or strategy..."
            disabled={isLoading || disabled}
            rows={1}
            className="w-full resize-none bg-background/85 rounded-xl border border-input/85 px-4 py-2.5 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px] transition-all duration-200"
          />
        </div>
        <Button
          size="icon-sm"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || disabled}
          className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-subtle hover:shadow-elevated disabled:shadow-none"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

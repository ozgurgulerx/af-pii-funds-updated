"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  MessageSquarePlus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { SAMPLE_CONVERSATIONS } from "@/data/seed";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectConversation: (id: string) => void;
  activeConversationId?: string;
  onNewChat: () => void;
  quickPrompts?: string[];
  onQuickPromptSelect?: (query: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarBody({
  isCollapsed,
  onToggle,
  onSelectConversation,
  activeConversationId,
  onNewChat,
  quickPrompts,
  onQuickPromptSelect,
  mobile = false,
  onMobileClose,
}: Omit<SidebarProps, "mobileOpen"> & { mobile?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredConversations = useMemo(
    () =>
      SAMPLE_CONVERSATIONS.filter((conversation) =>
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const showCollapsed = !mobile && isCollapsed;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className={cn("min-w-0", showCollapsed && "hidden")}>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              <Menu className="h-3.5 w-3.5" />
              Session Rail
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">Conversations</p>
          </div>
          <div className="flex items-center gap-2">
            {mobile && onMobileClose ? (
              <Button variant="outline" size="icon-sm" onClick={onMobileClose} aria-label="Close sessions">
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="icon-sm" onClick={onToggle} aria-label={isCollapsed ? "Expand rail" : "Collapse rail"}>
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className={cn("mt-3 space-y-3", showCollapsed && "hidden")}>
          <Button onClick={onNewChat} className="w-full justify-start gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            <span>New secured chat</span>
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search saved sessions"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 rounded-2xl border-border/80 bg-background/80 pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Tracked</div>
              <div className="mt-1 font-display text-lg font-semibold">{SAMPLE_CONVERSATIONS.length}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Verified</div>
              <div className="mt-1 font-display text-lg font-semibold">
                {SAMPLE_CONVERSATIONS.reduce((count, conversation) => count + conversation.messages.filter((message) => message.isVerified).length, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1" viewportClassName="px-3 py-3">
        {showCollapsed ? (
          <div className="space-y-2">
            <Button onClick={onNewChat} size="icon-sm" className="w-full">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-2xl border transition-colors",
                  conversation.id === activeConversationId
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border/80 hover:bg-background/70 hover:text-foreground"
                )}
              >
                <Clock3 className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Recent sessions
              </div>
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const verifiedCount = conversation.messages.filter((message) => message.isVerified).length;
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        onSelectConversation(conversation.id);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "w-full rounded-[22px] border px-3 py-3 text-left transition-all",
                        conversation.id === activeConversationId
                          ? "border-primary/30 bg-primary/[0.06] shadow-subtle"
                          : "border-border/70 bg-background/75 hover:border-primary/20 hover:bg-primary/[0.03]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{conversation.title}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(conversation.updatedAt)}</div>
                        </div>
                        <Badge variant={verifiedCount > 0 ? "success" : "outline"}>
                          {verifiedCount > 0 ? `${verifiedCount} verified` : "seed"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {quickPrompts && quickPrompts.length > 0 && onQuickPromptSelect && (
              <section>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ready prompts
                </div>
                <div className="space-y-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        onQuickPromptSelect(prompt);
                        onMobileClose?.();
                      }}
                      className="w-full rounded-2xl border border-border/70 bg-background/75 px-3 py-2 text-left text-[13px] text-foreground/85 transition-colors hover:border-primary/25 hover:bg-primary/[0.05]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  ...props
}: SidebarProps) {
  return (
    <>
      <aside className="hidden h-full w-[288px] shrink-0 border-r border-border/70 panel-glass lg:block">
        <SidebarBody {...props} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
            onClick={onMobileClose}
          >
            <motion.aside
              initial={{ x: -36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -36, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="panel-glass h-full w-[86vw] max-w-sm border-r border-border/70"
              onClick={(event) => event.stopPropagation()}
            >
              <SidebarBody {...props} mobile={true} onMobileClose={onMobileClose} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

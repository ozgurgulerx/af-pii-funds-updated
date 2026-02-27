"use client";

import { useReducer, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LeftRail, type RecentBriefing } from "@/components/layout/left-rail";
import { RightRail } from "@/components/layout/right-rail";
import { BriefPackTab } from "@/components/brief/brief-pack-tab";
import { CopilotChatTab } from "@/components/copilot/copilot-chat-tab";
import { FollowUpChips } from "@/components/copilot/follow-up-chips";
import { MessageComposer } from "@/components/composer/message-composer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { parseSSELine } from "@/lib/chat";
import { generateId } from "@/lib/utils";
import { flights, getFlightById } from "@/data/flights";
import { getBriefPack } from "@/data/brief-pack";
import { demoMacros } from "@/data/macros";
import type { BriefPack, CopilotMessage, Citation, ToolTraceStep, Artifact } from "@/types";

// ── State ─────────────────────────────────────────────────────

interface State {
  leftRailCollapsed: boolean;
  rightRailCollapsed: boolean;
  selectedFlightId: string;
  activeTab: "briefpack" | "copilot";
  activeRightTab: "evidence" | "tooltrace";
  auditMode: boolean;
  briefPack: BriefPack | null;
  messages: CopilotMessage[];
  isLoading: boolean;
  streamingContent: string;
  streamingMeta: { intent?: string; policyName?: string } | null;
  progressSteps: ToolTraceStep[];
  citations: Citation[];
  toolTrace: ToolTraceStep[];
  sourcesUsed: string[];
  artifacts: Artifact[];
  activeCitationId: number | null;
  recentBriefings: RecentBriefing[];
  followUps: string[];
}

type Action =
  | { type: "TOGGLE_LEFT_RAIL" }
  | { type: "TOGGLE_RIGHT_RAIL" }
  | { type: "SELECT_FLIGHT"; flightId: string }
  | { type: "SET_ACTIVE_TAB"; tab: "briefpack" | "copilot" }
  | { type: "SET_ACTIVE_RIGHT_TAB"; tab: "evidence" | "tooltrace" }
  | { type: "TOGGLE_AUDIT"; checked: boolean }
  | { type: "SET_BRIEF_PACK"; briefPack: BriefPack | null }
  | { type: "TOGGLE_REVIEWED"; sectionId: string }
  | { type: "ADD_USER_MESSAGE"; message: CopilotMessage }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "APPEND_STREAMING"; content: string }
  | { type: "SET_STREAMING_META"; meta: { intent?: string; policyName?: string } }
  | { type: "ADD_PROGRESS_STEP"; step: ToolTraceStep }
  | { type: "UPDATE_PROGRESS_STEP"; step: ToolTraceStep }
  | { type: "COMPLETE_RESPONSE"; message: CopilotMessage; toolTrace: ToolTraceStep[] }
  | { type: "RESET_STREAMING" }
  | { type: "SET_TOOL_TRACE"; toolTrace: ToolTraceStep[] }
  | { type: "SET_ACTIVE_CITATION"; id: number | null }
  | { type: "SET_CITATIONS"; citations: Citation[] }
  | { type: "SET_METADATA"; sourcesUsed: string[]; artifacts: Artifact[] }
  | { type: "SET_FOLLOW_UPS"; followUps: string[] }
  | { type: "ADD_RECENT_BRIEFING"; briefing: RecentBriefing };

const initialState: State = {
  leftRailCollapsed: false,
  rightRailCollapsed: false,
  selectedFlightId: "xq801",
  activeTab: "briefpack",
  activeRightTab: "evidence",
  auditMode: false,
  briefPack: null,
  messages: [],
  isLoading: false,
  streamingContent: "",
  streamingMeta: null,
  progressSteps: [],
  citations: [],
  toolTrace: [],
  sourcesUsed: [],
  artifacts: [],
  activeCitationId: null,
  recentBriefings: [],
  followUps: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TOGGLE_LEFT_RAIL":
      return { ...state, leftRailCollapsed: !state.leftRailCollapsed };
    case "TOGGLE_RIGHT_RAIL":
      return { ...state, rightRailCollapsed: !state.rightRailCollapsed };
    case "SELECT_FLIGHT":
      return { ...state, selectedFlightId: action.flightId, messages: [], followUps: [], citations: [], toolTrace: [], sourcesUsed: [], artifacts: [] };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_ACTIVE_RIGHT_TAB":
      return { ...state, activeRightTab: action.tab };
    case "TOGGLE_AUDIT":
      return { ...state, auditMode: action.checked };
    case "SET_BRIEF_PACK":
      return { ...state, briefPack: action.briefPack };
    case "TOGGLE_REVIEWED":
      if (!state.briefPack) return state;
      return {
        ...state,
        briefPack: {
          ...state.briefPack,
          sections: state.briefPack.sections.map((s) =>
            s.id === action.sectionId ? { ...s, isReviewed: !s.isReviewed } : s
          ),
        },
      };
    case "ADD_USER_MESSAGE":
      return { ...state, messages: [...state.messages, action.message], followUps: [] };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "APPEND_STREAMING":
      return { ...state, streamingContent: state.streamingContent + action.content };
    case "SET_STREAMING_META":
      return { ...state, streamingMeta: action.meta };
    case "ADD_PROGRESS_STEP":
      return { ...state, progressSteps: [...state.progressSteps, action.step] };
    case "UPDATE_PROGRESS_STEP":
      return {
        ...state,
        progressSteps: state.progressSteps.map((s) =>
          s.id === action.step.id ? action.step : s
        ),
      };
    case "COMPLETE_RESPONSE":
      return {
        ...state,
        messages: [...state.messages, action.message],
        toolTrace: action.toolTrace,
        isLoading: false,
        streamingContent: "",
        streamingMeta: null,
        progressSteps: [],
      };
    case "RESET_STREAMING":
      return { ...state, streamingContent: "", streamingMeta: null, progressSteps: [] };
    case "SET_TOOL_TRACE":
      return { ...state, toolTrace: action.toolTrace };
    case "SET_ACTIVE_CITATION":
      return { ...state, activeCitationId: action.id };
    case "SET_CITATIONS":
      return { ...state, citations: action.citations };
    case "SET_METADATA":
      return { ...state, sourcesUsed: action.sourcesUsed, artifacts: action.artifacts };
    case "SET_FOLLOW_UPS":
      return { ...state, followUps: action.followUps };
    case "ADD_RECENT_BRIEFING":
      return {
        ...state,
        recentBriefings: [action.briefing, ...state.recentBriefings].slice(0, 5),
      };
    default:
      return state;
  }
}

// ── Component ─────────────────────────────────────────────────

export default function BriefPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [storedCollapse, setStoredCollapse] = useLocalStorage("leftRailCollapsed", false);
  const [storedFlight, setStoredFlight] = useLocalStorage("selectedFlightId", "xq801");

  // Sync localStorage on mount
  useEffect(() => {
    if (storedCollapse) dispatch({ type: "TOGGLE_LEFT_RAIL" });
    if (storedFlight && storedFlight !== "xq801") {
      dispatch({ type: "SELECT_FLIGHT", flightId: storedFlight });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load brief pack when flight changes
  useEffect(() => {
    const bp = getBriefPack(state.selectedFlightId);
    dispatch({ type: "SET_BRIEF_PACK", briefPack: bp || null });
    setStoredFlight(state.selectedFlightId);
  }, [state.selectedFlightId, setStoredFlight]);

  const selectedFlight = getFlightById(state.selectedFlightId) || null;

  // ── SSE Chat Handler ────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMsg: CopilotMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: "ADD_USER_MESSAGE", message: userMsg });
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "RESET_STREAMING" });
      dispatch({ type: "SET_TOOL_TRACE", toolTrace: [] });

      let fullText = "";
      let intent: string | undefined;
      let policyName: string | undefined;
      let receivedCitations: Citation[] = [];
      let receivedToolTrace: ToolTraceStep[] = [];
      let receivedFollowUps: string[] = [];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...state.messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            flightId: state.selectedFlightId,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Chat request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunk of lines) {
            for (const line of chunk.split("\n")) {
              const event = parseSSELine(line);
              if (!event) continue;

              switch (event.type) {
                case "metadata":
                  intent = event.intent;
                  policyName = event.policyName;
                  dispatch({ type: "SET_STREAMING_META", meta: { intent: event.intent, policyName: event.policyName } });
                  dispatch({ type: "SET_METADATA", sourcesUsed: event.sourcesUsed, artifacts: event.artifacts });
                  break;
                case "progress": {
                  const step = event.step as ToolTraceStep;
                  if (step.status === "running") {
                    dispatch({ type: "ADD_PROGRESS_STEP", step });
                  } else {
                    dispatch({ type: "UPDATE_PROGRESS_STEP", step });
                  }
                  receivedToolTrace = [...receivedToolTrace.filter((s) => s.id !== step.id), step];
                  break;
                }
                case "text":
                  fullText += event.content;
                  dispatch({ type: "APPEND_STREAMING", content: event.content });
                  break;
                case "citations":
                  receivedCitations = event.citations as Citation[];
                  dispatch({ type: "SET_CITATIONS", citations: receivedCitations });
                  break;
                case "done":
                  receivedFollowUps = event.followUps || [];
                  break;
                case "error":
                  fullText = `Error: ${event.message}`;
                  break;
              }
            }
          }
        }
      } catch (error) {
        fullText = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
      }

      // Complete the response
      const assistantMsg: CopilotMessage = {
        id: generateId(),
        role: "assistant",
        content: fullText,
        timestamp: new Date().toISOString(),
        intent: intent as CopilotMessage["intent"],
        policyName,
        citations: receivedCitations,
        toolTrace: receivedToolTrace,
        followUps: receivedFollowUps,
      };

      dispatch({ type: "COMPLETE_RESPONSE", message: assistantMsg, toolTrace: receivedToolTrace });
      dispatch({ type: "SET_FOLLOW_UPS", followUps: receivedFollowUps });

      // Update tool trace in right rail
      if (receivedToolTrace.length > 0) {
        dispatch({ type: "SET_ACTIVE_RIGHT_TAB", tab: "tooltrace" });
      }

      // Add to recent briefings
      if (selectedFlight) {
        dispatch({
          type: "ADD_RECENT_BRIEFING",
          briefing: {
            id: generateId(),
            flightNumber: selectedFlight.flightNumber,
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
    [state.messages, state.selectedFlightId, selectedFlight]
  );

  const handleMacroClick = useCallback(
    (query: string) => {
      dispatch({ type: "SET_ACTIVE_TAB", tab: "copilot" });
      handleSendMessage(query);
    },
    [handleSendMessage]
  );

  const handleToggleLeftRail = useCallback(() => {
    dispatch({ type: "TOGGLE_LEFT_RAIL" });
    setStoredCollapse(!state.leftRailCollapsed);
  }, [state.leftRailCollapsed, setStoredCollapse]);

  const handleCitationClick = useCallback((id: number) => {
    dispatch({ type: "SET_ACTIVE_CITATION", id });
    dispatch({ type: "SET_ACTIVE_RIGHT_TAB", tab: "evidence" });
    if (state.rightRailCollapsed) {
      dispatch({ type: "TOGGLE_RIGHT_RAIL" });
    }
  }, [state.rightRailCollapsed]);

  return (
    <>
      <Header
        selectedFlight={selectedFlight}
        auditMode={state.auditMode}
        onToggleAudit={(checked) => dispatch({ type: "TOGGLE_AUDIT", checked })}
        onRefreshData={() => {
          const bp = getBriefPack(state.selectedFlightId);
          dispatch({ type: "SET_BRIEF_PACK", briefPack: bp || null });
        }}
        onExportPdf={() => {
          alert("Export module integration pending.");
        }}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden panel-grid">
        <LeftRail
          isCollapsed={state.leftRailCollapsed}
          onToggle={handleToggleLeftRail}
          flights={flights}
          selectedFlightId={state.selectedFlightId}
          onSelectFlight={(id) => dispatch({ type: "SELECT_FLIGHT", flightId: id })}
          recentBriefings={state.recentBriefings}
          macros={demoMacros}
          onMacroClick={handleMacroClick}
        />

        <div className="flex-1 min-w-0 flex flex-col border-x border-border/40 bg-gradient-to-b from-background/60 to-background">
          <Tabs
            value={state.activeTab}
            onValueChange={(v) => dispatch({ type: "SET_ACTIVE_TAB", tab: v as "briefpack" | "copilot" })}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border/70 bg-card/75 backdrop-blur-sm">
              <TabsList className="h-10 border border-border/70 bg-secondary/70">
                <TabsTrigger value="briefpack" className="text-xs font-medium">Portfolio Brief</TabsTrigger>
                <TabsTrigger value="copilot" className="text-xs font-medium">Fund Copilot</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="briefpack" className="flex-1 min-h-0 mt-0">
              <BriefPackTab
                briefPack={state.briefPack}
                onToggleReviewed={(sectionId) => dispatch({ type: "TOGGLE_REVIEWED", sectionId })}
                onRegenerateSection={(sectionId) => {
                  dispatch({ type: "SET_ACTIVE_TAB", tab: "copilot" });
                  const section = state.briefPack?.sections.find((s) => s.id === sectionId);
                  if (section) {
                    handleSendMessage(`Regenerate the ${section.title} section of the briefing`);
                  }
                }}
                activeCitationId={state.activeCitationId}
                onCitationClick={handleCitationClick}
              />
            </TabsContent>

            <TabsContent value="copilot" className="flex-1 min-h-0 mt-0 flex flex-col">
              <div className="flex-1 min-h-0">
                <CopilotChatTab
                  messages={state.messages}
                  isLoading={state.isLoading}
                  streamingContent={state.streamingContent}
                  streamingMeta={state.streamingMeta}
                  progressSteps={state.progressSteps}
                  activeCitationId={state.activeCitationId}
                  onCitationClick={handleCitationClick}
                />
              </div>
              <FollowUpChips
                suggestions={state.followUps}
                onSelect={handleSendMessage}
                isVisible={!state.isLoading && state.followUps.length > 0}
              />
              <MessageComposer
                onSubmit={handleSendMessage}
                isLoading={state.isLoading}
              />
            </TabsContent>
          </Tabs>
        </div>

        <RightRail
          isCollapsed={state.rightRailCollapsed}
          onToggle={() => dispatch({ type: "TOGGLE_RIGHT_RAIL" })}
          citations={state.citations}
          toolTrace={state.isLoading ? state.progressSteps : state.toolTrace}
          sourcesUsed={state.sourcesUsed}
          artifacts={state.artifacts}
          activeCitationId={state.activeCitationId}
          onCitationClick={handleCitationClick}
          auditMode={state.auditMode}
          activeTab={state.activeRightTab}
          onTabChange={(tab) => dispatch({ type: "SET_ACTIVE_RIGHT_TAB", tab: tab as "evidence" | "tooltrace" })}
        />
      </main>

      <Footer />
    </>
  );
}

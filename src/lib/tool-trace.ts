import type { ToolTraceStep } from "@/types";

const TOOL_NAME_LABELS: Record<string, string> = {
  "Query Rewrite": "Query Rewrite",
  "Query Analysis": "Query Analysis",
  "Intent Router V2": "Intent Router V2",
  "LLM Response Generation": "LLM Response Generation",
  "PII Detection": "PII Detection",
  "Context Compaction": "Context Compaction",
  "Answer Brief Builder": "Answer Brief Builder",
  "Answer Validation": "Answer Validation",
  "Azure AI Search (Filter)": "Azure AI Search (Filter)",
  "Azure AI Search (Semantic)": "Azure AI Search (Semantic)",
  "Azure AI Search (Semantic + Macro)": "Azure AI Search (Semantic + Macro)",
  "Azure AI Search (Hybrid)": "Azure AI Search (Hybrid)",
  "Azure AI Search (Hybrid + Market)": "Azure AI Search (Hybrid + Market)",
  "Azure AI Search (Market)": "Azure AI Search (Market)",
  "Azure AI Search (Macro Reports)": "Azure AI Search (Macro Reports)",
  "Azure AI Search (Agentic)": "Azure AI Search (Agentic)",
  "PostgreSQL (SQL Query)": "PostgreSQL (SQL Query)",
  "Chain (Market → Fund)": "Chain (Market → Fund)",
  "Foundry IQ": "Foundry IQ",
};

const ROUTE_LABELS: Record<string, string> = {
  SQL: "SQL",
  FILTER_SEARCH: "Filter Search",
  SEMANTIC: "Semantic Search",
  SEMANTIC_SEARCH: "Semantic Search",
  RAPTOR: "Macro Reports",
  MARKET_SEARCH: "Market Search",
  SEMANTIC_RAPTOR: "Semantic + Macro",
  HYBRID: "Hybrid Search",
  CHAIN: "Chain",
  AGENTIC: "Agentic",
  FOUNDRY_IQ: "Foundry IQ",
};

export function localizeRouteLabel(route: string): string {
  return ROUTE_LABELS[route] ?? route;
}

export function localizeToolName(toolName: string): string {
  return TOOL_NAME_LABELS[toolName] ?? toolName;
}

export function localizeTraceInputSummary(summary: string): string {
  let text = summary.trim();
  if (!text) return text;

  text = text.replace(/^message inspection$/i, "message inspection");
  text = text.replace(/^history_len=(\d+)$/i, "history length=$1");
  text = text.replace(/^context_len=(\d+), history_len=(\d+)$/i, "context length=$1, history length=$2");
  text = text.replace(/^query:\s*/i, "query: ");
  text = text.replace(/^message length=(\d+) chars$/i, "message length=$1 chars");
  text = text.replace(/^(\d+) messages, session=(.+)$/i, (_, count: string, session: string) => {
    const normalizedSession = session === "single" ? "single" : session;
    return `${count} messages, session=${normalizedSession}`;
  });

  return text;
}

export function localizeTraceOutputSummary(summary: string): string {
  let text = summary.trim();
  if (!text) return text;

  text = text.replace(/^clean input$/i, "Clean input");
  text = text.replace(/^single-session context preserved$/i, "Single-session context preserved");
  text = text.replace(/^skipped: no_history$/i, "Skipped: no history");
  text = text.replace(/^skipped: already standalone$/i, "Skipped: already standalone");
  text = text.replace(/route=(\w+)\s+confidence=([\d.]+);?\s*(.*)/i, (_, route: string, confidence: string, rest: string) => {
    const localizedRest = rest?.trim() ? rest.trim() : "route selected";
    return `route=${localizeRouteLabel(route)} confidence=${confidence}; ${localizedRest}`;
  });
  text = text.replace(/^(\d+)\s+citation\(s\)\s+prepared$/i, "$1 citation(s) prepared");
  text = text.replace(/^verified with (\d+) citation\(s\)$/i, "verified with $1 citation(s)");
  text = text.replace(/^verified without explicit citations$/i, "verified without explicit citations");
  text = text.replace(/^response drafted from retrieved evidence$/i, "response drafted from retrieved evidence");
  text = text.replace(/^summary composed from retrieved evidence$/i, "summary composed from retrieved evidence");
  text = text.replace(/^summary composed from model response$/i, "summary composed from model response");
  text = text.replace(/^answer length=(\d+) chars$/i, "answer length=$1 chars");

  return text;
}

export function upsertToolTrace(prev: ToolTraceStep[], step: ToolTraceStep): ToolTraceStep[] {
  const idx = prev.findIndex((candidate) => candidate.id === step.id);
  if (idx === -1) return [...prev, step];
  const next = [...prev];
  next[idx] = step;
  return next;
}

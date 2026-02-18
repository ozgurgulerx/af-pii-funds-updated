import { z } from "zod";

// ── Domain Types ──────────────────────────────────────────────

export interface Airport {
  icao: string;
  iata: string;
  name: string;
}

export type FlightStatus = "scheduled" | "boarding" | "departed" | "arrived" | "delayed" | "cancelled";

export interface Flight {
  id: string;
  flightNumber: string;
  departure: Airport;
  arrival: Airport;
  std: string; // scheduled time of departure (ISO)
  etd: string; // estimated time of departure (ISO)
  aircraftType: string;
  status: FlightStatus;
}

// ── Brief Pack Types ──────────────────────────────────────────

export type Severity = "green" | "amber" | "red";

export interface BriefSection {
  id: string;
  title: string;
  severity: Severity;
  content: string; // markdown with [N] citation markers
  lastUpdated: string; // ISO timestamp
  isReviewed: boolean;
}

export interface BriefPack {
  flightId: string;
  sections: BriefSection[];
  generatedAt: string;
}

// ── Copilot Chat Types ────────────────────────────────────────

export type Intent = "WX" | "NOTAM_AIRPORT" | "SOP" | "OP_DECISION" | "SAFETY" | "GENERAL";

export type SourceType = "METAR" | "TAF" | "NOTAM" | "SOP" | "ASRS" | "ATIS" | "CHART";

export interface Citation {
  id: number;
  sourceType: SourceType;
  identifier: string;
  title: string;
  excerpt: string;
  confidence: number; // 0-1
  timestamp?: string;
}

export interface ToolTraceStep {
  id: string;
  toolName: string;
  status: "running" | "completed" | "error";
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  tokensUsed?: number;
}

export interface Artifact {
  type: string;
  label: string;
  count: number;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  intent?: Intent;
  policyName?: string;
  citations?: Citation[];
  toolTrace?: ToolTraceStep[];
  sourcesUsed?: string[];
  artifacts?: Artifact[];
  followUps?: string[];
}

// ── Demo Macro Types ──────────────────────────────────────────

export interface DemoMacro {
  id: string;
  label: string;
  intent: Intent;
  query: string;
}

// ── SSE Event Types ───────────────────────────────────────────

export const SSEMetadataSchema = z.object({
  type: z.literal("metadata"),
  intent: z.string(),
  policyName: z.string().optional(),
  sourcesUsed: z.array(z.string()),
  artifacts: z.array(z.object({
    type: z.string(),
    label: z.string(),
    count: z.number(),
  })),
});

export const SSEProgressSchema = z.object({
  type: z.literal("progress"),
  step: z.object({
    id: z.string(),
    toolName: z.string(),
    status: z.enum(["running", "completed", "error"]),
    durationMs: z.number(),
    inputSummary: z.string(),
    outputSummary: z.string(),
    tokensUsed: z.number().optional(),
  }),
});

export const SSETextSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
});

export const SSECitationsSchema = z.object({
  type: z.literal("citations"),
  citations: z.array(z.object({
    id: z.number(),
    sourceType: z.string(),
    identifier: z.string(),
    title: z.string(),
    excerpt: z.string(),
    confidence: z.number(),
    timestamp: z.string().optional(),
  })),
});

export const SSEDoneSchema = z.object({
  type: z.literal("done"),
  followUps: z.array(z.string()).optional(),
});

export const SSEErrorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const SSEEventSchema = z.discriminatedUnion("type", [
  SSEMetadataSchema,
  SSEProgressSchema,
  SSETextSchema,
  SSECitationsSchema,
  SSEDoneSchema,
  SSEErrorSchema,
]);

export type SSEEvent = z.infer<typeof SSEEventSchema>;
export type SSEMetadata = z.infer<typeof SSEMetadataSchema>;
export type SSEProgress = z.infer<typeof SSEProgressSchema>;
export type SSEText = z.infer<typeof SSETextSchema>;
export type SSECitations = z.infer<typeof SSECitationsSchema>;
export type SSEDone = z.infer<typeof SSEDoneSchema>;
export type SSEError = z.infer<typeof SSEErrorSchema>;

// ── Agent Response (from mock-agent) ──────────────────────────

export interface AgentResponse {
  intent: Intent;
  policyName?: string;
  sourcesUsed: string[];
  artifacts: Artifact[];
  toolTrace: ToolTraceStep[];
  citations: Citation[];
  answer: string;
  followUps: string[];
}

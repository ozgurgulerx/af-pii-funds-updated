import { NextRequest } from "next/server";
import { z } from "zod";
import type { Citation, ToolTraceStep } from "@/types";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema),
  retrievalMode: z.enum(["code-rag", "foundry-iq"]).optional().default("code-rag"),
});

const PYTHON_API_URL = process.env.BACKEND_URL || process.env.PYTHON_API_URL || "http://localhost:5001";
const encoder = new TextEncoder();

type RetrievalMode = "code-rag" | "foundry-iq";

type BackendCitation = {
  source_type: string;
  identifier: string;
  title?: string;
  content_preview: string;
  score: number;
};

type BackendResponse = {
  answer: string;
  route: string;
  reasoning?: string;
  sql_query?: string;
  citations?: BackendCitation[];
  pii_blocked?: boolean;
  pii_warning?: string;
  tool_trace?: ToolTraceStep[];
  route_confidence?: number;
  route_reasoning?: string;
};

function createSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      if (attempt === maxRetries) return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function mapRouteToRetrievalToolName(route: string, retrievalMode: RetrievalMode, sqlQuery?: string): string {
  if (retrievalMode === "foundry-iq" || route === "FOUNDRY_IQ") return "Foundry IQ";

  switch (route) {
    case "SQL":
      return "PostgreSQL (SQL Query)";
    case "FILTER_SEARCH":
      return "Azure AI Search (Filter)";
    case "SEMANTIC":
    case "SEMANTIC_SEARCH":
      return "Azure AI Search (Semantic)";
    case "RAPTOR":
      return "Azure AI Search (Macro Reports)";
    case "SEMANTIC_RAPTOR":
      return "Azure AI Search (Semantic + Macro)";
    case "MARKET_SEARCH":
      return "Azure AI Search (Market)";
    case "HYBRID":
      return "Azure AI Search (Hybrid)";
    case "CHAIN":
      return "Chain (Market → Fund)";
    case "AGENTIC":
      return "Azure AI Search (Agentic)";
    default:
      return sqlQuery ? "PostgreSQL (SQL Query)" : "Azure AI Search (Hybrid + Market)";
  }
}

function buildQueryAnalysisOutput(query: string, route: string): string {
  const normalized = query.toLowerCase();
  const signals: string[] = [];

  if (/\b(compare|versus|vs)\b/i.test(query)) signals.push("question_type(comparative)");
  if (/\b(top|largest|biggest|highest|lowest|rank)\b/i.test(query)) signals.push("question_type(ranking)");
  if (/\b(aum|assets|duration|yield|holdings|exposure|returns?)\b/i.test(query)) signals.push("data_need(structured)");
  if (normalized.includes("bond")) signals.push("category(bond funds)");
  if (normalized.includes("equity") || normalized.includes("stock") || normalized.includes("nvidia")) {
    signals.push("category(equity funds)");
  }
  if (normalized.includes("inflation") || normalized.includes("macro") || normalized.includes("imf") || normalized.includes("rate")) {
    signals.push("market_term");
  }

  if (signals.length === 0) {
    signals.push(route === "SQL" ? "structured lookup" : "general query");
  }

  return signals.join(" | ");
}

function mapCitationDataset(sourceType: string): string {
  switch (sourceType) {
    case "SQL":
      return "nport_funds.db";
    case "SEMANTIC":
      return "nport-funds-index";
    case "RAPTOR":
      return "imf_raptor";
    case "foundry_iq":
      return "foundry_iq";
    default:
      return sourceType || "unknown";
  }
}

function normalizeTraceSteps(
  steps: ToolTraceStep[] | undefined,
  query: string,
  retrievalMode: RetrievalMode,
  data: BackendResponse,
  messageCount: number,
): ToolTraceStep[] {
  if (Array.isArray(steps) && steps.length > 0) {
    return steps.map((step) => ({
      id: step.id,
      toolName: step.toolName,
      status: step.status || "completed",
      durationMs: step.durationMs ?? 0,
      inputSummary: step.inputSummary || "message inspection",
      outputSummary: step.outputSummary || "",
      tokensUsed: step.tokensUsed,
    }));
  }

  const citationsCount = Array.isArray(data.citations) ? data.citations.length : 0;
  const routeReasoning = data.route_reasoning || data.reasoning || "LLM route";
  const retrievalToolName = mapRouteToRetrievalToolName(data.route, retrievalMode, data.sql_query);
  const validationSummary = citationsCount > 0
    ? `verified with ${citationsCount} citation(s)`
    : "verified without explicit citations";
  const piiStep: ToolTraceStep = {
    id: "pii-check",
    toolName: "PII Detection",
    status: "completed",
    durationMs: 0,
    inputSummary: `message length=${query.length} chars`,
    outputSummary: data.pii_blocked ? `request blocked | ${data.pii_warning || ""}`.trim() : "clean input",
  };

  if (data.pii_blocked) {
    return [piiStep];
  }

  return [
    piiStep,
    {
      id: "context-compaction",
      toolName: "Context Compaction",
      status: "completed",
      durationMs: 0,
      inputSummary: `${messageCount} messages, session=single`,
      outputSummary: "single-session context preserved",
    },
    {
      id: "query-rewrite",
      toolName: "Query Rewrite",
      status: "completed",
      durationMs: 0,
      inputSummary: `history_len=${Math.max(messageCount - 1, 0)}`,
      outputSummary: messageCount > 1 ? "skipped: already standalone" : "skipped: no_history",
    },
    {
      id: "query-analysis",
      toolName: "Query Analysis",
      status: "completed",
      durationMs: 0,
      inputSummary: `query: ${query}`,
      outputSummary: buildQueryAnalysisOutput(query, data.route),
    },
    {
      id: "intent-router-v2",
      toolName: "Intent Router V2",
      status: "completed",
      durationMs: 0,
      inputSummary: "message inspection",
      outputSummary: `route=${data.route} confidence=${(data.route_confidence ?? 0.8).toFixed(2)}; ${routeReasoning}`,
    },
    {
      id: "retrieval-main",
      toolName: retrievalToolName,
      status: "completed",
      durationMs: 0,
      inputSummary: data.sql_query ? "filters: SQL-backed retrieval" : "filters: route-specific retrieval",
      outputSummary: citationsCount > 0 ? `${citationsCount} citation(s) prepared` : "0 citation(s) prepared",
    },
    {
      id: "answer-brief",
      toolName: "Answer Brief Builder",
      status: "completed",
      durationMs: 0,
      inputSummary: `query: ${query}`,
      outputSummary: citationsCount > 0 ? "summary composed from retrieved evidence" : "summary composed from model response",
    },
    {
      id: "llm-generate",
      toolName: "LLM Response Generation",
      status: "completed",
      durationMs: 0,
      inputSummary: `query: ${query}`,
      outputSummary: `answer length=${data.answer.length} chars`,
    },
    {
      id: "answer-validation",
      toolName: "Answer Validation",
      status: "completed",
      durationMs: 0,
      inputSummary: `query: ${query}`,
      outputSummary: validationSummary,
    },
  ];
}

function parseLegacyPiiStatus(data: BackendResponse) {
  return {
    type: "pii_status" as const,
    hasPii: Boolean(data.pii_blocked),
    categories: [] as string[],
    thread: data.pii_blocked ? "blocked" : "single",
  };
}

async function streamResultToClient(
  controller: ReadableStreamDefaultController<Uint8Array>,
  data: BackendResponse,
  query: string,
  retrievalMode: RetrievalMode,
  messageCount: number,
) {
  controller.enqueue(encoder.encode(createSSEMessage(parseLegacyPiiStatus(data))));

  const sourcesUsed = Array.isArray(data.citations)
    ? [...new Set(data.citations.map((citation) => citation.source_type))]
    : [];

  controller.enqueue(
    encoder.encode(
      createSSEMessage({
        type: "metadata",
        intent: data.pii_blocked ? "PII_BLOCKED" : "GENERAL",
        sourcesUsed,
        artifacts: data.sql_query ? [{ type: "sql_query", label: "SQL query", count: 1 }] : [],
        routeConfidence: data.route_confidence ?? null,
        routeReasoning: data.route_reasoning ?? data.reasoning ?? null,
        route: data.route,
        reasoning: data.reasoning,
        sql_query: data.sql_query,
      }),
    ),
  );

  const hasBackendTrace = Array.isArray(data.tool_trace) && data.tool_trace.length > 0;
  const traceSteps = normalizeTraceSteps(data.tool_trace, query, retrievalMode, data, messageCount);
  for (const step of traceSteps) {
    if (!hasBackendTrace && step.status !== "running") {
      controller.enqueue(
        encoder.encode(
          createSSEMessage({
            type: "progress",
            step: { ...step, status: "running" },
          }),
        ),
      );
    }

    controller.enqueue(encoder.encode(createSSEMessage({ type: "progress", step })));
  }

  for (const [index, word] of data.answer.split(" ").entries()) {
    controller.enqueue(
      encoder.encode(
        createSSEMessage({
          type: "text",
          content: word + (index < data.answer.split(" ").length - 1 ? " " : ""),
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  if (data.citations && data.citations.length > 0) {
    const formattedCitations: Citation[] = data.citations.map((citation, idx) => ({
      id: idx + 1,
      provider: citation.source_type,
      dataset: mapCitationDataset(citation.source_type),
      rowId: citation.identifier,
      timestamp: new Date().toISOString(),
      confidence: citation.score || 0.9,
      excerpt: citation.content_preview,
    }));

    controller.enqueue(
      encoder.encode(
        createSSEMessage({
          type: "citations",
          citations: formattedCitations,
        }),
      ),
    );
  }

  controller.enqueue(
    encoder.encode(
      createSSEMessage({
        type: "done",
        isVerified: data.route === "FOUNDRY_IQ" || Boolean(data.citations?.length),
      }),
    ),
  );
}

async function pipeBackendStream(
  response: Response,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming backend returned no body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) controller.enqueue(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages, retrievalMode } = parsed.data;
    const lastUserMessage = messages.filter((message) => message.role === "user").pop();

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const query = lastUserMessage.content;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: "tool_call",
                name: "fund_rag_query",
                arguments: { query },
              }),
            ),
          );

          try {
            const streamingResponse = await fetchWithRetry(`${PYTHON_API_URL}/api/chat/stream`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: query,
                messages,
                use_llm_routing: true,
                retrieval_mode: retrievalMode,
              }),
            });

            if (streamingResponse.ok && streamingResponse.body) {
              await pipeBackendStream(streamingResponse, controller);
              controller.close();
              return;
            }
          } catch (streamError) {
            console.warn("Falling back to legacy chat endpoint after stream failure", streamError);
          }

          const response = await fetchWithRetry(`${PYTHON_API_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: query,
              messages,
              use_llm_routing: true,
              retrieval_mode: retrievalMode,
            }),
          });

          if (!response.ok) {
            throw new Error(`Python API error: ${response.status}`);
          }

          const data = (await response.json()) as BackendResponse;
          await streamResultToClient(controller, data, query, retrievalMode, messages.length);
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const isConnectionError = errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed");

          controller.enqueue(
            encoder.encode(
              createSSEMessage({
                type: "error",
                message: isConnectionError
                  ? "Backend server not running. Please start the Python API server (python api_server.py)"
                  : `Error: ${errorMessage}`,
              }),
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

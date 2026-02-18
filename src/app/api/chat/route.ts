import { NextRequest } from "next/server";
import { z } from "zod";
import { runMockAgent } from "@/lib/mock-agent";
import { getFlightById } from "@/data/flights";
import { createSSEMessage } from "@/lib/chat";

const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  flightId: z.string().optional(),
});

const encoder = new TextEncoder();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages, flightId } = parsed.data;
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const flight = flightId ? getFlightById(flightId) : getFlightById("xq801");
    if (!flight) {
      return new Response(
        JSON.stringify({ error: "Flight not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const agentResponse = runMockAgent(lastUserMessage.content, flight);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. Emit metadata
          controller.enqueue(encoder.encode(createSSEMessage({
            type: "metadata",
            intent: agentResponse.intent,
            policyName: agentResponse.policyName,
            sourcesUsed: agentResponse.sourcesUsed,
            artifacts: agentResponse.artifacts,
          })));

          // 2. Emit progress steps (staggered)
          for (const step of agentResponse.toolTrace) {
            // Emit as "running"
            controller.enqueue(encoder.encode(createSSEMessage({
              type: "progress",
              step: { ...step, status: "running" },
            })));
            await new Promise((r) => setTimeout(r, Math.min(step.durationMs / 3, 150)));

            // Emit as "completed"
            controller.enqueue(encoder.encode(createSSEMessage({
              type: "progress",
              step: { ...step, status: "completed" },
            })));
            await new Promise((r) => setTimeout(r, 30));
          }

          // 3. Stream text word-by-word
          const words = agentResponse.answer.split(" ");
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? " " : "");
            controller.enqueue(encoder.encode(createSSEMessage({
              type: "text",
              content: word,
            })));
            await new Promise((r) => setTimeout(r, 5));
          }

          // 4. Emit citations
          controller.enqueue(encoder.encode(createSSEMessage({
            type: "citations",
            citations: agentResponse.citations,
          })));

          // 5. Emit done
          controller.enqueue(encoder.encode(createSSEMessage({
            type: "done",
            followUps: agentResponse.followUps,
          })));

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(encoder.encode(createSSEMessage({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          })));
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

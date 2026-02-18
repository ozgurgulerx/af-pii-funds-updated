import { SSEEventSchema, type SSEEvent } from "@/types";

/**
 * Parse a single SSE line (data: {...}) into a validated SSEEvent
 */
export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;

  try {
    const raw = JSON.parse(line.slice(6));
    const result = SSEEventSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Create a formatted SSE message string
 */
export function createSSEMessage(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

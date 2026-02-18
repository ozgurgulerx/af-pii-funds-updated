import type { Intent } from "@/types";

interface ClassificationResult {
  intent: Intent;
  confidence: number;
}

const KEYWORD_MAP: Record<Exclude<Intent, "GENERAL">, string[]> = {
  WX: [
    "weather", "metar", "taf", "wind", "visibility", "fog", "rain", "snow",
    "icing", "turbulence", "temperature", "qnh", "cloud", "ceiling",
    "thunderstorm", "wx",
  ],
  NOTAM_AIRPORT: [
    "notam", "runway", "taxiway", "closure", "airport", "approach", "ils",
    "rnav", "navaid", "lighting", "construction", "apron",
  ],
  SOP: [
    "sop", "procedure", "standard", "policy", "checklist", "limit",
    "crosswind", "cat iii", "cat ii", "low vis", "de-ice", "deicing",
    "etops", "minimum",
  ],
  OP_DECISION: [
    "go/no-go", "decision", "fuel", "alternate", "divert", "recommend",
    "assessment", "plan", "should we", "can we", "feasible", "option",
  ],
  SAFETY: [
    "safety", "incident", "asrs", "report", "risk", "hazard", "tcas",
    "bird strike", "rejected", "go-around", "unstabilized", "threat",
  ],
};

// Tie-breaking priority: higher index = lower priority
const PRIORITY_ORDER: Exclude<Intent, "GENERAL">[] = [
  "OP_DECISION",
  "WX",
  "NOTAM_AIRPORT",
  "SOP",
  "SAFETY",
];

export function classifyIntent(query: string): ClassificationResult {
  const lower = query.toLowerCase();

  const scores: Record<string, number> = {};

  for (const [intent, keywords] of Object.entries(KEYWORD_MAP)) {
    let count = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        count++;
      }
    }
    scores[intent] = count;
  }

  // Find the max score
  let bestIntent: Intent = "GENERAL";
  let bestScore = 0;

  for (const intent of PRIORITY_ORDER) {
    const score = scores[intent] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestScore === 0) {
    return { intent: "GENERAL", confidence: 0.5 };
  }

  return {
    intent: bestIntent,
    confidence: Math.min(1, bestScore / 3),
  };
}

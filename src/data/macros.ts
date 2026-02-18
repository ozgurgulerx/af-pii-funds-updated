import type { DemoMacro } from "@/types";

export const demoMacros: DemoMacro[] = [
  {
    id: "m1",
    label: "Weather briefing",
    intent: "WX",
    query: "What is the current weather at departure and arrival?",
  },
  {
    id: "m2",
    label: "METAR/TAF decode",
    intent: "WX",
    query: "Decode the latest METAR and TAF for both airports",
  },
  {
    id: "m3",
    label: "NOTAMs summary",
    intent: "NOTAM_AIRPORT",
    query: "Summarize active NOTAMs for departure and arrival airports",
  },
  {
    id: "m4",
    label: "Runway status",
    intent: "NOTAM_AIRPORT",
    query: "What is the current runway configuration and any closures?",
  },
  {
    id: "m5",
    label: "SOP check",
    intent: "SOP",
    query: "Are there any relevant SOPs for today's flight conditions?",
  },
  {
    id: "m6",
    label: "Crosswind limits",
    intent: "SOP",
    query: "What are the crosswind limits for this aircraft type?",
  },
  {
    id: "m7",
    label: "Go/No-Go assessment",
    intent: "OP_DECISION",
    query: "Based on current conditions, provide a go/no-go recommendation",
  },
  {
    id: "m8",
    label: "Fuel planning",
    intent: "OP_DECISION",
    query: "Review fuel requirements considering weather and alternates",
  },
  {
    id: "m9",
    label: "Safety alerts",
    intent: "SAFETY",
    query: "Any recent safety reports relevant to this route?",
  },
  {
    id: "m10",
    label: "Risk assessment",
    intent: "SAFETY",
    query: "What are the key risk factors for today's flight?",
  },
  {
    id: "m11",
    label: "Brief summary",
    intent: "GENERAL",
    query: "Give me a quick executive summary of the full briefing",
  },
  {
    id: "m12",
    label: "Alternate options",
    intent: "OP_DECISION",
    query: "What are the best alternate airports and why?",
  },
];

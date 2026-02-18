import type {
  Flight,
  AgentResponse,
  Intent,
  ToolTraceStep,
  Citation,
  Artifact,
} from "@/types";
import { classifyIntent } from "./classifier";

// ── Pre-baked tool traces by intent ─────────────────────────────

const toolTraces: Record<Intent, ToolTraceStep[]> = {
  WX: [
    {
      id: "t1",
      toolName: "fetch_metar",
      status: "completed",
      durationMs: 320,
      inputSummary: "ICAO codes for departure and arrival",
      outputSummary: "Retrieved current METAR observations",
      tokensUsed: 180,
    },
    {
      id: "t2",
      toolName: "fetch_taf",
      status: "completed",
      durationMs: 290,
      inputSummary: "ICAO codes for departure and arrival",
      outputSummary: "Retrieved TAF forecasts (24h)",
      tokensUsed: 220,
    },
    {
      id: "t3",
      toolName: "analyze_wx_hazards",
      status: "completed",
      durationMs: 410,
      inputSummary: "METAR + TAF data for route",
      outputSummary: "Identified 2 weather hazards en route",
      tokensUsed: 350,
    },
  ],
  NOTAM_AIRPORT: [
    {
      id: "t1",
      toolName: "fetch_notams",
      status: "completed",
      durationMs: 480,
      inputSummary: "Departure and arrival ICAO codes",
      outputSummary: "Retrieved 12 active NOTAMs",
      tokensUsed: 410,
    },
    {
      id: "t2",
      toolName: "filter_notams",
      status: "completed",
      durationMs: 150,
      inputSummary: "12 raw NOTAMs",
      outputSummary: "Filtered to 5 operationally relevant NOTAMs",
      tokensUsed: 190,
    },
    {
      id: "t3",
      toolName: "assess_notam_impact",
      status: "completed",
      durationMs: 380,
      inputSummary: "5 relevant NOTAMs + aircraft type",
      outputSummary: "Impact assessment complete: 1 amber, 4 green",
      tokensUsed: 310,
    },
  ],
  SOP: [
    {
      id: "t1",
      toolName: "lookup_sop",
      status: "completed",
      durationMs: 260,
      inputSummary: "Aircraft type + flight conditions",
      outputSummary: "Retrieved 3 applicable SOPs",
      tokensUsed: 280,
    },
    {
      id: "t2",
      toolName: "check_limits",
      status: "completed",
      durationMs: 180,
      inputSummary: "SOP parameters vs current conditions",
      outputSummary: "All limits within tolerance",
      tokensUsed: 150,
    },
  ],
  OP_DECISION: [
    {
      id: "t1",
      toolName: "fetch_metar",
      status: "completed",
      durationMs: 310,
      inputSummary: "Departure, arrival, and alternate ICAO codes",
      outputSummary: "Retrieved METAR for 3 airports",
      tokensUsed: 200,
    },
    {
      id: "t2",
      toolName: "fetch_taf",
      status: "completed",
      durationMs: 280,
      inputSummary: "Departure, arrival, and alternate ICAO codes",
      outputSummary: "Retrieved TAF for 3 airports",
      tokensUsed: 240,
    },
    {
      id: "t3",
      toolName: "fetch_notams",
      status: "completed",
      durationMs: 460,
      inputSummary: "Route and airport NOTAMs",
      outputSummary: "Retrieved 8 operationally relevant NOTAMs",
      tokensUsed: 380,
    },
    {
      id: "t4",
      toolName: "lookup_sop",
      status: "completed",
      durationMs: 240,
      inputSummary: "Aircraft type + conditions",
      outputSummary: "Retrieved applicable SOPs and limits",
      tokensUsed: 260,
    },
    {
      id: "t5",
      toolName: "compute_fuel",
      status: "completed",
      durationMs: 190,
      inputSummary: "Route distance + wind + alternate",
      outputSummary: "Fuel requirement: 14,200 kg (includes reserves)",
      tokensUsed: 120,
    },
    {
      id: "t6",
      toolName: "assess_go_nogo",
      status: "completed",
      durationMs: 520,
      inputSummary: "Combined WX, NOTAM, SOP, fuel data",
      outputSummary: "GO recommendation with 2 advisory items",
      tokensUsed: 480,
    },
  ],
  SAFETY: [
    {
      id: "t1",
      toolName: "search_asrs",
      status: "completed",
      durationMs: 540,
      inputSummary: "Route, aircraft type, season",
      outputSummary: "Found 4 relevant ASRS reports",
      tokensUsed: 360,
    },
    {
      id: "t2",
      toolName: "lookup_sop",
      status: "completed",
      durationMs: 250,
      inputSummary: "Safety-related SOPs for identified risks",
      outputSummary: "Retrieved 2 mitigation procedures",
      tokensUsed: 200,
    },
    {
      id: "t3",
      toolName: "risk_matrix",
      status: "completed",
      durationMs: 320,
      inputSummary: "ASRS findings + route hazards",
      outputSummary: "Risk matrix: 1 amber, 3 green items",
      tokensUsed: 290,
    },
  ],
  GENERAL: [
    {
      id: "t1",
      toolName: "fetch_metar",
      status: "completed",
      durationMs: 310,
      inputSummary: "Departure and arrival ICAO codes",
      outputSummary: "Retrieved current METAR observations",
      tokensUsed: 180,
    },
    {
      id: "t2",
      toolName: "fetch_taf",
      status: "completed",
      durationMs: 280,
      inputSummary: "Departure and arrival ICAO codes",
      outputSummary: "Retrieved TAF forecasts",
      tokensUsed: 210,
    },
    {
      id: "t3",
      toolName: "fetch_notams",
      status: "completed",
      durationMs: 450,
      inputSummary: "Departure and arrival ICAO codes",
      outputSummary: "Retrieved 10 active NOTAMs",
      tokensUsed: 390,
    },
    {
      id: "t4",
      toolName: "lookup_sop",
      status: "completed",
      durationMs: 240,
      inputSummary: "Aircraft type + conditions",
      outputSummary: "Retrieved applicable SOPs",
      tokensUsed: 250,
    },
    {
      id: "t5",
      toolName: "assess_go_nogo",
      status: "completed",
      durationMs: 490,
      inputSummary: "All gathered data",
      outputSummary: "Overall briefing assessment: GO",
      tokensUsed: 440,
    },
  ],
};

// ── Pre-baked citations by intent ───────────────────────────────

const citationsByIntent: Record<Intent, Citation[]> = {
  WX: [
    {
      id: 1,
      sourceType: "METAR",
      identifier: "METAR-DEP",
      title: "Departure METAR",
      excerpt: "METAR observation for departure airport. Wind 270/12kt, visibility 9999, FEW040, temperature 8/3, QNH 1018.",
      confidence: 0.97,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "METAR",
      identifier: "METAR-ARR",
      title: "Arrival METAR",
      excerpt: "METAR observation for arrival airport. Wind 310/18G28kt, visibility 7000, SCT025 BKN035, temperature 5/2, QNH 1012.",
      confidence: 0.96,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "TAF",
      identifier: "TAF-DEP",
      title: "Departure TAF",
      excerpt: "TAF valid 24h. BECMG 1218/1220 28015kt SCT030. TEMPO 1220/1224 4000 RA BKN020.",
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    },
    {
      id: 4,
      sourceType: "TAF",
      identifier: "TAF-ARR",
      title: "Arrival TAF",
      excerpt: "TAF valid 24h. BECMG 1215/1218 32020G30kt BKN025. PROB30 TEMPO 1218/1224 3000 SHRA BKN015.",
      confidence: 0.94,
      timestamp: new Date().toISOString(),
    },
  ],
  NOTAM_AIRPORT: [
    {
      id: 1,
      sourceType: "NOTAM",
      identifier: "A0234/26",
      title: "Runway Closure Notice",
      excerpt: "RWY 06/24 closed for maintenance 0600-1400 UTC. Expect RWY 18/36 in use.",
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "NOTAM",
      identifier: "A0189/26",
      title: "ILS Downgrade",
      excerpt: "ILS RWY 36 downgraded to CAT I only. GP signal unreliable above 3000ft.",
      confidence: 0.97,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "NOTAM",
      identifier: "A0301/26",
      title: "Taxiway Restriction",
      excerpt: "TWY B3 closed between TWY A and TWY C. Use TWY B2 as alternative.",
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    },
    {
      id: 4,
      sourceType: "CHART",
      identifier: "CHART-AD2",
      title: "Airport Diagram Update",
      excerpt: "Updated airport diagram reflecting taxiway B3 closure and new hold short markings.",
      confidence: 0.93,
      timestamp: new Date().toISOString(),
    },
  ],
  SOP: [
    {
      id: 1,
      sourceType: "SOP",
      identifier: "SOP-WX-012",
      title: "Crosswind Operations",
      excerpt: "Maximum demonstrated crosswind component: 33kt dry, 25kt wet. Commander discretion applies for gusts.",
      confidence: 0.99,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "SOP",
      identifier: "SOP-APP-008",
      title: "Low Visibility Approach Procedure",
      excerpt: "CAT II/III operations require both autopilots serviceable, autoland mandatory below DH 100ft.",
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "SOP",
      identifier: "SOP-ICE-003",
      title: "De-icing Procedure",
      excerpt: "Type IV holdover time: 45 min (light freezing rain). Anti-ice must be ON when TAT below 10C in visible moisture.",
      confidence: 0.97,
      timestamp: new Date().toISOString(),
    },
  ],
  OP_DECISION: [
    {
      id: 1,
      sourceType: "METAR",
      identifier: "METAR-DEP",
      title: "Departure METAR",
      excerpt: "Current conditions at departure: wind 270/12kt, CAVOK, temperature 8C.",
      confidence: 0.97,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "TAF",
      identifier: "TAF-ARR",
      title: "Arrival TAF",
      excerpt: "Arrival forecast: BECMG 32020G30kt BKN025. PROB30 TEMPO 3000 SHRA BKN015.",
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "NOTAM",
      identifier: "A0234/26",
      title: "Runway Closure",
      excerpt: "RWY 06/24 closed 0600-1400 UTC. Single runway operations in effect.",
      confidence: 0.96,
      timestamp: new Date().toISOString(),
    },
    {
      id: 4,
      sourceType: "SOP",
      identifier: "SOP-FUEL-005",
      title: "Fuel Policy",
      excerpt: "Minimum fuel: trip + 5% contingency + alternate + 30 min final reserve. Extra fuel recommended if single RWY ops.",
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    },
    {
      id: 5,
      sourceType: "NOTAM",
      identifier: "A0412/26",
      title: "Alternate Airport NOTAMs",
      excerpt: "Alternate airport fully operational, all approaches available, no restrictions.",
      confidence: 0.94,
      timestamp: new Date().toISOString(),
    },
  ],
  SAFETY: [
    {
      id: 1,
      sourceType: "ASRS",
      identifier: "ASRS-2026-0142",
      title: "Wind Shear on Approach",
      excerpt: "B737 crew reported +15kt/-20kt wind shear on final RWY 27 at 800ft AGL. Went around successfully.",
      confidence: 0.96,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "ASRS",
      identifier: "ASRS-2026-0098",
      title: "Bird Strike on Departure",
      excerpt: "A320 struck flock of birds at 1500ft AGL during climb. No damage, continued to destination.",
      confidence: 0.93,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "SOP",
      identifier: "SOP-SAFE-017",
      title: "Unstabilized Approach Policy",
      excerpt: "Mandatory go-around if not stabilized by 1000ft AGL (IMC) or 500ft AGL (VMC). No exceptions.",
      confidence: 0.99,
      timestamp: new Date().toISOString(),
    },
    {
      id: 4,
      sourceType: "ASRS",
      identifier: "ASRS-2025-1287",
      title: "TCAS RA on Arrival",
      excerpt: "TCAS RA (climb) received at FL120 during descent. Conflicting traffic was VFR, no separation loss.",
      confidence: 0.91,
      timestamp: new Date().toISOString(),
    },
  ],
  GENERAL: [
    {
      id: 1,
      sourceType: "METAR",
      identifier: "METAR-DEP",
      title: "Departure METAR",
      excerpt: "Current departure conditions: wind 270/12kt, visibility 9999, FEW040, QNH 1018.",
      confidence: 0.97,
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      sourceType: "TAF",
      identifier: "TAF-ARR",
      title: "Arrival TAF",
      excerpt: "Arrival forecast: wind shifting to 320/20G30kt, BKN025 with PROB30 showers.",
      confidence: 0.94,
      timestamp: new Date().toISOString(),
    },
    {
      id: 3,
      sourceType: "NOTAM",
      identifier: "A0234/26",
      title: "Runway Closure",
      excerpt: "RWY 06/24 closed for maintenance 0600-1400 UTC. Single runway operations.",
      confidence: 0.96,
      timestamp: new Date().toISOString(),
    },
    {
      id: 4,
      sourceType: "SOP",
      identifier: "SOP-WX-012",
      title: "Crosswind Limits",
      excerpt: "Maximum demonstrated crosswind: 33kt dry, 25kt wet runway.",
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    },
  ],
};

// ── Policy names by intent ──────────────────────────────────────

const policyNameMap: Record<Intent, string | undefined> = {
  WX: "WX-OPS-001",
  NOTAM_AIRPORT: "NOTAM-REVIEW-002",
  SOP: "SOP-COMPLIANCE-003",
  OP_DECISION: "OPS-DECISION-004",
  SAFETY: "SAFETY-MGMT-005",
  GENERAL: undefined,
};

// ── Sources used by intent ──────────────────────────────────────

const sourcesUsedMap: Record<Intent, string[]> = {
  WX: ["METAR", "TAF"],
  NOTAM_AIRPORT: ["NOTAM", "CHART"],
  SOP: ["SOP"],
  OP_DECISION: ["METAR", "TAF", "NOTAM", "SOP"],
  SAFETY: ["ASRS", "SOP"],
  GENERAL: ["METAR", "TAF", "NOTAM", "SOP"],
};

// ── Artifacts by intent ─────────────────────────────────────────

const artifactsMap: Record<Intent, Artifact[]> = {
  WX: [
    { type: "wx_report", label: "Weather Reports", count: 4 },
  ],
  NOTAM_AIRPORT: [
    { type: "notam", label: "Active NOTAMs", count: 5 },
    { type: "chart", label: "Airport Charts", count: 1 },
  ],
  SOP: [
    { type: "sop_document", label: "SOP References", count: 3 },
  ],
  OP_DECISION: [
    { type: "wx_report", label: "Weather Reports", count: 4 },
    { type: "notam", label: "NOTAMs Reviewed", count: 8 },
    { type: "sop_document", label: "SOPs Applied", count: 2 },
    { type: "fuel_calc", label: "Fuel Calculation", count: 1 },
  ],
  SAFETY: [
    { type: "asrs_report", label: "ASRS Reports", count: 4 },
    { type: "risk_item", label: "Risk Items", count: 3 },
  ],
  GENERAL: [
    { type: "wx_report", label: "Weather Reports", count: 4 },
    { type: "notam", label: "Active NOTAMs", count: 5 },
    { type: "sop_document", label: "SOP References", count: 2 },
  ],
};

// ── Follow-up suggestions by intent ─────────────────────────────

const followUpsMap: Record<Intent, (flight: Flight) => string[]> = {
  WX: (f) => [
    `What are the crosswind limits for the ${f.aircraftType}?`,
    `Is there an alternate with better weather near ${f.arrival.icao}?`,
    "When is the next TAF update expected?",
    "Are there any SIGMETs along the route?",
  ],
  NOTAM_AIRPORT: (f) => [
    `Which approaches are available at ${f.arrival.icao}?`,
    "Are there any runway surface condition reports?",
    `What is the taxi route at ${f.departure.icao} given closures?`,
    "Any NOTAMs affecting alternates?",
  ],
  SOP: (f) => [
    `What are the CAT II minimums for ${f.arrival.icao}?`,
    `De-icing holdover times for the ${f.aircraftType}?`,
    "What is the stabilized approach criteria?",
    "Are there ETOPS requirements for this route?",
  ],
  OP_DECISION: (f) => [
    `What if weather deteriorates at ${f.arrival.icao}?`,
    "Can we reduce fuel with a closer alternate?",
    "What is the delay cost if we hold for weather improvement?",
    `Is there a slot restriction at ${f.arrival.icao}?`,
    "What are the go-around fuel requirements?",
  ],
  SAFETY: (f) => [
    `Any bird strike history at ${f.arrival.icao}?`,
    "What is the unstabilized approach rate for this route?",
    `Recent wind shear reports at ${f.arrival.icao}?`,
    "Are there fatigue risk factors for this crew schedule?",
  ],
  GENERAL: (f) => [
    `Give me a detailed weather briefing for ${f.departure.icao} to ${f.arrival.icao}`,
    "Summarize the active NOTAMs for both airports",
    "What is the go/no-go recommendation?",
    "Any safety concerns for this flight?",
    `What SOPs apply to the ${f.aircraftType} today?`,
    "Review fuel planning for this route",
  ],
};

// ── Answer templates ────────────────────────────────────────────

function generateWxAnswer(flight: Flight): string {
  return `## Weather Briefing: ${flight.departure.icao} to ${flight.arrival.icao}

### Departure -- ${flight.departure.icao} (${flight.departure.name})

**Current METAR** [1]
- Wind: 270/12kt
- Visibility: 9999m (CAVOK conditions)
- Cloud: FEW at 4,000ft
- Temperature: 8C / Dewpoint: 3C
- QNH: 1018 hPa

**TAF Outlook** [3]
- Becoming 280/15kt with SCT030 between 18-20Z
- TEMPO period 20-24Z: visibility 4000m in rain, BKN020

Departure conditions are **good** with no significant hazards. Deterioration expected later in the evening with rain developing.

### Arrival -- ${flight.arrival.icao} (${flight.arrival.name})

**Current METAR** [2]
- Wind: 310/18 gusting 28kt
- Visibility: 7000m
- Cloud: SCT025 BKN035
- Temperature: 5C / Dewpoint: 2C
- QNH: 1012 hPa

**TAF Outlook** [4]
- Becoming 320/20 gusting 30kt, BKN025
- PROB30 TEMPO: 3000m in showers, BKN015

Arrival conditions are **marginal**. Crosswind component approximately 18kt gusting 28kt. Cloud base adequate for ILS approach but may lower with showers.

### En-Route Hazards
- Moderate turbulence expected FL250-FL350 over the route midpoint
- No significant icing forecast below FL200

### Summary
Departure: **GREEN** -- No concerns.
Arrival: **AMBER** -- Gusty crosswind approaching limits; monitor updates closely.`;
}

function generateNotamAnswer(flight: Flight): string {
  return `## Active NOTAMs: ${flight.departure.icao} / ${flight.arrival.icao}

### ${flight.departure.icao} -- ${flight.departure.name}

| NOTAM ID | Subject | Impact |
|----------|---------|--------|
| **A0234/26** | RWY 06/24 closed 0600-1400 UTC [1] | Amber -- Single runway ops, expect delays |
| **A0301/26** | TWY B3 closed between A and C [3] | Green -- Use TWY B2, minor taxi delay |
| **A0178/26** | Apron stand 14-16 closed | Green -- No impact on ${flight.flightNumber} |

### ${flight.arrival.icao} -- ${flight.arrival.name}

| NOTAM ID | Subject | Impact |
|----------|---------|--------|
| **A0189/26** | ILS RWY 36 downgraded to CAT I [2] | Amber -- No CAT II/III available |
| **A0445/26** | Construction work south of TWY M | Green -- No impact on active taxi routes |

### Impact Assessment for ${flight.flightNumber} (${flight.aircraftType})

1. **Runway closure at ${flight.departure.icao}** [1] -- Single runway operations will be in effect during your ETD. Allow extra taxi time and potential departure sequencing delays.

2. **ILS downgrade at ${flight.arrival.icao}** [2] -- Only CAT I minima available on RWY 36. With current forecast visibility of 7000m this is adequate, but if conditions deteriorate below CAT I minimums, a diversion may be necessary.

3. **Taxiway restriction** [3] -- Minor taxi route change at departure. Updated chart available [4].

### Overall NOTAM Status: **AMBER**
One operationally significant NOTAM (ILS downgrade) warrants monitoring.`;
}

function generateSopAnswer(flight: Flight): string {
  return `## Applicable SOPs for ${flight.flightNumber} (${flight.aircraftType})

### 1. Crosswind Operations -- SOP-WX-012 [1]

Given the forecast wind at ${flight.arrival.icao} (310/18G28kt), the following limits apply:

- **Maximum demonstrated crosswind (dry):** 33kt
- **Maximum demonstrated crosswind (wet):** 25kt
- **Company limit (gusts):** Commander discretion above 25kt component
- **Current crosswind component:** ~18kt gusting to ~28kt

**Status:** Within limits on dry runway. If runway becomes wet due to forecast showers, the gust component approaches the wet limit.

### 2. Low Visibility Approach -- SOP-APP-008 [2]

With the ILS downgrade at ${flight.arrival.icao} (CAT I only per NOTAM A0189/26):

- **CAT I Decision Height:** 200ft AGL
- **Minimum visibility:** RVR 550m
- **Required equipment:** Single autopilot coupled approach acceptable
- **Autoland:** Not required for CAT I

Current forecast conditions remain above CAT I minima.

### 3. De-icing / Anti-icing -- SOP-ICE-003 [3]

- **TAT at departure:** +8C (above threshold)
- **De-icing:** Not required at departure
- **Engine anti-ice:** Set ON if entering visible moisture with TAT below 10C en route
- **Wing anti-ice:** As per QRH if icing conditions encountered

### Compliance Summary

| SOP | Status | Action Required |
|-----|--------|-----------------|
| Crosswind limits | Amber | Monitor; brief go-around for wet RWY gusts |
| Low vis approach | Green | CAT I adequate for forecast |
| De-icing | Green | Not required at departure |`;
}

function generateOpDecisionAnswer(flight: Flight): string {
  return `## Go/No-Go Assessment: ${flight.flightNumber}
### ${flight.departure.icao} to ${flight.arrival.icao} | ${flight.aircraftType}

---

### Decision: **GO** (with advisories)

---

### Weather Analysis

**Departure (${flight.departure.icao})** [1]
- Conditions: CAVOK, wind 270/12kt -- **GREEN**
- No departure constraints

**Arrival (${flight.arrival.icao})** [2]
- Conditions: Wind 310/18G28kt, visibility 7000m, SCT025 BKN035 -- **AMBER**
- Crosswind component ~18kt gusting 28kt (within limits)
- PROB30 deterioration to 3000m in showers

### NOTAM Assessment [3]

- RWY 06/24 at ${flight.departure.icao} closed -- single runway operations, minor delay risk
- ILS at ${flight.arrival.icao} downgraded to CAT I only -- adequate for current conditions
- **Contingency:** If conditions drop below CAT I minima, diversion required

### Fuel Analysis [4]

| Component | Fuel (kg) |
|-----------|-----------|
| Trip fuel | 9,800 |
| Contingency (5%) | 490 |
| Alternate | 2,400 |
| Final reserve (30 min) | 1,100 |
| **Extra (recommended)** | **410** |
| **Total required** | **14,200** |

Extra fuel recommended due to single runway ops at departure (potential holding) and gusty conditions at arrival (potential go-around).

### Alternate Airport [5]

- Alternate fully operational, all approaches available
- Weather at alternate: CAVOK, no restrictions
- Fuel to alternate from ${flight.arrival.icao}: 2,400 kg

### Risk Summary

| Factor | Rating | Notes |
|--------|--------|-------|
| Departure WX | Green | No issues |
| Arrival WX | Amber | Gusty crosswind, monitor for wet RWY |
| NOTAMs | Amber | ILS downgrade limits precision approach |
| Fuel | Green | Adequate with reserves |
| Alternate | Green | Fully available |

### Recommendations

1. **Brief crosswind approach and go-around procedure** for ${flight.arrival.icao}
2. **Request latest RWY condition report** before departure
3. **Monitor arrival TAF updates** -- next update expected within 2 hours
4. **Carry recommended extra fuel** (410 kg) for single-RWY delay contingency`;
}

function generateSafetyAnswer(flight: Flight): string {
  return `## Safety Intelligence: ${flight.departure.icao} to ${flight.arrival.icao}

### Recent ASRS Reports Relevant to This Route

**1. Wind Shear on Approach -- ${flight.arrival.icao}** [1]
- **Report:** ASRS-2026-0142 (filed 2 weeks ago)
- **Event:** B737 crew encountered +15kt/-20kt wind shear on final RWY 27 at 800ft AGL
- **Outcome:** Successful go-around executed
- **Relevance:** High -- same aircraft family, same arrival airport, similar wind conditions forecast today

**2. Bird Strike on Departure** [2]
- **Report:** ASRS-2026-0098 (filed 3 weeks ago)
- **Event:** A320 struck flock of birds at 1500ft AGL during climb from ${flight.departure.icao}
- **Outcome:** No damage, continued to destination
- **Relevance:** Medium -- seasonal bird activity noted at departure airport

**3. TCAS RA During Arrival** [4]
- **Report:** ASRS-2025-1287 (filed 6 weeks ago)
- **Event:** TCAS RA (climb) received at FL120 during descent into ${flight.arrival.icao}
- **Outcome:** No separation loss, conflicting traffic was VFR
- **Relevance:** Low -- ATC aware, traffic pattern being monitored

### Applicable Safety SOPs [3]

- **Stabilized Approach Policy:** Mandatory go-around if not stabilized by 1000ft AGL (IMC) or 500ft AGL (VMC)
- Given the wind shear report, crew should brief **escape maneuver** and have go-around triggers clearly set

### Risk Matrix for ${flight.flightNumber}

| Hazard | Likelihood | Severity | Risk Level |
|--------|-----------|----------|------------|
| Wind shear on approach | Possible | Major | **AMBER** |
| Bird strike at departure | Unlikely | Minor | GREEN |
| TCAS event | Remote | Minor | GREEN |

### Mitigations

1. **Brief wind shear escape maneuver** before approach to ${flight.arrival.icao}
2. **Monitor PIREP feed** for real-time wind shear reports on arrival
3. **Activate predictive wind shear system** during approach
4. **Bird strike awareness** -- climb through 2000ft AGL expeditiously at ${flight.departure.icao}`;
}

function generateGeneralAnswer(flight: Flight): string {
  return `## Executive Briefing: ${flight.flightNumber}
### ${flight.departure.name} (${flight.departure.icao}) to ${flight.arrival.name} (${flight.arrival.icao})
### Aircraft: ${flight.aircraftType}

---

### Weather [1][2]

- **Departure:** CAVOK, light winds -- **GREEN**
- **Arrival:** SCT025 BKN035, wind 310/18G28kt, visibility 7000m -- **AMBER**
- **En-route:** Moderate turbulence FL250-350 over route midpoint
- **Trend:** Arrival conditions may deteriorate with PROB30 showers reducing visibility to 3000m

### NOTAMs [3]

- **${flight.departure.icao}:** RWY 06/24 closed (single RWY ops), TWY B3 restriction
- **${flight.arrival.icao}:** ILS downgraded to CAT I only
- **Impact:** Minor delays at departure; reduced approach capability at arrival

### SOPs [4]

- Crosswind limits apply: 33kt dry / 25kt wet -- current gusts approaching wet limit
- CAT I approach procedures in effect (ILS downgrade)
- De-icing not required at departure (TAT +8C)

### Safety

- Recent wind shear ASRS report at ${flight.arrival.icao} (same aircraft family)
- Stabilized approach policy reinforced: go-around below 1000ft if unstable
- Seasonal bird activity noted at ${flight.departure.icao}

### Recommendation: **GO**

The flight is cleared to proceed with the following advisories:

1. **Brief crosswind and wind shear procedures** for arrival at ${flight.arrival.icao}
2. **Carry extra fuel** (+410 kg) for single runway delay contingency
3. **Monitor arrival TAF** for deterioration trends
4. **Confirm alternate availability** -- currently fully operational

### Key Decision Points

| Checkpoint | Action |
|-----------|--------|
| Pre-departure | Confirm latest RWY condition at ${flight.arrival.icao} |
| Top of descent | Verify arrival weather still above CAT I minima |
| Final approach | Go-around if not stabilized by 1000ft AGL |`;
}

// ── Main mock agent function ────────────────────────────────────

export function runMockAgent(query: string, flight: Flight): AgentResponse {
  const { intent } = classifyIntent(query);

  const trace = toolTraces[intent];
  const citations = citationsByIntent[intent];
  const policyName = policyNameMap[intent];
  const sourcesUsed = sourcesUsedMap[intent];
  const artifacts = artifactsMap[intent];
  const followUps = followUpsMap[intent](flight);

  let answer: string;
  switch (intent) {
    case "WX":
      answer = generateWxAnswer(flight);
      break;
    case "NOTAM_AIRPORT":
      answer = generateNotamAnswer(flight);
      break;
    case "SOP":
      answer = generateSopAnswer(flight);
      break;
    case "OP_DECISION":
      answer = generateOpDecisionAnswer(flight);
      break;
    case "SAFETY":
      answer = generateSafetyAnswer(flight);
      break;
    case "GENERAL":
    default:
      answer = generateGeneralAnswer(flight);
      break;
  }

  return {
    intent,
    policyName,
    sourcesUsed,
    artifacts,
    toolTrace: trace,
    citations,
    answer,
    followUps,
  };
}

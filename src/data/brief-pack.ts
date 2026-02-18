import type { BriefPack } from "@/types";

// ── Helper ──────────────────────────────────────────────────────
const ts = "2026-02-18T05:00:00Z"; // generation baseline

// ── XQ 801  LTFM → EGLL  B737-800  scheduled ────────────────────
const xq801: BriefPack = {
  flightId: "xq801",
  generatedAt: ts,
  sections: [
    {
      id: "xq801-overview",
      title: "Overview",
      severity: "green",
      content: `### Flight XQ 801 — Istanbul (LTFM) to London Heathrow (EGLL)

| Item | Detail |
|------|--------|
| Aircraft | B737-800 (TC-SNR) |
| STD / ETD | 0630Z / 0630Z |
| Flight time | 3h 45m |
| Route | LTFM — KEMIK — BAVUL — UL602 — EGLL |
| Fuel (planned) | 14,800 kg block fuel |
| Alternate | London Gatwick (EGKK) |

**Key items requiring attention:**
- **Weather [1]:** Fog at EGLL — RVR 200m, CAT III approach required.
- **NOTAMs [2]:** RWY 09R/27L closed at EGLL; single runway ops on 09L/27R.
- **Safety [3]:** Relevant ASRS report on late runway changes during LVP at EGLL.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-weather",
      title: "Weather",
      severity: "red",
      content: `### Departure — LTFM (Istanbul)

**METAR** [1]
\`\`\`
LTFM 180530Z 17008KT CAVOK 08/02 Q1024 NOSIG
\`\`\`
Conditions: Clear skies, visibility unrestricted, wind 170/08kt. No concerns.

**TAF** [2]
\`\`\`
TAF LTFM 180500Z 1806/1912 18010KT 9999 SCT040 NOSIG
\`\`\`
Forecast: Stable conditions throughout departure window. No significant change expected.

---

### Arrival — EGLL (London Heathrow)

**METAR** [3]
\`\`\`
EGLL 180550Z 04003KT 0200 R09L/0250 FG VV001 04/04 Q1031 REDZ
\`\`\`
**RED ALERT:** Visibility **200m**, RVR 250m on RWY 09L. Dense fog with vertical visibility 100ft. Temperature and dewpoint equal (04/04) — fog unlikely to clear quickly.

**TAF** [4]
\`\`\`
TAF EGLL 180500Z 1806/1912 04005KT 0300 FG VV001
    TEMPO 1806/1811 0200 FG VV001
    BECMG 1811/1812 9999 BKN020
\`\`\`
Forecast: Fog persisting until approximately **1100Z**, then improving to broken cloud at 2000ft with unrestricted visibility. ETA is approximately **1015Z** — expect fog conditions on arrival.

---

### Alternate — EGKK (London Gatwick)

**METAR** [5]
\`\`\`
EGKK 180550Z 03005KT 9999 SCT015 05/03 Q1031 NOSIG
\`\`\`
Conditions: Good visibility, scattered cloud at 1500ft. Suitable alternate.

### Operational Impact
- **CAT III approach required** at EGLL [6].
- Consider holding if fuel allows — TAF indicates improvement by 1100Z.
- Alternate EGKK is VFR with CAT I available.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-notams",
      title: "NOTAMs",
      severity: "amber",
      content: `### EGLL — London Heathrow

**A1247/26 — Runway Closure** [1]
> RWY 09R/27L **CLOSED** for resurfacing works from 15 FEB to 28 FEB 2026. All departures and arrivals via RWY 09L/27R.

**Impact:** Single runway operations. Expect delays in sequence. Higher wake turbulence separation may apply.

**A1302/26 — ILS Glidepath Fluctuation** [2]
> ILS RWY 27R glidepath may show fluctuations on final approach until 1200Z. CAT III operations available, **autoland recommended**.

**A1255/26 — Low Visibility Procedures** [3]
> LVP in force from 0500Z to 1200Z. CAT II/III operations authorized on RWY 27R.

**A1310/26 — Taxiway Restrictions** [4]
> TWY Alpha between A3 and A5 limited to aircraft wingspan max 36m due works in progress until 1800Z.

**Impact:** B737-800 wingspan 35.8m — within limit but marginal. Brief alternative taxi route via TWY Bravo.

---

### LTFM — Istanbul Airport

**B5678/26 — ILS 35L Unserviceable** [5]
> ILS RWY 35L U/S until 2000Z 18 FEB. VOR/DME approach available. Expect ILS RWY 35R.

**B5691/26 — Taxiway Mike Restricted** [6]
> TWY M between M3 and M5 closed for construction until 20 FEB. Use TWY N as alternative.

**Impact:** Minor taxi re-routing. Departure via RWY 35R expected — ILS available.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTFM RWY 35R

| Parameter | Value |
|-----------|-------|
| TORA | 3,000m |
| TODA | 3,400m |
| LDA | 2,700m |
| Surface | Asphalt, dry |
| Slope | 0.1% up |
| Lighting | CAT II/III |

Takeoff performance: Adequate for B737-800 at planned weight [1]. No restrictions.

---

### Arrival — EGLL RWY 27R

| Parameter | Value |
|-----------|-------|
| TORA | 3,658m |
| LDA | 3,350m |
| Surface | Grooved asphalt, dry |
| Slope | Level |
| Lighting | CAT III (ALSF-2, PAPI) |

Landing performance: Adequate. CAT III autoland available [2]. Single runway operations due 09R/27L closure.

---

### Alternate — EGKK RWY 26L

| Parameter | Value |
|-----------|-------|
| LDA | 3,159m |
| Surface | Grooved asphalt |
| Lighting | CAT I |

Adequate for diversion. Ground handling confirmed available [3].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

**SOP-OPS-055: CAT III Approach Procedures** [1]
- Both autopilots engaged by 1000ft AGL.
- Confirm "LAND" or "LAND 3" annunciation at glideslope capture.
- DH 50ft (CAT IIIA) — go-around if no visual reference at DH.
- RVR requirement: 200m minimum.
- Do not disconnect autopilot until speed below 80 kt after touchdown.

**SOP-OPS-041: Low Visibility Taxi Procedures** [2]
- Maximum taxi speed 10 kt when RVR < 400m.
- All taxi clearances read back in full.
- Stop-bar lights must be visible before crossing any holding point.
- Both pilots monitor airport moving map.

**SOP-FUEL-005: Minimum Fuel Reserves** [3]
- B737-800 final reserve: 2,200 kg.
- Additional holding fuel recommended: 30 minutes (1,800 kg).
- Minimum diversion fuel to EGKK: 1,200 kg.

**SOP-PERF-012: Crosswind Limits B737-800** [4]
- Current wind at EGLL: 040/03kt — well within limits.
- Autoland CAT III limit: 15 kt crosswind component.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-safety",
      title: "Safety Learnings",
      severity: "amber",
      content: `### Relevant Safety Reports

**ASRS-2026-001: Late Runway Change During Low Visibility Operations** [1]
During LVP at a major hub (vis 250m), ATC assigned a runway change after the before-takeoff checklist was complete. PM loaded the wrong SID under time pressure. Caught during cross-check but caused 12-minute delay. New runway had a displaced threshold requiring performance recalculation.

**Relevance to XQ 801:** EGLL is in LVP with single runway ops. If runway direction changes (09L vs 27R), be prepared for full re-brief.

**Mitigations:**
- Use the 10-minute rule for runway change acceptance.
- PM independently verify FMS entries.
- Brief both runway directions proactively.

---

**ASRS-2026-003: Taxi Incursion Near-Miss at Complex Airport** [2]
Crew approached crossing active runway without hold-short instruction. Stop-bar lights were inoperative (NOTAM'd but not briefed). Stopped 15m short with traffic on final.

**Relevance to XQ 801:** EGLL has taxiway restrictions (TWY Alpha) and LVP active. Heightened awareness required for taxi after landing.

**Mitigations:**
- Brief taxiway restrictions and stop-bar status from NOTAMs before approach.
- PM maintains heads-up lookout during taxi in LVP.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq801-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **CAT III approach planning** [1]: Confirm both autopilots serviceable during pre-flight. Brief CAT IIIA minima (DH 50ft, RVR 200m). Consider hold at EGLL if fuel permits — TAF shows improvement by 1100Z.

2. **Fuel strategy** [2]: Recommend Commander's extra fuel of 1,800 kg (30 min hold) given fog conditions and single runway ops. Total minimum fuel: 14,020 kg.

3. **Alternate readiness** [3]: EGKK confirmed suitable. Weather VFR, CAT I ILS available, ground handling confirmed. Brief the diversion route and approach during cruise.

4. **Taxi planning** [4]: Brief the EGLL arrival taxi route avoiding TWY Alpha A3-A5 restrictions. Use TWY Bravo. Note LVP taxi speed limit (10 kt).

5. **Safety awareness** [5]: Brief runway change procedure per SOP-OPS-057 in case of direction change at EGLL. Review stop-bar locations on airport chart.

### Go/No-Go Assessment: **CONDITIONAL GO**
- Departure: GREEN — all conditions nominal.
- Arrival: AMBER — CAT III required, improving trend in TAF.
- Alternate: GREEN — EGKK suitable.
- Fuel: GREEN — adequate with holding allowance.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── XQ 237  LTAI → EDDM  B737-800  boarding ─────────────────────
const xq237: BriefPack = {
  flightId: "xq237",
  generatedAt: ts,
  sections: [
    {
      id: "xq237-overview",
      title: "Overview",
      severity: "green",
      content: `### Flight XQ 237 — Antalya (LTAI) to Munich (EDDM)

| Item | Detail |
|------|--------|
| Aircraft | B737-800 (TC-SNA) |
| STD / ETD | 0815Z / 0815Z |
| Flight time | 2h 50m |
| Route | LTAI — AKBEL — UL15 — EDDM |
| Fuel (planned) | 11,200 kg block fuel |
| Alternate | Nuremberg (EDDN) |

**Status:** Boarding in progress. No major concerns identified.

**Key items:**
- Weather at both airports is VMC [1].
- Minor NOTAM for taxiway work at EDDM [2].
- Standard operations expected.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-weather",
      title: "Weather",
      severity: "green",
      content: `### Departure — LTAI (Antalya)

**METAR** [1]
\`\`\`
LTAI 180600Z 32005KT 9999 FEW040 12/04 Q1022 NOSIG
\`\`\`
Conditions: Clear, unrestricted visibility, light northwesterly wind. No concerns.

**TAF** [2]
\`\`\`
TAF LTAI 180500Z 1806/1912 33008KT 9999 FEW040 NOSIG
\`\`\`
Stable conditions throughout departure window.

---

### Arrival — EDDM (Munich)

**METAR** [3]
\`\`\`
EDDM 180550Z 25012KT 9999 SCT025 02/M02 Q1028 NOSIG
\`\`\`
Conditions: Good visibility, scattered cloud at 2500ft, wind 250/12kt. No concerns.

**TAF** [4]
\`\`\`
TAF EDDM 180500Z 1806/1912 26014KT 9999 SCT030
    TEMPO 1809/1914 26018G28KT BKN025
\`\`\`
Note: Possible gusts to 28kt from the west during arrival window. Crosswind component for RWY 26L/R approximately 5-8kt — within limits [5].

---

### Alternate — EDDN (Nuremberg)

**METAR** [5]
\`\`\`
EDDN 180550Z 24008KT 9999 SCT030 01/M03 Q1029 NOSIG
\`\`\`
Suitable alternate. No restrictions.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-notams",
      title: "NOTAMs",
      severity: "green",
      content: `### EDDM — Munich Airport

**C2145/26 — Taxiway Echo Work** [1]
> TWY E between E3 and E5 closed for maintenance 0600-1400Z daily until 22 FEB. Use TWY F as alternative.

**Impact:** Minor. Standard re-routing applies.

---

### LTAI — Antalya Airport

**B5720/26 — PAPI RWY 18R** [2]
> PAPI RWY 18R unserviceable until 20 FEB. PAPI RWY 36L available.

**Impact:** Negligible for departure. If returning, RWY 36L preferred for visual approach aid.

No other operationally significant NOTAMs active for this route.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTAI RWY 36L

| Parameter | Value |
|-----------|-------|
| TORA | 3,400m |
| LDA | 3,400m |
| Surface | Asphalt, dry |
| Lighting | CAT I |

Adequate for departure at planned weight [1].

---

### Arrival — EDDM RWY 26R

| Parameter | Value |
|-----------|-------|
| TORA | 4,000m |
| LDA | 4,000m |
| Surface | Grooved asphalt, dry |
| Lighting | CAT III |

Ample runway length. Dual runway ops in effect (26L/26R) [2].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

No non-standard SOPs triggered for current conditions.

**Standard references:**
- **SOP-PERF-012:** Crosswind Limits B737-800 [1] — Current wind well within limits.
- **SOP-FUEL-005:** Fuel reserves adequate [2].
- **SOP-OPS-029:** Alternate (EDDN) meets selection criteria [3].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-safety",
      title: "Safety Learnings",
      severity: "green",
      content: `### Relevant Safety Reports

No high-priority safety reports match today's conditions for this route.

**General awareness:**
- EDDM taxi layout is complex with dual parallel runways [1]. Maintain situational awareness during taxi-in, particularly crossing RWY 26L if assigned to Terminal 1 stands.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq237-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **Standard flight** [1]: No significant concerns. Weather VMC at both ends.
2. **Wind monitoring** [2]: TAF indicates possible gusts to 28kt at EDDM during arrival. Monitor ATIS for actual conditions.
3. **Taxi at EDDM** [3]: TWY E partially closed — expect routing via TWY F.

### Go/No-Go Assessment: **GO**
- All parameters nominal across all categories.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── XQ 515  LTFJ → EHAM  A320neo  scheduled ─────────────────────
const xq515: BriefPack = {
  flightId: "xq515",
  generatedAt: ts,
  sections: [
    {
      id: "xq515-overview",
      title: "Overview",
      severity: "green",
      content: `### Flight XQ 515 — Sabiha Gokcen (LTFJ) to Amsterdam Schiphol (EHAM)

| Item | Detail |
|------|--------|
| Aircraft | A320neo (TC-SEB) |
| STD / ETD | 1000Z / 1000Z |
| Flight time | 3h 20m |
| Route | LTFJ — BARAN — UL602 — EHAM |
| Fuel (planned) | 13,400 kg block fuel |
| Alternate | Brussels (EBBR) |

**Key items:**
- Crosswind at EHAM 18-24kt on RWY 18R/36L [1]. Within A320neo limits.
- NOTAM: RWY 06/24 closed for maintenance [2].
- Routine flight with standard planning.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-weather",
      title: "Weather",
      severity: "green",
      content: `### Departure — LTFJ (Sabiha Gokcen)

**METAR** [1]
\`\`\`
LTFJ 180730Z 20012KT 9999 SCT035 09/03 Q1023 NOSIG
\`\`\`
Good conditions. No concerns.

**TAF** [2]
\`\`\`
TAF LTFJ 180500Z 1806/1912 21014KT 9999 SCT035 NOSIG
\`\`\`
Stable throughout.

---

### Arrival — EHAM (Amsterdam Schiphol)

**METAR** [3]
\`\`\`
EHAM 180750Z 28018G24KT 9999 SCT022 06/02 Q1026 NOSIG
\`\`\`
Wind 280/18 gusting 24kt. Visibility good. Crosswind component for RWY 36R approximately 18kt steady, 24kt in gusts [4].

**TAF** [4]
\`\`\`
TAF EHAM 180500Z 1806/1912 28016G25KT 9999 SCT025
    TEMPO 1812/1916 29020G30KT BKN020
\`\`\`
Gusts possibly increasing to 30kt later in the afternoon. Arrival at ~1320Z should see 24-25kt gusts.

---

### Alternate — EBBR (Brussels)

**METAR** [5]
\`\`\`
EBBR 180750Z 26012KT 9999 SCT030 05/01 Q1027 NOSIG
\`\`\`
Suitable alternate. Lighter winds.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-notams",
      title: "NOTAMs",
      severity: "amber",
      content: `### EHAM — Amsterdam Schiphol

**A0892/26 — Runway 06/24 Closed** [1]
> RWY 06/24 (Kaagbaan) closed for maintenance 10 FEB to 25 FEB 2026. Arrivals via 36R, 18R, or 27 depending on wind.

**Impact:** Reduced runway options. With 280/18G24, expect RWY 27 or 36R assignment. Both adequate for A320neo.

**A0910/26 — Bird Activity Warning** [2]
> Increased bird activity (geese) reported in approach path RWY 36R, especially 0700-0900Z and 1500-1700Z.

**Impact:** Arrival at ~1320Z outside peak window, but awareness recommended.

---

### LTFJ — Sabiha Gokcen

**B5735/26 — VOR SAW Maintenance** [3]
> VOR/DME SAW U/S for maintenance 0800-1200Z 18 FEB. RNAV departures unaffected.

**Impact:** None for RNAV-equipped A320neo departure.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTFJ RWY 06

| Parameter | Value |
|-----------|-------|
| TORA | 3,000m |
| LDA | 2,580m |
| Surface | Asphalt, dry |
| Lighting | CAT I |

Adequate for A320neo at planned weight [1].

---

### Arrival — EHAM RWY 27 (expected)

| Parameter | Value |
|-----------|-------|
| TORA | 3,453m |
| LDA | 3,453m |
| Surface | Grooved asphalt, dry |
| Lighting | CAT III |

Ample length. Wind favors RWY 27 with current 280-degree direction [2].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

**SOP-PERF-013: Crosswind Limits A320neo** [1]
- Dry runway: 38 kt max demonstrated.
- Current crosswind ~18kt (gust 24kt): within limits.
- If gust spread exceeds 20kt, reduce limit by 5kt — monitor.

**SOP-FUEL-005: Fuel Reserves** [2]
- A320neo final reserve: 1,900 kg.
- Alternate (EBBR) fuel: 900 kg.

No non-standard SOPs triggered.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-safety",
      title: "Safety Learnings",
      severity: "green",
      content: `### Relevant Safety Reports

**ASRS-2026-002: Crosswind Exceedance on Landing** [1]
Gust of 35kt exceeded wet runway crosswind limit during flare. Aircraft rolled to within 2m of runway edge.

**Relevance:** EHAM runway is dry, and current gusts (24kt) are well within A320neo dry limit (38kt). Low applicability but worth awareness if conditions deteriorate.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq515-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **Crosswind monitoring** [1]: Watch for gust increase toward 30kt per TAF. Brief go-around criteria if crosswind exceeds comfort level.
2. **Bird awareness** [2]: Note EHAM bird activity NOTAM. Maintain awareness on approach, especially if assigned RWY 36R.
3. **Standard operations** [3]: No major concerns. Routine flight.

### Go/No-Go Assessment: **GO**
- All parameters within limits. Crosswind manageable.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── XQ 103  LTFM → LFPG  B737-MAX 8  delayed ───────────────────
const xq103: BriefPack = {
  flightId: "xq103",
  generatedAt: ts,
  sections: [
    {
      id: "xq103-overview",
      title: "Overview",
      severity: "amber",
      content: `### Flight XQ 103 — Istanbul (LTFM) to Paris CDG (LFPG)

| Item | Detail |
|------|--------|
| Aircraft | B737-MAX 8 (TC-SMX) |
| STD / ETD | 0745Z / **0920Z** (DELAYED +95min) |
| Flight time | 3h 15m |
| Route | LTFM — KUMRU — UM728 — LFPG |
| Fuel (planned) | 13,600 kg block fuel |
| Alternate | Paris Orly (LFPO) |

**DELAY REASON:** Inbound aircraft delayed due to technical issue at origin. New ETD 0920Z.

**Key items:**
- **Weather [1]:** Strong gusting winds at LFPG — 270/22G35kt. Crosswind component for RWY 27R approximately 8kt, headwind dominant.
- **NOTAMs [2]:** RWY 08R/26L closed at LFPG.
- **Revised arrival** [3]: ETA now ~1235Z. Weather may improve or worsen per TAF.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-weather",
      title: "Weather",
      severity: "amber",
      content: `### Departure — LTFM (Istanbul)

**METAR** [1]
\`\`\`
LTFM 180530Z 17008KT CAVOK 08/02 Q1024 NOSIG
\`\`\`
Clear conditions. No concerns.

---

### Arrival — LFPG (Paris CDG)

**METAR** [2]
\`\`\`
LFPG 180600Z 27022G35KT 9999 SCT030 BKN045 07/01 Q1019 NOSIG
\`\`\`
**AMBER:** Strong westerly wind gusting 35kt. Visibility good. Turbulence expected on approach [3].

**TAF** [3]
\`\`\`
TAF LFPG 180500Z 1806/1912 27020G32KT 9999 SCT030
    TEMPO 1808/1814 27025G38KT BKN025
    BECMG 1814/1816 25015KT SCT035
\`\`\`
Gusts may reach **38kt** during arrival window (1200-1400Z). Improving by 1600Z. RWY 27 configuration expected — headwind dominant, crosswind approximately 8-12kt [4].

**Wind shear risk:** Moderate. LFPG LLWAS active. Brief wind shear escape maneuver per SOP-OPS-038 [5].

---

### Alternate — LFPO (Paris Orly)

**METAR** [4]
\`\`\`
LFPO 180600Z 26018G28KT 9999 SCT025 06/01 Q1019 NOSIG
\`\`\`
Similar wind conditions but lighter gusts. Suitable alternate.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-notams",
      title: "NOTAMs",
      severity: "amber",
      content: `### LFPG — Paris CDG

**A3456/26 — Runway 08R/26L Closed** [1]
> RWY 08R/26L closed for resurfacing 12 FEB to 01 MAR 2026. Operations on RWY 09R/27L and 08L/26R.

**Impact:** Reduced runway capacity. Expect sequencing delays, especially with strong winds limiting approach spacing.

**A3472/26 — Wind Shear Alerting** [2]
> LLWAS (Low Level Wind Shear Alert System) enhanced sensitivity mode active during gusty conditions. Pilots may receive wind shear advisories on approach.

**A3480/26 — Taxiway November Closure** [3]
> TWY N between N4 and N6 closed for drainage works until 25 FEB.

---

### LTFM — Istanbul Airport

**B5678/26 — ILS 35L U/S** [4]
> ILS RWY 35L U/S until 2000Z. Expect RWY 35R for departure.

Standard re-routing. No operational impact on departure performance.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTFM RWY 35R

| Parameter | Value |
|-----------|-------|
| TORA | 3,000m |
| LDA | 2,700m |
| Surface | Asphalt, dry |

Adequate for B737-MAX 8 [1].

---

### Arrival — LFPG RWY 27L (expected)

| Parameter | Value |
|-----------|-------|
| TORA | 4,215m |
| LDA | 3,615m |
| Surface | Grooved asphalt, dry |
| Lighting | CAT III |

Ample length. Strong headwind will reduce ground speed and landing distance [2]. No performance concerns.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

**SOP-OPS-038: Wind Shear Escape Maneuver** [1]
- Brief wind shear recognition criteria and escape procedure.
- If EGPWS "WINDSHEAR" warning: TOGA thrust, 15 degrees nose up, maintain configuration.

**SOP-PERF-012: Crosswind Limits B737-MAX 8** [2]
- Dry runway max: 33 kt. Current crosswind ~8-12kt: well within limits.
- Gust spread 13kt: below 15kt threshold, no reduction required.

**SOP-FUEL-005: Fuel Reserves** [3]
- B737-MAX 8 final reserve: 2,000 kg.
- Commander's extra fuel recommended for potential holding.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-safety",
      title: "Safety Learnings",
      severity: "amber",
      content: `### Relevant Safety Reports

**ASRS-2026-008: Go-Around Due to Unstabilized Approach** [1]
Late ATC vector placed aircraft high on profile at a busy European hub. At 1000ft: 2 dots above glideslope, Vref+25kt. Go-around at 950ft complicated by terrain-aware missed approach.

**Relevance to XQ 103:** LFPG with strong gusty winds may lead to ATC speed/sequencing adjustments that compress approach profiles. Brief stabilized approach criteria clearly.

---

**ASRS-2026-005: TCAS RA Encounter During Climb-out** [2]
TCAS RA received climbing through FL180. Military fast-jet transiting airway without Mode-S.

**Relevance:** European airway transit. General awareness — follow TCAS RA immediately.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq103-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **Wind shear briefing** [1]: Brief escape maneuver per SOP-OPS-038 given gusty conditions at LFPG. Monitor LLWAS reports on approach.
2. **Stabilized approach** [2]: Firm commitment to go-around if not stabilized by 1000ft. Gusts may cause airspeed variations.
3. **Delay impact** [3]: 95-minute delay shifts arrival into potentially windier period per TAF. Monitor updated TAF enroute.
4. **Extra fuel** [4]: Recommend 1,500 kg Commander's extra fuel for holding contingency.

### Go/No-Go Assessment: **GO**
- Winds strong but within limits. Headwind dominant on RWY 27. Standard approach expected.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── XQ 422  LTBJ → EDDF  B737-800  scheduled ────────────────────
const xq422: BriefPack = {
  flightId: "xq422",
  generatedAt: ts,
  sections: [
    {
      id: "xq422-overview",
      title: "Overview",
      severity: "green",
      content: `### Flight XQ 422 — Izmir (LTBJ) to Frankfurt (EDDF)

| Item | Detail |
|------|--------|
| Aircraft | B737-800 (TC-SNP) |
| STD / ETD | 1130Z / 1130Z |
| Flight time | 2h 55m |
| Route | LTBJ — DIKLA — UL612 — EDDF |
| Fuel (planned) | 11,600 kg block fuel |
| Alternate | Stuttgart (EDDS) |

**Standard flight.** No significant concerns identified across all categories [1].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-weather",
      title: "Weather",
      severity: "green",
      content: `### Departure — LTBJ (Izmir)

**METAR** [1]
\`\`\`
LTBJ 180900Z 34006KT 9999 FEW045 14/05 Q1021 NOSIG
\`\`\`
Excellent conditions.

**TAF** [2]
\`\`\`
TAF LTBJ 180500Z 1806/1912 35008KT 9999 FEW045 NOSIG
\`\`\`
Stable.

---

### Arrival — EDDF (Frankfurt)

**METAR** [3]
\`\`\`
EDDF 180900Z 24010KT 9999 BKN030 04/00 Q1025 NOSIG
\`\`\`
Good conditions. Broken cloud at 3000ft, light westerly wind.

**TAF** [4]
\`\`\`
TAF EDDF 180500Z 1806/1912 24012KT 9999 BKN035
    TEMPO 1812/1918 25016KT BKN025
\`\`\`
Minor wind increase expected but well within limits.

---

### Alternate — EDDS (Stuttgart)
\`\`\`
EDDS 180900Z 23008KT 9999 SCT035 03/M01 Q1026 NOSIG
\`\`\`
Suitable alternate [5].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-notams",
      title: "NOTAMs",
      severity: "green",
      content: `### EDDF — Frankfurt

**C1890/26 — Taxiway Lima Restriction** [1]
> TWY L between L4 and L7 closed 0800-1600Z daily until 20 FEB for lighting replacement. Use TWY M.

**Impact:** Minor taxi re-routing only.

---

### LTBJ — Izmir

No operationally significant NOTAMs active [2].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTBJ RWY 34

| Parameter | Value |
|-----------|-------|
| TORA | 3,240m |
| LDA | 3,240m |
| Surface | Asphalt, dry |

No restrictions [1].

---

### Arrival — EDDF RWY 25L (expected)

| Parameter | Value |
|-----------|-------|
| TORA | 4,000m |
| LDA | 4,000m |
| Surface | Grooved asphalt, dry |
| Lighting | CAT IIIB |

Ample length. Dual runway operations (25L/25R) [2].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

No non-standard SOPs triggered. Standard references apply:
- **SOP-PERF-012:** Crosswind limits [1] — wind within limits.
- **SOP-FUEL-005:** Fuel reserves adequate [2].
- **SOP-OPS-029:** Alternate (EDDS) meets criteria [3].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-safety",
      title: "Safety Learnings",
      severity: "green",
      content: `### Relevant Safety Reports

No high-priority safety reports match conditions for this route and flight [1]. Standard awareness of EDDF complex taxi layout applies.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq422-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **Standard operations** [1]: No concerns across all briefing categories.
2. **Taxi at EDDF** [2]: Note TWY L closure — use TWY M between L4-L7.
3. **Routine flight** [3]: Weather VMC, NOTAMs minor, fuel nominal.

### Go/No-Go Assessment: **GO**
- All green. Standard operations.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── XQ 688  LTBS → EGKK  A321neo  scheduled ─────────────────────
const xq688: BriefPack = {
  flightId: "xq688",
  generatedAt: ts,
  sections: [
    {
      id: "xq688-overview",
      title: "Overview",
      severity: "green",
      content: `### Flight XQ 688 — Dalaman (LTBS) to London Gatwick (EGKK)

| Item | Detail |
|------|--------|
| Aircraft | A321neo (TC-SEC) |
| STD / ETD | 1300Z / 1300Z |
| Flight time | 3h 50m |
| Route | LTBS — DESLA — UL15 — EGKK |
| Fuel (planned) | 14,200 kg block fuel |
| Alternate | London Stansted (EGSS) |

**Key items:**
- Weather improving at EGKK — earlier morning fog has cleared [1].
- NOTAM: RWY 08L/26R restricted to arrivals only [2].
- Bird activity reported near Dalaman coastal approach [3].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-weather",
      title: "Weather",
      severity: "green",
      content: `### Departure — LTBS (Dalaman)

**METAR** [1]
\`\`\`
LTBS 181100Z 22006KT 9999 FEW040 16/06 Q1020 NOSIG
\`\`\`
Excellent conditions. Clear skies, light wind.

**TAF** [2]
\`\`\`
TAF LTBS 180500Z 1806/1912 23008KT 9999 FEW040 NOSIG
\`\`\`
Stable.

---

### Arrival — EGKK (London Gatwick)

**METAR** [3]
\`\`\`
EGKK 181100Z 05008KT 9999 SCT020 06/03 Q1030 NOSIG
\`\`\`
Good conditions. Morning fog has cleared. Scattered cloud at 2000ft. Light easterly wind [4].

**TAF** [4]
\`\`\`
TAF EGKK 180500Z 1806/1912 05006KT 9999 SCT020
    BECMG 1816/1818 04004KT SCT030
\`\`\`
Improving conditions through the afternoon. No concerns for ETA ~1650Z.

---

### Alternate — EGSS (London Stansted)
\`\`\`
EGSS 181100Z 04006KT 9999 SCT025 05/02 Q1030 NOSIG
\`\`\`
Suitable alternate [5].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-notams",
      title: "NOTAMs",
      severity: "amber",
      content: `### EGKK — London Gatwick

**A1380/26 — Runway Restriction** [1]
> RWY 08L/26R restricted to arrivals only 0600-2200Z daily due noise abatement. Departures via RWY 08R/26L only.

**Impact:** Single runway for arrivals at EGKK (standard ops). No additional concern.

**A1395/26 — RNAV Approach Restriction** [2]
> RNAV (GNSS) approach RWY 26L temporarily withdrawn until 22 FEB due GPS interference testing. ILS and VOR approaches available.

**Impact:** Low. ILS 26L fully operational for expected arrival.

---

### LTBS — Dalaman

**B5750/26 — Bird Activity** [3]
> Increased bird activity (raptors, storks) reported in the Dalaman river delta area, particularly within 3nm of RWY 13/31 at altitudes up to 2000ft AGL. Peak activity 0700-1000Z and 1500-1800Z.

**Impact:** Departure at 1300Z is between peak periods but close. Brief bird strike awareness. Coastal departure routing recommended if available.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-runway",
      title: "Airport / Runway",
      severity: "green",
      content: `### Departure — LTBS RWY 13

| Parameter | Value |
|-----------|-------|
| TORA | 3,000m |
| LDA | 3,000m |
| Surface | Asphalt, dry |
| Lighting | CAT I |

Adequate for A321neo at planned weight [1].

---

### Arrival — EGKK RWY 26L (expected)

| Parameter | Value |
|-----------|-------|
| TORA | 3,159m |
| LDA | 2,565m |
| Surface | Grooved asphalt, dry |
| Lighting | CAT I |

Adequate for A321neo [2]. Single runway operations standard at Gatwick.`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-sop",
      title: "Company SOPs",
      severity: "green",
      content: `### Active SOPs for This Flight

No non-standard SOPs triggered.

**Standard references:**
- **SOP-PERF-013:** Crosswind Limits A321neo [1] — wind within limits.
- **SOP-FUEL-005:** Fuel reserves adequate [2].
- **SOP-OPS-029:** Alternate (EGSS) meets criteria [3].`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-safety",
      title: "Safety Learnings",
      severity: "amber",
      content: `### Relevant Safety Reports

**ASRS-2025-007: Bird Strike on Initial Climb** [1]
Flock of gulls at 800ft AGL during climb from coastal airport. Engine #1 vibration and EGT rise. Parameters within limits. Returned for precautionary landing. Fan blade damage confirmed.

**Relevance to XQ 688:** Dalaman is coastal with NOTAM'd bird activity (raptors, storks). Departure at 1300Z is near afternoon peak activity period.

**Mitigations:**
- Brief bird strike awareness with focus on engine indications.
- If engine parameters exceed limits after strike, treat as engine failure.
- Report all strikes to ATC immediately.
- Consider climb speed adjustment to minimize time in bird-dense altitude band (below 2000ft AGL).`,
      lastUpdated: ts,
      isReviewed: false,
    },
    {
      id: "xq688-recommendations",
      title: "Recommendations",
      severity: "green",
      content: `### Summary Recommendations

1. **Bird strike awareness** [1]: Brief bird hazard at LTBS. Monitor for activity during takeoff roll and initial climb. Report any impacts.
2. **Weather** [2]: No concerns. EGKK fog cleared, good conditions expected at ETA.
3. **Standard operations** [3]: Routine flight otherwise.

### Go/No-Go Assessment: **GO**
- All parameters green. Bird activity is advisory awareness only.`,
      lastUpdated: ts,
      isReviewed: false,
    },
  ],
};

// ── Export ───────────────────────────────────────────────────────
export const briefPacks: Record<string, BriefPack> = {
  xq801: xq801,
  xq237: xq237,
  xq515: xq515,
  xq103: xq103,
  xq422: xq422,
  xq688: xq688,
};

export function getBriefPack(flightId: string): BriefPack | undefined {
  return briefPacks[flightId];
}

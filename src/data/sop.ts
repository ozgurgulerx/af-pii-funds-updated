export interface SOPSnippet {
  id: string;
  title: string;
  content: string;
  keywords: string[];
}

export const sopSnippets: SOPSnippet[] = [
  {
    id: "sop-001",
    title: "Low Visibility Taxi Procedures",
    content: `## SOP-OPS-041: Low Visibility Taxi Procedures

**Applicability:** All fleet types | **Revision:** Rev 12, Jan 2026

### Conditions
These procedures apply when RVR is reported below **400m** or visibility is below **600m** at the aerodrome.

### Taxi Requirements
1. **Both pilots** must monitor taxi route on airport moving map display (if equipped).
2. Captain shall taxi at **maximum 10 kt ground speed** when RVR < 400m.
3. All taxi clearances must be **read back in full**, including hold-short instructions.
4. **Stop-bar lights** must be visible before crossing any runway holding point. If stop bars are not visible, hold position and contact ATC.
5. No taxi permitted when RVR < **75m** unless follow-me vehicle is provided.

### Crew Coordination
- PF: Responsible for aircraft control and taxi navigation.
- PM: Responsible for ATC communications, verifying position on airport chart, and monitoring moving map.
- Both pilots shall cross-check taxi route **before commencing taxi**.

### Additional Restrictions
- No intersection departures permitted when RVR < 400m.
- If SMGCS is not operational and RVR < 200m, taxi is **not permitted** without a follow-me vehicle.`,
    keywords: ["low visibility", "taxi", "LVP", "RVR", "fog", "SMGCS", "stop bar"],
  },
  {
    id: "sop-002",
    title: "Runway Change After Pushback",
    content: `## SOP-OPS-057: Runway Change After Pushback

**Applicability:** All fleet types | **Revision:** Rev 8, Dec 2025

### General
If a runway change is assigned after pushback and before takeoff, the following procedures apply.

### PF Actions
1. Acknowledge the runway change with ATC.
2. Brief the **new departure runway, SID, and initial altitude**.
3. Verify takeoff performance data is valid for the new runway (length, slope, obstacles).
4. Update the FMS with the new runway and SID.

### PM Actions
1. Confirm FMS entries match the new clearance.
2. Verify **NOTAM status** of the new runway (closures, works in progress).
3. Cross-check takeoff performance: if conditions differ significantly (e.g., tailwind component, runway length), a **new takeoff data calculation is required**.
4. Update departure briefing card.

### Performance Re-check Triggers
A new performance calculation is **mandatory** if:
- Runway length differs by more than **300m**
- Wind component changes by more than **5 kt**
- Runway surface condition changes (dry vs. wet/contaminated)
- Obstacle clearance gradient differs

### Time Limitation
If the crew cannot complete all required checks within **10 minutes** of the runway change notification, they must advise ATC and request delay or return to stand.`,
    keywords: ["runway change", "pushback", "departure", "FMS", "performance", "SID"],
  },
  {
    id: "sop-003",
    title: "Crosswind Limits - B737 Series",
    content: `## SOP-PERF-012: Crosswind Limits - Boeing 737 Series

**Applicability:** B737-800, B737-MAX 8 | **Revision:** Rev 15, Feb 2026

### Maximum Demonstrated Crosswind Components

| Condition | B737-800 | B737-MAX 8 |
|-----------|----------|------------|
| Dry runway | 33 kt | 33 kt |
| Wet runway | 25 kt | 27 kt |
| Contaminated (compacted snow) | 15 kt | 17 kt |
| Contaminated (standing water/slush) | 13 kt | 15 kt |
| Icy runway (CRFI < 0.3) | 10 kt | 10 kt |

### Gust Corrections
- If gusts reported, use the **mean wind + full gust** for crosswind calculation.
- If gust spread exceeds **15 kt**, reduce maximum crosswind limit by **5 kt**.

### Autoland Crosswind Limits
- CAT II: Maximum 25 kt crosswind component.
- CAT IIIA: Maximum 15 kt crosswind component.
- CAT IIIB: Maximum 15 kt crosswind component.

### Notes
- Commander may reduce limits at their discretion based on pilot experience, visibility, and turbulence.
- First officers acting as PF: reduce all limits by **5 kt** unless specifically authorized by the Commander.`,
    keywords: ["crosswind", "B737", "B737-800", "B737-MAX", "wind limits", "landing", "contaminated runway"],
  },
  {
    id: "sop-004",
    title: "Crosswind Limits - A320 Family",
    content: `## SOP-PERF-013: Crosswind Limits - Airbus A320 Family

**Applicability:** A320neo, A321neo | **Revision:** Rev 11, Jan 2026

### Maximum Demonstrated Crosswind Components

| Condition | A320neo | A321neo |
|-----------|---------|---------|
| Dry runway | 38 kt | 35 kt |
| Wet runway | 29 kt | 27 kt |
| Contaminated (compacted snow) | 17 kt | 15 kt |
| Contaminated (standing water/slush) | 15 kt | 13 kt |
| Icy runway (CRFI < 0.3) | 12 kt | 10 kt |

### Gust Corrections
- If gusts reported, use the **mean wind + full gust** for crosswind calculation.
- If gust spread exceeds **20 kt**, reduce maximum crosswind limit by **5 kt**.

### Autoland Crosswind Limits
- CAT II: Maximum 20 kt crosswind component (A320neo), 20 kt (A321neo).
- CAT IIIA: Maximum 15 kt crosswind component.
- CAT IIIB: Maximum 15 kt crosswind component.

### Notes
- A321neo has reduced limits compared to A320neo due to longer fuselage and higher susceptibility to weathercocking.
- Commander discretion applies as per SOP-OPS-001.`,
    keywords: ["crosswind", "A320", "A320neo", "A321neo", "Airbus", "wind limits", "landing"],
  },
  {
    id: "sop-005",
    title: "Alternate Airport Selection Criteria",
    content: `## SOP-OPS-029: Alternate Airport Selection

**Applicability:** All fleet types | **Revision:** Rev 9, Nov 2025

### Destination Alternate Requirements
An alternate is required if:
1. Destination weather is forecast below **circling minima + 200ft / 1000m visibility** at ETA +/- 1 hour.
2. A single runway is available and NOTAM'd restrictions may affect landing.

### Alternate Weather Minima (at ETA)
- **Precision approach (ILS/GLS):** Ceiling >= DH + 200ft, Visibility >= approach minimum + 800m.
- **Non-precision approach:** Ceiling >= MDA + 300ft, Visibility >= approach minimum + 1500m.
- **Two independent approaches available:** Ceiling >= higher DH/MDA + 200ft, Visibility >= higher minimum + 800m.

### Operational Considerations
1. Alternate must have **adequate runway length** for aircraft landing weight.
2. Ground handling and fuel availability must be confirmed.
3. If destination has CAT II/III capability and alternate does not, ensure weather margins account for CAT I minima at alternate.
4. Consider geopolitical factors and overflight permissions for diversion routing.

### Fuel Planning Impact
- Alternate fuel = fuel from destination missed approach to alternate + approach and landing.
- Additional **15 minutes holding fuel** at alternate if only one alternate selected.`,
    keywords: ["alternate", "diversion", "weather minima", "fuel planning", "destination alternate"],
  },
  {
    id: "sop-006",
    title: "CAT III Approach Procedures",
    content: `## SOP-OPS-055: CAT III Approach Procedures

**Applicability:** B737-800, B737-MAX 8, A320neo, A321neo | **Revision:** Rev 14, Feb 2026

### Prerequisites
1. Both autopilots (or single fail-passive AP for CAT IIIA) serviceable and engaged by **1000ft AGL**.
2. ILS frequency auto-tuned and verified by both pilots.
3. Autoland capability confirmed on ECAM/STATUS page.
4. Both radio altimeters operative and cross-checked.

### Crew Briefing (mandatory items)
- Decision Height / Alert Height (DH 50ft for CAT IIIA, AH for CAT IIIB)
- Missed approach procedure (automatic go-around if below DH)
- RVR requirements and current values
- Low visibility taxi-out procedure after landing

### Approach Execution
1. At **glideslope capture**, confirm "LAND" or "LAND 3" annunciation.
2. At **500ft RA**, confirm stable: speed, configuration, glideslope, localizer.
3. At **200ft RA**, PM calls "200 radio." Both pilots monitor annunciations.
4. At **DH/AH**, PF assesses visual references:
   - If adequate visual reference: continue to land.
   - If NO visual reference at DH: initiate go-around.
5. After touchdown, manual rollout or autobrake as briefed. Do not disconnect autopilot until speed below **80 kt**.

### RVR Requirements

| Category | DH | RVR |
|----------|-----|-----|
| CAT IIIA | 50 ft | 200m |
| CAT IIIB | < 50 ft or nil | 75m |`,
    keywords: ["CAT III", "CAT IIIA", "CAT IIIB", "autoland", "ILS", "low visibility", "approach"],
  },
  {
    id: "sop-007",
    title: "De-icing / Anti-icing Holdover Times",
    content: `## SOP-OPS-063: De-icing and Anti-icing Procedures

**Applicability:** All fleet types | **Revision:** Rev 10, Jan 2026

### Pre-takeoff Contamination Check
A tactile or visual check of critical surfaces is **mandatory** if:
- More than **15 minutes** have elapsed since de-icing in active precipitation.
- Holdover time has expired or is about to expire.

### Holdover Time Guidelines (Type IV Fluid)

| OAT | Freezing Fog | Light Snow | Moderate Snow | Heavy Snow | Freezing Rain |
|-----|-------------|------------|---------------|------------|---------------|
| -3 to 0C | 60 min | 45 min | 25 min | 15 min | 15 min |
| -14 to -3C | 90 min | 60 min | 35 min | 20 min | 20 min |
| Below -14C | 120 min | 75 min | 40 min | 20 min | N/A |

### Procedures
1. **One-step de-icing:** Type I heated fluid (60C min) for removal of existing contamination, followed immediately by Type IV for anti-icing protection.
2. **Two-step de-icing:** Type I for removal, then Type IV applied within **3 minutes** of completing Type I application.
3. Record the **start time of final anti-icing application** as the holdover time reference.

### Taxi Limitations
- Taxi speed shall not exceed **15 kt** after de-icing to minimize fluid loss.
- Avoid taxiing through standing water, slush, or contaminated areas.
- If holdover time expires before takeoff, **return for re-treatment**.`,
    keywords: ["de-icing", "anti-icing", "holdover", "contamination", "Type IV", "Type I", "winter operations"],
  },
  {
    id: "sop-008",
    title: "Fuel Policy - Minimum Reserves",
    content: `## SOP-FUEL-005: Minimum Fuel Reserves

**Applicability:** All fleet types | **Revision:** Rev 7, Dec 2025

### Minimum Fuel at Destination
The aircraft must arrive at destination with no less than:
- **Final reserve fuel:** 30 minutes at 1500ft above destination elevation in clean configuration.
- For B737-800: approximately **2,200 kg**.
- For B737-MAX 8: approximately **2,000 kg**.
- For A320neo: approximately **1,900 kg**.
- For A321neo: approximately **2,300 kg**.

### Additional Fuel Requirements

| Component | Calculation |
|-----------|-------------|
| Trip fuel | Planned burn to destination |
| Contingency | 5% of trip fuel (minimum 3% if enroute alternate available) |
| Alternate fuel | Fuel from destination missed approach to alternate |
| Final reserve | 30 minutes holding at 1500ft AGL |
| Additional fuel | Commander discretion (weather, ATC delays, etc.) |

### MINIMUM DIVERSION FUEL
At any point enroute, the aircraft must have sufficient fuel to:
1. Proceed to the nearest adequate airport.
2. Descend, approach, and land.
3. Hold for **30 minutes** at 1500ft above that airport.

### Commander's Extra Fuel
The Commander shall add fuel for:
- Known or forecast holding at destination or alternate.
- Adverse weather requiring deviation or altitude changes.
- Anticipated ATC restrictions or traffic delays.
- Single-runway operations at destination.`,
    keywords: ["fuel", "reserves", "minimum fuel", "diversion fuel", "contingency", "planning"],
  },
  {
    id: "sop-009",
    title: "Wind Shear Escape Maneuver",
    content: `## SOP-OPS-038: Wind Shear Escape Maneuver

**Applicability:** All fleet types | **Revision:** Rev 13, Feb 2026

### Recognition
Wind shear is suspected when any of the following occur simultaneously:
- **Airspeed variation** of +/- 15 kt
- **Vertical speed variation** of +/- 500 fpm
- **Pitch attitude variation** of +/- 5 degrees (uncommanded)
- EGPWS "WINDSHEAR" warning

### Escape Maneuver (Takeoff - below 1000ft AGL)
1. **Thrust:** Advance thrust levers to **TOGA** (or firewall).
2. **Pitch:** Rotate to initial pitch attitude **15 degrees nose up**.
   - Do NOT exceed stick shaker / alpha protection.
3. **Configuration:** Do NOT change flap or gear configuration until terrain clearance is assured.
4. **Autopilot:** Disconnect if not already disconnected.
5. **Follow flight director WINDSHEAR guidance** if available.

### Escape Maneuver (Approach - below 1000ft AGL)
1. **Thrust:** Advance to **TOGA**.
2. **Pitch:** Target **15 degrees nose up** initially.
3. **Configuration:** Do NOT retract flaps or gear until positive rate of climb established.
4. **Go-around:** Execute missed approach once clear of shear.
5. Report wind shear to ATC with details.

### Post-Event
- Report wind shear intensity and altitude band to ATC.
- File a wind shear PIREP.
- Assess aircraft performance and fuel before re-attempting approach.`,
    keywords: ["wind shear", "escape", "TOGA", "go-around", "EGPWS", "microburst", "approach"],
  },
  {
    id: "sop-010",
    title: "Contaminated Runway Operations",
    content: `## SOP-PERF-020: Contaminated Runway Operations

**Applicability:** All fleet types | **Revision:** Rev 6, Nov 2025

### Runway Condition Reporting
Pilots must obtain the latest RCAM (Runway Condition Assessment Matrix) or SNOWTAM before operating on contaminated runways.

### RWYCC to Braking Action Mapping

| RWYCC | Braking Action | Typical Surface |
|-------|---------------|-----------------|
| 6 | Dry | Dry pavement |
| 5 | Good | Wet (grooved/PFC) |
| 4 | Good to Medium | Compacted snow (-15C) |
| 3 | Medium | Wet (smooth), dry snow, wet compacted snow |
| 2 | Medium to Poor | Standing water, slush < 3mm |
| 1 | Poor | Ice, wet ice, slush > 3mm |
| 0 | Unreliable | Conditions worse than Poor |

### Operating Limits
- **RWYCC 0:** Landing and takeoff **PROHIBITED**.
- **RWYCC 1:** Landing permitted only if no better runway/airport available. Takeoff requires Commander approval and performance re-assessment.
- **RWYCC 2 or below:** Autobrake MAX recommended. Reverse thrust must be applied immediately after touchdown.

### Performance Adjustments
1. Use manufacturer contaminated runway performance data (not factored dry data).
2. Add **15% safety margin** to calculated landing distance.
3. Consider reduced thrust takeoff restrictions: **no reduced thrust** on RWYCC 3 or below.
4. Maximum crosswind limits per SOP-PERF-012/013 apply.`,
    keywords: ["contaminated", "runway condition", "RWYCC", "braking action", "SNOWTAM", "ice", "standing water"],
  },
];

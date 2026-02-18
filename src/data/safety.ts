export interface SafetyReport {
  id: string;
  title: string;
  narrative: string;
  mitigations: string[];
  keywords: string[];
  date: string;
  severity: "low" | "medium" | "high";
}

export const safetyReports: SafetyReport[] = [
  {
    id: "asrs-001",
    title: "Late Runway Change During Low Visibility Operations",
    narrative: `During LVP operations at a major European hub (visibility 250m, RVR 300m), ATC assigned a runway change from 25R to 25L after we had already completed the before-takeoff checklist. The crew reprogrammed the FMS while under pressure to maintain sequence. The PM inadvertently loaded the wrong SID, which was caught during the cross-check but resulted in a 12-minute delay. The new runway had a NOTAM'd displaced threshold reducing available length by 300m, requiring a complete performance recalculation.

**Key factors:** Time pressure from ATC, low visibility limiting external reference cross-checks, unfamiliarity with the alternate SID from the new runway.`,
    mitigations: [
      "Always verify NOTAM status of the newly assigned runway before accepting the change.",
      "Use the '10-minute rule' - if checks cannot be completed in 10 minutes, request a delay or return to stand.",
      "PM should independently verify FMS entries against the new clearance using paper/EFB chart.",
      "Brief the new departure procedure verbally even if time is short.",
    ],
    keywords: ["runway change", "low visibility", "LVP", "FMS", "SID", "time pressure"],
    date: "2026-01-15",
    severity: "high",
  },
  {
    id: "asrs-002",
    title: "Crosswind Exceedance on Landing - B737-800",
    narrative: `On approach to a coastal Mediterranean airport, ATIS reported wind 270/18G28. The crosswind component for runway 36 was calculated at 18 kt steady, within limits. During the final 200ft, a gust of 35 kt was recorded by the anemometer, creating a momentary crosswind component exceeding 28 kt on the wet runway (limit: 25 kt). The aircraft touched down with a 4-degree crab angle and rolled to within 2m of the runway edge before correction.

The crew elected to continue the landing rather than go around because they were below 100ft RA when the gust occurred. Post-event data analysis showed the actual crosswind component peaked at 31 kt during the flare.`,
    mitigations: [
      "When gusts exceed 15 kt spread, apply the full gust value (not half) for crosswind calculation.",
      "Brief a go-around plan even at low altitude for gusty crosswind conditions.",
      "Consider using the higher crosswind limit runway even if it requires a tailwind component.",
      "Review operator-specific gust correction policy before each gusty approach.",
    ],
    keywords: ["crosswind", "gust", "landing", "B737", "wind limits", "runway excursion"],
    date: "2026-01-22",
    severity: "high",
  },
  {
    id: "asrs-003",
    title: "Taxi Incursion Near-Miss at Complex Airport",
    narrative: `After landing on runway 06, we were cleared to taxi to gate via taxiway Alpha. The airport moving map was not updated with the latest construction work area. At taxiway Alpha-3, we approached a crossing runway (14/32) that was active. The PM was heads-down reviewing the gate assignment when the PF noticed an aircraft on short final for runway 14 approximately 1.5 nm out.

We stopped 15m short of the holding point. ATC had not issued a hold-short instruction because the system showed us still on the main taxiway. The stop-bar lights at the holding point were inoperative (NOTAM'd, but neither crew member had noted this specific NOTAM during briefing).`,
    mitigations: [
      "Always review NOTAMs for taxiway/stop-bar serviceability, not just runway NOTAMs.",
      "PM should maintain heads-up lookout during taxi, especially at complex airports.",
      "Even without a hold-short instruction, always visually clear crossing runways.",
      "Update airport moving map databases before each flight if possible.",
    ],
    keywords: ["taxi", "incursion", "near-miss", "stop bar", "NOTAM", "crossing runway"],
    date: "2026-02-01",
    severity: "high",
  },
  {
    id: "asrs-004",
    title: "Rejected Takeoff Due to Tire Debris on Runway",
    narrative: `During the takeoff roll at 95 kt (V1 = 142 kt), the PM observed what appeared to be a large piece of tire debris on the runway centerline approximately 500m ahead. The PF called "REJECT" and initiated maximum braking and full reverse thrust. The aircraft stopped with approximately 800m of runway remaining.

Post-event inspection revealed the debris was a section of truck tire approximately 40cm in diameter. No FOD check had been conducted in the previous 2 hours despite 3 heavy aircraft movements. The crew's decision to reject was appropriate given the distance and speed margins available.`,
    mitigations: [
      "Below V1, PF has authority to reject for any perceived hazard on the runway.",
      "Airports with construction activity nearby should increase FOD check frequency.",
      "Brief FOD awareness as part of the takeoff brief at airports with known surface issues.",
      "Report all FOD immediately to ATC for runway closure and inspection.",
    ],
    keywords: ["rejected takeoff", "RTO", "FOD", "tire debris", "runway inspection"],
    date: "2025-12-10",
    severity: "medium",
  },
  {
    id: "asrs-005",
    title: "TCAS RA Encounter During Climb-out",
    narrative: `Climbing through FL180 on a standard European airway, we received a TCAS TA followed 8 seconds later by an RA commanding "CLIMB, CLIMB." The intruder was a military fast-jet transiting the airway at FL185 without a transponder Mode-S response, visible on TCAS only intermittently.

PF immediately disconnected the autopilot and followed the RA guidance, climbing at 2500 fpm. The closest point of approach was estimated at 300ft vertical and 0.8nm lateral. ATC had no awareness of the military traffic until our report. The RA was resolved after 15 seconds with "CLEAR OF CONFLICT."`,
    mitigations: [
      "Always follow TCAS RA commands immediately, regardless of ATC instructions.",
      "Report all TCAS RA events to ATC with altitude, heading, and estimated miss distance.",
      "Be aware of military training areas near airways and brief potential TCAS events.",
      "File a mandatory occurrence report for all TCAS RA events.",
    ],
    keywords: ["TCAS", "RA", "resolution advisory", "military", "conflict", "climb"],
    date: "2026-01-08",
    severity: "medium",
  },
  {
    id: "asrs-006",
    title: "Fuel Emergency Diversion",
    narrative: `Holding at destination due to a runway closure (disabled aircraft), the crew held for 25 minutes in the published holding pattern. When the runway reopened, we were number 14 in the sequence. Fuel calculations showed we could accept one approach attempt with minimum reserve fuel at the alternate.

After the first approach resulted in a go-around due to wake turbulence spacing violations by ATC, the crew declared MAYDAY FUEL and diverted to the alternate. We landed with 1,950 kg remaining (minimum reserve: 2,200 kg for the aircraft type). The hold had consumed more fuel than planned because the holding altitude was FL120 (higher than planned FL080) due to traffic.`,
    mitigations: [
      "Declare PAN PAN FUEL when reserve fuel is expected to be reached before landing.",
      "Continuously update fuel calculations during holds, using actual consumption not planned.",
      "Consider diversion earlier rather than later when holding duration is uncertain.",
      "Brief minimum diversion fuel before entering any hold and set a hard fuel gate.",
    ],
    keywords: ["fuel emergency", "diversion", "holding", "minimum fuel", "MAYDAY", "reserves"],
    date: "2026-02-05",
    severity: "high",
  },
  {
    id: "asrs-007",
    title: "Bird Strike on Initial Climb",
    narrative: `At approximately 800ft AGL during initial climb from a coastal airport, a flock of large gulls was encountered. Multiple impacts were felt and heard. The PM reported a vibration on engine #1 and EGT rising 15 degrees above normal. Engine parameters stabilized within limits but the vibration persisted.

The crew ran the engine vibration checklist, which recommended continuing to climb if parameters remained within limits. We continued the departure, climbed to a safe altitude, and requested a return to the departure airport. Post-landing borescope inspection revealed minor fan blade damage on engine #1 and dents on the nose radome.`,
    mitigations: [
      "Brief bird strike awareness at airports with known avian activity, especially coastal locations.",
      "If engine parameters exceed limits after a bird strike, treat as an engine failure.",
      "Report bird strikes to ATC immediately to warn following traffic.",
      "Consider climb speed adjustment (Vy vs V2+XX) to minimize time in bird-dense altitude bands.",
    ],
    keywords: ["bird strike", "engine damage", "vibration", "coastal", "avian"],
    date: "2025-11-28",
    severity: "medium",
  },
  {
    id: "asrs-008",
    title: "Go-Around Due to Unstabilized Approach",
    narrative: `On approach to a mountainous European airport with circling required, the aircraft was configured with gear down and flaps 30 at 1200ft AGL. A late vector by ATC placed us high on the approach profile. At 1000ft, we were 2 dots above the glideslope and at Vref + 25 kt. The PF initiated a go-around at 950ft AGL per stabilization criteria.

The go-around was complicated by terrain to the north requiring an immediate climbing left turn per the missed approach procedure. The crew executed the procedure correctly but noted the high workload due to the late decision altitude. This was the second go-around at this airport in the same week for the airline.`,
    mitigations: [
      "Strictly adhere to stabilization criteria at 1000ft (IFR) or 500ft (VFR).",
      "Brief terrain-aware missed approach procedures at challenging airports before starting the approach.",
      "Do not accept ATC vectors that compress the approach when at challenging airports.",
      "Share go-around experiences via safety reporting to build awareness for specific airports.",
    ],
    keywords: ["go-around", "unstabilized", "approach", "terrain", "stabilization criteria"],
    date: "2026-01-30",
    severity: "medium",
  },
];

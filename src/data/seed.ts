import type { Conversation, Message, Citation, WatchlistItem } from "@/types";

export type HeroProfileId = "balanced" | "momentum" | "defensive" | "aggressive";

export interface HeroProfileSuggestion {
  id: HeroProfileId;
  label: string;
  code: string;
  fundName: string;
  badge: string;
  summary: string;
  query: string;
}

export const SAMPLE_CITATIONS: Citation[] = [
  {
    id: 1,
    provider: "SEC EDGAR",
    dataset: "N-PORT Q4 2024",
    rowId: "NPORT-P/A:0000102909-24-000892",
    timestamp: "2024-12-15T08:30:00Z",
    confidence: 0.98,
    excerpt: "Vanguard Total Bond Market Index Fund - Total Net Assets: $328.4B",
  },
  {
    id: 2,
    provider: "SEC EDGAR",
    dataset: "N-PORT Q4 2024",
    rowId: "NPORT-P/A:0000036405-24-001234",
    timestamp: "2024-12-10T14:22:00Z",
    confidence: 0.95,
    excerpt: "PIMCO Income Fund - MBS Holdings: 42.3% of portfolio, DV01: $8.2M",
  },
  {
    id: 3,
    provider: "IMF WEO",
    dataset: "World Economic Outlook Oct 2024",
    rowId: "IMF-WEO-2410-CH1",
    timestamp: "2024-10-22T00:00:00Z",
    confidence: 0.97,
    excerpt: "Global inflation expected to decline to 4.3% in 2025, supporting gradual rate cuts",
  },
  {
    id: 4,
    provider: "SEC EDGAR",
    dataset: "N-PORT Q4 2024",
    rowId: "NPORT-P/A:0000729218-24-000567",
    timestamp: "2024-12-12T10:15:00Z",
    confidence: 0.96,
    excerpt: "Fidelity Contrafund - NVIDIA Corp (CUSIP: 67066G104) - 4.2% of portfolio",
  },
];

export const HERO_PROFILE_SUGGESTIONS: HeroProfileSuggestion[] = [
  {
    id: "balanced",
    label: "Balanced",
    code: "VTBM",
    fundName: "Vanguard Total Bond Market Index",
    badge: "Risk 5/7",
    summary: "A core allocation candidate when duration and credit quality need to stay balanced.",
    query: "Give me a profile of Vanguard Total Bond Market Index and explain when it fits a balanced allocation.",
  },
  {
    id: "momentum",
    label: "Momentum",
    code: "FCNT",
    fundName: "Fidelity Contrafund",
    badge: "AI-led",
    summary: "A high-conviction growth fund when market leadership is still concentrated in AI-heavy exposures.",
    query: "Why is Fidelity Contrafund a momentum-style pick right now, and what is driving its AI exposure?",
  },
  {
    id: "defensive",
    label: "Defensive",
    code: "VSTB",
    fundName: "Vanguard Short-Term Bond",
    badge: "Risk 3/7",
    summary: "A steadier sleeve when preserving liquidity and containing duration risk matters more than upside chase.",
    query: "Summarize Vanguard Short-Term Bond and explain why it works as a defensive fund in the current rate backdrop.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    code: "FOTC",
    fundName: "Fidelity OTC Portfolio",
    badge: "Risk 6/7",
    summary: "A tactical higher-beta option when you want more concentrated participation in technology and growth.",
    query: "Walk me through Fidelity OTC Portfolio as an aggressive fund idea and highlight the main concentration risks.",
  },
] as const;

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Bond Fund Analysis",
    createdAt: new Date("2024-12-20T10:30:00Z"),
    updatedAt: new Date("2024-12-20T10:35:00Z"),
    isSaved: true,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "What are the top 5 largest bond funds by AUM?",
        createdAt: new Date("2024-12-20T10:30:00Z"),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: `## Top 5 Bond Funds by AUM [1]

Based on the latest SEC N-PORT filings:

| Rank | Fund Name | Manager | Total Net Assets |
|------|-----------|---------|------------------|
| 1 | Vanguard Total Bond Market Index | Vanguard | $328.4B |
| 2 | PIMCO Income Fund | PIMCO | $142.7B |
| 3 | Vanguard Intermediate-Term Corporate | Vanguard | $89.2B |
| 4 | iShares Core U.S. Aggregate Bond | BlackRock | $85.1B |
| 5 | Metropolitan West Total Return Bond | MetWest | $78.4B |

**Key Insight:** Vanguard dominates the bond fund space with both the largest index fund and significant presence in corporate bonds.`,
        createdAt: new Date("2024-12-20T10:30:30Z"),
        citations: [SAMPLE_CITATIONS[0], SAMPLE_CITATIONS[1]],
        isVerified: true,
      },
      {
        id: "msg-3",
        role: "user",
        content: "What is PIMCO Income Fund's interest rate risk exposure?",
        createdAt: new Date("2024-12-20T10:32:00Z"),
      },
      {
        id: "msg-4",
        role: "assistant",
        content: `Based on the SEC N-PORT filings, PIMCO Income Fund has the following interest rate risk profile [2]:

### Duration Risk (DV01 by Tenor)
- **3-month:** $1.2M
- **1-year:** $2.8M
- **5-year:** $8.2M (largest exposure)
- **10-year:** $4.1M
- **30-year:** $1.9M

### Portfolio Composition
- **MBS Holdings:** 42.3% of portfolio
- **Corporate Bonds:** 28.1%
- **Government Securities:** 18.7%

**Key Insight:** The fund has concentrated duration risk in the 5-year tenor, making it sensitive to intermediate-term rate movements.`,
        createdAt: new Date("2024-12-20T10:32:30Z"),
        citations: [SAMPLE_CITATIONS[1]],
        isVerified: true,
      },
    ],
  },
  {
    id: "conv-2",
    title: "Macro + Fund Strategy",
    createdAt: new Date("2024-12-19T14:00:00Z"),
    updatedAt: new Date("2024-12-19T14:10:00Z"),
    isSaved: false,
    messages: [
      {
        id: "msg-5",
        role: "user",
        content: "Best bond funds given IMF's rate outlook?",
        createdAt: new Date("2024-12-19T14:00:00Z"),
      },
      {
        id: "msg-6",
        role: "assistant",
        content: `## Bond Fund Recommendations Based on IMF Outlook [2][3]

### IMF Economic Context
The IMF projects inflation to decline to 4.3% in 2025, supporting gradual rate cuts by major central banks. This creates a favorable environment for duration-sensitive assets.

### Recommended Funds

**For Income Seekers:**
- **PIMCO Income Fund** - High yield with active MBS management
- **Metropolitan West Total Return** - Diversified approach

**For Rate Sensitivity:**
- **Vanguard Long-Term Treasury** - Maximum duration benefit from rate cuts
- **iShares 20+ Year Treasury** - Pure long-duration exposure

**For Risk Management:**
- **Vanguard Short-Term Bond** - Lower volatility if rate path uncertain

**Key Insight:** With the IMF expecting disinflation, longer-duration funds should outperform, but investors should size positions based on their rate conviction.`,
        createdAt: new Date("2024-12-19T14:00:45Z"),
        citations: [SAMPLE_CITATIONS[1], SAMPLE_CITATIONS[2]],
        isVerified: true,
      },
    ],
  },
  {
    id: "conv-3",
    title: "Equity Fund Holdings",
    createdAt: new Date("2024-12-18T09:00:00Z"),
    updatedAt: new Date("2024-12-18T09:15:00Z"),
    isSaved: true,
    messages: [
      {
        id: "msg-7",
        role: "user",
        content: "Which funds hold NVIDIA stock?",
        createdAt: new Date("2024-12-18T09:00:00Z"),
      },
      {
        id: "msg-8",
        role: "assistant",
        content: `## Funds Holding NVIDIA (CUSIP: 67066G104) [4]

Based on N-PORT filings, here are the top funds by NVIDIA allocation:

| Fund | Manager | % of Portfolio | Value |
|------|---------|----------------|-------|
| Fidelity Contrafund | Fidelity | 4.2% | $5.8B |
| Vanguard Growth Index | Vanguard | 3.8% | $12.1B |
| T. Rowe Price Blue Chip | T. Rowe | 3.5% | $2.4B |
| American Funds Growth | Capital Group | 3.1% | $4.7B |
| Fidelity OTC Portfolio | Fidelity | 2.9% | $1.8B |

**Total NVIDIA Holdings:** $26.8B across top 5 funds

**Key Insight:** Fidelity Contrafund has the highest concentration, suggesting strong conviction in the AI/semiconductor thesis.`,
        createdAt: new Date("2024-12-18T09:00:30Z"),
        citations: [SAMPLE_CITATIONS[3]],
        isVerified: true,
      },
    ],
  },
];

export const SAMPLE_WATCHLIST: WatchlistItem[] = [
  {
    id: "w1",
    type: "company",
    name: "PIMCO Income Fund",
    addedAt: new Date("2024-12-15"),
  },
  {
    id: "w2",
    type: "company",
    name: "Vanguard Total Bond",
    addedAt: new Date("2024-12-18"),
  },
  {
    id: "w3",
    type: "investor",
    name: "Fidelity Contrafund",
    addedAt: new Date("2024-12-10"),
  },
  {
    id: "w4",
    type: "investor",
    name: "T. Rowe Price Growth",
    addedAt: new Date("2024-12-12"),
  },
];

// Legacy follow-up suggestions (string array for backwards compatibility)
export const FOLLOW_UP_SUGGESTIONS = [
  "Which funds are riding the AI wave?",
  "Best funds if the dollar weakens?",
  "Top bond funds for today's rate environment",
  "What's the IMF outlook on global growth?",
];

// Query type definitions for the UI
export type QueryType = "sql" | "semantic" | "hybrid" | "chain" | "raptor";

// Enhanced follow-up suggestions with query type metadata
export interface FollowUpSuggestion {
  text: string;
  type: QueryType;
}

export const ENHANCED_FOLLOW_UP_SUGGESTIONS: FollowUpSuggestion[] = [
  { text: "Which funds have the biggest NVIDIA positions?", type: "sql" },
  { text: "Best funds for current rate environment?", type: "chain" },
  { text: "What's IMF saying about US growth in 2025?", type: "raptor" },
  { text: "Funds with an aggressive AI/tech focus", type: "semantic" },
  { text: "Where to invest if inflation stays high?", type: "chain" },
  { text: "Compare duration risk: Vanguard vs PIMCO", type: "sql" },
];

export const RTI_IQ_FOLLOW_UP_SUGGESTIONS: FollowUpSuggestion[] = [
  { text: "Show a fund to issuer path for a sample fund", type: "sql" },
  { text: "Which issuers are connected to the same fund through holdings?", type: "sql" },
  { text: "Trace Fund to Holding to Instrument to Issuer for one example", type: "chain" },
  { text: "Which funds share an issuer in the RTI / IQ proof lane?", type: "chain" },
];

// Demo queries for live presentations - designed to be impressive and topical
export const DEMO_QUERIES = {
  // Code-based RAG queries (work with SQL/SEMANTIC/RAPTOR/CHAIN routes)
  codeRag: [
    // SQL - Fast, precise, impressive data lookups
    { query: "Which funds have the largest NVIDIA holdings?", route: "SQL", description: "Shows AI investment exposure" },
    { query: "Top 5 bond funds by total assets under management", route: "SQL", description: "Quick ranking query" },
    { query: "Funds with duration risk (DV01) over $10 million", route: "SQL", description: "Risk metric lookup" },

    // SEMANTIC - Style and similarity matching
    { query: "Conservative income funds for retirees", route: "SEMANTIC", description: "Style-based search" },
    { query: "Aggressive growth funds betting on tech", route: "SEMANTIC", description: "Investment style matching" },

    // RAPTOR - Economic outlook
    { query: "What's the IMF forecast for global inflation?", route: "RAPTOR", description: "Macro economic context" },
    { query: "IMF view on emerging market growth", route: "RAPTOR", description: "Regional economic outlook" },

    // SEMANTIC_RAPTOR - Fund style + macro context (faster than CHAIN, no SQL)
    { query: "Growth funds aligned with IMF's positive outlook", route: "SEMANTIC_RAPTOR", description: "Style + macro (parallel)" },
    { query: "Conservative funds suited for uncertain economic times", route: "SEMANTIC_RAPTOR", description: "Defense style + macro" },
    { query: "Income-focused funds that fit the inflation forecast", route: "SEMANTIC_RAPTOR", description: "Income style + inflation" },

    // CHAIN - The impressive macro-driven queries (takes longer but shows intelligence)
    { query: "Best bond funds for current rate environment?", route: "CHAIN", description: "Looks up rates, then recommends funds" },
    { query: "Where should I invest if inflation rises to 5%?", route: "CHAIN", description: "Hypothetical scenario analysis" },
    { query: "How to position my portfolio given IMF's outlook?", route: "CHAIN", description: "Full macro-driven recommendation" },
  ],

  // Foundry IQ queries (uses Azure AI Agent with grounded knowledge)
  foundryIq: [
    { query: "What are the largest bond ETFs?", description: "General fund knowledge" },
    { query: "Explain duration risk in bond funds", description: "Educational/conceptual" },
    { query: "How do interest rates affect bond prices?", description: "Market mechanics" },
    { query: "Best practices for fixed income allocation", description: "Investment guidance" },
    { query: "Compare active vs passive bond fund strategies", description: "Strategy comparison" },
  ],

  rtiIq: [
    { query: "Show a Fund to Holding to Instrument to Issuer path for one sample fund", description: "Graph proof traversal" },
    { query: "Which issuers appear under the same fund through holdings?", description: "Connected issuer lookup" },
    { query: "Find a shared issuer across two funds in the RTI / IQ proof lane", description: "Cross-fund graph check" },
  ],
};

export interface QueryCategory {
  id: QueryType;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  examples: string[];
}

export const QUERY_CATEGORIES: QueryCategory[] = [
  {
    id: "sql",
    title: "Data Lookups",
    description: "Precise queries from SEC N-PORT filings (490K holdings)",
    icon: "Database",
    color: "blue",
    examples: [
      "Which funds hold the most NVIDIA stock?",
      "Top 10 largest bond funds by AUM",
      "Funds with DV01 exposure over $5 million",
      "Compare Apple holdings: Vanguard vs Fidelity",
    ],
  },
  {
    id: "semantic",
    title: "Style Matching",
    description: "Find funds by investment style and similarity",
    icon: "Compass",
    color: "purple",
    examples: [
      "Conservative income funds for retirement",
      "Aggressive growth funds focused on AI/tech",
      "Funds similar to PIMCO Total Return",
      "Low-volatility bond funds for capital preservation",
    ],
  },
  {
    id: "chain",
    title: "Macro-Driven",
    description: "Economic context drives fund recommendations",
    icon: "GitBranch",
    color: "amber",
    examples: [
      "Best bond funds for current rate environment",
      "Where to invest if inflation rises to 5%?",
      "Portfolio positioning for IMF's growth forecast",
      "Which funds benefit if dollar weakens?",
    ],
  },
  {
    id: "raptor",
    title: "Economic Outlook",
    description: "IMF World Economic Outlook analysis",
    icon: "Globe",
    color: "rose",
    examples: [
      "What's the IMF saying about inflation in 2025?",
      "IMF's view on US economic growth",
      "Global recession risk according to the IMF",
      "What does IMF predict for emerging markets?",
    ],
  },
];

// Flattened list of all example queries with their types
export const ALL_QUERY_EXAMPLES = QUERY_CATEGORIES.flatMap((cat) =>
  cat.examples.map((example) => ({
    text: example,
    type: cat.id,
    color: cat.color,
  }))
);

export const DATA_PROVIDERS = [
  { name: "SEC EDGAR", type: "Primary" },
  { name: "N-PORT Filings", type: "Primary" },
  { name: "Form 13F", type: "Secondary" },
];

export function getDataAsOfTimestamp(): string {
  return new Date().toISOString().split("T")[0] + " 08:00 UTC";
}

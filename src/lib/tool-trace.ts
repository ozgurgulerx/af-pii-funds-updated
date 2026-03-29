import type { ToolTraceStep } from "@/types";

const TOOL_NAME_LABELS: Record<string, string> = {
  "Query Rewrite": "Soru Düzenleme",
  "Query Analysis": "Sorgu Analizi",
  "Intent Router V2": "Yönlendirme Karar Motoru",
  "LLM Response Generation": "Yanıt Oluşturma",
  "PII Detection": "Kişisel Veri Kontrolü",
  "Context Compaction": "Bağlam Düzenleme",
  "Answer Brief Builder": "Answer Brief Builder",
  "Answer Validation": "Answer Validation",
  "Azure AI Search (Filter)": "Azure AI Search (Filtreli Arama)",
  "Azure AI Search (Semantic)": "Azure AI Search (Anlamsal Arama)",
  "Azure AI Search (Hybrid)": "Azure AI Search (Karma Arama)",
  "Azure AI Search (Hybrid + Market)": "Azure AI Search (Karma + Piyasa)",
  "Azure AI Search (Market)": "Azure AI Search (Piyasa)",
  "Azure AI Search (Macro Reports)": "Azure AI Search (Makro Raporlar)",
  "Azure AI Search (Agentic)": "Azure AI Search (Ajan Akışı)",
  "PostgreSQL (SQL Query)": "PostgreSQL (SQL Sorgusu)",
  "Chain (Market → Fund)": "Zincir Akış (Piyasa → Fon)",
  "Foundry IQ": "Foundry IQ",
};

const ROUTE_LABELS: Record<string, string> = {
  SQL: "SQL",
  FILTER_SEARCH: "Filtreli Arama",
  SEMANTIC_SEARCH: "Anlamsal Arama",
  MARKET_SEARCH: "Piyasa",
  HYBRID: "Karma Arama",
  CHAIN: "Zincir Akış",
  AGENTIC: "Ajan Akışı",
  FOUNDRY_IQ: "Foundry IQ",
};

function localizeRouteLabel(route: string): string {
  return ROUTE_LABELS[route] ?? route;
}

export function localizeToolName(toolName: string): string {
  return TOOL_NAME_LABELS[toolName] ?? toolName;
}

export function localizeTraceInputSummary(summary: string): string {
  let text = summary.trim();
  if (!text) return text;

  text = text.replace(/^message inspection$/i, "mesaj incelemesi");
  text = text.replace(/^history_len=(\d+)$/i, "geçmiş uzunluğu=$1");
  text = text.replace(/^context_len=(\d+), history_len=(\d+)$/i, "bağlam uzunluğu=$1, geçmiş uzunluğu=$2");
  text = text.replace(/^query:\s*/i, "sorgu: ");
  text = text.replace(/^message length=(\d+) chars$/i, "mesaj uzunluğu=$1 karakter");
  text = text.replace(/^(\d+) messages, session=(.+)$/i, (_, count: string, session: string) => {
    const normalizedSession = session === "single" ? "tek" : session;
    return `${count} ileti, oturum=${normalizedSession}`;
  });

  return text;
}

export function localizeTraceOutputSummary(summary: string): string {
  let text = summary.trim();
  if (!text) return text;

  text = text.replace(/^clean input$/i, "Kişisel veri tespit edilmedi");
  text = text.replace(/^single-session context preserved$/i, "Tüm ileti tek oturum bağlamında korundu");
  text = text.replace(/^skipped: no_history$/i, "Atlandı: geçmiş yeterli değil");
  text = text.replace(/^skipped: already standalone$/i, "Atlandı: soru zaten bağımsız");
  text = text.replace(/route=(\w+)\s+confidence=([\d.]+);?\s*(.*)/i, (_, route: string, confidence: string, rest: string) => {
    const localizedRest = rest?.trim() ? rest.trim() : "rota seçildi";
    return `rota=${localizeRouteLabel(route)} güven=${confidence}; ${localizedRest}`;
  });
  text = text.replace(/^(\d+)\s+citation\(s\)\s+prepared$/i, "$1 atıf hazırlandı");
  text = text.replace(/^verified with (\d+) citation\(s\)$/i, "$1 atıf ile doğrulandı");
  text = text.replace(/^verified without explicit citations$/i, "Açık atıf olmadan doğrulandı");
  text = text.replace(/^response drafted from retrieved evidence$/i, "Yanıt taslağı bulunan kanıtlardan üretildi");
  text = text.replace(/^summary composed from retrieved evidence$/i, "Yanıt özeti getirilen kanıtlardan derlendi");
  text = text.replace(/^answer length=(\d+) chars$/i, "yanıt uzunluğu=$1 karakter");

  return text;
}

export function upsertToolTrace(prev: ToolTraceStep[], step: ToolTraceStep): ToolTraceStep[] {
  const idx = prev.findIndex((candidate) => candidate.id === step.id);
  if (idx === -1) return [...prev, step];
  const next = [...prev];
  next[idx] = step;
  return next;
}

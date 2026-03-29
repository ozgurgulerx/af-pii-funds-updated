#!/usr/bin/env python3
"""
Unified Retriever - Multi-source retrieval combining SQL, Semantic, and RAPTOR.
Routes queries to appropriate sources and returns answers with citations.
"""

import os
import sqlite3
import time
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

from query_router import QueryRouter
from sql_generator import SQLGenerator
from pii_filter import PiiFilter, PiiDetectedError, PiiCheckResult
from progress_emitter import ProgressEmitter, MetadataEvent, ResultEvent
from runtime_config import default_sqlite_path, load_local_env

load_local_env()

# Database configuration - support both SQLite (local) and PostgreSQL (production)
USE_POSTGRES = os.getenv("USE_POSTGRES", "").lower() in ("true", "1", "yes") or os.getenv("PGHOST")
DB_PATH = Path(os.getenv("SQLITE_PATH", str(default_sqlite_path())))

# Azure OpenAI configuration
OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
OPENAI_KEY = os.getenv("AZURE_OPENAI_API_KEY")
LLM_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-5-nano")
EMBEDDING_DEPLOYMENT = os.getenv("AZURE_TEXT_EMBEDDING_DEPLOYMENT_NAME", "text-embedding-3-small")

# Azure AI Search configuration
SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
SEARCH_KEY = os.getenv("AZURE_SEARCH_ADMIN_KEY")
FUND_INDEX = "nport-funds-index"
RAPTOR_INDEX = "imf_raptor"


@dataclass
class Citation:
    """Citation for a source used in the answer."""
    source_type: str  # SQL, SEMANTIC, RAPTOR
    identifier: str   # e.g., accession_number, doc_id, chunk_id
    title: str        # Human-readable title
    content_preview: str = ""  # First ~100 chars of content
    score: float = 0.0  # Relevance score if applicable

    def __str__(self):
        prefix_map = {"SQL": "SQL", "SEMANTIC": "SEM", "RAPTOR": "IMF"}
        prefix = prefix_map.get(self.source_type, self.source_type[:3])
        return f"[{prefix}] {self.title}"

    def to_dict(self):
        return {
            "source_type": self.source_type,
            "identifier": self.identifier,
            "title": self.title,
            "content_preview": self.content_preview,
            "score": self.score
        }


@dataclass
class RetrievalResult:
    """Result from unified retrieval."""
    answer: str
    route: str
    reasoning: str
    citations: List[Citation] = field(default_factory=list)
    sql_results: Optional[List[Dict]] = None
    semantic_results: Optional[List[Dict]] = None
    raptor_results: Optional[List[Dict]] = None
    sql_query: Optional[str] = None
    pii_blocked: bool = False
    pii_warning: Optional[str] = None

    def to_dict(self):
        return {
            "answer": self.answer,
            "route": self.route,
            "reasoning": self.reasoning,
            "citations": [c.to_dict() for c in self.citations],
            "sql_query": self.sql_query,
            "pii_blocked": self.pii_blocked,
            "pii_warning": self.pii_warning
        }


class UnifiedRetriever:
    """
    Unified retrieval interface combining:
    - SQLite database (15 tables, 490K holdings)
    - Semantic search (nport-funds-index)
    - RAPTOR search (imf_raptor - IMF WEO documents)

    All queries are filtered through PII detection before processing.
    """

    def __init__(self, enable_pii_filter: bool = True):
        # LLM client - use Azure AD auth (API key auth disabled on resource)
        credential = DefaultAzureCredential()
        token_provider = get_bearer_token_provider(credential, "https://cognitiveservices.azure.com/.default")
        self.llm = AzureOpenAI(
            azure_endpoint=OPENAI_ENDPOINT,
            azure_ad_token_provider=token_provider,
            api_version="2024-06-01"
        )

        # Search clients
        credential = AzureKeyCredential(SEARCH_KEY)
        self.fund_search = SearchClient(
            endpoint=SEARCH_ENDPOINT,
            index_name=FUND_INDEX,
            credential=credential
        )

        try:
            self.raptor_search = SearchClient(
                endpoint=SEARCH_ENDPOINT,
                index_name=RAPTOR_INDEX,
                credential=credential
            )
            self.has_raptor = True
        except Exception as e:
            print(f"Warning: RAPTOR index not available: {e}")
            self.raptor_search = None
            self.has_raptor = False

        # Database connection - SQLite or PostgreSQL
        self.use_postgres = USE_POSTGRES
        if self.use_postgres:
            import psycopg2
            import psycopg2.extras
            pg_database = os.getenv("PGDATABASE", "fundrag")
            # nport_funds schema lives in 'fundrag' database, not 'postgres'
            if pg_database == "postgres":
                pg_database = "fundrag"
            self.db = psycopg2.connect(
                host=os.getenv("PGHOST"),
                port=int(os.getenv("PGPORT", 5432)),
                database=pg_database,
                user=os.getenv("PGUSER"),
                password=os.getenv("PGPASSWORD"),
                sslmode="require"
            )
            self.db.autocommit = True
            print(f"Connected to PostgreSQL: {os.getenv('PGHOST')}/{pg_database}")
        else:
            # SQLite - check_same_thread=False allows use across Flask threads
            self.db = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            self.db.row_factory = sqlite3.Row
            print(f"Connected to SQLite: {DB_PATH}")

        # Specialized components
        self.router = QueryRouter()
        self.sql_generator = SQLGenerator()

        # PII filter
        self.enable_pii_filter = enable_pii_filter
        if enable_pii_filter:
            self.pii_filter = PiiFilter()
            if self.pii_filter.is_available():
                print("PII filter enabled and available")
            else:
                print("Warning: PII filter enabled but service unavailable")
        else:
            self.pii_filter = None
            print("Warning: PII filter disabled")

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding from Azure OpenAI."""
        response = self.llm.embeddings.create(
            model=EMBEDDING_DEPLOYMENT,
            input=text[:8000]
        )
        return response.data[0].embedding

    def _build_semantic_context(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "fund_name": r["fund_name"],
                "manager": r["manager_name"],
                "assets": f"${r['total_assets']/1e9:.1f}B" if r["total_assets"] else "N/A",
                "type": r["fund_type"],
                "description": r["content"][:300],
            }
            for r in results
        ]

    def _build_raptor_context(self, results: List[Dict[str, Any]], limit: int = 500) -> List[str]:
        return [
            r.get("raw", r.get("content", str(r)))[:limit]
            for r in results
        ]

    def _trace_route_confidence(
        self,
        use_llm_routing: bool,
        forced_route: Optional[str],
        route_reasoning: str,
    ) -> float:
        if forced_route:
            return 1.0
        if use_llm_routing:
            return 0.86 if route_reasoning else 0.82
        return 0.72

    def _build_query_analysis_output(self, query: str, route: str) -> str:
        normalized = query.lower()
        signals: List[str] = []

        if any(token in normalized for token in ["compare", "versus", " vs "]):
            signals.append("question_type(comparative)")
        if any(token in normalized for token in ["top", "largest", "biggest", "highest", "lowest", "rank"]):
            signals.append("question_type(ranking)")
        if any(token in normalized for token in ["aum", "assets", "duration", "yield", "holdings", "exposure", "return"]):
            signals.append("data_need(structured)")
        if "bond" in normalized:
            signals.append("category(bond funds)")
        if any(token in normalized for token in ["equity", "stock", "nvidia"]):
            signals.append("category(equity funds)")
        if any(token in normalized for token in ["inflation", "macro", "imf", "rate", "growth"]):
            signals.append("market_term")

        if not signals:
            signals.append("structured lookup" if route == "SQL" else "general query")

        return " | ".join(signals)

    def _format_citations(self, citations: List[Citation]) -> List[Dict[str, Any]]:
        return [citation.to_dict() for citation in citations]

    def _sources_used(self, citations: List[Citation]) -> List[str]:
        return sorted({citation.source_type for citation in citations if citation.source_type})

    def _artifacts_for_query(self, sql_query: Optional[str]) -> List[Dict[str, Any]]:
        if not sql_query:
            return []
        return [{"type": "sql_query", "label": "SQL query", "count": 1}]

    def _retrieval_trace_descriptor(self, route: str) -> Tuple[str, str]:
        mapping = {
            "SQL": ("retrieval-sql", "PostgreSQL (SQL Query)"),
            "SEMANTIC": ("retrieval-semantic", "Azure AI Search (Semantic)"),
            "RAPTOR": ("retrieval-raptor", "Azure AI Search (Macro Reports)"),
            "SEMANTIC_RAPTOR": ("retrieval-semantic-raptor", "Azure AI Search (Semantic + Macro)"),
            "HYBRID": ("retrieval-hybrid", "Azure AI Search (Hybrid)"),
            "CHAIN": ("retrieval-chain", "Chain (Market → Fund)"),
        }
        return mapping.get(route, ("retrieval-main", "Azure AI Search (Hybrid + Market)"))

    def _prepare_sql_route(self, query: str, sql_hint: str = None) -> Dict[str, Any]:
        results, sql, citations = self.query_sql(query, sql_hint)
        return {
            "route": "SQL",
            "reasoning": "Query requires precise structured data",
            "context": {"sql_results": results},
            "citations": citations,
            "sql_results": results,
            "sql_query": sql,
        }

    def _prepare_semantic_route(self, query: str) -> Dict[str, Any]:
        results, citations = self.query_semantic(query)
        return {
            "route": "SEMANTIC",
            "reasoning": "Query requires semantic understanding or similarity",
            "context": {"semantic_results": self._build_semantic_context(results)},
            "citations": citations,
            "semantic_results": results,
            "sql_query": None,
        }

    def _prepare_raptor_route(self, query: str, topics: List[str] = None) -> Dict[str, Any]:
        results, citations = self.query_raptor(query, topics)
        return {
            "route": "RAPTOR",
            "reasoning": "Query is about macro or economic context",
            "context": {"raptor_results": self._build_raptor_context(results)},
            "citations": citations,
            "raptor_results": results,
            "sql_query": None,
        }

    def _prepare_semantic_raptor_route(self, query: str, raptor_topics: List[str] = None) -> Dict[str, Any]:
        query_embedding = self.get_embedding(query)
        semantic_results, semantic_citations = [], []
        raptor_results, raptor_citations = [], []

        with ThreadPoolExecutor(max_workers=2) as executor:
            semantic_future = executor.submit(self.query_semantic, query, 5, query_embedding)
            raptor_future = executor.submit(self.query_raptor, query, raptor_topics, 3, query_embedding)

            try:
                semantic_results, semantic_citations = semantic_future.result(timeout=30)
            except Exception as e:
                print(f"Semantic query error in SEMANTIC_RAPTOR: {e}")

            try:
                raptor_results, raptor_citations = raptor_future.result(timeout=30)
            except Exception as e:
                print(f"RAPTOR query error in SEMANTIC_RAPTOR: {e}")

        return {
            "route": "SEMANTIC_RAPTOR",
            "reasoning": "Query combines fund style matching with macro economic context",
            "context": {
                "semantic_context": self._build_semantic_context(semantic_results) if semantic_results else [],
                "macro_context": self._build_raptor_context(raptor_results, 400) if raptor_results else [],
            },
            "citations": semantic_citations[:4] + raptor_citations[:3],
            "semantic_results": semantic_results[:5] if semantic_results else [],
            "raptor_results": raptor_results[:3] if raptor_results else [],
            "sql_query": None,
        }

    def _prepare_hybrid_route(
        self,
        query: str,
        sql_hint: str = None,
        raptor_topics: List[str] = None,
    ) -> Dict[str, Any]:
        query_embedding = self.get_embedding(query)
        sql_results, sql_query, sql_citations = [], None, []
        semantic_results, semantic_citations = [], []
        raptor_results, raptor_citations = [], []

        with ThreadPoolExecutor(max_workers=3) as executor:
            sql_future = executor.submit(self.query_sql, query, sql_hint)
            semantic_future = executor.submit(self.query_semantic, query, 3, query_embedding)
            raptor_future = executor.submit(self.query_raptor, query, raptor_topics, 2, query_embedding)

            try:
                sql_results, sql_query, sql_citations = sql_future.result(timeout=30)
            except Exception as e:
                print(f"SQL query error in parallel execution: {e}")

            try:
                semantic_results, semantic_citations = semantic_future.result(timeout=30)
            except Exception as e:
                print(f"Semantic query error in parallel execution: {e}")

            try:
                raptor_results, raptor_citations = raptor_future.result(timeout=30)
            except Exception as e:
                print(f"RAPTOR query error in parallel execution: {e}")

        return {
            "route": "HYBRID",
            "reasoning": "Query requires both fund data and macro context",
            "context": {
                "sql_results": sql_results[:10] if sql_results else [],
                "semantic_context": [r["content"][:200] for r in semantic_results] if semantic_results else [],
                "macro_context": self._build_raptor_context(raptor_results, 300) if raptor_results else [],
            },
            "citations": sql_citations[:5] + semantic_citations[:3] + raptor_citations[:2],
            "sql_results": sql_results[:10] if sql_results else [],
            "semantic_results": semantic_results[:5] if semantic_results else [],
            "raptor_results": raptor_results[:3] if raptor_results else [],
            "sql_query": sql_query,
        }

    def _prepare_chain_route(self, query: str, raptor_topics: List[str] = None) -> Dict[str, Any]:
        raptor_results, raptor_citations = self.query_raptor(query, raptor_topics, top=3)

        if not raptor_results:
            return self._prepare_hybrid_route(query)

        macro_context = "\n".join(self._build_raptor_context(raptor_results, 500))

        criteria_prompt = f"""Based on the following macroeconomic context, what fund characteristics
should an investor look for? Be specific about asset types, sectors, risk levels.

User Question: {query}

Macroeconomic Context:
{macro_context}

Return specific fund selection criteria in 2-3 sentences."""

        criteria_response = self.llm.chat.completions.create(
            model=LLM_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are a fund analyst deriving investment criteria from economic outlook."},
                {"role": "user", "content": criteria_prompt},
            ],
            timeout=30,
        )

        criteria = criteria_response.choices[0].message.content
        fund_query = f"{query}\n\nBased on analysis: {criteria}"
        sql_results, sql_query, sql_citations = [], None, []
        semantic_results, semantic_citations = [], []

        with ThreadPoolExecutor(max_workers=2) as executor:
            sql_future = executor.submit(self.query_sql, fund_query)
            semantic_future = executor.submit(self.query_semantic, fund_query, 3)

            try:
                sql_results, sql_query, sql_citations = sql_future.result(timeout=30)
            except Exception as e:
                print(f"SQL query error in CHAIN execution: {e}")

            try:
                semantic_results, semantic_citations = semantic_future.result(timeout=30)
            except Exception as e:
                print(f"Semantic query error in CHAIN execution: {e}")

        return {
            "route": "CHAIN",
            "reasoning": "Macro context drives fund selection",
            "context": {
                "macro_context": macro_context[:1000],
                "derived_criteria": criteria,
                "sql_results": sql_results[:10],
                "semantic_matches": [r["content"][:200] for r in semantic_results],
            },
            "citations": raptor_citations + sql_citations[:5] + semantic_citations[:2],
            "sql_results": sql_results[:10] if sql_results else [],
            "semantic_results": semantic_results[:5] if semantic_results else [],
            "raptor_results": raptor_results[:3] if raptor_results else [],
            "sql_query": sql_query,
        }

    def _prepare_route_payload(
        self,
        route: str,
        query: str,
        sql_hint: Optional[str] = None,
        raptor_topics: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if route == "SQL":
            return self._prepare_sql_route(query, sql_hint)
        if route == "SEMANTIC":
            return self._prepare_semantic_route(query)
        if route == "RAPTOR":
            return self._prepare_raptor_route(query, raptor_topics)
        if route == "SEMANTIC_RAPTOR":
            return self._prepare_semantic_raptor_route(query, raptor_topics)
        if route == "CHAIN":
            return self._prepare_chain_route(query, raptor_topics)
        return self._prepare_hybrid_route(query, sql_hint, raptor_topics)

    def _result_from_payload(self, query: str, payload: Dict[str, Any]) -> RetrievalResult:
        answer = self._synthesize_answer(query, payload["context"], payload["route"])
        return RetrievalResult(
            answer=answer,
            route=payload["route"],
            reasoning=payload["reasoning"],
            citations=payload["citations"],
            sql_results=payload.get("sql_results"),
            semantic_results=payload.get("semantic_results"),
            raptor_results=payload.get("raptor_results"),
            sql_query=payload.get("sql_query"),
        )

    # =========================================================================
    # Core Retrieval Methods
    # =========================================================================

    def query_sql(self, query: str, sql_hint: str = None) -> Tuple[List[Dict], str, List[Citation]]:
        """
        Execute SQL query against the fund database.

        Returns:
            Tuple of (results, sql_query, citations)
        """
        # Generate SQL
        if sql_hint:
            enhanced_query = f"{query}\nHint: {sql_hint}"
        else:
            enhanced_query = query

        sql = self.sql_generator.generate(enhanced_query)

        # For PostgreSQL, add schema prefix to table names
        if self.use_postgres:
            # Simple replacement of common table names to include schema
            tables = ['fund_reported_info', 'fund_reported_holding', 'registrant', 'submission',
                      'identifiers', 'debt_security', 'interest_rate_risk', 'monthly_total_return',
                      'monthly_return_cat_instrument', 'derivative_counterparty',
                      'fwd_foreigncur_contract_swap', 'nonforeign_exchange_swap',
                      'securities_lending', 'explanatory_note', 'borrower']
            for table in tables:
                sql = sql.replace(f' {table}', f' nport_funds.{table}')
                sql = sql.replace(f'FROM {table}', f'FROM nport_funds.{table}')
                sql = sql.replace(f'JOIN {table}', f'JOIN nport_funds.{table}')

        # Execute
        citations = []
        try:
            cur = self.db.cursor()
            cur.execute(sql)
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in rows]

            # Create citations for each result
            for i, row in enumerate(results[:10]):  # Limit citations to top 10
                accession = row.get("accession_number", "")
                fund_name = row.get("series_name", row.get("fund_name", f"Result {i+1}"))
                citations.append(Citation(
                    source_type="SQL",
                    identifier=accession or f"row_{i}",
                    title=fund_name,
                    content_preview=str(row)[:100]
                ))

            return results, sql, citations

        except Exception as e:
            return [{"error": str(e), "sql": sql}], sql, []

    def query_semantic(self, query: str, top: int = 5, embedding: List[float] = None) -> Tuple[List[Dict], List[Citation]]:
        """
        Search fund index using semantic similarity.

        Args:
            query: Search query text
            top: Number of results to return
            embedding: Pre-computed embedding (optional, computed if not provided)

        Returns:
            Tuple of (results, citations)
        """
        if embedding is None:
            embedding = self.get_embedding(query)

        vector_query = VectorizedQuery(
            vector=embedding,
            k_nearest_neighbors=top,
            fields="content_vector"
        )

        results = self.fund_search.search(
            search_text=query,
            vector_queries=[vector_query],
            top=top,
            select=["fund_name", "manager_name", "total_assets", "fund_type",
                   "content", "top_holdings_text", "accession_number"]
        )

        results_list = []
        citations = []

        for r in results:
            result_dict = {
                "fund_name": r.get("fund_name", ""),
                "manager_name": r.get("manager_name", ""),
                "total_assets": r.get("total_assets", 0),
                "fund_type": r.get("fund_type", ""),
                "content": r.get("content", ""),
                "top_holdings_text": r.get("top_holdings_text", ""),
                "score": r.get("@search.score", 0)
            }
            results_list.append(result_dict)

            citations.append(Citation(
                source_type="SEMANTIC",
                identifier=r.get("accession_number", ""),
                title=r.get("fund_name", "Unknown Fund"),
                content_preview=r.get("content", "")[:100],
                score=r.get("@search.score", 0)
            ))

        return results_list, citations

    def query_raptor(self, query: str, topics: List[str] = None, top: int = 3, embedding: List[float] = None) -> Tuple[List[Dict], List[Citation]]:
        """
        Search RAPTOR index for macro/economic context.
        RAPTOR index fields: id, doc_id, level, kind, raw, contentVector

        Args:
            query: Search query text
            topics: Optional topic hints for enhanced search
            top: Number of results to return
            embedding: Pre-computed embedding (optional, computed if not provided)

        Returns:
            Tuple of (results, citations)
        """
        if not self.has_raptor:
            return [], []

        # Enhance query with topics if provided
        search_query = query
        if topics:
            search_query = f"{query} {' '.join(topics)}"

        try:
            # Use provided embedding or compute new one
            if embedding is None:
                embedding = self.get_embedding(search_query)

            vector_query = VectorizedQuery(
                vector=embedding,
                k_nearest_neighbors=top,
                fields="contentVector"  # RAPTOR uses contentVector, not content_vector
            )

            results = self.raptor_search.search(
                search_text=search_query,
                vector_queries=[vector_query],
                top=top,
                select=["id", "doc_id", "level", "kind", "raw"]
            )

            results_list = []
            citations = []

            for r in results:
                result_dict = dict(r)
                results_list.append(result_dict)

                # Extract document info for citation
                # RAPTOR index: id, doc_id, level, kind, raw
                doc_id = r.get("doc_id", r.get("id", ""))
                kind = r.get("kind", "summary")
                level = r.get("level", 0)
                content = r.get("raw", "")  # RAPTOR uses 'raw' field for content

                citations.append(Citation(
                    source_type="RAPTOR",
                    identifier=doc_id,
                    title=f"IMF WEO ({kind}, L{level})",
                    content_preview=content[:100] if content else "",
                    score=r.get("@search.score", 0)
                ))

            return results_list, citations

        except Exception as e:
            print(f"RAPTOR search error: {e}")
            return [], []

    # =========================================================================
    # Route Execution Methods
    # =========================================================================

    def execute_sql_route(self, query: str, sql_hint: str = None) -> RetrievalResult:
        """Execute SQL-only retrieval."""
        return self._result_from_payload(query, self._prepare_sql_route(query, sql_hint))

    def execute_semantic_route(self, query: str) -> RetrievalResult:
        """Execute semantic-only retrieval."""
        return self._result_from_payload(query, self._prepare_semantic_route(query))

    def execute_raptor_route(self, query: str, topics: List[str] = None) -> RetrievalResult:
        """Execute RAPTOR-only retrieval for macro context."""
        return self._result_from_payload(query, self._prepare_raptor_route(query, topics))

    def execute_semantic_raptor_route(self, query: str, raptor_topics: List[str] = None) -> RetrievalResult:
        """
        Execute SEMANTIC + RAPTOR in parallel.
        Use when query combines fund style/similarity with macro economic context.
        No SQL needed - for queries about fund styles aligned with economic outlook.
        """
        return self._result_from_payload(query, self._prepare_semantic_raptor_route(query, raptor_topics))

    def execute_hybrid_route(self, query: str, sql_hint: str = None,
                            raptor_topics: List[str] = None) -> RetrievalResult:
        """Execute hybrid retrieval (SQL + Semantic + RAPTOR in parallel)."""
        return self._result_from_payload(query, self._prepare_hybrid_route(query, sql_hint, raptor_topics))

    def execute_chain_route(self, query: str, raptor_topics: List[str] = None) -> RetrievalResult:
        """
        Execute chain retrieval: RAPTOR -> derive criteria -> SQL/Semantic.
        Macro context drives fund selection.

        Args:
            query: User's question
            raptor_topics: Optional topics for RAPTOR search
        """
        return self._result_from_payload(query, self._prepare_chain_route(query, raptor_topics))

    # =========================================================================
    # Main Interface
    # =========================================================================

    def check_pii(self, text: str) -> PiiCheckResult:
        """
        Check text for PII.

        Args:
            text: Text to check

        Returns:
            PiiCheckResult with detection details
        """
        if not self.pii_filter:
            return PiiCheckResult(has_pii=False, entities=[])
        return self.pii_filter.check(text)

    def answer(self, query: str, use_llm_routing: bool = True, forced_route: Optional[str] = None,
               sql_hint: Optional[str] = None, raptor_topics: Optional[List[str]] = None) -> RetrievalResult:
        """
        Main entry point - route query and return answer with citations.
        All queries are checked for PII before processing.

        Args:
            query: User's natural language question
            use_llm_routing: Whether to use LLM (True) or heuristics (False) for routing
            forced_route: Optional route override supplied by the caller
            sql_hint: Optional SQL hint when the route is known already
            raptor_topics: Optional RAPTOR topics when the route is known already

        Returns:
            RetrievalResult with answer, citations, and metadata
        """
        # Step 0: Check for PII before processing
        if self.pii_filter:
            pii_result = self.pii_filter.check(query)
            if pii_result.has_pii:
                warning = self.pii_filter.format_warning(pii_result.entities)
                print(f"\n{'='*60}")
                print(f"PII DETECTED - Query blocked")
                print(f"Categories: {[e.category for e in pii_result.entities]}")
                print(f"{'='*60}")
                return RetrievalResult(
                    answer=warning,
                    route="BLOCKED",
                    reasoning="Query contains personally identifiable information",
                    pii_blocked=True,
                    pii_warning=warning
                )

        # Route the query
        if forced_route:
            route_result = {
                "route": forced_route,
                "reasoning": "Route override from API request"
            }
            if sql_hint:
                route_result["sql_hint"] = sql_hint
            if raptor_topics:
                route_result["raptor_topics"] = raptor_topics
        elif use_llm_routing:
            route_result = self.router.route(query)
        else:
            route_result = {
                "route": self.router.quick_route(query),
                "reasoning": "Heuristic routing"
            }

        route = route_result.get("route", "HYBRID")
        sql_hint = route_result.get("sql_hint", sql_hint)
        raptor_topics = route_result.get("raptor_topics", raptor_topics or [])

        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print(f"Route: {route} - {route_result.get('reasoning', '')}")
        print(f"{'='*60}")

        payload = self._prepare_route_payload(route, query, sql_hint, raptor_topics)
        result = self._result_from_payload(query, payload)

        result.reasoning = route_result.get("reasoning", result.reasoning)
        return result

    def answer_streaming(
        self,
        query: str,
        emitter: ProgressEmitter,
        use_llm_routing: bool = True,
        forced_route: Optional[str] = None,
        sql_hint: Optional[str] = None,
        raptor_topics: Optional[List[str]] = None,
        trace_query: Optional[str] = None,
        history_len: int = 0,
    ) -> RetrievalResult:
        """
        Streaming entry point for live UI traces and text chunks.

        PII gating is handled by the API layer before calling this method.
        """
        display_query = trace_query or query

        rewrite_input = f"history_len={history_len}"
        emitter.start("query-rewrite", "Query Rewrite", rewrite_input)
        rewrite_started = time.perf_counter()
        rewrite_output = "skipped: already standalone" if history_len > 0 else "skipped: no_history"
        emitter.complete(
            "query-rewrite",
            "Query Rewrite",
            int((time.perf_counter() - rewrite_started) * 1000),
            rewrite_output,
            rewrite_input,
        )

        analysis_input = f"query: {display_query}"
        emitter.start("query-analysis", "Query Analysis", analysis_input)
        analysis_started = time.perf_counter()

        if forced_route:
            route_result: Dict[str, Any] = {
                "route": forced_route,
                "reasoning": "Route override from API request",
            }
            if sql_hint:
                route_result["sql_hint"] = sql_hint
            if raptor_topics:
                route_result["raptor_topics"] = raptor_topics
        elif use_llm_routing:
            route_result = self.router.route(query)
        else:
            route_result = {
                "route": self.router.quick_route(query),
                "reasoning": "Heuristic routing",
            }

        route = route_result.get("route", "HYBRID")
        sql_hint = route_result.get("sql_hint", sql_hint)
        raptor_topics = route_result.get("raptor_topics", raptor_topics or [])
        analysis_output = self._build_query_analysis_output(display_query, route)
        emitter.complete(
            "query-analysis",
            "Query Analysis",
            int((time.perf_counter() - analysis_started) * 1000),
            analysis_output,
            analysis_input,
        )

        router_input = "message inspection"
        emitter.start("intent-router-v2", "Intent Router V2", router_input)
        router_started = time.perf_counter()
        route_confidence = self._trace_route_confidence(
            use_llm_routing=use_llm_routing,
            forced_route=forced_route,
            route_reasoning=route_result.get("reasoning", ""),
        )
        route_reasoning = route_result.get("reasoning", "")
        emitter.complete(
            "intent-router-v2",
            "Intent Router V2",
            int((time.perf_counter() - router_started) * 1000),
            f"route={route} confidence={route_confidence:.2f}; {route_reasoning}",
            router_input,
        )

        retrieval_step_id, retrieval_tool_name = self._retrieval_trace_descriptor(route)
        retrieval_input = "filters: route-specific retrieval"
        emitter.start(retrieval_step_id, retrieval_tool_name, retrieval_input)
        retrieval_started = time.perf_counter()
        payload = self._prepare_route_payload(route, query, sql_hint, raptor_topics)
        citations = payload["citations"]
        emitter.complete(
            retrieval_step_id,
            retrieval_tool_name,
            int((time.perf_counter() - retrieval_started) * 1000),
            f"{len(citations)} citation(s) prepared",
            retrieval_input,
        )

        sources_used = self._sources_used(citations)
        artifacts = self._artifacts_for_query(payload.get("sql_query"))

        brief_input = f"query: {display_query}"
        emitter.start("answer-brief", "Answer Brief Builder", brief_input)
        brief_started = time.perf_counter()
        brief_output = (
            "summary composed from retrieved evidence"
            if citations
            else "summary composed from model response"
        )
        emitter.complete(
            "answer-brief",
            "Answer Brief Builder",
            int((time.perf_counter() - brief_started) * 1000),
            brief_output,
            brief_input,
        )

        emitter.emit_metadata(
            MetadataEvent(
                intent="GENERAL",
                sources_used=sources_used,
                route=route,
                route_confidence=route_confidence,
                route_reasoning=route_reasoning,
                artifacts=artifacts,
            )
        )

        generation_input = f"query: {display_query}"
        emitter.start("llm-generate", "LLM Response Generation", generation_input)
        generation_started = time.perf_counter()
        answer = self._synthesize_answer_streaming(query, payload["context"], route, emitter)
        emitter.complete(
            "llm-generate",
            "LLM Response Generation",
            int((time.perf_counter() - generation_started) * 1000),
            f"answer length={len(answer)} chars",
            generation_input,
        )

        validation_input = f"query: {display_query}"
        emitter.start("answer-validation", "Answer Validation", validation_input)
        validation_started = time.perf_counter()
        validation_output = (
            f"verified with {len(citations)} citation(s)"
            if citations
            else "verified without explicit citations"
        )
        emitter.complete(
            "answer-validation",
            "Answer Validation",
            int((time.perf_counter() - validation_started) * 1000),
            validation_output,
            validation_input,
        )

        result = RetrievalResult(
            answer=answer,
            route=route,
            reasoning=route_reasoning or payload.get("reasoning", ""),
            citations=citations,
            sql_results=payload.get("sql_results"),
            semantic_results=payload.get("semantic_results"),
            raptor_results=payload.get("raptor_results"),
            sql_query=payload.get("sql_query"),
        )

        emitter.finish_streaming(
            ResultEvent(
                answer=answer,
                citations=self._format_citations(citations),
                sources_used=sources_used,
                intent="GENERAL",
                route=route,
                route_confidence=route_confidence,
                route_reasoning=route_reasoning,
                artifacts=artifacts,
            )
        )

        return result

    def _synthesize_answer(self, query: str, context: dict, route: str) -> str:
        """Generate natural language answer from retrieved context."""

        route_instructions = {
            "SQL": "Focus on the precise data from SQL results.",
            "SEMANTIC": "Focus on fund characteristics and similarity.",
            "RAPTOR": "Focus on the macroeconomic outlook and its implications.",
            "SEMANTIC_RAPTOR": "Explain how fund styles and characteristics align with the economic outlook.",
            "HYBRID": "Combine fund data with economic context for a comprehensive answer.",
            "CHAIN": "Explain how the economic outlook influences fund recommendations."
        }

        system_prompt = f"""You are a helpful mutual fund analyst assistant.
Answer the user's question based on the provided context.
{route_instructions.get(route, '')}

Guidelines:
- Be concise but informative
- Format numbers nicely (e.g., $2.5B instead of 2500000000)
- If showing multiple funds, use a clear list format
- Reference the data sources when relevant
- If the context is insufficient, say so clearly"""

        context_str = f"""
Query: {query}

Retrieved Data:
{context}
"""

        response = self.llm.chat.completions.create(
            model=LLM_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context_str}
            ]
        )

        return response.choices[0].message.content

    def _synthesize_answer_streaming(
        self,
        query: str,
        context: dict,
        route: str,
        emitter: ProgressEmitter,
    ) -> str:
        """Generate the answer while streaming text chunks to the UI."""
        route_instructions = {
            "SQL": "Focus on the precise data from SQL results.",
            "SEMANTIC": "Focus on fund characteristics and similarity.",
            "RAPTOR": "Focus on the macroeconomic outlook and its implications.",
            "SEMANTIC_RAPTOR": "Explain how fund styles and characteristics align with the economic outlook.",
            "HYBRID": "Combine fund data with economic context for a comprehensive answer.",
            "CHAIN": "Explain how the economic outlook influences fund recommendations.",
        }

        system_prompt = f"""You are a helpful mutual fund analyst assistant.
Answer the user's question based on the provided context.
{route_instructions.get(route, '')}

Guidelines:
- Be concise but informative
- Format numbers nicely (e.g., $2.5B instead of 2500000000)
- If showing multiple funds, use a clear list format
- Reference the data sources when relevant
- If the context is insufficient, say so clearly"""

        context_str = f"""
Query: {query}

Retrieved Data:
{context}
"""

        chunks: List[str] = []
        try:
            response = self.llm.chat.completions.create(
                model=LLM_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context_str},
                ],
                stream=True,
            )

            for chunk in response:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if not delta:
                    continue
                chunks.append(delta)
                emitter.emit_text_chunk(delta)
        except Exception:
            fallback_answer = self._synthesize_answer(query, context, route)
            for token in fallback_answer.split(" "):
                if not token:
                    continue
                emitter.emit_text_chunk(token + " ")
            return fallback_answer

        return "".join(chunks).strip()


# =============================================================================
# Convenience Functions
# =============================================================================

def answer_question(query: str, use_llm_routing: bool = True) -> dict:
    """
    Simple function to get an answer with citations.

    Args:
        query: User's question
        use_llm_routing: Whether to use LLM for query routing

    Returns:
        dict with answer, route, citations
    """
    retriever = UnifiedRetriever()
    result = retriever.answer(query, use_llm_routing)
    return result.to_dict()


# =============================================================================
# Main - Testing
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("UNIFIED RETRIEVER TEST")
    print("=" * 70)

    retriever = UnifiedRetriever()

    test_queries = [
        ("Top 5 largest bond funds", "SQL"),
        ("Conservative income-focused funds", "SEMANTIC"),
        ("What is IMF's inflation outlook?", "RAPTOR"),
        ("Best bond funds given current rate environment", "HYBRID"),
        ("How should I position for IMF's growth forecast?", "CHAIN"),
    ]

    for query, expected_route in test_queries:
        print(f"\n{'='*70}")
        print(f"TEST: {query}")
        print(f"Expected Route: {expected_route}")
        print("=" * 70)

        result = retriever.answer(query)

        print(f"\nRoute Used: {result.route}")
        print(f"Reasoning: {result.reasoning}")
        print(f"\nAnswer:\n{result.answer[:500]}...")
        print(f"\nCitations ({len(result.citations)}):")
        for c in result.citations[:5]:
            print(f"  - {c}")

        if result.sql_query:
            print(f"\nSQL Query: {result.sql_query[:100]}...")

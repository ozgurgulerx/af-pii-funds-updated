#!/usr/bin/env python3
"""
Manual ontology demo client backed by the local graph-shaped runtime files.

This lane exists to demonstrate ontology-style traversal honestly while the
live Fabric GraphModel path remains blocked. It does not claim to use the live
Fabric ontology runtime.
"""

from __future__ import annotations

import csv
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from runtime_config import REPO_ROOT, load_local_env

load_local_env()


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return " ".join(normalized.split())


def format_currency(raw_value: str | None) -> str:
    if not raw_value:
        return "N/A"

    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return "N/A"

    absolute_value = abs(value)
    if absolute_value >= 1_000_000_000_000:
        return f"${value / 1_000_000_000_000:.2f}T"
    if absolute_value >= 1_000_000_000:
        return f"${value / 1_000_000_000:.2f}B"
    if absolute_value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if absolute_value >= 1_000:
        return f"${value / 1_000:.2f}K"
    return f"${value:,.2f}"


def format_percent(raw_value: str | None) -> str:
    if not raw_value:
        return "N/A"
    try:
        value = float(raw_value) * 100
    except (TypeError, ValueError):
        return "N/A"
    return f"{value:.2f}%"


class ManualOntologyClient:
    """Local demo path that traverses ontology-shaped runtime CSVs."""

    def __init__(self, data_root: str | Path | None = None, *, max_examples: int = 5):
        env_data_root = os.getenv("MANUAL_ONTOLOGY_DATA_ROOT")
        self.data_root = Path(data_root or env_data_root or REPO_ROOT / "data" / "fabric_runtime" / "core")
        self.max_examples = max_examples
        self.agent_name = "manual-ontology-demo"
        self.display_name = "Manual Ontology Demo"
        self.source_name = "manual_ontology"
        self.config_error: str | None = None

        self._loaded = False
        self._funds_by_id: dict[str, dict[str, str]] = {}
        self._fund_aliases: list[tuple[str, str]] = []
        self._managers_by_id: dict[str, dict[str, str]] = {}
        self._holdings_by_fund: dict[str, list[dict[str, str]]] = defaultdict(list)
        self._instruments_by_id: dict[str, dict[str, str]] = {}
        self._issuers_by_id: dict[str, dict[str, str]] = {}
        self._issuer_aliases: list[tuple[str, str]] = []
        self._issuer_ticker_aliases: list[tuple[str, str]] = []
        self._funds_by_issuer: dict[str, list[dict[str, str]]] = defaultdict(list)

    def _load_rows(self, filename: str) -> list[dict[str, str]]:
        path = self.data_root / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing manual ontology runtime file: {path}")

        with path.open("r", encoding="utf-8", newline="") as handle:
            return list(csv.DictReader(handle))

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return

        try:
            funds = self._load_rows("dim_fund.csv")
            managers = self._load_rows("dim_manager.csv")
            holdings = self._load_rows("dim_holding.csv")
            instruments = self._load_rows("dim_instrument.csv")
            issuers = self._load_rows("dim_issuer.csv")
        except FileNotFoundError as exc:
            self.config_error = str(exc)
            self._loaded = True
            return

        self._funds_by_id = {row["fund_id"]: row for row in funds if row.get("fund_id")}
        self._managers_by_id = {row["manager_id"]: row for row in managers if row.get("manager_id")}
        self._instruments_by_id = {row["instrument_id"]: row for row in instruments if row.get("instrument_id")}
        self._issuers_by_id = {row["issuer_id"]: row for row in issuers if row.get("issuer_id")}

        seen_fund_aliases: set[tuple[str, str]] = set()
        for row in funds:
            fund_id = row.get("fund_id", "")
            for key in ("fund_id", "fund_name", "display_label", "series_id"):
                alias = normalize_text(row.get(key))
                if alias and (alias, fund_id) not in seen_fund_aliases:
                    self._fund_aliases.append((alias, fund_id))
                    seen_fund_aliases.add((alias, fund_id))

        seen_issuer_aliases: set[tuple[str, str]] = set()
        for row in issuers:
            issuer_id = row.get("issuer_id", "")
            for key in ("issuer_id", "issuer_name", "display_label"):
                alias = normalize_text(row.get(key))
                if alias and (alias, issuer_id) not in seen_issuer_aliases:
                    self._issuer_aliases.append((alias, issuer_id))
                    seen_issuer_aliases.add((alias, issuer_id))

        for row in holdings:
            fund_id = row.get("fund_id")
            issuer_id = row.get("issuer_id")
            if fund_id:
                self._holdings_by_fund[fund_id].append(row)
            if issuer_id and fund_id:
                self._funds_by_issuer[issuer_id].append(row)

        for fund_id, fund_holdings in self._holdings_by_fund.items():
            fund_holdings.sort(key=lambda row: self._safe_float(row.get("market_value_usd")), reverse=True)

        for issuer_id, issuer_holdings in self._funds_by_issuer.items():
            issuer_holdings.sort(key=lambda row: self._safe_float(row.get("market_value_usd")), reverse=True)

        seen_tickers: set[tuple[str, str]] = set()
        for row in instruments:
            issuer_id = row.get("issuer_id", "")
            ticker = normalize_text(row.get("ticker"))
            if ticker and issuer_id and (ticker, issuer_id) not in seen_tickers:
                self._issuer_ticker_aliases.append((ticker, issuer_id))
                seen_tickers.add((ticker, issuer_id))

        self._fund_aliases.sort(key=lambda item: len(item[0]), reverse=True)
        self._issuer_aliases.sort(key=lambda item: len(item[0]), reverse=True)
        self._issuer_ticker_aliases.sort(key=lambda item: len(item[0]), reverse=True)
        self._loaded = True

    @staticmethod
    def _safe_float(raw_value: str | None) -> float:
        try:
            return float(raw_value or 0.0)
        except (TypeError, ValueError):
            return 0.0

    def _match_alias(self, message: str, aliases: list[tuple[str, str]]) -> str | None:
        normalized_message = normalize_text(message)
        if not normalized_message:
            return None

        message_tokens = set(normalized_message.split())

        for alias, entity_id in aliases:
            if alias and alias in normalized_message:
                return entity_id

        best_entity_id: str | None = None
        best_score = 0
        for alias, entity_id in aliases:
            alias_tokens = [token for token in alias.split() if len(token) >= 3]
            if not alias_tokens:
                continue
            overlap = sum(1 for token in alias_tokens if token in message_tokens)
            if overlap == 0:
                continue
            score = overlap * 100 + len(alias_tokens)
            if overlap == len(alias_tokens) and score > best_score:
                best_entity_id = entity_id
                best_score = score

        return best_entity_id

    def _match_fund(self, message: str) -> dict[str, str] | None:
        self._ensure_loaded()
        if self.config_error:
            return None
        fund_id = self._match_alias(message, self._fund_aliases)
        if fund_id is None:
            return None
        return self._funds_by_id.get(fund_id)

    def _match_issuer(self, message: str) -> dict[str, str] | None:
        self._ensure_loaded()
        if self.config_error:
            return None

        issuer_id = self._match_alias(message, self._issuer_aliases)
        if issuer_id is None:
            issuer_id = self._match_alias(message, self._issuer_ticker_aliases)
        if issuer_id is None:
            return None
        return self._issuers_by_id.get(issuer_id)

    def _make_citation(self, identifier: str, title: str, content_preview: str, score: float = 1.0) -> dict[str, Any]:
        return {
            "source_type": self.source_name,
            "identifier": identifier,
            "title": title,
            "content_preview": content_preview,
            "score": score,
        }

    def _build_response(
        self,
        *,
        answer: str,
        citations: list[dict[str, Any]],
        route_reasoning: str,
    ) -> dict[str, Any]:
        return {
            "answer": answer,
            "agent": self.agent_name,
            "citations": citations,
            "conversation_id": None,
            "route": "MANUAL_ONTOLOGY",
            "route_reasoning": route_reasoning,
            "retrieval_display_name": self.display_name,
            "retrieval_output_summary": f"{len(citations)} citation(s) prepared from the local manual ontology runtime",
            "sources_used": [self.source_name] if citations else [],
            "source": self.source_name,
        }

    def _build_scope_guidance_response(self) -> dict[str, Any]:
        answer = (
            "The manual ontology demo is available, but this question is outside the current demo scope. "
            "Use a fund or issuer from the local runtime and ask for one of these paths:\n"
            "1. Show the manual ontology path for Alpha Growth Fund.\n"
            "2. Which issuers does Alpha Growth Fund hold?\n"
            "3. Which funds hold NVIDIA Corp?\n"
            "4. Who manages Alpha Growth Fund?\n\n"
            "This demo uses the checked-in local graph-shaped runtime, not the live Fabric GraphModel."
        )
        return self._build_response(
            answer=answer,
            citations=[],
            route_reasoning="Manual ontology demo scope guidance returned because no supported fund or issuer entity was matched.",
        )

    def _build_manager_answer(self, fund: dict[str, str]) -> dict[str, Any]:
        manager = self._managers_by_id.get(fund.get("manager_id", ""))
        manager_name = manager.get("manager_name") if manager else "unknown manager"
        fund_name = fund.get("fund_name", fund.get("display_label", fund.get("fund_id", "Unknown fund")))
        answer = (
            f"{fund_name} is linked to manager {manager_name} in the manual ontology demo. "
            f"The link comes from fund `{fund.get('fund_id', 'N/A')}` -> manager `{fund.get('manager_id', 'N/A')}` "
            f"for filing {fund.get('filing_id', 'N/A')} dated {fund.get('filing_date', 'N/A')}. "
            "This is the manual demo path over local runtime data, not the live Fabric GraphModel."
        )
        citations = [
            self._make_citation(
                f"fund:{fund.get('fund_id', 'unknown')}",
                f"Fund {fund_name}",
                f"Fund row linked to manager_id {fund.get('manager_id', 'N/A')}",
            )
        ]
        if manager:
            citations.append(
                self._make_citation(
                    f"manager:{manager.get('manager_id', 'unknown')}",
                    f"Manager {manager_name}",
                    f"Manager row for {manager_name}",
                )
            )

        return self._build_response(
            answer=answer,
            citations=citations,
            route_reasoning="Manual ontology demo matched a fund and resolved its manager through local runtime keys.",
        )

    def _build_fund_path_answer(self, fund: dict[str, str]) -> dict[str, Any]:
        fund_id = fund.get("fund_id", "")
        fund_name = fund.get("fund_name", fund.get("display_label", fund_id))
        manager = self._managers_by_id.get(fund.get("manager_id", ""))
        holdings = self._holdings_by_fund.get(fund_id, [])

        unique_instrument_ids = {row.get("instrument_id", "") for row in holdings if row.get("instrument_id")}
        unique_issuer_ids = {row.get("issuer_id", "") for row in holdings if row.get("issuer_id")}

        sample_lines: list[str] = []
        citations: list[dict[str, Any]] = [
            self._make_citation(
                f"fund:{fund_id}",
                f"Fund {fund_name}",
                f"{fund_name} with total assets {format_currency(fund.get('total_assets_usd'))}",
            )
        ]

        if manager:
            citations.append(
                self._make_citation(
                    f"manager:{manager.get('manager_id', 'unknown')}",
                    f"Manager {manager.get('manager_name', 'Unknown manager')}",
                    f"Manager node for {manager.get('manager_name', 'Unknown manager')}",
                    0.98,
                )
            )

        for index, holding in enumerate(holdings[: self.max_examples], start=1):
            instrument = self._instruments_by_id.get(holding.get("instrument_id", ""))
            issuer = self._issuers_by_id.get(holding.get("issuer_id", ""))

            holding_label = holding.get("display_label", holding.get("holding_id", "Unknown holding"))
            instrument_label = instrument.get("display_label") if instrument else holding.get("instrument_id", "Unknown instrument")
            issuer_label = issuer.get("issuer_name") if issuer else holding.get("issuer_name", "Unknown issuer")
            sample_lines.append(
                f"{index}. {fund_name} -> {holding_label} -> {instrument_label} -> {issuer_label} "
                f"({format_currency(holding.get('market_value_usd'))}, {format_percent(holding.get('portfolio_weight'))})"
            )
            citations.append(
                self._make_citation(
                    f"holding:{holding.get('holding_id', 'unknown')}",
                    f"Holding {holding_label}",
                    f"Holding row for {holding_label} worth {format_currency(holding.get('market_value_usd'))}",
                    0.96,
                )
            )
            if instrument:
                citations.append(
                    self._make_citation(
                        f"instrument:{instrument.get('instrument_id', 'unknown')}",
                        f"Instrument {instrument_label}",
                        f"Instrument row for {instrument_label}",
                        0.94,
                    )
                )
            if issuer:
                citations.append(
                    self._make_citation(
                        f"issuer:{issuer.get('issuer_id', 'unknown')}",
                        f"Issuer {issuer_label}",
                        f"Issuer row for {issuer_label}",
                        0.94,
                    )
                )

        sample_block = "\n".join(sample_lines) if sample_lines else "No holdings are loaded for this fund in the local runtime."
        manager_line = (
            f"Manager: {manager.get('manager_name', 'Unknown manager')} ({manager.get('manager_id', 'N/A')}). "
            if manager
            else ""
        )
        answer = (
            f"Manual ontology demo for {fund_name} ({fund_id}). {manager_line}"
            f"Filing {fund.get('filing_id', 'N/A')} dated {fund.get('filing_date', 'N/A')} with report date {fund.get('report_date', 'N/A')}. "
            f"Assets: {format_currency(fund.get('total_assets_usd'))}. "
            f"The local runtime currently shows {len(holdings)} holdings, {len(unique_instrument_ids)} instruments, "
            f"and {len(unique_issuer_ids)} issuers linked through the Fund -> Holding -> Instrument -> Issuer path.\n\n"
            f"Sample Fund -> Holding -> Instrument -> Issuer paths:\n{sample_block}\n\n"
            "This is the manual demo path over local curated runtime data, not the live Fabric GraphModel."
        )

        return self._build_response(
            answer=answer,
            citations=citations,
            route_reasoning="Manual ontology demo matched a fund and traversed local Fund -> Holding -> Instrument -> Issuer links.",
        )

    def _build_issuer_funds_answer(self, issuer: dict[str, str]) -> dict[str, Any]:
        issuer_id = issuer.get("issuer_id", "")
        issuer_name = issuer.get("issuer_name", issuer.get("display_label", issuer_id))
        issuer_holdings = self._funds_by_issuer.get(issuer_id, [])
        citations: list[dict[str, Any]] = [
            self._make_citation(
                f"issuer:{issuer_id}",
                f"Issuer {issuer_name}",
                f"Issuer node for {issuer_name}",
            )
        ]

        lines: list[str] = []
        seen_fund_ids: set[str] = set()
        for holding in issuer_holdings:
            fund_id = holding.get("fund_id", "")
            if fund_id in seen_fund_ids:
                continue
            seen_fund_ids.add(fund_id)
            fund = self._funds_by_id.get(fund_id)
            if fund is None:
                continue

            fund_name = fund.get("fund_name", fund.get("display_label", fund_id))
            instrument = self._instruments_by_id.get(holding.get("instrument_id", ""))
            lines.append(
                f"- {fund_name} ({fund_id}) via holding {holding.get('holding_id', 'N/A')} "
                f"and instrument {instrument.get('display_label', holding.get('instrument_id', 'N/A')) if instrument else holding.get('instrument_id', 'N/A')} "
                f"for {format_currency(holding.get('market_value_usd'))} ({format_percent(holding.get('portfolio_weight'))})"
            )
            citations.append(
                self._make_citation(
                    f"fund:{fund_id}",
                    f"Fund {fund_name}",
                    f"Fund linked to issuer {issuer_name}",
                    0.97,
                )
            )
            citations.append(
                self._make_citation(
                    f"holding:{holding.get('holding_id', 'unknown')}",
                    f"Holding {holding.get('display_label', holding.get('holding_id', 'Unknown holding'))}",
                    f"Holding row linking fund {fund_id} to issuer {issuer_name}",
                    0.95,
                )
            )
            if len(lines) >= self.max_examples:
                break

        funds_count = len({holding.get("fund_id", "") for holding in issuer_holdings if holding.get("fund_id")})
        lines_block = "\n".join(lines) if lines else "- No linked funds found in the local runtime."
        answer = (
            f"Manual ontology demo for issuer {issuer_name} ({issuer_id}). "
            f"The local runtime shows {funds_count} fund-to-issuer links through Holding -> Instrument -> Issuer.\n\n"
            f"Sample linked funds:\n{lines_block}\n\n"
            "This is the manual demo path over local curated runtime data, not the live Fabric GraphModel."
        )

        return self._build_response(
            answer=answer,
            citations=citations,
            route_reasoning="Manual ontology demo matched an issuer and resolved linked funds from local holding rows.",
        )

    def chat(self, message: str, conversation_id: str | None = None) -> dict[str, Any]:
        del conversation_id
        self._ensure_loaded()

        if self.config_error:
            return {
                "answer": f"{self.display_name} configuration error: {self.config_error}",
                "agent": self.agent_name,
                "citations": [],
                "error": True,
                "route": "MANUAL_ONTOLOGY",
                "route_reasoning": "Manual ontology demo data could not be loaded.",
                "retrieval_display_name": self.display_name,
                "sources_used": [],
            }

        normalized_message = normalize_text(message)
        fund = self._match_fund(normalized_message)
        issuer = self._match_issuer(normalized_message)

        if fund and ("manager" in normalized_message or "managed" in normalized_message):
            return self._build_manager_answer(fund)

        if issuer and any(token in normalized_message for token in ("fund", "funds", "hold", "holds", "holder", "holders", "own", "owns")):
            return self._build_issuer_funds_answer(issuer)

        if fund:
            return self._build_fund_path_answer(fund)

        if issuer:
            return self._build_issuer_funds_answer(issuer)

        return self._build_scope_guidance_response()

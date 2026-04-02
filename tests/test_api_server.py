from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = REPO_ROOT / "src"


def load_api_server_module(monkeypatch):
    sys.path.insert(0, str(SRC_ROOT))

    fake_unified_retriever = types.ModuleType("unified_retriever")

    class DummyCitation:
        def __init__(self, source_type: str, identifier: str, title: str, content_preview: str, score: float):
            self.source_type = source_type
            self.identifier = identifier
            self.title = title
            self.content_preview = content_preview
            self.score = score

    class DummyRetriever:
        pii_filter = None

        def _build_query_analysis_output(self, message: str, route: str) -> str:
            return f"route={route} query={message}"

        def answer(self, message: str, use_llm_routing: bool = True, forced_route: str | None = None):
            return types.SimpleNamespace(
                answer="Grounded code-rag fallback",
                route="RAPTOR",
                reasoning="IMF context retrieved from RAPTOR",
                citations=[
                    DummyCitation(
                        source_type="RAPTOR",
                        identifier="IMF_2510",
                        title="IMF WEO (chunk, L0)",
                        content_preview="US growth in 2025 remains resilient in the January update.",
                        score=0.92,
                    )
                ],
                sql_query=None,
                pii_blocked=False,
                pii_warning=None,
            )

    fake_unified_retriever.UnifiedRetriever = DummyRetriever

    class DummyClient:
        def __init__(self, *args, **kwargs):
            self.config_error = None

        def chat(self, message: str, conversation_id: str | None = None):
            return {
                "answer": "ok",
                "agent": "dummy-agent",
                "citations": [],
                "conversation_id": conversation_id,
            }

    fake_foundry = types.ModuleType("foundry_agent_client")
    fake_foundry.FoundryAgentClient = DummyClient

    fake_fabric = types.ModuleType("fabric_iq_agent_client")
    fake_fabric.FabricIQAgentClient = DummyClient

    fake_rti = types.ModuleType("rti_iq_agent_client")
    fake_rti.RTIIQAgentClient = DummyClient

    fake_progress = types.ModuleType("progress_emitter")
    for name in (
        "ErrorEvent",
        "MetadataEvent",
        "PiiStatusEvent",
        "ProgressEmitter",
        "ProgressEvent",
        "ResultEvent",
        "TextChunkEvent",
    ):
        setattr(fake_progress, name, type(name, (), {}))

    fake_flask_cors = types.ModuleType("flask_cors")
    fake_flask_cors.CORS = lambda app: app

    monkeypatch.setitem(sys.modules, "unified_retriever", fake_unified_retriever)
    monkeypatch.setitem(sys.modules, "foundry_agent_client", fake_foundry)
    monkeypatch.setitem(sys.modules, "fabric_iq_agent_client", fake_fabric)
    monkeypatch.setitem(sys.modules, "rti_iq_agent_client", fake_rti)
    monkeypatch.setitem(sys.modules, "progress_emitter", fake_progress)
    monkeypatch.setitem(sys.modules, "flask_cors", fake_flask_cors)

    sys.modules.pop("api_server", None)

    return importlib.import_module("api_server")


def test_run_agent_lane_falls_back_to_fabric_iq_when_foundry_iq_errors(monkeypatch):
    module = load_api_server_module(monkeypatch)

    module.foundry_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "Foundry IQ could not access grounded retrieval tools for this question.",
            "agent": "funds-foundry-IQ-agent",
            "citations": [],
            "error": True,
        },
    )
    module.fabric_iq_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "Grounded Fabric-backed answer",
            "agent": "af-funds-fabric-agent",
            "citations": [
                {
                    "text": "Ranked funds from Fabric",
                    "url_citation": {"title": "Fabric Response for: NVDA holdings"},
                }
            ],
        },
    )

    lane, agent_result, formatted_citations = module.run_agent_lane(
        "foundry-iq",
        "Which funds have the biggest NVIDIA positions?",
        None,
    )

    assert lane["display_name"] == "Fabric IQ"
    assert agent_result["answer"] == "Grounded Fabric-backed answer"
    assert agent_result["agent"] == "af-funds-fabric-agent"
    assert agent_result["route"] == "FABRIC_IQ"
    assert formatted_citations == [
        {
            "source_type": "fabric_iq",
            "identifier": "Fabric Response for: NVDA holdings",
            "title": "Fabric Response for: NVDA holdings",
            "content_preview": "Ranked funds from Fabric",
            "score": 1.0,
        }
    ]


def test_run_agent_lane_falls_back_to_code_rag_when_agent_lanes_fail(monkeypatch):
    module = load_api_server_module(monkeypatch)

    module.foundry_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "Foundry IQ could not access grounded retrieval tools for this question.",
            "agent": "funds-foundry-IQ-agent",
            "citations": [],
            "error": True,
        },
    )
    module.fabric_iq_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "Fabric IQ could not access grounded retrieval tools for this question.",
            "agent": "af-funds-fabric-agent",
            "citations": [],
            "error": True,
        },
    )

    lane, agent_result, formatted_citations = module.run_agent_lane(
        "foundry-iq",
        "What's IMF saying about US growth in 2025?",
        None,
    )

    assert lane["display_name"] == "Foundry IQ"
    assert agent_result["answer"] == "Grounded code-rag fallback"
    assert agent_result["route"] == "RAPTOR"
    assert agent_result["fallback_origin"] == "code-rag"
    assert agent_result["reasoning"].startswith("Foundry IQ fallback to RAPTOR")
    assert formatted_citations == [
        {
            "source_type": "RAPTOR",
            "identifier": "IMF_2510",
            "title": "IMF WEO (chunk, L0)",
            "content_preview": "US growth in 2025 remains resilient in the January update.",
            "score": 0.92,
        }
    ]


def test_run_agent_lane_does_not_trust_uncited_foundry_answer(monkeypatch):
    module = load_api_server_module(monkeypatch)

    module.foundry_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "I can retry the holdings lookup if you want.",
            "agent": "funds-foundry-IQ-agent",
            "citations": [],
            "error": False,
        },
    )
    module.fabric_iq_client = types.SimpleNamespace(
        config_error=None,
        chat=lambda message, conversation_id=None: {
            "answer": "Grounded Fabric-backed answer",
            "agent": "af-funds-fabric-agent",
            "citations": [
                {
                    "text": "Ranked funds from Fabric",
                    "url_citation": {"title": "Fabric Response for: NVDA holdings"},
                }
            ],
        },
    )

    lane, agent_result, formatted_citations = module.run_agent_lane(
        "foundry-iq",
        "Which funds have the biggest NVIDIA positions?",
        None,
    )

    assert lane["display_name"] == "Fabric IQ"
    assert agent_result["answer"] == "Grounded Fabric-backed answer"
    assert agent_result["route"] == "FABRIC_IQ"
    assert formatted_citations == [
        {
            "source_type": "fabric_iq",
            "identifier": "Fabric Response for: NVDA holdings",
            "title": "Fabric Response for: NVDA holdings",
            "content_preview": "Ranked funds from Fabric",
            "score": 1.0,
        }
    ]

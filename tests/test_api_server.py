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

    class DummyRetriever:
        pii_filter = None

        def _build_query_analysis_output(self, message: str, route: str) -> str:
            return f"route={route} query={message}"

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

    assert lane["display_name"] == "Foundry IQ"
    assert agent_result["answer"] == "Grounded Fabric-backed answer"
    assert agent_result["agent"] == "af-funds-fabric-agent"
    assert formatted_citations == [
        {
            "source_type": "foundry_iq",
            "identifier": "Fabric Response for: NVDA holdings",
            "title": "Fabric Response for: NVDA holdings",
            "content_preview": "Ranked funds from Fabric",
            "score": 1.0,
        }
    ]

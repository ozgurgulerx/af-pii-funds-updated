from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = REPO_ROOT / "src"


def load_foundry_agent_client_module(monkeypatch):
    sys.path.insert(0, str(SRC_ROOT))

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *args, **kwargs: None

    fake_azure = types.ModuleType("azure")
    fake_identity = types.ModuleType("azure.identity")

    class DummyCredential:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

        def get_token(self, _scope):
            return types.SimpleNamespace(token="test-token")

    fake_identity.DefaultAzureCredential = DummyCredential
    fake_identity.ClientSecretCredential = DummyCredential
    fake_azure.identity = fake_identity

    monkeypatch.setitem(sys.modules, "dotenv", fake_dotenv)
    monkeypatch.setitem(sys.modules, "azure", fake_azure)
    monkeypatch.setitem(sys.modules, "azure.identity", fake_identity)

    sys.modules.pop("runtime_config", None)
    sys.modules.pop("foundry_agent_client", None)

    return importlib.import_module("foundry_agent_client")


def test_request_params_match_api_mode(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    legacy = module.FoundryAgentClient()
    prompt_v1 = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        api_mode="prompt_v1",
        allow_default_project_config=False,
    )

    assert legacy._request_params() == {"api-version": "2025-05-15-preview"}
    assert prompt_v1._request_params() == {}


def test_prompt_v1_chat_omits_api_version(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)
    captured = {}

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_test",
                "conversation": "conv_test",
                "output": [
                    {
                        "type": "message",
                        "content": [{"text": "ok"}],
                    }
                ],
            }

    def fake_post(url, headers, json, params, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["json"] = json
        captured["params"] = params
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(module.requests, "post", fake_post)

    client = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        agent_version="10",
        api_mode="prompt_v1",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds hold the largest NVIDIA positions?")

    assert captured["url"] == "https://example.services.ai.azure.com/api/projects/admin-4912/openai/v1/responses"
    assert captured["params"] == {}
    assert captured["json"]["agent_reference"] == {
        "type": "agent_reference",
        "name": "af-funds-fabric-agent",
        "version": "10",
    }
    assert result["answer"] == "ok"


def test_prompt_v1_chat_retries_without_required_tool_choice_after_bad_request(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)
    captured_requests = []

    class FakeErrorResponse:
        ok = False
        status_code = 400
        text = "tool_choice required is not supported for this request"

        @staticmethod
        def json():
            return {"error": {"message": FakeErrorResponse.text}}

    class FakeSuccessResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_retry",
                "conversation": "conv_retry",
                "output": [
                    {
                        "type": "message",
                        "content": [{"text": "retry-ok"}],
                    }
                ],
            }

    responses = [FakeErrorResponse(), FakeSuccessResponse()]

    def fake_post(url, headers, json, params, timeout):
        captured_requests.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "params": params,
                "timeout": timeout,
            }
        )
        return responses.pop(0)

    monkeypatch.setattr(module.requests, "post", fake_post)

    client = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        agent_version="10",
        api_mode="prompt_v1",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert len(captured_requests) == 2
    assert captured_requests[0]["json"]["tool_choice"] == "required"
    assert "tool_choice" not in captured_requests[1]["json"]
    assert result["answer"] == "retry-ok"


def test_prompt_v1_chat_retries_with_kb_only_fallback_after_tool_user_error(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)
    captured_requests = []

    class FakeToolUserErrorResponse:
        ok = False
        status_code = 400
        text = (
            '{"error":{"message":"Create assistant failed","code":"tool_user_error"}}'
        )

        @staticmethod
        def json():
            return {"error": {"message": "Create assistant failed", "code": "tool_user_error"}}

    class FakeSuccessResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_kb_fallback",
                "conversation": "conv_kb_fallback",
                "output": [
                    {
                        "type": "message",
                        "content": [{"text": "kb-only-ok"}],
                    }
                ],
            }

    responses = [FakeToolUserErrorResponse(), FakeToolUserErrorResponse(), FakeSuccessResponse()]

    def fake_post(url, headers, json, params, timeout):
        captured_requests.append(
            {
                "url": url,
                "headers": headers,
                "json": json,
                "params": params,
                "timeout": timeout,
            }
        )
        return responses.pop(0)

    monkeypatch.setattr(module.requests, "post", fake_post)

    fallback_message = "Use only the knowledge base fallback."
    client = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        agent_version="10",
        api_mode="prompt_v1",
        allow_default_project_config=False,
        tool_user_error_fallback_message=fallback_message,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert len(captured_requests) == 3
    assert captured_requests[0]["json"]["tool_choice"] == "required"
    assert "tool_choice" not in captured_requests[1]["json"]
    assert "tool_choice" not in captured_requests[2]["json"]
    assert fallback_message in captured_requests[2]["json"]["input"][0]["content"]
    assert "Original user question" in captured_requests[2]["json"]["input"][0]["content"]
    assert result["answer"] == "kb-only-ok"


def test_uses_prefixed_client_secret_credential_when_foundry_env_vars_are_present(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    monkeypatch.setenv("FABRIC_IQ_AZURE_TENANT_ID", "tenant-123")
    monkeypatch.setenv("FABRIC_IQ_AZURE_CLIENT_ID", "client-123")
    monkeypatch.setenv("FABRIC_IQ_AZURE_CLIENT_SECRET", "secret-123")

    client = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        api_mode="prompt_v1",
        display_name="Fabric IQ",
        allow_default_project_config=False,
        credential_env_prefix="FABRIC_IQ",
    )

    assert client.credential.kwargs == {
        "tenant_id": "tenant-123",
        "client_id": "client-123",
        "client_secret": "secret-123",
    }
    assert client.config_error is None


def test_prefixed_foundry_credential_requires_all_secret_fields(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    monkeypatch.setenv("FABRIC_IQ_AZURE_TENANT_ID", "tenant-123")
    monkeypatch.setenv("FABRIC_IQ_AZURE_CLIENT_ID", "client-123")
    monkeypatch.delenv("FABRIC_IQ_AZURE_CLIENT_SECRET", raising=False)

    client = module.FoundryAgentClient(
        agent_name="af-funds-fabric-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        api_mode="prompt_v1",
        display_name="Fabric IQ",
        allow_default_project_config=False,
        credential_env_prefix="FABRIC_IQ",
    )

    assert client.config_error == (
        "Fabric IQ credential configuration is incomplete. "
        "Missing: FABRIC_IQ_AZURE_CLIENT_SECRET."
    )


def test_chat_rejects_ungrounded_tool_failure_answer(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_degraded",
                "conversation": "conv_degraded",
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "text": (
                                    "I’m having trouble accessing the live N-PORT retrieval tool right now "
                                    "(403 error). I can still share the list I previously pulled and retry "
                                    "once the tool is available."
                                )
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: FakeResponse())

    client = module.FoundryAgentClient(
        agent_name="funds-foundry-IQ-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert result["error"] is True
    assert result["citations"] == []
    assert "grounded retrieval tools" in result["answer"]
    assert "previously pulled" not in result["answer"]


def test_chat_rejects_retrieval_error_clarifier_answer(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_retry_prompt",
                "conversation": "conv_retry_prompt",
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "text": (
                                    "I’m unable to access the SEC N-PORT holdings database right now "
                                    "(retrieval error). I can retry — would you like me to pull the official "
                                    "list with citations?\n\nQuick question to make results most useful: do "
                                    "you want funds ranked by absolute $ value of their NVIDIA (NVDA) "
                                    "position, or NVIDIA as a percentage of the fund’s net assets?\n\n"
                                    "Which option do you want me to fetch?"
                                )
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: FakeResponse())

    client = module.FoundryAgentClient(
        agent_name="funds-foundry-IQ-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert result["error"] is True
    assert result["citations"] == []
    assert "grounded retrieval tools" in result["answer"]
    assert "official list with citations" not in result["answer"]


def test_chat_rejects_unsourced_macro_retry_answer(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_macro_retry",
                "conversation": "conv_macro_retry",
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "text": (
                                    "I’m sorry — I tried to pull the IMF World Economic Outlook data but "
                                    "couldn’t retrieve the source due to an internal error. I can retry "
                                    "and return the IMF’s official 2025 US growth projection with a proper "
                                    "citation, or I can give a brief, sourced-agnostic summary of the IMF’s "
                                    "likely view and the drivers/risks for US growth in 2025. Which do you "
                                    "prefer?\n\nQuick (unsourced) summary: the IMF expects growth to "
                                    "moderate as tighter policy weighs on demand."
                                )
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: FakeResponse())

    client = module.FoundryAgentClient(
        agent_name="funds-foundry-IQ-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("What's IMF saying about US growth in 2025?")

    assert result["error"] is True
    assert result["citations"] == []
    assert "grounded retrieval tools" in result["answer"]
    assert "Quick (unsourced) summary" not in result["answer"]


def test_chat_rejects_best_effort_nport_summary_answer(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_best_effort",
                "conversation": "conv_best_effort",
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "text": (
                                    "Short answer: I can pull an authoritative list from the SEC N-PORT "
                                    "fund filings, but my access to the N-PORT database is failing right "
                                    "now. I can (A) retry and return a ranked list of funds + NVDA "
                                    "weight/value, or (B) give a best-effort, non-filed summary of the "
                                    "fund types and ETFs that typically hold the largest NVIDIA positions. "
                                    "Which would you prefer?"
                                )
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: FakeResponse())

    client = module.FoundryAgentClient(
        agent_name="funds-foundry-IQ-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert result["error"] is True
    assert result["citations"] == []
    assert "grounded retrieval tools" in result["answer"]
    assert "best-effort" not in result["answer"]


def test_chat_rejects_retry_prompt_with_estimated_holdings(monkeypatch):
    module = load_foundry_agent_client_module(monkeypatch)

    class FakeResponse:
        ok = True

        @staticmethod
        def json():
            return {
                "id": "resp_estimated_holdings",
                "conversation": "conv_estimated_holdings",
                "output": [
                    {
                        "type": "message",
                        "content": [
                            {
                                "text": (
                                    "I can pull exact N-PORT holdings, but I’m currently unable to access "
                                    "the SEC N-PORT database (tool error). Would you like me to retry "
                                    "fetching the exact list, or for now see a quick list of funds/ETFs "
                                    "that typically have the largest NVIDIA exposures (estimates and "
                                    "reasons)? Estimated list of funds that commonly hold the biggest "
                                    "NVIDIA positions (no official N-PORT citations due to access issue)."
                                )
                            }
                        ],
                    }
                ],
            }

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: FakeResponse())

    client = module.FoundryAgentClient(
        agent_name="funds-foundry-IQ-agent",
        base_url="https://example.services.ai.azure.com",
        project="admin-4912",
        allow_default_project_config=False,
    )
    monkeypatch.setattr(client, "_get_token", lambda: "test-token")

    result = client.chat("Which funds have the biggest NVIDIA positions?")

    assert result["error"] is True
    assert result["citations"] == []
    assert "grounded retrieval tools" in result["answer"]
    assert "Estimated list of funds" not in result["answer"]

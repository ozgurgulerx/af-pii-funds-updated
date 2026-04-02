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
        def get_token(self, _scope):
            return types.SimpleNamespace(token="test-token")

    fake_identity.DefaultAzureCredential = DummyCredential
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

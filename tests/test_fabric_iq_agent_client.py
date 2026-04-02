import importlib.util
import pathlib
import sys
import types


MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "src" / "fabric_iq_agent_client.py"


def load_fabric_iq_module(monkeypatch):
    captured = {}

    fake_foundry = types.ModuleType("foundry_agent_client")

    class DummyFoundryAgentClient:
        def __init__(self, *args, **kwargs):
            captured["args"] = args
            captured["kwargs"] = kwargs

    fake_foundry.FoundryAgentClient = DummyFoundryAgentClient

    fake_runtime = types.ModuleType("runtime_config")
    fake_runtime.load_local_env = lambda: None

    monkeypatch.setitem(sys.modules, "foundry_agent_client", fake_foundry)
    monkeypatch.setitem(sys.modules, "runtime_config", fake_runtime)

    spec = importlib.util.spec_from_file_location("fabric_iq_agent_client_under_test", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module, captured


def test_fabric_iq_client_uses_extended_request_timeout(monkeypatch):
    module, captured = load_fabric_iq_module(monkeypatch)

    module.FabricIQAgentClient()

    assert captured["kwargs"]["request_timeout_seconds"] == 150
    assert captured["kwargs"]["api_mode"] == "prompt_v1"
    assert captured["kwargs"]["credential_env_prefix"] == "FABRIC_IQ"

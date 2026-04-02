from pathlib import Path


DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile.backend"


def test_backend_dockerfile_copies_required_backend_modules():
    contents = DOCKERFILE.read_text(encoding="utf-8")

    assert "COPY src/fabric_iq_agent_client.py ." in contents
    assert "COPY src/manual_ontology_client.py ." in contents
    assert "COPY src/rti_iq_agent_client.py ." in contents

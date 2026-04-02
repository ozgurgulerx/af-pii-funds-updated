#!/usr/bin/env python3
"""
Client wrapper for the separate Fabric IQ Foundry lane.
This is intentionally isolated from the legacy Foundry IQ defaults.
"""

import os

from foundry_agent_client import FoundryAgentClient
from runtime_config import load_local_env

load_local_env()


class FabricIQAgentClient(FoundryAgentClient):
    """Client for the project-specific Fabric IQ Foundry agent."""

    def __init__(self):
        super().__init__(
            agent_name=os.getenv("FABRIC_IQ_AGENT_NAME", ""),
            base_url=os.getenv("FABRIC_IQ_FOUNDRY_BASE_URL"),
            project=os.getenv("FABRIC_IQ_FOUNDRY_PROJECT"),
            agent_version=os.getenv("FABRIC_IQ_AGENT_VERSION", "10"),
            display_name="Fabric IQ",
            source_name="af-fabric-iq-agent",
            error_mode_hint="Please check Fabric IQ configuration or use another retrieval mode.",
            require_explicit_config=True,
            explicit_config_field_names=(
                "FABRIC_IQ_AGENT_NAME",
                "FABRIC_IQ_FOUNDRY_BASE_URL",
                "FABRIC_IQ_FOUNDRY_PROJECT",
            ),
            allow_default_project_config=False,
            api_mode="prompt_v1",
        )

#!/usr/bin/env python3
"""
Client wrapper for the separate RTI / IQ Foundry lane.
This is intentionally isolated from the legacy Foundry IQ defaults.
"""

import os

from foundry_agent_client import FoundryAgentClient
from runtime_config import load_local_env

load_local_env()


class RTIIQAgentClient(FoundryAgentClient):
    """Client for the project-specific RTI / IQ Foundry agent."""

    def __init__(self):
        super().__init__(
            agent_name=os.getenv("RTI_IQ_AGENT_NAME", ""),
            base_url=os.getenv("RTI_IQ_FOUNDRY_BASE_URL"),
            project=os.getenv("RTI_IQ_FOUNDRY_PROJECT"),
            agent_version=os.getenv("RTI_IQ_AGENT_VERSION", ""),
            display_name="RTI / IQ",
            source_name="af-rti-iq-agent",
            error_mode_hint="Please check RTI / IQ configuration or use another retrieval mode.",
            require_explicit_config=True,
            explicit_config_field_names=(
                "RTI_IQ_AGENT_NAME",
                "RTI_IQ_FOUNDRY_BASE_URL",
                "RTI_IQ_FOUNDRY_PROJECT",
            ),
            allow_default_project_config=False,
            api_mode="prompt_v1",
        )

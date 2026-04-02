#!/usr/bin/env python3
"""
Client to call Azure AI Foundry IQ Agent in workflows.
Use this to integrate funds-foundry-IQ-agent into your applications.

This client uses the Azure AI Foundry Responses API to invoke prompt-type agents,
which provides access to the agent's configured knowledge base and instructions.
"""

import os
import requests
from azure.identity import ClientSecretCredential, DefaultAzureCredential
from runtime_config import load_local_env

load_local_env()


class FoundryAgentClient:
    """Client for Azure AI Foundry IQ Agent using the Responses API"""

    # Maximum number of tool approval iterations to prevent infinite loops
    MAX_APPROVAL_ITERATIONS = 10

    def __init__(
        self,
        agent_name: str = "funds-foundry-IQ-agent",
        *,
        base_url: str | None = None,
        project: str | None = None,
        agent_version: str | None = None,
        display_name: str = "Foundry IQ",
        source_name: str | None = None,
        error_mode_hint: str = "Please try Code-based RAG mode instead.",
        require_explicit_config: bool = False,
        explicit_config_field_names: tuple[str, str, str] | None = None,
        allow_default_project_config: bool = True,
        api_mode: str = "legacy_responses",
        credential_env_prefix: str | None = None,
    ):
        self.agent_name = agent_name
        self.display_name = display_name
        self.source_name = source_name or agent_name
        self.error_mode_hint = error_mode_hint
        self.api_mode = api_mode
        self.agent_version = agent_version
        self.credential_env_prefix = credential_env_prefix

        # Azure AI Foundry project configuration
        default_base_url = (
            "https://ozgurguler-7212-resource.services.ai.azure.com"
            if allow_default_project_config
            else None
        )
        default_project = "ozgurguler-7212" if allow_default_project_config else None
        self.base_url = base_url if base_url is not None else os.getenv("AZURE_AI_FOUNDRY_BASE_URL", default_base_url)
        self.project = project if project is not None else os.getenv("AZURE_AI_FOUNDRY_PROJECT", default_project)
        self.api_version = "2025-05-15-preview"
        self.config_error = None

        if require_explicit_config:
            field_names = explicit_config_field_names or (
                "AGENT_NAME",
                "AZURE_AI_FOUNDRY_BASE_URL",
                "AZURE_AI_FOUNDRY_PROJECT",
            )
            missing_fields = []
            if not self.agent_name:
                missing_fields.append(field_names[0])
            if not self.base_url:
                missing_fields.append(field_names[1])
            if not self.project:
                missing_fields.append(field_names[2])
            if missing_fields:
                self.config_error = (
                    f"{self.display_name} configuration is incomplete. "
                    f"Missing: {', '.join(missing_fields)}."
                )

        self.credential = self._build_credential()

    def _prefixed_credential_field_names(self) -> dict[str, str] | None:
        """Return the env vars used for a dedicated client-secret credential."""
        if not self.credential_env_prefix:
            return None
        prefix = self.credential_env_prefix.rstrip("_")
        return {
            "tenant_id": f"{prefix}_AZURE_TENANT_ID",
            "client_id": f"{prefix}_AZURE_CLIENT_ID",
            "client_secret": f"{prefix}_AZURE_CLIENT_SECRET",
        }

    def _build_credential(self):
        """Build the best available Azure credential for this client."""
        env_fields = self._prefixed_credential_field_names()
        if env_fields is None:
            return DefaultAzureCredential()

        env_values = {field: os.getenv(name) for field, name in env_fields.items()}
        if not any(env_values.values()):
            return DefaultAzureCredential()

        missing_fields = [env_fields[field] for field, value in env_values.items() if not value]
        if missing_fields:
            if self.config_error is None:
                self.config_error = (
                    f"{self.display_name} credential configuration is incomplete. "
                    f"Missing: {', '.join(missing_fields)}."
                )
            return DefaultAzureCredential()

        return ClientSecretCredential(
            tenant_id=env_values["tenant_id"],
            client_id=env_values["client_id"],
            client_secret=env_values["client_secret"],
        )

    def _request_params(self) -> dict:
        """Return request query params for the active API mode."""
        if self.api_mode == "prompt_v1":
            return {}
        return {"api-version": self.api_version}

    def _get_token(self) -> str:
        """Get Azure AD token for AI Foundry API.

        IMPORTANT: Uses ai.azure.com scope, NOT cognitiveservices.azure.com
        """
        token = self.credential.get_token("https://ai.azure.com/.default")
        return token.token

    def _post_response(self, url: str, headers: dict, body: dict, *, timeout: int = 120):
        """Send a Responses API request for the active API mode."""
        return requests.post(
            url,
            headers=headers,
            json=body,
            params=self._request_params(),
            timeout=timeout,
        )

    def _should_retry_without_required_tool_choice(self, response, body: dict) -> bool:
        """Retry prompt_v1 requests without tool_choice when Foundry rejects it."""
        return (
            self.api_mode == "prompt_v1"
            and body.get("tool_choice") == "required"
            and getattr(response, "status_code", None) == 400
        )

    def _extract_response(self, data: dict) -> tuple:
        """Extract answer and citations from response data.

        Returns:
            tuple: (answer_text, citations_list, has_final_message)
        """
        output = data.get("output", [])
        answer_parts = []
        citations = []
        has_final_message = False

        if isinstance(output, list):
            for item in output:
                if isinstance(item, dict):
                    item_type = item.get("type")

                    # Extract text from message items
                    if item_type == "message":
                        has_final_message = True
                        content = item.get("content", [])
                        for content_item in content:
                            if isinstance(content_item, dict):
                                text = content_item.get("text", "")
                                if text:
                                    answer_parts.append(text)
                                # Collect annotations as citations
                                annotations = content_item.get("annotations", [])
                                if annotations:
                                    citations.extend(annotations)

                    # Also handle direct text output
                    elif item_type == "output_text":
                        text = item.get("text", "")
                        if text:
                            answer_parts.append(text)
                            has_final_message = True

        answer = "\n\n".join(answer_parts) if answer_parts else ""
        return answer, citations, has_final_message

    def _find_approval_requests(self, data: dict) -> list:
        """Find all MCP approval requests in the response.

        Returns:
            list of approval request IDs
        """
        output = data.get("output", [])
        approval_ids = []

        if isinstance(output, list):
            for item in output:
                if isinstance(item, dict) and item.get("type") == "mcp_approval_request":
                    approval_id = item.get("id")
                    if approval_id:
                        approval_ids.append(approval_id)

        return approval_ids

    def _is_ungrounded_tool_failure_answer(self, answer: str, citations: list | None) -> bool:
        """Detect agent prose that admits tool failure and then improvises an answer."""
        if citations:
            return False

        normalized = (answer or "").lower()
        if not normalized:
            return False

        access_failure_signals = [
            "403 error",
            "403 forbidden",
            "having trouble accessing",
            "can't access",
            "cannot access",
            "could not access",
            "tool unavailable",
            "retrieval tool",
        ]
        stale_fallback_signals = [
            "previously pulled",
            "i can still share the list",
            "once the tool is available",
            "when the tool is available",
            "happy to retry",
        ]

        return (
            any(signal in normalized for signal in access_failure_signals)
            and any(signal in normalized for signal in stale_fallback_signals)
        )

    def _build_grounding_failure_result(self) -> dict:
        return {
            "answer": (
                f"{self.display_name} could not access grounded retrieval tools for this question. "
                f"{self.error_mode_hint}"
            ),
            "agent": self.agent_name,
            "citations": [],
            "error": True,
        }

    def chat(self, message: str, conversation_id: str = None) -> dict:
        """
        Send a message to the Foundry IQ agent using the Responses API.

        This properly invokes the prompt-type agent with its configured:
        - Model: gpt-5-mini
        - Knowledge Base: kb_funds_kb02_2mx2h (SEC N-PORT + IMF data)
        - System instructions

        The method automatically approves MCP tool calls (knowledge base retrieval)
        in a loop until a final message is received.

        Args:
            message: User's question
            conversation_id: Optional conversation ID for multi-turn conversations

        Returns:
            dict with 'answer', 'agent', 'citations', 'conversation_id'
        """
        if self.config_error:
            return {
                "answer": self.config_error,
                "agent": self.agent_name or self.display_name,
                "citations": [],
                "error": True,
            }

        if self.api_mode == "prompt_v1":
            agent_reference = {"type": "agent_reference", "name": self.agent_name}
            if self.agent_version:
                agent_reference["version"] = str(self.agent_version)

            url = f"{self.base_url}/api/projects/{self.project}/openai/v1/responses"
            body = {
                "agent_reference": agent_reference,
                "tool_choice": "required",
                "input": [
                    {
                        "role": "user",
                        "content": message,
                    }
                ],
            }
        else:
            url = f"{self.base_url}/api/projects/{self.project}/openai/responses"
            body = {
                "agent": {"type": "agent_reference", "name": self.agent_name},
                "input": message
            }

            # Include conversation ID for multi-turn conversations
            if conversation_id:
                body["conversation"] = conversation_id

        headers = {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json"
        }

        try:
            response = self._post_response(url, headers, body, timeout=120)
            if not response.ok and self._should_retry_without_required_tool_choice(response, body):
                fallback_body = dict(body)
                fallback_body.pop("tool_choice", None)
                response = self._post_response(url, headers, fallback_body, timeout=120)

            if not response.ok:
                error_text = response.text
                print(f"{self.display_name} agent error: {response.status_code} - {error_text}")
                return {
                    "answer": f"{self.display_name} agent error: {response.status_code}. {self.error_mode_hint}",
                    "agent": self.agent_name,
                    "citations": [],
                    "error": True
                }

            data = response.json()
            response_id = data.get("id")

            # Check if we have a final message already
            answer, citations, has_final = self._extract_response(data)
            if has_final and answer:
                if self._is_ungrounded_tool_failure_answer(answer, citations):
                    return self._build_grounding_failure_result()
                return {
                    "answer": answer,
                    "agent": self.agent_name,
                    "citations": citations,
                    "conversation_id": data.get("conversation"),
                    "source": self.source_name
                }

            # Loop to handle MCP tool approvals
            for iteration in range(self.MAX_APPROVAL_ITERATIONS):
                approval_ids = self._find_approval_requests(data)

                if not approval_ids:
                    # No more approvals needed, check for final message
                    answer, citations, has_final = self._extract_response(data)
                    if has_final and answer:
                        if self._is_ungrounded_tool_failure_answer(answer, citations):
                            return self._build_grounding_failure_result()
                        return {
                            "answer": answer,
                            "agent": self.agent_name,
                            "citations": citations,
                            "conversation_id": data.get("conversation"),
                            "source": self.source_name
                        }
                    else:
                        # No approvals and no message - something unexpected
                        break

                # Auto-approve all pending MCP tool calls
                approval_responses = []
                for approval_id in approval_ids:
                    approval_responses.append({
                        "type": "mcp_approval_response",
                        "approve": True,
                        "approval_request_id": approval_id
                    })

                # Send approval and continue
                if self.api_mode == "prompt_v1":
                    agent_reference = {"type": "agent_reference", "name": self.agent_name}
                    if self.agent_version:
                        agent_reference["version"] = str(self.agent_version)
                    approval_body = {
                        "agent_reference": agent_reference,
                        "input": approval_responses,
                        "previous_response_id": response_id,
                    }
                else:
                    approval_body = {
                        "agent": {"type": "agent_reference", "name": self.agent_name},
                        "input": approval_responses,
                        "previous_response_id": response_id
                    }

                response = self._post_response(url, headers, approval_body, timeout=120)

                if not response.ok:
                    error_text = response.text
                    print(f"{self.display_name} agent approval error: {response.status_code} - {error_text}")
                    return {
                        "answer": f"Error during {self.display_name} knowledge retrieval: {response.status_code}",
                        "agent": self.agent_name,
                        "citations": [],
                        "error": True
                    }

                data = response.json()
                response_id = data.get("id")

                # Check if we now have a final message
                answer, citations, has_final = self._extract_response(data)
                if has_final and answer:
                    return {
                        "answer": answer,
                        "agent": self.agent_name,
                        "citations": citations,
                        "conversation_id": data.get("conversation"),
                            "source": self.source_name
                        }

            # Max iterations reached without final message
            return {
                "answer": "The agent is still processing. Please try a simpler question.",
                "agent": self.agent_name,
                "citations": [],
                "error": True
            }

        except requests.exceptions.Timeout:
            print(f"{self.display_name} agent timeout")
            return {
                "answer": f"{self.display_name} agent timed out. {self.error_mode_hint}",
                "agent": self.agent_name,
                "citations": [],
                "error": True
            }
        except Exception as e:
            print(f"{self.display_name} agent error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "answer": f"{self.display_name} agent encountered an error: {str(e)}. {self.error_mode_hint}",
                "agent": self.agent_name,
                "citations": [],
                "error": True
            }


class FoundryAgentWorkflow:
    """
    Workflow integration for Foundry IQ Agent.
    Use this class to integrate the agent into larger workflows.
    """

    def __init__(self):
        self.client = FoundryAgentClient()
        self.conversation_id = None

    def ask(self, question: str) -> str:
        """Simple Q&A - returns just the answer"""
        result = self.client.chat(question, self.conversation_id)

        # Store conversation ID for multi-turn
        if result.get("conversation_id"):
            self.conversation_id = result["conversation_id"]

        return result["answer"]

    def ask_with_context(self, question: str, context: dict = None) -> dict:
        """
        Q&A with additional context.

        Args:
            question: User's question
            context: Additional context like user preferences, constraints

        Returns:
            Full response with answer, citations, metadata
        """
        # Enhance question with context
        if context:
            enhanced_question = f"{question}\n\nContext: {context}"
        else:
            enhanced_question = question

        result = self.client.chat(enhanced_question, self.conversation_id)

        # Store conversation ID for multi-turn
        if result.get("conversation_id"):
            self.conversation_id = result["conversation_id"]

        result["question"] = question
        result["context"] = context

        return result

    def batch_questions(self, questions: list) -> list:
        """Process multiple questions"""
        results = []
        for q in questions:
            results.append({
                "question": q,
                "answer": self.ask(q)
            })
        return results

    def reset_conversation(self):
        """Clear conversation history"""
        self.conversation_id = None


# Example usage
if __name__ == "__main__":
    print("=" * 60)
    print("FOUNDRY IQ AGENT WORKFLOW TEST")
    print("=" * 60)

    workflow = FoundryAgentWorkflow()

    # Single question
    print("\n📝 Question 1: What are the top bond funds?")
    answer = workflow.ask("What are the top bond funds?")
    print(f"\n🤖 Answer:\n{answer}")

    # Follow-up (uses conversation history)
    print("\n" + "-" * 60)
    print("\n📝 Question 2: How might interest rates affect them?")
    answer = workflow.ask("How might interest rates affect them?")
    print(f"\n🤖 Answer:\n{answer}")

    # With context
    print("\n" + "-" * 60)
    print("\n📝 Question 3: With context (risk-averse investor)")
    result = workflow.ask_with_context(
        "What funds should I consider?",
        context={"risk_tolerance": "low", "investment_horizon": "5 years"}
    )
    print(f"\n🤖 Answer:\n{result['answer']}")

    print("\n" + "=" * 60)
    print("✅ Workflow test complete")
    print("=" * 60)

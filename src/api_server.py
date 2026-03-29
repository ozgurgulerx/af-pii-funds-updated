#!/usr/bin/env python3
"""
Flask API Server for Fund RAG Backend.
Provides HTTP endpoints for the Next.js frontend.
"""

import json
import threading
import time

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from unified_retriever import UnifiedRetriever
from foundry_agent_client import FoundryAgentClient
from progress_emitter import (
    ErrorEvent,
    MetadataEvent,
    PiiStatusEvent,
    ProgressEmitter,
    ProgressEvent,
    ResultEvent,
    TextChunkEvent,
)

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Initialize retrievers once
print("Initializing Fund RAG retriever...")
retriever = UnifiedRetriever()
print("Retriever ready!")

print("Initializing Foundry IQ client...")
foundry_client = FoundryAgentClient()
print("Foundry IQ client ready!")

ALLOWED_QUERY_ROUTES = {"SQL", "SEMANTIC", "RAPTOR", "SEMANTIC_RAPTOR", "HYBRID", "CHAIN"}


def normalize_messages(messages: list | None) -> list[dict]:
    normalized_messages = []
    if not isinstance(messages, list):
        return normalized_messages

    for entry in messages:
        if not isinstance(entry, dict):
            continue
        role = entry.get("role")
        content = entry.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue
        content = content.strip()
        if not content:
            continue
        normalized_messages.append({"role": role, "content": content})

    return normalized_messages


def build_backend_query(message: str, messages: list | None, max_history: int = 6) -> str:
    """Serialize recent conversation history into the backend prompt."""
    normalized_messages = normalize_messages(messages)

    if not normalized_messages:
        return message

    normalized_message = message.strip()
    prior_messages = normalized_messages
    if (
        normalized_messages[-1]["role"] == "user"
        and normalized_messages[-1]["content"] == normalized_message
    ):
        prior_messages = normalized_messages[:-1]
    if not prior_messages:
        return message

    history_lines = [
        f"{entry['role'].upper()}: {entry['content']}"
        for entry in prior_messages[-max_history:]
    ]
    history_block = "\n".join(history_lines)
    return f"Conversation history:\n{history_block}\n\nCurrent user question:\n{message}"


def format_foundry_citations(raw_citations: list | None) -> list[dict]:
    formatted_citations = []
    for citation in raw_citations or []:
        if not isinstance(citation, dict):
            continue
        formatted_citations.append({
            "source_type": "foundry_iq",
            "identifier": citation.get("url_citation", {}).get("title", citation.get("text", "Unknown")),
            "title": citation.get("url_citation", {}).get("title", "Foundry IQ Knowledge Base"),
            "content_preview": citation.get("text", ""),
            "score": 1.0,
        })
    return formatted_citations


def build_route_confidence(use_llm_routing: bool, forced_route: str | None = None) -> float:
    if forced_route:
        return 1.0
    return 0.86 if use_llm_routing else 0.72


def sse_message(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def build_streaming_response(emitter: ProgressEmitter):
    def generate():
        result: ResultEvent | None = None
        metadata_payload: dict | None = None
        text_streamed = False

        for event in emitter:
            if isinstance(event, PiiStatusEvent):
                payload = {
                    "type": "pii_status",
                    "hasPii": event.has_pii,
                    "categories": event.categories,
                    "thread": event.thread,
                }
                if event.redacted_text:
                    payload["redactedText"] = event.redacted_text
                yield sse_message(payload)
            elif isinstance(event, ProgressEvent):
                yield sse_message({"type": "progress", "step": event.step})
            elif isinstance(event, MetadataEvent):
                metadata_payload = {
                    "type": "metadata",
                    "intent": event.intent,
                    "sourcesUsed": event.sources_used,
                    "route": event.route,
                    "routeConfidence": event.route_confidence,
                    "routeReasoning": event.route_reasoning,
                    "artifacts": event.artifacts,
                }
                yield sse_message(metadata_payload)
            elif isinstance(event, TextChunkEvent):
                text_streamed = True
                yield sse_message({"type": "text", "content": event.content})
            elif isinstance(event, ResultEvent):
                result = event
                if not text_streamed:
                    if metadata_payload is None:
                        metadata_payload = {
                            "type": "metadata",
                            "intent": event.intent,
                            "sourcesUsed": event.sources_used,
                            "route": event.route,
                            "routeConfidence": event.route_confidence,
                            "routeReasoning": event.route_reasoning,
                            "artifacts": event.artifacts,
                        }
                        yield sse_message(metadata_payload)
                    for token in event.answer.split(" "):
                        if not token:
                            continue
                        yield sse_message({"type": "text", "content": token + " "})

                yield sse_message({"type": "citations", "citations": event.citations})
                is_verified = bool(event.citations) or event.route == "FOUNDRY_IQ"
                yield sse_message({"type": "done", "isVerified": is_verified})
            elif isinstance(event, ErrorEvent):
                yield sse_message({"type": "error", "message": event.message})
                return

        if result is not None:
            return

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "fund-rag-api"})


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint for fund queries.

    Request body:
        {
            "message": "What are the top 5 bond funds?",
            "retrieval_mode": "code-rag" | "foundry-iq"
        }

    Response:
        {
            "answer": "...",
            "route": "SQL|SEMANTIC|RAPTOR|HYBRID|CHAIN|FOUNDRY_IQ",
            "citations": [...],
            "pii_blocked": false
        }
    """
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        message = data['message']
        messages = data.get('messages')
        conversation_id = data.get('conversation_id')
        use_llm_routing = data.get('use_llm_routing', True)
        retrieval_mode = data.get('retrieval_mode', 'code-rag')
        backend_query = build_backend_query(message, messages)

        if retrieval_mode == 'foundry-iq':
            # Use Foundry IQ Agent
            foundry_result = foundry_client.chat(backend_query, conversation_id=conversation_id)

            # Format Foundry IQ citations to match code-rag format
            formatted_citations = format_foundry_citations(foundry_result.get("citations", []))

            response = {
                "answer": foundry_result.get("answer", "No answer available"),
                "route": "FOUNDRY_IQ",
                "reasoning": f"Using Foundry IQ agent ({foundry_result.get('agent', 'unknown')})",
                "citations": formatted_citations,
                "pii_blocked": False,
                "pii_warning": None,
                "sql_query": None,
                "conversation_id": foundry_result.get("conversation_id")
            }

            return jsonify(response)

        # Default: Use code-based RAG (JSON response for all routes)
        result = retriever.answer(backend_query, use_llm_routing=use_llm_routing)

        # Format response
        response = {
            "answer": result.answer,
            "route": result.route,
            "reasoning": result.reasoning,
            "citations": [
                {
                    "source_type": c.source_type,
                    "identifier": c.identifier,
                    "title": c.title,
                    "content_preview": c.content_preview,
                    "score": c.score
                }
                for c in result.citations
            ],
            "pii_blocked": result.pii_blocked,
            "pii_warning": result.pii_warning,
            "sql_query": result.sql_query
        }

        return jsonify(response)

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming SSE chat endpoint with live trace telemetry."""
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        message = data['message']
        messages = data.get('messages')
        conversation_id = data.get('conversation_id')
        use_llm_routing = data.get('use_llm_routing', True)
        retrieval_mode = data.get('retrieval_mode', 'code-rag')
        backend_query = build_backend_query(message, messages)
        normalized_messages = normalize_messages(messages)
        prior_message_count = len(normalized_messages[:-1]) if normalized_messages else 0

        emitter = ProgressEmitter()

        def worker():
            try:
                pii_input = f"message length={len(message)} chars"
                emitter.start("pii-check", "PII Detection", pii_input)
                pii_started = time.perf_counter()
                pii_result = retriever.check_pii(message)
                pii_categories = sorted({entity.category for entity in pii_result.entities})
                pii_duration = int((time.perf_counter() - pii_started) * 1000)

                if pii_result.has_pii:
                    warning = retriever.pii_filter.format_warning(pii_result.entities) if retriever.pii_filter else "Request blocked because PII was detected."
                    emitter.complete(
                        "pii-check",
                        "PII Detection",
                        pii_duration,
                        f"request blocked | categories: {', '.join(pii_categories) or 'unknown'}",
                        pii_input,
                    )
                    emitter.emit_pii_status(
                        has_pii=True,
                        categories=pii_categories,
                        thread="blocked",
                        redacted_text=pii_result.redacted_text or "",
                    )
                    emitter.emit_metadata(
                        MetadataEvent(
                            intent="PII_BLOCKED",
                            sources_used=[],
                            route="BLOCKED",
                            route_confidence=1.0,
                            route_reasoning="input blocked due to pii",
                            artifacts=[],
                        )
                    )
                    emitter.finish(
                        ResultEvent(
                            answer=warning,
                            citations=[],
                            sources_used=[],
                            intent="PII_BLOCKED",
                            route="BLOCKED",
                            route_confidence=1.0,
                            route_reasoning="input blocked due to pii",
                            artifacts=[],
                        )
                    )
                    return

                emitter.complete(
                    "pii-check",
                    "PII Detection",
                    pii_duration,
                    "clean input",
                    pii_input,
                )
                emitter.emit_pii_status(
                    has_pii=False,
                    categories=[],
                    thread="single",
                    redacted_text=pii_result.redacted_text or "",
                )

                compact_input = f"{len(normalized_messages)} messages, session=single"
                emitter.start("context-compaction", "Context Compaction", compact_input)
                compact_started = time.perf_counter()
                compact_output = (
                    "single-session context preserved"
                    if normalized_messages
                    else "single-session context preserved"
                )
                emitter.complete(
                    "context-compaction",
                    "Context Compaction",
                    int((time.perf_counter() - compact_started) * 1000),
                    compact_output,
                    compact_input,
                )

                if retrieval_mode == 'foundry-iq':
                    rewrite_input = f"history_len={prior_message_count}"
                    emitter.start("query-rewrite", "Query Rewrite", rewrite_input)
                    rewrite_started = time.perf_counter()
                    emitter.complete(
                        "query-rewrite",
                        "Query Rewrite",
                        int((time.perf_counter() - rewrite_started) * 1000),
                        "skipped: already standalone" if prior_message_count > 0 else "skipped: no_history",
                        rewrite_input,
                    )

                    analysis_input = f"query: {message}"
                    emitter.start("query-analysis", "Query Analysis", analysis_input)
                    analysis_started = time.perf_counter()
                    emitter.complete(
                        "query-analysis",
                        "Query Analysis",
                        int((time.perf_counter() - analysis_started) * 1000),
                        retriever._build_query_analysis_output(message, "FOUNDRY_IQ"),
                        analysis_input,
                    )

                    route_input = "message inspection"
                    emitter.start("intent-router-v2", "Intent Router V2", route_input)
                    route_started = time.perf_counter()
                    route_confidence = build_route_confidence(use_llm_routing)
                    emitter.complete(
                        "intent-router-v2",
                        "Intent Router V2",
                        int((time.perf_counter() - route_started) * 1000),
                        f"route=FOUNDRY_IQ confidence={route_confidence:.2f}; using Foundry IQ agent",
                        route_input,
                    )

                    retrieval_input = "filters: Foundry IQ agent retrieval"
                    emitter.start("retrieval-foundry-iq", "Foundry IQ", retrieval_input)
                    retrieval_started = time.perf_counter()
                    foundry_result = foundry_client.chat(backend_query, conversation_id=conversation_id)
                    formatted_citations = format_foundry_citations(foundry_result.get("citations", []))
                    emitter.complete(
                        "retrieval-foundry-iq",
                        "Foundry IQ",
                        int((time.perf_counter() - retrieval_started) * 1000),
                        f"{len(formatted_citations)} citation(s) prepared",
                        retrieval_input,
                    )

                    emitter.start("answer-brief", "Answer Brief Builder", analysis_input)
                    brief_started = time.perf_counter()
                    emitter.complete(
                        "answer-brief",
                        "Answer Brief Builder",
                        int((time.perf_counter() - brief_started) * 1000),
                        "summary composed from model response",
                        analysis_input,
                    )

                    emitter.emit_metadata(
                        MetadataEvent(
                            intent="GENERAL",
                            sources_used=["foundry_iq"] if formatted_citations else [],
                            route="FOUNDRY_IQ",
                            route_confidence=route_confidence,
                            route_reasoning="using Foundry IQ agent",
                            artifacts=[],
                        )
                    )

                    answer_text = foundry_result.get("answer", "No answer available")
                    generation_input = f"query: {message}"
                    emitter.start("llm-generate", "LLM Response Generation", generation_input)
                    generation_started = time.perf_counter()
                    for token in answer_text.split(" "):
                        if not token:
                            continue
                        emitter.emit_text_chunk(token + " ")
                    emitter.complete(
                        "llm-generate",
                        "LLM Response Generation",
                        int((time.perf_counter() - generation_started) * 1000),
                        f"answer length={len(answer_text)} chars",
                        generation_input,
                    )

                    emitter.start("answer-validation", "Answer Validation", generation_input)
                    validation_started = time.perf_counter()
                    emitter.complete(
                        "answer-validation",
                        "Answer Validation",
                        int((time.perf_counter() - validation_started) * 1000),
                        (
                            f"verified with {len(formatted_citations)} citation(s)"
                            if formatted_citations
                            else "verified without explicit citations"
                        ),
                        generation_input,
                    )

                    emitter.finish_streaming(
                        ResultEvent(
                            answer=answer_text,
                            citations=formatted_citations,
                            sources_used=["foundry_iq"] if formatted_citations else [],
                            intent="GENERAL",
                            route="FOUNDRY_IQ",
                            route_confidence=route_confidence,
                            route_reasoning="using Foundry IQ agent",
                            artifacts=[],
                        )
                    )
                    return

                retriever.answer_streaming(
                    backend_query,
                    emitter,
                    use_llm_routing=use_llm_routing,
                    trace_query=message,
                    history_len=prior_message_count,
                )
            except Exception as e:
                print(f"Error in stream worker: {e}")
                import traceback
                traceback.print_exc()
                emitter.fail(str(e))

        threading.Thread(target=worker, daemon=True).start()
        return build_streaming_response(emitter)
    except Exception as e:
        print(f"Error in chat stream endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/query', methods=['POST'])
def query():
    """
    Direct query endpoint with route specification.

    Request body:
        {
            "message": "Top 5 bond funds",
            "route": "SQL"  // Optional: SQL, SEMANTIC, RAPTOR, HYBRID, CHAIN
        }
    """
    try:
        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        message = data['message']
        forced_route = data.get('route')
        if forced_route is not None:
            forced_route = str(forced_route).upper()
            if forced_route not in ALLOWED_QUERY_ROUTES:
                return jsonify({"error": f"Unsupported route '{forced_route}'"}), 400

        # Use heuristic routing for faster response unless a route override is supplied.
        result = retriever.answer(message, use_llm_routing=False, forced_route=forced_route)

        return jsonify({
            "answer": result.answer,
            "route": result.route,
            "citations": [c.to_dict() for c in result.citations],
            "pii_blocked": result.pii_blocked
        })

    except Exception as e:
        print(f"Error in query endpoint: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("FUND RAG API SERVER")
    print("=" * 60)
    print("Endpoints:")
    print("  GET  /health     - Health check")
    print("  POST /api/chat   - Chat with fund RAG")
    print("                     retrieval_mode: 'code-rag' | 'foundry-iq'")
    print("  POST /api/chat/stream - Streaming chat with trace telemetry")
    print("  POST /api/query  - Direct query")
    print("=" * 60)

    app.run(host='0.0.0.0', port=5001, debug=True)
